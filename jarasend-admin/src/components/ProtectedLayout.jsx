import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAdminAuth } from '../context/AdminAuthContext'
import { canAccess } from '../lib/permissions'
import Sidebar from './Sidebar'

export default function ProtectedLayout() {
  const { status, adminProfile } = useAdminAuth()
  const location = useLocation()

  if (status === 'checking') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--slate)' }}>Loading…</p>
      </div>
    )
  }

  if (status !== 'admin') {
    return <Navigate to="/login" replace />
  }

  const allowed = canAccess(adminProfile.role, location.pathname)

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar />
      <div style={{ flex: 1, minWidth: 0 }}>
        {allowed ? (
          <Outlet />
        ) : (
          <div style={{ padding: 60, textAlign: 'center' }}>
            <h2 style={{ fontSize: 18, marginBottom: 8 }}>You don't have access to this section</h2>
            <p style={{ color: 'var(--slate)', fontSize: 13 }}>
              Your role ({adminProfile.role.replace('_', ' ')}) doesn't include this page. Contact a super admin if you need it.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
