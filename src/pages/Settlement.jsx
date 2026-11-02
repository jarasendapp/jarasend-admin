import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import TableToolbar from '../components/TableToolbar'

function formatNaira(kobo) {
  return '₦' + (Number(kobo) / 100).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// Shows what has been credited to each agent from completed pickups
// (cash_received_kobo) and what they have withdrawn (withdrawn_kobo).
// Amounts come from the admin_agent_wallets RPC and are in kobo.
export default function Settlement() {
  const [agents, setAgents] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    setLoadError('')
    try {
      const { data, error } = await supabase.rpc('admin_agent_wallets')
      if (error) throw error
      setAgents((data ?? []).map((a) => ({
        userId: a.user_id,
        agent: a.business_name || a.full_name || a.user_id,
        location: a.location || '—',
        credited: Number(a.cash_received_kobo) || 0,
        withdrawn: Number(a.withdrawn_kobo) || 0,
      })))
    } catch (err) {
      setLoadError(err.message || 'Could not load settlement data.')
    } finally {
      setLoading(false)
    }
  }

  const totalCredited = agents.reduce((s, a) => s + a.credited, 0)
  const totalWithdrawn = agents.reduce((s, a) => s + a.withdrawn, 0)

  return (
    <div style={{ padding: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: 22, marginBottom: 4 }}>Settlement</h1>
          <p style={{ color: 'var(--slate)', fontSize: 13, marginTop: 0 }}>
            What's been credited to agents from completed pickups, and what they've withdrawn.
          </p>
        </div>
        <TableToolbar
          filename="settlement"
          rows={agents}
          columns={[
            { label: 'Agent', value: (a) => a.agent },
            { label: 'Location', value: (a) => a.location },
            { label: 'Total credited', value: (a) => a.credited / 100 },
            { label: 'Total withdrawn', value: (a) => a.withdrawn / 100 },
          ]}
        />
      </div>

      {loadError && (
        <div style={{ padding: 14, background: '#FEF2F2', color: 'var(--error)', borderRadius: 10, fontSize: 13, margin: '16px 0' }}>{loadError}</div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14, margin: '20px 0' }}>
        {[
          { label: 'Total credited to agents', value: totalCredited },
          { label: 'Total withdrawn by agents', value: totalWithdrawn },
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
              {['Agent', 'Location', 'Total credited', 'Total withdrawn'].map((h) => (
                <th key={h} style={{ textAlign: 'left', padding: '11px 16px', fontWeight: 700, color: 'var(--slate)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.3 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} style={{ padding: 32, textAlign: 'center', color: 'var(--slate)' }}>Loading…</td></tr>
            ) : agents.length === 0 ? (
              <tr><td colSpan={4} style={{ padding: 32, textAlign: 'center', color: 'var(--slate)' }}>No agent accounts yet.</td></tr>
            ) : (
              agents.map((a) => (
                <tr key={a.userId} style={{ borderBottom: '1px solid var(--divider)' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 600 }}>{a.agent}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--slate)' }}>{a.location}</td>
                  <td style={{ padding: '12px 16px' }} className="mono">{formatNaira(a.credited)}</td>
                  <td style={{ padding: '12px 16px' }} className="mono">{formatNaira(a.withdrawn)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
