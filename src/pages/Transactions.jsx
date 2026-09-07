import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import StatusBadge from '../components/StatusBadge'
import TableToolbar from '../components/TableToolbar'
import PeriodDropdown, { filterByPeriod } from '../components/PeriodDropdown'

function formatNaira(n) {
  return '₦' + n.toLocaleString('en-NG')
}

// Uses the ACTUAL TxType and TxStatus values from the mobile app's
// entities.dart (send, receive, cashPickup, withdrawal, onboardingFee /
// pendingCollection, collected, expired, cancelled, failed, reversed) —
// not invented categories. Live data, mirrored from the app's own
// offline transaction repository into the `transactions` table.
const TYPE_LABELS = { send: 'Send', receive: 'Receive', cashPickup: 'Cash pickup', withdrawal: 'Withdrawal', onboardingFee: 'Onboarding fee' }
const STATUS_MAP = {
  pendingCollection: 'Pending', collected: 'Completed', expired: 'Expired',
  cancelled: 'Reversed', failed: 'Reversed', reversed: 'Reversed',
}

export default function Transactions() {
  const [transactions, setTransactions] = useState([])
  const [profiles, setProfiles] = useState({})
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [typeFilter, setTypeFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [period, setPeriod] = useState('All time')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    setLoadError('')
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('date_time', { ascending: false })
        .limit(500)
      if (error) throw error
      setTransactions((data ?? []).map((t) => ({ ...t, amount: Number(t.amount), fee: Number(t.fee) })))

      const userIds = [...new Set((data ?? []).map((t) => t.user_id))]
      if (userIds.length) {
        const { data: profileRows, error: profileError } = await supabase
          .from('profiles')
          .select('id, full_name, surname')
          .in('id', userIds)
        if (profileError) throw profileError
        setProfiles(Object.fromEntries((profileRows ?? []).map((p) => [p.id, `${p.full_name} ${p.surname}`])))
      }
    } catch (err) {
      setLoadError(err.message || 'Could not load transactions.')
    } finally {
      setLoading(false)
    }
  }

  const withNames = useMemo(
    () => transactions.map((t) => ({ ...t, name: profiles[t.user_id] || t.user_id })),
    [transactions, profiles],
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const base = withNames.filter((t) => {
      const matchesType = typeFilter === 'All' || t.type === typeFilter
      const matchesSearch = !q || t.name.toLowerCase().includes(q) || t.reference.toLowerCase().includes(q)
      return matchesType && matchesSearch
    })
    return filterByPeriod(base, period, (t) => new Date(t.date_time))
  }, [withNames, typeFilter, search, period])

  return (
    <div style={{ padding: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: 22, marginBottom: 4 }}>Transactions</h1>
          <p style={{ color: 'var(--slate)', fontSize: 13, marginTop: 0 }}>Every send, receive, pickup, withdrawal, and onboarding fee.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <TableToolbar
            filename="transactions"
            rows={filtered}
            columns={[
              { label: 'Reference', value: (t) => t.reference },
              { label: 'Account', value: (t) => t.name },
              { label: 'Type', value: (t) => TYPE_LABELS[t.type] ?? t.type },
              { label: 'Amount', value: (t) => t.amount },
              { label: 'Fee', value: (t) => t.fee },
              { label: 'Status', value: (t) => STATUS_MAP[t.status] ?? t.status },
              { label: 'Date', value: (t) => t.date_time },
            ]}
          />
        </div>
      </div>

      {loadError && (
        <div style={{ padding: 14, background: '#FEF2F2', color: 'var(--error)', borderRadius: 10, fontSize: 13, margin: '16px 0' }}>{loadError}</div>
      )}

      <div style={{ display: 'flex', gap: 8, margin: '20px 0 18px', flexWrap: 'wrap' }}>
        {['All', ...Object.keys(TYPE_LABELS)].map((t) => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            style={{
              fontSize: 12, fontWeight: 600, padding: '7px 14px', borderRadius: 20,
              border: `1px solid ${typeFilter === t ? 'var(--navy)' : 'var(--divider)'}`,
              background: typeFilter === t ? 'var(--navy)' : '#fff',
              color: typeFilter === t ? '#fff' : 'var(--text)',
            }}
          >
            {t === 'All' ? 'All' : TYPE_LABELS[t]}
          </button>
        ))}
        <PeriodDropdown value={period} onChange={setPeriod} />
        <input
          type="text"
          placeholder="Search name or reference…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ marginLeft: 'auto', minWidth: 240, padding: '8px 14px', borderRadius: 20, border: '1px solid var(--divider)', fontSize: 12.5, fontFamily: 'inherit' }}
        />
      </div>

      <div style={{ background: '#fff', border: '1px solid var(--divider)', borderRadius: 14, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
          <thead>
            <tr style={{ background: '#FAFBFC', borderBottom: '1px solid var(--divider)' }}>
              {['Reference', 'Account', 'Type', 'Amount', 'Fee', 'Status', 'Date'].map((h) => (
                <th key={h} style={{ textAlign: 'left', padding: '11px 16px', fontWeight: 700, color: 'var(--slate)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.3 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ padding: 32, textAlign: 'center', color: 'var(--slate)' }}>Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: 32, textAlign: 'center', color: 'var(--slate)' }}>No transactions match this filter.</td></tr>
            ) : (
              filtered.map((t) => (
                <tr key={t.reference} style={{ borderBottom: '1px solid var(--divider)' }}>
                  <td style={{ padding: '12px 16px' }} className="mono">{t.reference}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 600 }}>{t.name}</td>
                  <td style={{ padding: '12px 16px' }}>{TYPE_LABELS[t.type] ?? t.type}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 600 }} className="mono">{formatNaira(t.amount)}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--slate)' }} className="mono">{formatNaira(t.fee)}</td>
                  <td style={{ padding: '12px 16px' }}><StatusBadge status={STATUS_MAP[t.status] ?? t.status} /></td>
                  <td style={{ padding: '12px 16px', color: 'var(--slate)' }}>{new Date(t.date_time).toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
