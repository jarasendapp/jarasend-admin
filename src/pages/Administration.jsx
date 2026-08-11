import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAdminAuth } from '../context/AdminAuthContext'

const ROLE_LABELS = {
  super_admin: 'Super admin', finance_admin: 'Finance admin', support: 'Support',
  compliance: 'Compliance', operations: 'Operations',
}

export default function Administration() {
  const { adminProfile } = useAdminAuth()
  const [admins, setAdmins] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const { data, error: err } = await supabase
          .from('admin_users')
          .select('id, full_name, role, created_at')
          .order('created_at', { ascending: true })
        if (err) throw err
        if (!cancelled) setAdmins(data ?? [])
      } catch (e) {
        if (!cancelled) setError(e.message || 'Could not load the admin list.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  return (
    <div style={{ padding: 28 }}>
      <h1 style={{ fontSize: 22, marginBottom: 4 }}>Administration</h1>
      <p style={{ color: 'var(--slate)', fontSize: 13, marginTop: 0, marginBottom: 24 }}>
        Everyone with access to this dashboard.
      </p>

      {error && (
        <div style={{ background: 'var(--error-tint)', color: 'var(--error)', borderRadius: 10, padding: '12px 14px', fontSize: 13, marginBottom: 16 }}>
          {error}
        </div>
      )}

      <div style={{ background: '#fff', border: '1px solid var(--divider)', borderRadius: 14, overflow: 'hidden', marginBottom: 24 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
          <thead>
            <tr style={{ background: '#FAFBFC', borderBottom: '1px solid var(--divider)' }}>
              {['Name', 'Role', 'Added'].map((h) => (
                <th key={h} style={{ textAlign: 'left', padding: '11px 16px', fontWeight: 700, color: 'var(--slate)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.3 }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {admins.map((a) => (
              <tr key={a.id} style={{ borderBottom: '1px solid var(--divider)' }}>
                <td style={{ padding: '12px 16px', fontWeight: 600 }}>
                  {a.full_name}
                  {a.id === adminProfile?.id && (
                    <span style={{ marginLeft: 8, fontSize: 10.5, color: 'var(--slate)', fontWeight: 500 }}>(you)</span>
                  )}
                </td>
                <td style={{ padding: '12px 16px' }}>{ROLE_LABELS[a.role] ?? a.role}</td>
                <td style={{ padding: '12px 16px', color: 'var(--slate)' }}>{new Date(a.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
            {!loading && admins.length === 0 && (
              <tr>
                <td colSpan={3} style={{ padding: 32, textAlign: 'center', color: 'var(--slate)' }}>
                  No admins found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{ background: '#fff', border: '1px solid var(--divider)', borderRadius: 14, padding: 22, maxWidth: 560 }}>
        <h3 style={{ fontSize: 14, marginBottom: 8 }}>Adding a new admin</h3>
        <p style={{ fontSize: 12.5, color: 'var(--slate)', lineHeight: 1.7, marginTop: 0 }}>
          This has to be done directly in Supabase, not from this page — creating a login
          requires a level of access (the service role key) that should never exist in code
          running in a browser, since it can bypass every permission rule in the database.
        </p>
        <ol style={{ fontSize: 12.5, color: 'var(--slate)', lineHeight: 1.9, paddingLeft: 18 }}>
          <li>Supabase → <strong>Authentication → Users → Add user</strong> — create their login</li>
          <li>Copy their UUID</li>
          <li>Supabase → <strong>SQL Editor</strong>, run:
            <pre style={{ background: 'var(--bg)', borderRadius: 8, padding: '10px 12px', marginTop: 6, fontSize: 11.5, overflowX: 'auto' }}>
{`insert into public.admin_users (id, full_name, role)
values ('their-uuid-here', 'Their Name', 'support');`}
            </pre>
          </li>
        </ol>
        <p style={{ fontSize: 11.5, color: 'var(--slate)', marginTop: 4 }}>
          Valid roles: super_admin, finance_admin, support, compliance, operations.
        </p>
      </div>
    </div>
  )
}
