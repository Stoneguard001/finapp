import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react'
import { useDbStore } from '@/store/dbStore'
import { getSetting, setSetting } from '@/db/queries/settings'

export const CURRENCY_PRESETS = [
  { id: 'en-US|USD', label: 'US Dollar (USD)',           locale: 'en-US', currency: 'USD' },
  { id: 'en-GB|GBP', label: 'British Pound (GBP)',       locale: 'en-GB', currency: 'GBP' },
  { id: 'de-DE|EUR', label: 'Euro — German (EUR)',        locale: 'de-DE', currency: 'EUR' },
  { id: 'fr-FR|EUR', label: 'Euro — French (EUR)',        locale: 'fr-FR', currency: 'EUR' },
  { id: 'en-AU|AUD', label: 'Australian Dollar (AUD)',    locale: 'en-AU', currency: 'AUD' },
  { id: 'en-CA|CAD', label: 'Canadian Dollar (CAD)',      locale: 'en-CA', currency: 'CAD' },
  { id: 'en-NZ|NZD', label: 'New Zealand Dollar (NZD)',   locale: 'en-NZ', currency: 'NZD' },
  { id: 'en-SG|SGD', label: 'Singapore Dollar (SGD)',     locale: 'en-SG', currency: 'SGD' },
  { id: 'en-HK|HKD', label: 'Hong Kong Dollar (HKD)',     locale: 'en-HK', currency: 'HKD' },
  { id: 'en-IN|INR', label: 'Indian Rupee (INR)',          locale: 'en-IN', currency: 'INR' },
  { id: 'ja-JP|JPY', label: 'Japanese Yen (JPY)',          locale: 'ja-JP', currency: 'JPY' },
  { id: 'zh-CN|CNY', label: 'Chinese Yuan (CNY)',          locale: 'zh-CN', currency: 'CNY' },
  { id: 'ko-KR|KRW', label: 'Korean Won (KRW)',            locale: 'ko-KR', currency: 'KRW' },
  { id: 'pt-BR|BRL', label: 'Brazilian Real (BRL)',        locale: 'pt-BR', currency: 'BRL' },
  { id: 'es-MX|MXN', label: 'Mexican Peso (MXN)',          locale: 'es-MX', currency: 'MXN' },
  { id: 'de-CH|CHF', label: 'Swiss Franc (CHF)',           locale: 'de-CH', currency: 'CHF' },
  { id: 'sv-SE|SEK', label: 'Swedish Krona (SEK)',         locale: 'sv-SE', currency: 'SEK' },
  { id: 'nb-NO|NOK', label: 'Norwegian Krone (NOK)',       locale: 'nb-NO', currency: 'NOK' },
  { id: 'da-DK|DKK', label: 'Danish Krone (DKK)',          locale: 'da-DK', currency: 'DKK' },
  { id: 'pl-PL|PLN', label: 'Polish Zloty (PLN)',          locale: 'pl-PL', currency: 'PLN' },
  { id: 'tr-TR|TRY', label: 'Turkish Lira (TRY)',          locale: 'tr-TR', currency: 'TRY' },
  { id: 'en-ZA|ZAR', label: 'South African Rand (ZAR)',    locale: 'en-ZA', currency: 'ZAR' },
  { id: 'ar-AE|AED', label: 'UAE Dirham (AED)',            locale: 'ar-AE', currency: 'AED' },
  { id: 'ru-RU|RUB', label: 'Russian Ruble (RUB)',         locale: 'ru-RU', currency: 'RUB' },
]

const DEFAULT_ID = 'en-US|USD'

const CurrencyContext = createContext()

export function CurrencyProvider({ children }) {
  const [presetId, setPresetId] = useState(DEFAULT_ID)
  const ready = useDbStore(s => s.ready)

  useEffect(() => {
    if (!ready) {
      setPresetId(DEFAULT_ID)
      return
    }
    setPresetId(getSetting('currency_preset', DEFAULT_ID))
  }, [ready])

  const preset = useMemo(
    () => CURRENCY_PRESETS.find(p => p.id === presetId) ?? CURRENCY_PRESETS[0],
    [presetId]
  )

  const formatter = useMemo(
    () => new Intl.NumberFormat(preset.locale, { style: 'currency', currency: preset.currency }),
    [preset]
  )

  const fmt = useCallback((n) => formatter.format(n ?? 0), [formatter])

  const setPreset = useCallback((id) => {
    setPresetId(id)
    setSetting('currency_preset', id)
  }, [])

  return (
    <CurrencyContext.Provider value={{ presetId, preset, setPreset, fmt }}>
      {children}
    </CurrencyContext.Provider>
  )
}

export const useCurrency = () => useContext(CurrencyContext)
