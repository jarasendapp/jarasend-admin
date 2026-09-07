import { useState } from 'react'
import { supabase } from '../lib/supabase'
import StatusBadge from '../components/StatusBadge'

function formatNaira(n) {
  return '₦' + n.toLocaleString('en-NG')
}

const STATUS_MAP = {
  pendingCollection: 'Pending', collected: 'Completed', expired: 'Expired',
  cancelled: 'Reversed', failed: 'Reversed', reversed: 'Reversed',
}

// Hashes the entered code with SHA-256, matching the mobile app's own
// hashing exactly (sha256.convert(utf8.encode(value)).toString()) — the
// plaintext code is never stored anywhere, including here. This only
// lets us confirm whether a code someone reads out over the phone
// matches a real transaction, the same way a system verifies a PIN
// without ever displaying it.
async function sha256Hex(value) {
  const bytes = new TextEncoder().encode(value)
  const hashBuffer = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

export default function ClaimCodes() {
  const [query, setQuery] = useState('')
  const [result, setResult] = useState(null)
  const [searched, setSearched] = useState(false)
  const [searching, setSearching] = useState(false)
  const [profiles, setProfiles] = useState({})

  async function handleSearch(e) {
    e.preventDefault()
    const code = query.trim()
    if (!code) return
    setSearching(true)
    setSearched(false)
    try {
      const hash = await sha256Hex(code)
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('pickup_code_hash', hash)
        .maybeSingle()
      if (error) throw error
      setResult(data)

      if (data) {
        const userIds = [data.user_id, data.agent_id].filter(Boolean)
        const { data: profileRows } = await supabase
          .from('profiles')
          .select('id, full_name, surname, business_name')
          .in('id', userIds)
        setProfiles(Object.fromEntries((profileRows ?? []).map((p) => [p.id, p])))
      }
    } catch (err) {
      setResult(null)
    } finally {
      setSearching(false)
      setSearched(true)
    }
  }

  const agentProfile = result?.agent_id ? profiles[result.agent_id] : null

  return (
    <div style={{ padding: 28 }}>
      <div>
        <h1 style={{ fontSize: 22, marginBottom: 4 }}>Claim codes</h1>
        <p style={{ color: 'var(--slate)', fontSize: 13, marginTop: 0 }}>
          Look up a single redemption code — useful when a customer or agent calls in about one. The code itself is never stored or shown here — only whether it matches.
        </p>
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
          disabled={searching}
          style={{ padding: '11px 22px', borderRadius: 10, border: 'none', background: 'var(--navy)', color: '#fff', fontWeight: 600, fontSize: 13.5 }}
        >
          {searching ? 'Looking up…' : 'Look up'}
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
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--green-dark)' }}>✓ Code matches this transaction</span>
            <StatusBadge status={STATUS_MAP[result.status] ?? result.status} />
          </div>
          <Row label="Receiver mobile" value={result.counterparty_mobile || '—'} mono />
          <Row label="Amount" value={formatNaira(Number(result.amount))} mono />
          <Row label="Sent" value={new Date(result.date_time).toLocaleString()} />
          <Row label="Assigned agent" value={agentProfile ? `${agentProfile.full_name} ${agentProfile.surname}${agentProfile.business_name ? ` — ${agentProfile.business_name}` : ''}` : '—'} />
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
