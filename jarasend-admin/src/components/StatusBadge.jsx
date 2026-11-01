const STATUS_STYLES = {
  // Cash pickup statuses
  Pending: { bg: 'var(--gold-tint)', fg: '#854F0B' },
  Completed: { bg: 'var(--green-tint)', fg: 'var(--green-dark)' },
  Unclaimed: { bg: '#E8ECF3', fg: 'var(--navy)' },
  Expired: { bg: '#F0F0F0', fg: 'var(--slate)' },
  Reversed: { bg: 'var(--error-tint)', fg: 'var(--error)' },
  // KYC statuses — kept visually distinct from the cash-pickup set above
  // rather than reusing those labels, since "Reversed" or "Unclaimed"
  // would read as transaction problems, not verification outcomes.
  Approved: { bg: 'var(--green-tint)', fg: 'var(--green-dark)' },
  Rejected: { bg: 'var(--error-tint)', fg: 'var(--error)' },
  'Not started': { bg: '#F0F0F0', fg: 'var(--slate)' },
}

export default function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES.Pending
  return (
    <span style={{
      display: 'inline-block', fontSize: 11, fontWeight: 700, padding: '3px 10px',
      borderRadius: 20, background: s.bg, color: s.fg,
    }}>
      {status}
    </span>
  )
}
