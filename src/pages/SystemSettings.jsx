function formatNaira(n) {
  return '₦' + n.toLocaleString('en-NG')
}

// Pulled directly from the mobile app's actual source
// (offline_transaction_repository.dart) — these are the real, current
// values enforced today, not placeholders.
const LIMITS = [
  { label: 'Maximum single transfer', value: 100000 },
  { label: 'Maximum daily send total', value: 100000 },
  { label: 'Maximum weekly send total', value: 300000 },
  { label: 'Maximum monthly send total', value: 1000000 },
  { label: 'Minimum commission withdrawal', value: 100 },
  { label: 'One-time agent fee (taken from first payout above it)', value: 2000 },
]
const RULES = [
  { label: 'Transfer fee (taken only when a claim completes)', value: '1.02%' },
  { label: 'Unclaimed transfer expires after', value: '7 days (168 hrs), then refunded' },
  { label: 'Bank account change: withdrawals paused for', value: '48 hours' },
]

export default function SystemSettings() {
  return (
    <div style={{ padding: 28 }}>
      <h1 style={{ fontSize: 22, marginBottom: 4 }}>System settings</h1>
      <p style={{ color: 'var(--slate)', fontSize: 13, marginTop: 0, marginBottom: 24 }}>
        The platform's current transaction limits and thresholds.
      </p>

      <div style={{
        background: 'var(--gold-tint)', color: '#854F0B', borderRadius: 10,
        padding: '12px 14px', fontSize: 12.5, marginBottom: 20, maxWidth: 640,
      }}>
        These values are enforced by the server (and mirrored in the app), so what's shown here
        is genuinely accurate — but they aren't editable from this page yet. Changing
        them currently means updating the app itself and shipping a new build, since
        there's no live configuration table the app reads from. Making these truly
        editable from here is a reasonable next step, once that config table exists.
      </div>

      <div style={{ background: '#fff', border: '1px solid var(--divider)', borderRadius: 14, overflow: 'hidden', maxWidth: 500 }}>
        {LIMITS.map((l, i) => (
          <div key={l.label} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '14px 20px', borderBottom: i < LIMITS.length - 1 ? '1px solid var(--divider)' : 'none',
          }}>
            <span style={{ fontSize: 13 }}>{l.label}</span>
            <span className="mono" style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)' }}>{formatNaira(l.value)}</span>
          </div>
        ))}
      </div>

      <div style={{ background: '#fff', border: '1px solid var(--divider)', borderRadius: 14, overflow: 'hidden', maxWidth: 500, marginTop: 16 }}>
        {RULES.map((l, i) => (
          <div key={l.label} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
            padding: '14px 20px', borderBottom: i < RULES.length - 1 ? '1px solid var(--divider)' : 'none',
          }}>
            <span style={{ fontSize: 13 }}>{l.label}</span>
            <span className="mono" style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)', textAlign: 'right' }}>{l.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
