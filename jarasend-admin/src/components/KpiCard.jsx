export default function KpiCard({ label, value, icon, tint = 'green', sample = false }) {
  const tintColors = {
    green: { bg: 'var(--green-tint)', fg: 'var(--green-dark)' },
    gold: { bg: 'var(--gold-tint)', fg: '#854F0B' },
    navy: { bg: '#E8ECF3', fg: 'var(--navy)' },
  }
  const c = tintColors[tint] ?? tintColors.green

  return (
    <div style={{
      background: '#fff', border: '1px solid var(--divider)', borderRadius: 14,
      padding: 16, position: 'relative',
    }}>
      {sample && (
        <span style={{
          position: 'absolute', top: 10, right: 10, fontSize: 9.5, fontWeight: 700,
          background: 'var(--gold-tint)', color: '#854F0B', padding: '2px 7px',
          borderRadius: 20, letterSpacing: 0.3,
        }}>
          SAMPLE DATA
        </span>
      )}
      <div style={{
        width: 34, height: 34, borderRadius: 10, background: c.bg, color: c.fg,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, marginBottom: 12,
      }}>
        {icon}
      </div>
      <div className="num" style={{ fontSize: 22, fontWeight: 600, marginBottom: 2 }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--slate)' }}>{label}</div>
    </div>
  )
}
