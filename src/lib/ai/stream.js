import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { GoogleGenerativeAI } from '@google/generative-ai'

// Providers using OpenAI-compatible chat completions API
const OPENAI_COMPAT_BASE = {
  openai: 'https://api.openai.com/v1',
  groq:   'https://api.groq.com/openai/v1',
  ollama: 'http://localhost:11434/v1',
}

export const PROVIDERS = {
  anthropic: {
    label: 'Claude (Anthropic)',
    requiresKey: true,
    customModel: false,
    models: [
      { id: 'claude-sonnet-4-6',         label: 'Claude Sonnet 4.6' },
      { id: 'claude-haiku-4-5-20251001',  label: 'Claude Haiku 4.5 (Fast)' },
      { id: 'claude-opus-4-8',            label: 'Claude Opus 4.8 (Powerful)' },
    ],
    defaultModel: 'claude-sonnet-4-6',
  },
  openai: {
    label: 'ChatGPT (OpenAI)',
    requiresKey: true,
    customModel: false,
    models: [
      { id: 'gpt-4o',      label: 'GPT-4o' },
      { id: 'gpt-4o-mini', label: 'GPT-4o mini (Fast)' },
    ],
    defaultModel: 'gpt-4o',
  },
  gemini: {
    label: 'Gemini (Google)',
    requiresKey: true,
    customModel: false,
    models: [
      { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
      { id: 'gemini-1.5-pro',   label: 'Gemini 1.5 Pro' },
    ],
    defaultModel: 'gemini-2.0-flash',
  },
  groq: {
    label: 'Groq',
    requiresKey: true,
    customModel: false,
    models: [
      { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B' },
      { id: 'llama-3.1-8b-instant',    label: 'Llama 3.1 8B (Fast)' },
      { id: 'mixtral-8x7b-32768',      label: 'Mixtral 8x7B' },
      { id: 'gemma2-9b-it',            label: 'Gemma 2 9B' },
    ],
    defaultModel: 'llama-3.3-70b-versatile',
  },
  ollama: {
    label: 'Ollama (Local)',
    requiresKey: false,
    customModel: true,
    models: [],
    defaultModel: 'llama3.2',
  },
}

// messages: [{ role: 'user'|'assistant', content: string }]
export async function* streamChat({ provider, apiKey, model, system, messages, ollamaUrl }) {
  if (provider === 'anthropic') {
    const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true })
    const stream = client.messages.stream({ model, system, messages, max_tokens: 1024 })
    for await (const text of stream.textStream) {
      yield text
    }

  } else if (provider === 'gemini') {
    const genAI = new GoogleGenerativeAI(apiKey)
    const genModel = genAI.getGenerativeModel({ model, systemInstruction: system })
    const history = messages.slice(0, -1).map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }))
    const chat = genModel.startChat({ history })
    const result = await chat.sendMessageStream(messages[messages.length - 1].content)
    for await (const chunk of result.stream) {
      yield chunk.text()
    }

  } else if (OPENAI_COMPAT_BASE[provider]) {
    const base = provider === 'ollama' && ollamaUrl
      ? `${ollamaUrl.replace(/\/+$/, '')}/v1`
      : OPENAI_COMPAT_BASE[provider]
    const client = new OpenAI({
      baseURL: base,
      apiKey: provider === 'ollama' ? 'ollama' : apiKey,
      dangerouslyAllowBrowser: true,
    })
    const stream = await client.chat.completions.create({
      model,
      messages: [{ role: 'system', content: system }, ...messages],
      stream: true,
    })
    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content
      if (text) yield text
    }

  } else {
    throw new Error(`Unknown provider: ${provider}`)
  }
}
