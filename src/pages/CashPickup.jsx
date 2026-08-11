import { useMemo, useState } from 'react'
import StatusBadge from '../components/StatusBadge'

// Sample data — cash pickup/transaction records are not yet centralized
// in Supabase (they live on individual devices), so this page can't pull
// real data yet. Same "SAMPLE DATA" convention as the Dashboard's Money
// section. Structure matches the real transaction model exactly, so
// switching to live data later is a data-source swap, not a redesign.
const SAMPLE_PICKUPS = [
  { id: 1, receiverMobile: '0803 214 7765', amount: 25000, sentAt: '2026-08-08 09:14', code: '482913', agent: 'Chidi Okonkwo — Onitsha', status: 'Completed', statusAt: '2026-08-08 11:02' },
  { id: 2, receiverMobile: '0706 552 8801', amount: 8000, sentAt: '2026-08-08 10:31', code: '117745', agent: 'Amaka Eze — Ikeja', status: 'Completed', statusAt: '2026-08-08 10:58' },
  { id: 3, receiverMobile: '0912 340 6612', amount: 15000, sentAt: '2026-08-09 08:02', code: '590214', agent: '—', status: 'Pending', statusAt: '—' },
  { id: 4, receiverMobile: '0814 776 2290', amount: 40000, sentAt: '2026-08-09 09:47', code: '338871', agent: '—', status: 'Pending', statusAt: '—' },
  { id: 5, receiverMobile: '0703 991 4456', amount: 12000, sentAt: '2026-08-06 14:20', code: '204558', agent: '—', status: 'Unclaimed', statusAt: '2026-08-08 14:20' },
  { id: 6, receiverMobile: '0815 662 3390', amount: 5000, sentAt: '2026-08-05 16:45', code: '671023', agent: '—', status: 'Unclaimed', statusAt: '2026-08-07 16:45' },
  { id: 7, receiverMobile: '0902 118 7734', amount: 20000, sentAt: '2026-07-28 11:10', code: '845290', agent: '—', status: 'Expired', statusAt: '2026-08-04 11:10' },
  { id: 8, receiverMobile: '0705 340 9981', amount: 7500, sentAt: '2026-07-25 13:55', code: '129046', agent: '—', status: 'Expired', statusAt: '2026-08-01 13:55' },
  { id: 9, receiverMobile: '0813 227 6650', amount: 18000, sentAt: '2026-08-02 10:00', code: '763418', agent: '—', status: 'Reversed', statusAt: '2026-08-09 10:00' },
  { id: 10, receiverMobile: '0906 774 1123', amount: 30000, sentAt: '2026-08-01 15:30', code: '304187', agent: '—', status: 'Reversed', statusAt: '2026-08-08 15:30' },
  { id: 11, receiverMobile: '0708 552 0091', amount: 9500, sentAt: '2026-08-09 12:15', code: '956102', agent: 'Ibrahim Musa — Kano', status: 'Completed', statusAt: '2026-08-09 13:40' },
  { id: 12, receiverMobile: '0817 664 5523', amount: 22000, sentAt: '2026-08-09 13:02', code: '412873', agent: '—', status: 'Pending', statusAt: '—' },
]

const STATUS_FILTERS = ['All', 'Pending', 'Completed', 'Unclaimed', 'Expired', 'Reversed']

function formatNaira(n) {
  return '₦' + n.toLocaleString('en-NG')
}

export default function CashPickup() {
  const [filter, setFilter] = useState('All')
  const [search, setSearch] = useState('')

  const counts = useMemo(() => {
    const c = { All: SAMPLE_PICKUPS.length }
    for (const s of STATUS_FILTERS.slice(1)) {
      c[s] = SAMPLE_PICKUPS.filter((p) => p.status === s).length
    }
    return c
  }, [])

  const filtered = useMemo(() => {
    return SAMPLE_PICKUPS.filter((p) => {
      const matchesStatus = filter === 'All' || p.status === filter
      const q = search.trim().toLowerCase()
      const matchesSearch = !q || p.receiverMobile.toLowerCase().includes(q) || p.code.includes(q)
      return matchesStatus && matchesSearch
    })
  }, [filter, search])

  return (
    <div style={{ padding: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: 22, marginBottom: 4 }}>Cash pickup</h1>
          <p style={{ color: 'var(--slate)', fontSize: 13, marginTop: 0 }}>
            Every receiver, redemption code, assigned agent, and pickup status.
          </p>
        </div>
        <span style={{ fontSize: 9.5, fontWeight: 700, background: 'var(--gold-tint)', color: '#854F0B', padding: '3px 9px', borderRadius: 20, marginTop: 4 }}>
          SAMPLE DATA
        </span>
      </div>

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
            {s} <span style={{ opacity: 0.7 }}>({counts[s]})</span>
          </button>
        ))}
        <input
          type="text"
          placeholder="Search mobile number or redemption code…"
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
              {['Receiver mobile', 'Amount sent', 'Sent (date & time)', 'Redemption code', 'Assigned agent', 'Status', 'Status timestamp'].map((h) => (
                <th key={h} style={{ textAlign: 'left', padding: '11px 16px', fontWeight: 700, color: 'var(--slate)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.3 }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} style={{ borderBottom: '1px solid var(--divider)' }}>
                <td style={{ padding: '12px 16px' }} className="mono">{p.receiverMobile}</td>
                <td style={{ padding: '12px 16px', fontWeight: 600 }} className="mono">{formatNaira(p.amount)}</td>
                <td style={{ padding: '12px 16px', color: 'var(--slate)' }}>{p.sentAt}</td>
                <td style={{ padding: '12px 16px' }} className="mono">{p.code}</td>
                <td style={{ padding: '12px 16px' }}>{p.agent}</td>
                <td style={{ padding: '12px 16px' }}><StatusBadge status={p.status} /></td>
                <td style={{ padding: '12px 16px', color: 'var(--slate)' }}>{p.statusAt}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: 32, textAlign: 'center', color: 'var(--slate)' }}>
                  No records match this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
