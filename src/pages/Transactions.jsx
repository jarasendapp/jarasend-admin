import { useMemo, useState } from 'react'
import StatusBadge from '../components/StatusBadge'
import TableToolbar from '../components/TableToolbar'
import PeriodDropdown, { filterByPeriod } from '../components/PeriodDropdown'

function formatNaira(n) {
  return '₦' + n.toLocaleString('en-NG')
}

// Sample data, using the ACTUAL TxType and TxStatus values from the
// mobile app's entities.dart (send, receive, cashPickup, withdrawal /
// pendingCollection, collected, expired, cancelled, failed, reversed) —
// not invented categories. Only the individual records are illustrative;
// actual transaction volume needs centralized data, still offline today.
const TYPE_LABELS = { send: 'Send', receive: 'Receive', cashPickup: 'Cash pickup', withdrawal: 'Withdrawal' }
const STATUS_MAP = {
  pendingCollection: 'Pending', collected: 'Completed', expired: 'Expired',
  cancelled: 'Reversed', failed: 'Reversed', reversed: 'Reversed',
}

const SAMPLE_TX = [
  { ref: 'TX-88213', name: 'Blessing Nwachukwu', type: 'send', amount: 25000, fee: 250, status: 'collected', date: '2026-08-08 09:14' },
  { ref: 'TX-88214', name: 'Emeka Obi', type: 'send', amount: 8000, fee: 80, status: 'collected', date: '2026-08-08 10:31' },
  { ref: 'TX-88215', name: 'Fatima Bello', type: 'send', amount: 15000, fee: 150, status: 'pendingCollection', date: '2026-08-09 08:02' },
  { ref: 'TX-88216', name: 'Chidi Okonkwo', type: 'withdrawal', amount: 200000, fee: 0, status: 'collected', date: '2026-08-09 09:20' },
  { ref: 'TX-88217', name: 'Segun Adekunle', type: 'send', amount: 40000, fee: 400, status: 'expired', date: '2026-08-05 09:47' },
  { ref: 'TX-88218', name: 'Amaka Eze', type: 'withdrawal', amount: 150000, fee: 0, status: 'collected', date: '2026-08-08 11:15' },
  { ref: 'TX-88219', name: 'Ibrahim Musa', type: 'send', amount: 18000, fee: 180, status: 'reversed', date: '2026-08-02 10:00' },
]

export default function Transactions() {
  const [typeFilter, setTypeFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [period, setPeriod] = useState('All time')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const base = SAMPLE_TX.filter((t) => {
      const matchesType = typeFilter === 'All' || t.type === typeFilter
      const matchesSearch = !q || t.name.toLowerCase().includes(q) || t.ref.toLowerCase().includes(q)
      return matchesType && matchesSearch
    })
    // Sample dates are 'YYYY-MM-DD HH:MM' strings - normalize to ISO
    // (replace the space with 'T') for reliable cross-browser parsing.
    return filterByPeriod(base, period, (t) => new Date(t.date.replace(' ', 'T')))
  }, [typeFilter, search, period])

  return (
    <div style={{ padding: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: 22, marginBottom: 4 }}>Transactions</h1>
          <p style={{ color: 'var(--slate)', fontSize: 13, marginTop: 0 }}>Every send, receive, pickup, and withdrawal.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className="no-print" style={{ fontSize: 9.5, fontWeight: 700, background: 'var(--gold-tint)', color: '#854F0B', padding: '3px 9px', borderRadius: 20 }}>
            SAMPLE DATA
          </span>
          <TableToolbar
            filename="transactions"
            rows={filtered}
            columns={[
              { label: 'Reference', value: (t) => t.ref },
              { label: 'Account', value: (t) => t.name },
              { label: 'Type', value: (t) => TYPE_LABELS[t.type] },
              { label: 'Amount', value: (t) => t.amount },
              { label: 'Fee', value: (t) => t.fee },
              { label: 'Status', value: (t) => STATUS_MAP[t.status] },
              { label: 'Date', value: (t) => t.date },
            ]}
          />
        </div>
      </div>

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
            {filtered.map((t) => (
              <tr key={t.ref} style={{ borderBottom: '1px solid var(--divider)' }}>
                <td style={{ padding: '12px 16px' }} className="mono">{t.ref}</td>
                <td style={{ padding: '12px 16px', fontWeight: 600 }}>{t.name}</td>
                <td style={{ padding: '12px 16px' }}>{TYPE_LABELS[t.type]}</td>
                <td style={{ padding: '12px 16px', fontWeight: 600 }} className="mono">{formatNaira(t.amount)}</td>
                <td style={{ padding: '12px 16px', color: 'var(--slate)' }} className="mono">{formatNaira(t.fee)}</td>
                <td style={{ padding: '12px 16px' }}><StatusBadge status={STATUS_MAP[t.status]} /></td>
                <td style={{ padding: '12px 16px', color: 'var(--slate)' }}>{t.date}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: 32, textAlign: 'center', color: 'var(--slate)' }}>No transactions match this filter.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
