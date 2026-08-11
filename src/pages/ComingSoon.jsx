export default function ComingSoon({ title }) {
  return (
    <div style={{ padding: 28 }}>
      <h1 style={{ fontSize: 22, marginBottom: 8 }}>{title}</h1>
      <div style={{
        background: '#fff', border: '1px dashed var(--divider)', borderRadius: 14,
        padding: 40, textAlign: 'center', color: 'var(--slate)', fontSize: 13.5,
      }}>
        This section isn't built yet — Dashboard is the first module.
        <br />More sections are being added incrementally.
      </div>
    </div>
  )
}
