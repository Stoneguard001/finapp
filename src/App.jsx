import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { useDbStore } from '@/store/dbStore'
import Layout from '@/components/layout/Layout'
import Welcome from '@/pages/Welcome'
import Dashboard from '@/pages/Dashboard'
import Transactions from '@/pages/Transactions'
import Budgets from '@/pages/Budgets'
import Accounts from '@/pages/Accounts'
import ImportPage from '@/pages/ImportPage'
import Categories from '@/pages/Categories'
import Rules from '@/pages/Rules'
import Help from '@/pages/Help'

export default function App() {
  const ready = useDbStore(s => s.ready)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (ready) navigate('/dashboard', { replace: true })
  }, [ready])

  if (!ready) {
    if (location.pathname === '/help') {
      return (
        <Layout>
          <Routes>
            <Route path="/help" element={<Help />} />
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
        <Route path="/categories"   element={<Categories />} />
        <Route path="/rules"        element={<Rules />} />
        <Route path="/help"         element={<Help />} />
      </Routes>
    </Layout>
  )
}
