import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Inventory from './pages/Inventory'
import Customers from './pages/Customers'
import Challans from './pages/Challans'
import ChallanDetail from './pages/ChallanDetail'
import Returns from './pages/Returns'
import Invoices from './pages/Invoices'
import InvoiceDetail from './pages/InvoiceDetail'
import Settings from './pages/Settings'
import UsersPage from './pages/Users'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="customers" element={<Customers />} />
          <Route path="challans" element={<Challans />} />
          <Route path="challans/:id" element={<ChallanDetail />} />
          <Route path="returns" element={<Returns />} />
          <Route path="invoices" element={<Invoices />} />
          <Route path="invoices/:id" element={<InvoiceDetail />} />
          <Route path="settings" element={<Settings />} />
          <Route path="users" element={<UsersPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
