export default function DetailModal({ title, onClose, loading, error, children }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(11,31,58,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 55, padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 16, padding: 28, width: 520, maxHeight: '85vh', overflowY: 'auto' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 17 }}>{title}</h2>
          <button
            onClick={onClose}
            style={{ background: 'var(--bg)', border: 'none', color: 'var(--navy)', borderRadius: 8, padding: '6px 14px', fontSize: 12.5, fontWeight: 600 }}
          >
            Close
          </button>
        </div>

        {loading && <p style={{ color: 'var(--slate)', fontSize: 13 }}>Loading…</p>}
        {error && (
          <div style={{ background: 'var(--error-tint)', color: 'var(--error)', borderRadius: 10, padding: '10px 12px', fontSize: 12.5, marginBottom: 12 }}>
            {error}
          </div>
        )}
        {!loading && !error && children}
      </div>
    </div>
  )
}

export function DetailRow({ label, value, mono }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--divider)' }}>
      <span style={{ fontSize: 12.5, color: 'var(--slate)' }}>{label}</span>
      <span className={mono ? 'mono' : undefined} style={{ fontSize: 13, fontWeight: 600, textAlign: 'right' }}>{value}</span>
    </div>
  )
}

export function DetailSectionLabel({ children }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--slate)', letterSpacing: 0.3, textTransform: 'uppercase', margin: '18px 0 6px' }}>
      {children}
    </div>
  )
}
