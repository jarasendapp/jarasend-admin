// The address every "Contact support" click routes to. Update this one
// line whenever the designated support inbox is finalized — every button
// on this page reads from here, so there's only one place to change.
const SUPPORT_EMAIL = 'support@jarasend.name.ng'

export default function Support() {
  return (
    <div style={{ padding: 28 }}>
      <h1 style={{ fontSize: 22, marginBottom: 4 }}>Support</h1>
      <p style={{ color: 'var(--slate)', fontSize: 13, marginTop: 0, marginBottom: 24 }}>
        Customer and agent support requests route here.
      </p>

      <div style={{
        background: '#fff', border: '1px solid var(--divider)', borderRadius: 14,
        padding: 28, maxWidth: 520,
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12, background: 'var(--green-tint)',
          color: 'var(--green-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, marginBottom: 16,
        }}>
          ✉️
        </div>
        <h3 style={{ fontSize: 15, marginBottom: 6 }}>Contact support</h3>
        <p style={{ fontSize: 12.5, color: 'var(--slate)', marginTop: 0, marginBottom: 18, lineHeight: 1.6 }}>
          Every message sent through this button goes to the designated support inbox
          — <strong>{SUPPORT_EMAIL}</strong>. A full in-dashboard ticket queue (with status,
          assignment, and history) is a planned follow-up; for now this is a direct line in.
        </p>
        <a
          href={`mailto:${SUPPORT_EMAIL}`}
          style={{
            display: 'inline-block', padding: '11px 20px', borderRadius: 10,
            background: 'var(--navy)', color: '#fff', fontSize: 13.5, fontWeight: 600,
          }}
        >
          Open email to support
        </a>
      </div>
    </div>
  )
}
