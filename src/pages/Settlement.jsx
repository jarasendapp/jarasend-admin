import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import TableToolbar from '../components/TableToolbar'

function formatNaira(n) {
  return '₦' + n.toLocaleString('en-NG')
}

// Reframed from "owed vs settled" (the original sample concept) to
// match how the app actually works: an agent's float is credited the
// INSTANT they complete a pickup — there's no separate, delayed
// settlement step to reconcile against, so an "owed" figure distinct
// from "settled" doesn't genuinely exist in this offline-simulation
// model. What's real and worth showing instead: total ever credited
// to an agent (from completed pickups), total they've already
// withdrawn to their bank account, and their current float — money
// they've earned but not yet cashed out, which is the honest
// equivalent of "outstanding."
export default function Settlement() {
  const [agents, setAgents] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    setLoadError('')
    try {
      const { data, error } = await supabase.from('agent_accounts').select('*')
      if (error) throw error

      const userIds = (data ?? []).map((a) => a.user_id)
      const { data: profileRows, error: profileError } = userIds.length
        ? await supabase.from('profiles').select('id, full_name, surname, business_town').in('id', userIds)
        : { data: [], error: null }
      if (profileError) throw profileError
      const profiles = Object.fromEntries((profileRows ?? []).map((p) => [p.id, p]))

      setAgents((data ?? []).map((a) => ({
        userId: a.user_id,
        agent: profiles[a.user_id] ? `${profiles[a.user_id].full_name} ${profiles[a.user_id].surname}` : a.user_id,
        location: profiles[a.user_id]?.business_town || '—',
        credited: Number(a.total_cash_received),
        withdrawn: Number(a.total_cash_withdrawn),
        float: Number(a.float),
      })))
    } catch (err) {
      setLoadError(err.message || 'Could not load settlement data.')
    } finally {
      setLoading(false)
    }
  }

  const totalCredited = agents.reduce((s, a) => s + a.credited, 0)
  const totalWithdrawn = agents.reduce((s, a) => s + a.withdrawn, 0)
  const totalFloat = agents.reduce((s, a) => s + a.float, 0)

  return (
    <div style={{ padding: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: 22, marginBottom: 4 }}>Settlement</h1>
          <p style={{ color: 'var(--slate)', fontSize: 13, marginTop: 0 }}>
            What's been credited to agents from completed pickups, what they've withdrawn, and what's still sitting as float.
          </p>
        </div>
        <TableToolbar
          filename="settlement"
          rows={agents}
          columns={[
            { label: 'Agent', value: (a) => a.agent },
            { label: 'Location', value: (a) => a.location },
            { label: 'Total credited', value: (a) => a.credited },
            { label: 'Total withdrawn', value: (a) => a.withdrawn },
            { label: 'Current float', value: (a) => a.float },
          ]}
        />
      </div>

      {loadError && (
        <div style={{ padding: 14, background: '#FEF2F2', color: 'var(--error)', borderRadius: 10, fontSize: 13, margin: '16px 0' }}>{loadError}</div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, margin: '20px 0' }}>
        {[
          { label: 'Total credited to agents', value: totalCredited },
          { label: 'Total withdrawn by agents', value: totalWithdrawn },
          { label: 'Total float outstanding', value: totalFloat },
        ].map((k) => (
          <div key={k.label} style={{ background: '#fff', border: '1px solid var(--divider)', borderRadius: 14, padding: 16 }}>
            <div style={{ fontSize: 11.5, color: 'var(--slate)', marginBottom: 6 }}>{k.label}</div>
            <div className="mono" style={{ fontSize: 19, fontWeight: 700, color: 'var(--navy)' }}>{formatNaira(k.value)}</div>
          </div>
        ))}
      </div>

      <div style={{ background: '#fff', border: '1px solid var(--divider)', borderRadius: 14, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
          <thead>
            <tr style={{ background: '#FAFBFC', borderBottom: '1px solid var(--divider)' }}>
              {['Agent', 'Location', 'Total credited', 'Total withdrawn', 'Current float'].map((h) => (
                <th key={h} style={{ textAlign: 'left', padding: '11px 16px', fontWeight: 700, color: 'var(--slate)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.3 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ padding: 32, textAlign: 'center', color: 'var(--slate)' }}>Loading…</td></tr>
            ) : agents.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: 32, textAlign: 'center', color: 'var(--slate)' }}>No agent accounts yet.</td></tr>
            ) : (
              agents.map((a) => (
                <tr key={a.userId} style={{ borderBottom: '1px solid var(--divider)' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 600 }}>{a.agent}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--slate)' }}>{a.location}</td>
                  <td style={{ padding: '12px 16px' }} className="mono">{formatNaira(a.credited)}</td>
                  <td style={{ padding: '12px 16px' }} className="mono">{formatNaira(a.withdrawn)}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 600 }} className="mono">{formatNaira(a.float)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
