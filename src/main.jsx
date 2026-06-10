import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import App from './App'
import { ThemeProvider } from './context/ThemeContext'
import { CurrencyProvider } from './context/CurrencyContext'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HelmetProvider>
      <ThemeProvider>
        <CurrencyProvider>
          <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '') || '/'}>
            <App />
          </BrowserRouter>
        </CurrencyProvider>
      </ThemeProvider>
    </HelmetProvider>
  </React.StrictMode>
)
