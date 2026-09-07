import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AdminAuthProvider } from './context/AdminAuthContext'
import ProtectedLayout from './components/ProtectedLayout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Analytics from './pages/Analytics'
import PersonalAccounts from './pages/PersonalAccounts'
import AgentAccounts from './pages/AgentAccounts'
import KycManagement from './pages/KycManagement'
import Transactions from './pages/Transactions'
import ClaimCodes from './pages/ClaimCodes'
import CashPickup from './pages/CashPickup'
import Wallets from './pages/Wallets'
import Settlement from './pages/Settlement'
import Commission from './pages/Commission'
import AccountChangeRequests from './pages/AccountChangeRequests'
import FraudMonitoring from './pages/FraudMonitoring'
import SecurityCenter from './pages/SecurityCenter'
import AuditLogs from './pages/AuditLogs'
import Notifications from './pages/Notifications'
import Support from './pages/Support'
import ApiMonitoring from './pages/ApiMonitoring'
import Administration from './pages/Administration'
import SystemSettings from './pages/SystemSettings'

export default function App() {
  return (
    <BrowserRouter>
      <AdminAuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/personal-accounts" element={<PersonalAccounts />} />
            <Route path="/agent-accounts" element={<AgentAccounts />} />
            <Route path="/kyc" element={<KycManagement />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/claim-codes" element={<ClaimCodes />} />
            <Route path="/cash-pickup" element={<CashPickup />} />
            <Route path="/wallets" element={<Wallets />} />
            <Route path="/settlement" element={<Settlement />} />
            <Route path="/commission" element={<Commission />} />
            <Route path="/account-change-requests" element={<AccountChangeRequests />} />
            <Route path="/fraud-monitoring" element={<FraudMonitoring />} />
            <Route path="/security-center" element={<SecurityCenter />} />
            <Route path="/audit-logs" element={<AuditLogs />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/support" element={<Support />} />
            <Route path="/api-monitoring" element={<ApiMonitoring />} />
            <Route path="/administration" element={<Administration />} />
            <Route path="/system-settings" element={<SystemSettings />} />
          </Route>
        </Routes>
      </AdminAuthProvider>
    </BrowserRouter>
  )
}
