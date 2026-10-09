import { callAdminApi } from '../lib/adminApi'
import { useState } from 'react'
import { supabase } from '../lib/supabase'
import StatusBadge from '../components/StatusBadge'

function formatNaira(kobo) {
  return '₦' + (Number(kobo) / 100).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtDateTime(v) {
  return v ? new Date(v).toLocaleString() : '—'
}

const STATUS_MAP = {
  held: 'Pending', released: 'Completed', refunded: 'Reversed',
  pending_hold: 'Processing', releasing: 'Processing', refunding: 'Processing',
  failed: 'Failed',
}

const inputStyle = { padding: '11px 14px', borderRadius: 10, border: '1px solid var(--divider)', fontSize: 14, fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' }
const labelStyle = { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--slate)', marginBottom: 5 }

export default function ClaimCodes() {
  const [code, setCode] = useState('')
  const [phone, setPhone] = useState('')
  const [results, setResults] = useState([])
  const [codeChecked, setCodeChecked] = useState(false)
  const [searched, setSearched] = useState(false)
  const [searching, setSearching] = useState(false)
  const [message, setMessage] = useState('')

  async function handleSearch(e) {
    e.preventDefault()
    const c = code.trim()
    const p = phone.trim()
    setMessage('')
    if (!c && !p) {
      setSearched(false)
      setResults([])
      setMessage('Enter a claim code, a receiver phone number, or both.')
      return
    }
    setSearching(true)
    setSearched(false)
    setResults([])
    try {
      const body = { action: 'claim_lookup' }
      if (c) body.code = c
      if (p) body.phone = p
      const data = await callAdminApi(body)
      if (!data?.ok) {
        setMessage(data?.error || 'Lookup failed. Please try again.')
        return
      }
      setResults((data.results ?? []).slice(0, 20))
      setCodeChecked(!!data.code_checked)
      setSearched(true)
    } catch (err) {
      setMessage('Lookup failed: ' + (err.message || 'no reason given'))
    } finally {
      setSearching(false)
    }
  }

  return (
    <div style={{ padding: 28 }}>
      <div>
        <h1 style={{ fontSize: 22, marginBottom: 4 }}>Claim codes</h1>
        <p style={{ color: 'var(--slate)', fontSize: 13, marginTop: 0 }}>
          Look up cash-pickup records by claim code, by receiver phone number, or both — useful when a customer or agent calls in. The code itself is never shown here — only whether it matches.
        </p>
      </div>

      <form onSubmit={handleSearch} style={{ display: 'flex', gap: 10, margin: '20px 0', maxWidth: 640, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 180 }}>
          <label style={labelStyle}>Claim code (6 digits)</label>
          <input type="text" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" style={inputStyle} />
        </div>
        <div style={{ flex: 1, minWidth: 180 }}>
          <label style={labelStyle}>Receiver phone number</label>
          <input type="text" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0706…" style={inputStyle} />
        </div>
        <button
          type="submit"
          disabled={searching}
          style={{ padding: '11px 22px', borderRadius: 10, border: 'none', background: 'var(--navy)', color: '#fff', fontWeight: 600, fontSize: 13.5 }}
        >
          {searching ? 'Looking up…' : 'Look up'}
        </button>
      </form>

      {searching && <div style={{ color: 'var(--slate)', fontSize: 13 }}>Looking up…</div>}

      {message && (
        <div style={{ background: 'var(--error-tint)', color: 'var(--error)', borderRadius: 10, padding: '12px 14px', fontSize: 13, maxWidth: 640 }}>
          {message}
        </div>
      )}

      {searched && results.length === 0 && (
        <div style={{ background: 'var(--error-tint)', color: 'var(--error)', borderRadius: 10, padding: '12px 14px', fontSize: 13, maxWidth: 640 }}>
          No record found.
        </div>
      )}

      {results.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 520 }}>
          {results.map((r) => (
            <div key={r.reference} style={{ background: '#fff', border: '1px solid var(--divider)', borderRadius: 14, padding: 22 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                {codeChecked ? (
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--green-dark)' }}>✓ Code matches</span>
                ) : (
                  <span style={{ fontSize: 12, color: 'var(--slate)' }}>Code not checked (phone search)</span>
                )}
                <StatusBadge status={STATUS_MAP[r.status] ?? r.status} />
              </div>
              <Row label="Reference" value={r.reference} mono />
              <Row label="Receiver mobile" value={r.receiver_phone || '—'} mono />
              <Row label="Amount" value={formatNaira(r.amount_kobo)} mono />
              <Row label="Fee" value={formatNaira(r.fee_kobo)} mono />
              <Row label="Sender" value={r.sender_name || '—'} />
              <Row label="Sender phone" value={r.sender_phone || '—'} mono />
              <Row label="Sent" value={fmtDateTime(r.created_at)} />
              <Row label="Expires" value={fmtDateTime(r.expires_at)} />
              <Row label="Claimed" value={fmtDateTime(r.claimed_at)} />
              <Row label="Assigned agent" value={r.agent_name || '—'} />
              <button
                className="no-print"
                onClick={() => window.print()}
                style={{
                  marginTop: 16, width: '100%', padding: '9px', borderRadius: 10, border: '1px solid var(--divider)',
                  background: '#fff', fontSize: 12.5, fontWeight: 600, color: 'var(--navy)',
                }}
              >
                🖨 Print this record
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Row({ label, value, mono }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--divider)' }}>
      <span style={{ fontSize: 12.5, color: 'var(--slate)' }}>{label}</span>
      <span className={mono ? 'mono' : undefined} style={{ fontSize: 13, fontWeight: 600, textAlign: 'right' }}>{value}</span>
    </div>
  )
}
