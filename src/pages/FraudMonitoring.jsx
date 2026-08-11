import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function FraudMonitoring() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const { data: alerts, error: alertsError } = await supabase
          .from('audit_logs')
          .select('id, user_id, detail, device_id, date_time')
          .eq('action', 'fraudAlert')
          .order('date_time', { ascending: false })
          .limit(300)
        if (alertsError) throw alertsError

        const userIds = [...new Set((alerts ?? []).map((a) => a.user_id))]
        const { data: profiles, error: profilesError } = userIds.length
          ? await supabase.from('profiles').select('id, full_name, surname, phone').in('id', userIds)
          : { data: [], error: null }
        if (profilesError) throw profilesError

        const profileById = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]))

        if (cancelled) return
        setRows((alerts ?? []).map((a) => ({ ...a, profile: profileById[a.user_id] })))
      } catch (err) {
        if (!cancelled) setError(err.message || 'Could not load fraud alerts.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [])

  return (
    <div style={{ padding: 28 }}>
      <h1 style={{ fontSize: 22, marginBottom: 4 }}>Fraud monitoring</h1>
      <p style={{ color: 'var(--slate)', fontSize: 13, marginTop: 0, marginBottom: 4 }}>
        {loading ? 'Loading…' : `${rows.length} flagged event${rows.length === 1 ? '' : 's'}`} — every alert the
        app's own pattern checks have raised (rapid repeat transfers, amounts near daily limits, invalid claim
        code attempts, and similar). These are real, not sample data.
      </p>

      {error && (
        <div style={{ background: 'var(--error-tint)', color: 'var(--error)', borderRadius: 10, padding: '12px 14px', fontSize: 13, margin: '16px 0' }}>
          {error}
        </div>
      )}

      <div style={{ background: '#fff', border: '1px solid var(--divider)', borderRadius: 14, overflow: 'hidden', marginTop: 18 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
          <thead>
            <tr style={{ background: '#FAFBFC', borderBottom: '1px solid var(--divider)' }}>
              {['Account', 'Phone', 'Reason flagged', 'Device', 'When'].map((h) => (
                <th key={h} style={{ textAlign: 'left', padding: '11px 16px', fontWeight: 700, color: 'var(--slate)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.3 }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} style={{ borderBottom: '1px solid var(--divider)' }}>
                <td style={{ padding: '12px 16px', fontWeight: 600 }}>{r.profile ? `${r.profile.full_name} ${r.profile.surname}` : '—'}</td>
                <td style={{ padding: '12px 16px' }} className="mono">{r.profile?.phone || '—'}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--error)', background: 'var(--error-tint)', padding: '3px 10px', borderRadius: 20 }}>
                    {r.detail}
                  </span>
                </td>
                <td style={{ padding: '12px 16px', color: 'var(--slate)', fontSize: 11 }}>{r.device_id || '—'}</td>
                <td style={{ padding: '12px 16px', color: 'var(--slate)' }}>{new Date(r.date_time).toLocaleString()}</td>
              </tr>
            ))}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: 32, textAlign: 'center', color: 'var(--slate)' }}>
                  No fraud alerts have been raised.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
