import { Routes, Route, Navigate } from 'react-router-dom'
import { useDbStore } from '@/store/dbStore'
import Layout from '@/components/layout/Layout'
import Welcome from '@/pages/Welcome'
import Dashboard from '@/pages/Dashboard'
import Transactions from '@/pages/Transactions'
import Budgets from '@/pages/Budgets'
import Accounts from '@/pages/Accounts'
import ImportPage from '@/pages/ImportPage'
import Categories from '@/pages/Categories'

export default function App() {
  const ready = useDbStore(s => s.ready)

  if (!ready) return <Welcome />

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
      </Routes>
    </Layout>
  )
}
