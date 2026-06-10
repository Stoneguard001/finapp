import { useState, useEffect } from 'react'

const GA_ID = 'G-91J812TYTN'

function loadGA() {
  if (window.gtag) return
  const s = document.createElement('script')
  s.async = true
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`
  document.head.appendChild(s)
  window.dataLayer = window.dataLayer || []
  window.gtag = function () { window.dataLayer.push(arguments) }
  window.gtag('js', new Date())
  window.gtag('config', GA_ID)
}

export default function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const consent = localStorage.getItem('cookie-consent')
    if (consent === 'accepted') {
      loadGA()
    } else if (consent === null) {
      setVisible(true)
    }
  }, [])

  if (!visible) return null

  function accept() {
    localStorage.setItem('cookie-consent', 'accepted')
    loadGA()
    setVisible(false)
  }

  function decline() {
    localStorage.setItem('cookie-consent', 'declined')
    setVisible(false)
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900 dark:bg-slate-950 border-t border-slate-700 dark:border-slate-800 px-4 py-3">
      <div className="max-w-2xl mx-auto flex flex-col sm:flex-row sm:items-center gap-3">
        <p className="text-sm text-slate-300 flex-1">
          This site uses Google Analytics cookies to understand how people use EvenKeel. No personal or financial data is ever collected.
        </p>
        <div className="flex gap-2 flex-shrink-0">
          <button onClick={decline} className="btn-ghost text-sm">Decline</button>
          <button onClick={accept} className="btn-primary text-sm">Accept</button>
        </div>
      </div>
    </div>
  )
}
