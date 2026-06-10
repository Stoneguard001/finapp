import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { useDbStore } from '@/store/dbStore'
import { ToastProvider } from '@/context/ToastContext'
import Layout from '@/components/layout/Layout'
import UpdatePrompt from '@/components/UpdatePrompt'
import Welcome from '@/pages/Welcome'
import Dashboard from '@/pages/Dashboard'
import Transactions from '@/pages/Transactions'
import Budgets from '@/pages/Budgets'
import Accounts from '@/pages/Accounts'
import ImportPage from '@/pages/ImportPage'
import Categories from '@/pages/Categories'
import Rules from '@/pages/Rules'
import Settings from '@/pages/Settings'
import Reports from '@/pages/Reports'
import Help from '@/pages/Help'
import About from '@/pages/About'

export default function App() {
  return <ToastProvider><AppInner /><UpdatePrompt /></ToastProvider>
}

function AppInner() {
  const ready = useDbStore(s => s.ready)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (ready) navigate('/dashboard', { replace: true })
  }, [ready])

  useEffect(() => {
    document.dispatchEvent(new Event('app-rendered'))
  }, [])

  if (!ready) {
    if (location.pathname === '/help' || location.pathname === '/about') {
      return (
        <Layout>
          <Routes>
            <Route path="/help"  element={<Help />} />
            <Route path="/about" element={<About />} />
          </Routes>
        </Layout>
      )
    }
    return <Welcome />
  }

  return (
    <Layout>
      <Routes>
        <Route path="/"             element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard"    element={<Dashboard />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route path="/budgets"      element={<Budgets />} />
        <Route path="/accounts"     element={<Accounts />} />
        <Route path="/import"       element={<ImportPage />} />
        <Route path="/reports"      element={<Reports />} />
        <Route path="/categories"   element={<Categories />} />
        <Route path="/rules"        element={<Rules />} />
        <Route path="/settings"     element={<Settings />} />
        <Route path="/help"         element={<Help />} />
        <Route path="/about"        element={<About />} />
      </Routes>
    </Layout>
  )
}
