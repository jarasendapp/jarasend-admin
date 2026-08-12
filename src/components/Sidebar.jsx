import { NavLink } from 'react-router-dom'
import { useAdminAuth } from '../context/AdminAuthContext'
import { canAccess } from '../lib/permissions'

const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      { to: '/', label: 'Dashboard' },
      { to: '/analytics', label: 'Analytics' },
    ],
  },
  {
    label: 'People',
    items: [
      { to: '/personal-accounts', label: 'Personal accounts' },
      { to: '/agent-accounts', label: 'Agent accounts' },
      { to: '/kyc', label: 'KYC management' },
    ],
  },
  {
    label: 'Money',
    items: [
      { to: '/transactions', label: 'Transactions' },
      { to: '/claim-codes', label: 'Claim codes' },
      { to: '/cash-pickup', label: 'Cash pickup' },
      { to: '/wallets', label: 'Wallets' },
      { to: '/settlement', label: 'Settlement' },
      { to: '/commission', label: 'Commission' },
    ],
  },
  {
    label: 'Risk',
    items: [
      { to: '/fraud-monitoring', label: 'Fraud monitoring' },
      { to: '/security-center', label: 'Security center' },
      { to: '/audit-logs', label: 'Audit logs' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { to: '/notifications', label: 'Notifications' },
      { to: '/support', label: 'Support' },
      { to: '/api-monitoring', label: 'API monitoring' },
    ],
  },
  {
    label: 'Platform',
    items: [
      { to: '/administration', label: 'Administration' },
      { to: '/system-settings', label: 'System settings' },
    ],
  },
]

export default function Sidebar() {
  const { adminProfile, logout } = useAdminAuth()

  return (
    <div className="no-print" style={{
      width: 250, background: 'var(--navy)', flexShrink: 0, padding: '20px 14px',
      display: 'flex', flexDirection: 'column', position: 'sticky', top: 0,
      height: '100vh', overflowY: 'auto',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '0 6px 22px' }}>
        <img src="/jarasend_icon.png" alt="" style={{ width: 26, height: 26, borderRadius: 7, flexShrink: 0 }} />
        <span style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600, fontSize: 17, color: '#fff' }}>
          Jara<span style={{ color: 'var(--gold)' }}>Send</span>
        </span>
      </div>

      {NAV_GROUPS.map((group) => {
        const visibleItems = group.items.filter((item) => canAccess(adminProfile?.role, item.to))
        if (visibleItems.length === 0) return null
        return (
          <div key={group.label} style={{ marginBottom: 18 }}>
            <div style={{
              fontSize: 10.5, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.35)', padding: '0 10px 8px',
            }}>
              {group.label}
            </div>
            {visibleItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                style={({ isActive }) => ({
                  display: 'block', padding: '9px 10px', borderRadius: 9, fontSize: 13,
                  fontWeight: 500, marginBottom: 2, color: isActive ? '#fff' : 'rgba(255,255,255,0.65)',
                  background: isActive ? 'var(--green)' : 'transparent',
                })}
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        )
      })}

      <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 10px 10px' }}>
          <div style={{
            width: 30, height: 30, borderRadius: 9, background: 'var(--green-tint)',
            color: 'var(--green-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: 12, flexShrink: 0,
          }}>
            {adminProfile?.full_name?.[0]?.toUpperCase() ?? 'A'}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ color: '#fff', fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {adminProfile?.full_name ?? 'Admin'}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, textTransform: 'capitalize' }}>
              {adminProfile?.role?.replace('_', ' ') ?? ''}
            </div>
          </div>
        </div>
        <button
          onClick={logout}
          style={{
            width: '100%', textAlign: 'left', padding: '9px 10px', borderRadius: 9,
            background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.65)',
            fontSize: 13, fontWeight: 500,
          }}
        >
          Logout
        </button>
      </div>
    </div>
  )
}
