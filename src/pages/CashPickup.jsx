import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import StatusBadge from '../components/StatusBadge'
import TableToolbar from '../components/TableToolbar'

function formatNaira(n) {
  return '₦' + n.toLocaleString('en-NG')
}

// Uses the ACTUAL TxStatus values from the mobile app's entities.dart.
// Note: the redemption code itself is deliberately never shown here,
// even masked — the app only ever stores a SHA-256 hash of it, never
// the plaintext, and this table is a browsable list any support staff
// member can scroll through. Showing codes here (even if we somehow
// had them) would be a real security regression versus the app's own
// design, since a code is effectively a one-time credential for
// collecting someone's cash. Use the Claim Codes page instead, which
// verifies a single code someone reads out over the phone without ever
// displaying it.
const STATUS_MAP = {
  pendingCollection: 'Pending', collected: 'Completed', expired: 'Expired',
  cancelled: 'Reversed', failed: 'Reversed', reversed: 'Reversed',
}
const STATUS_FILTERS = ['All', 'Pending', 'Completed', 'Expired', 'Reversed']

export default function CashPickup() {
  const [pickups, setPickups] = useState([])
  const [profiles, setProfiles] = useState({})
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [filter, setFilter] = useState('All')
  const [search, setSearch] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    setLoadError('')
    try {
      // Cash pickup = transactions of type 'send', since that's the
      // flow where a receiver collects cash from an agent.
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('type', 'send')
        .order('date_time', { ascending: false })
        .limit(500)
      if (error) throw error
      setPickups((data ?? []).map((p) => ({ ...p, amount: Number(p.amount) })))

      const userIds = [...new Set((data ?? []).map((p) => p.agent_id).filter(Boolean))]
      if (userIds.length) {
        const { data: profileRows, error: profileError } = await supabase
          .from('profiles')
          .select('id, full_name, surname, business_name')
          .in('id', userIds)
        if (profileError) throw profileError
        setProfiles(Object.fromEntries((profileRows ?? []).map((p) => [p.id, `${p.full_name} ${p.surname}${p.business_name ? ` — ${p.business_name}` : ''}`])))
      }
    } catch (err) {
      setLoadError(err.message || 'Could not load cash pickup records.')
    } finally {
      setLoading(false)
    }
  }

  const withAgentNames = useMemo(
    () => pickups.map((p) => ({ ...p, agentName: p.agent_id ? (profiles[p.agent_id] || p.agent_id) : '—', statusLabel: STATUS_MAP[p.status] ?? p.status })),
    [pickups, profiles],
  )

  const counts = useMemo(() => {
    const c = { All: withAgentNames.length }
    for (const s of STATUS_FILTERS.slice(1)) {
      c[s] = withAgentNames.filter((p) => p.statusLabel === s).length
    }
    return c
  }, [withAgentNames])

  const filtered = useMemo(() => {
    return withAgentNames.filter((p) => {
      const matchesStatus = filter === 'All' || p.statusLabel === filter
      const q = search.trim().toLowerCase()
      const matchesSearch = !q || (p.counterparty_mobile || '').toLowerCase().includes(q) || p.reference.toLowerCase().includes(q)
      return matchesStatus && matchesSearch
    })
  }, [withAgentNames, filter, search])

  return (
    <div style={{ padding: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: 22, marginBottom: 4 }}>Cash pickup</h1>
          <p style={{ color: 'var(--slate)', fontSize: 13, marginTop: 0 }}>
            Every receiver, assigned agent, and pickup status. Redemption codes are never shown here — use Claim Codes to verify one.
          </p>
        </div>
        <TableToolbar
          filename="cash-pickup"
          rows={filtered}
          columns={[
            { label: 'Receiver mobile', value: (p) => p.counterparty_mobile },
            { label: 'Amount sent', value: (p) => p.amount },
            { label: 'Reference', value: (p) => p.reference },
            { label: 'Sent (date & time)', value: (p) => p.date_time },
            { label: 'Assigned agent', value: (p) => p.agentName },
            { label: 'Status', value: (p) => p.statusLabel },
          ]}
        />
      </div>

      {loadError && (
        <div style={{ padding: 14, background: '#FEF2F2', color: 'var(--error)', borderRadius: 10, fontSize: 13, margin: '16px 0' }}>{loadError}</div>
      )}

      <div style={{ display: 'flex', gap: 8, margin: '20px 0 18px', flexWrap: 'wrap' }}>
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            style={{
              fontSize: 12, fontWeight: 600, padding: '7px 14px', borderRadius: 20,
              border: `1px solid ${filter === s ? 'var(--navy)' : 'var(--divider)'}`,
              background: filter === s ? 'var(--navy)' : '#fff',
              color: filter === s ? '#fff' : 'var(--text)',
            }}
          >
            {s} <span style={{ opacity: 0.7 }}>({counts[s] ?? 0})</span>
          </button>
        ))}
        <input
          type="text"
          placeholder="Search mobile number or reference…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            marginLeft: 'auto', minWidth: 260, padding: '8px 14px', borderRadius: 20,
            border: '1px solid var(--divider)', fontSize: 12.5, fontFamily: 'inherit',
          }}
        />
      </div>

      <div style={{ background: '#fff', border: '1px solid var(--divider)', borderRadius: 14, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
          <thead>
            <tr style={{ background: '#FAFBFC', borderBottom: '1px solid var(--divider)' }}>
              {['Receiver mobile', 'Amount sent', 'Reference', 'Sent (date & time)', 'Assigned agent', 'Status'].map((h) => (
                <th key={h} style={{ textAlign: 'left', padding: '11px 16px', fontWeight: 700, color: 'var(--slate)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.3 }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ padding: 32, textAlign: 'center', color: 'var(--slate)' }}>Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: 32, textAlign: 'center', color: 'var(--slate)' }}>No records match this filter.</td></tr>
            ) : (
              filtered.map((p) => (
                <tr key={p.reference} style={{ borderBottom: '1px solid var(--divider)' }}>
                  <td style={{ padding: '12px 16px' }} className="mono">{p.counterparty_mobile || '—'}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 600 }} className="mono">{formatNaira(p.amount)}</td>
                  <td style={{ padding: '12px 16px' }} className="mono">{p.reference}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--slate)' }}>{new Date(p.date_time).toLocaleString()}</td>
                  <td style={{ padding: '12px 16px' }}>{p.agentName}</td>
                  <td style={{ padding: '12px 16px' }}><StatusBadge status={p.statusLabel} /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
