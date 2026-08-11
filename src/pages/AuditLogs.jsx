import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

const ACTION_LABELS = {
  login: 'Login', logout: 'Logout', registration: 'Registration', otpVerified: 'OTP verified',
  pinChanged: 'PIN changed', passwordChanged: 'Password changed', kycSubmitted: 'KYC submitted',
  kycStatusChanged: 'KYC status changed', moneySent: 'Money sent', payoutAuthorized: 'Payout authorized',
  withdrawal: 'Withdrawal', fraudAlert: 'Fraud alert', biometricEnabled: 'Biometric enabled',
  biometricLogin: 'Biometric login', sessionLocked: 'Session locked', verificationAttempt: 'Verification attempt',
  transactionReversed: 'Transaction reversed',
}

export default function AuditLogs() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('All')

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const { data: logs, error: logsError } = await supabase
          .from('audit_logs')
          .select('id, user_id, action, detail, device_id, date_time')
          .order('date_time', { ascending: false })
          .limit(500)
        if (logsError) throw logsError

        const userIds = [...new Set((logs ?? []).map((l) => l.user_id))]
        const { data: profiles, error: profilesError } = userIds.length
          ? await supabase.from('profiles').select('id, full_name, surname, phone').in('id', userIds)
          : { data: [], error: null }
        if (profilesError) throw profilesError

        const profileById = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]))

        if (cancelled) return
        setRows((logs ?? []).map((l) => ({ ...l, profile: profileById[l.user_id] })))
      } catch (err) {
        if (!cancelled) setError(err.message || 'Could not load audit logs.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter((r) => {
      const matchesAction = actionFilter === 'All' || r.action === actionFilter
      const matchesSearch = !q ||
        r.profile?.full_name?.toLowerCase().includes(q) ||
        r.profile?.phone?.toLowerCase().includes(q) ||
        r.detail?.toLowerCase().includes(q)
      return matchesAction && matchesSearch
    })
  }, [rows, search, actionFilter])

  return (
    <div style={{ padding: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: 22, marginBottom: 4 }}>Audit logs</h1>
          <p style={{ color: 'var(--slate)', fontSize: 13, marginTop: 0 }}>
            {loading ? 'Loading…' : `Most recent ${rows.length} actions across every account`}
          </p>
        </div>
        <input
          type="text"
          placeholder="Search name, phone, or detail…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            minWidth: 260, padding: '8px 14px', borderRadius: 20,
            border: '1px solid var(--divider)', fontSize: 12.5, fontFamily: 'inherit',
          }}
        />
      </div>

      <div style={{ margin: '16px 0' }}>
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 10, border: '1px solid var(--divider)', fontSize: 12.5, fontFamily: 'inherit' }}
        >
          <option value="All">All action types</option>
          {Object.entries(ACTION_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      {error && (
        <div style={{ background: 'var(--error-tint)', color: 'var(--error)', borderRadius: 10, padding: '12px 14px', fontSize: 13, marginBottom: 16 }}>
          {error}
        </div>
      )}

      <div style={{ background: '#fff', border: '1px solid var(--divider)', borderRadius: 14, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
          <thead>
            <tr style={{ background: '#FAFBFC', borderBottom: '1px solid var(--divider)' }}>
              {['User', 'Phone', 'Action', 'Detail', 'Device', 'When'].map((h) => (
                <th key={h} style={{ textAlign: 'left', padding: '11px 16px', fontWeight: 700, color: 'var(--slate)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.3 }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} style={{ borderBottom: '1px solid var(--divider)' }}>
                <td style={{ padding: '12px 16px', fontWeight: 600 }}>{r.profile ? `${r.profile.full_name} ${r.profile.surname}` : '—'}</td>
                <td style={{ padding: '12px 16px' }} className="mono">{r.profile?.phone || '—'}</td>
                <td style={{ padding: '12px 16px' }}>{ACTION_LABELS[r.action] ?? r.action}</td>
                <td style={{ padding: '12px 16px', color: 'var(--slate)' }}>{r.detail}</td>
                <td style={{ padding: '12px 16px', color: 'var(--slate)', fontSize: 11 }}>{r.device_id || '—'}</td>
                <td style={{ padding: '12px 16px', color: 'var(--slate)' }}>{new Date(r.date_time).toLocaleString()}</td>
              </tr>
            ))}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: 32, textAlign: 'center', color: 'var(--slate)' }}>
                  No audit log entries match this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
