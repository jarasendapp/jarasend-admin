import { useState } from 'react'
import StatusBadge from '../components/StatusBadge'

function formatNaira(n) {
  return '₦' + n.toLocaleString('en-NG')
}

// Sample data — same underlying records as Cash Pickup, but this page
// is purpose-built as a quick lookup tool for support staff verifying a
// single code, not a browsable table of everything.
const SAMPLE_CODES = {
  '482913': { receiverMobile: '0803 214 7765', amount: 25000, sentAt: '2026-08-08 09:14', status: 'Completed', agent: 'Chidi Okonkwo — Onitsha' },
  '117745': { receiverMobile: '0706 552 8801', amount: 8000, sentAt: '2026-08-08 10:31', status: 'Completed', agent: 'Amaka Eze — Ikeja' },
  '590214': { receiverMobile: '0912 340 6612', amount: 15000, sentAt: '2026-08-09 08:02', status: 'Pending', agent: '—' },
  '204558': { receiverMobile: '0703 991 4456', amount: 12000, sentAt: '2026-08-06 14:20', status: 'Unclaimed', agent: '—' },
  '845290': { receiverMobile: '0902 118 7734', amount: 20000, sentAt: '2026-07-28 11:10', status: 'Expired', agent: '—' },
  '763418': { receiverMobile: '0813 227 6650', amount: 18000, sentAt: '2026-08-02 10:00', status: 'Reversed', agent: '—' },
}

export default function ClaimCodes() {
  const [query, setQuery] = useState('')
  const [result, setResult] = useState(null)
  const [searched, setSearched] = useState(false)

  function handleSearch(e) {
    e.preventDefault()
    const code = query.trim()
    setResult(SAMPLE_CODES[code] ?? null)
    setSearched(true)
  }

  return (
    <div style={{ padding: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: 22, marginBottom: 4 }}>Claim codes</h1>
          <p style={{ color: 'var(--slate)', fontSize: 13, marginTop: 0 }}>
            Look up a single redemption code — useful when a customer or agent calls in about one.
          </p>
        </div>
        <span style={{ fontSize: 9.5, fontWeight: 700, background: 'var(--gold-tint)', color: '#854F0B', padding: '3px 9px', borderRadius: 20, marginTop: 4 }}>
          SAMPLE DATA
        </span>
      </div>

      <form onSubmit={handleSearch} style={{ display: 'flex', gap: 10, margin: '20px 0', maxWidth: 420 }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter 6-digit code…"
          style={{ flex: 1, padding: '11px 14px', borderRadius: 10, border: '1px solid var(--divider)', fontSize: 14, fontFamily: 'inherit' }}
        />
        <button
          type="submit"
          style={{ padding: '11px 22px', borderRadius: 10, border: 'none', background: 'var(--navy)', color: '#fff', fontWeight: 600, fontSize: 13.5 }}
        >
          Look up
        </button>
      </form>

      {searched && !result && (
        <div style={{ background: 'var(--error-tint)', color: 'var(--error)', borderRadius: 10, padding: '12px 14px', fontSize: 13, maxWidth: 420 }}>
          No record found for that code.
        </div>
      )}

      {result && (
        <div style={{ background: '#fff', border: '1px solid var(--divider)', borderRadius: 14, padding: 22, maxWidth: 420 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span className="mono" style={{ fontSize: 18, fontWeight: 700 }}>{query.trim()}</span>
            <StatusBadge status={result.status} />
          </div>
          <Row label="Receiver mobile" value={result.receiverMobile} mono />
          <Row label="Amount" value={formatNaira(result.amount)} mono />
          <Row label="Sent" value={result.sentAt} />
          <Row label="Assigned agent" value={result.agent} />
        </div>
      )}
    </div>
  )
}

function Row({ label, value, mono }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--divider)' }}>
      <span style={{ fontSize: 12.5, color: 'var(--slate)' }}>{label}</span>
      <span className={mono ? 'mono' : undefined} style={{ fontSize: 13, fontWeight: 600 }}>{value}</span>
    </div>
  )
}
