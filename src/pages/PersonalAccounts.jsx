import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import StatusBadge from '../components/StatusBadge'

const KYC_STATUS_LABELS = {
  approved: 'Approved',
  pending: 'Pending',
  rejected: 'Rejected',
  notStarted: 'Not started',
}

const PAGE_SIZE = 25

export default function PersonalAccounts() {
  const [rows, setRows] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)

  useEffect(() => {
    let cancelled = false
    // Debounce search input so it doesn't re-query on every keystroke.
    const timeout = setTimeout(async () => {
      setLoading(true)
      setError(null)
      try {
        let query = supabase
          .from('profiles')
          .select('id, full_name, surname, phone, email, state, created_at', { count: 'exact' })
          .contains('roles', ['personal'])

        const q = search.trim()
        if (q) {
          query = query.or(`full_name.ilike.%${q}%,surname.ilike.%${q}%,phone.ilike.%${q}%,email.ilike.%${q}%`)
        }

        const from = page * PAGE_SIZE
        const { data: profiles, count, error: profilesError } = await query
          .order('created_at', { ascending: false })
          .range(from, from + PAGE_SIZE - 1)
        if (profilesError) throw profilesError

        const userIds = (profiles ?? []).map((p) => p.id)
        const { data: kycRows, error: kycError } = userIds.length
          ? await supabase.from('kyc_records').select('user_id, status').eq('role', 'personal').in('user_id', userIds)
          : { data: [], error: null }
        if (kycError) throw kycError

        const kycByUser = Object.fromEntries((kycRows ?? []).map((k) => [k.user_id, k.status]))

        if (cancelled) return
        setRows((profiles ?? []).map((p) => ({ ...p, kycStatus: kycByUser[p.id] ?? 'notStarted' })))
        setTotalCount(count ?? 0)
      } catch (err) {
        if (!cancelled) setError(err.message || 'Could not load personal accounts.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, 300)

    return () => { cancelled = true; clearTimeout(timeout) }
  }, [search, page])

  // Reset to page 1 whenever the search term changes.
  useEffect(() => { setPage(0) }, [search])

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  return (
    <div style={{ padding: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: 22, marginBottom: 4 }}>Personal accounts</h1>
          <p style={{ color: 'var(--slate)', fontSize: 13, marginTop: 0 }}>
            {loading ? 'Loading…' : `${totalCount} registered ${totalCount === 1 ? 'account' : 'accounts'}`}
          </p>
        </div>
        <input
          type="text"
          placeholder="Search name, phone, or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            minWidth: 260, padding: '8px 14px', borderRadius: 20,
            border: '1px solid var(--divider)', fontSize: 12.5, fontFamily: 'inherit',
          }}
        />
      </div>

      {error && (
        <div style={{ background: 'var(--error-tint)', color: 'var(--error)', borderRadius: 10, padding: '12px 14px', fontSize: 13, margin: '16px 0' }}>
          {error}
        </div>
      )}

      <div style={{ background: '#fff', border: '1px solid var(--divider)', borderRadius: 14, overflow: 'hidden', marginTop: 18 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
          <thead>
            <tr style={{ background: '#FAFBFC', borderBottom: '1px solid var(--divider)' }}>
              {['Full name', 'Phone', 'Email', 'State', 'KYC status', 'Joined'].map((h) => (
                <th key={h} style={{ textAlign: 'left', padding: '11px 16px', fontWeight: 700, color: 'var(--slate)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.3 }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} style={{ borderBottom: '1px solid var(--divider)' }}>
                <td style={{ padding: '12px 16px', fontWeight: 600 }}>{r.full_name} {r.surname}</td>
                <td style={{ padding: '12px 16px' }} className="mono">{r.phone}</td>
                <td style={{ padding: '12px 16px', color: 'var(--slate)' }}>{r.email || '—'}</td>
                <td style={{ padding: '12px 16px' }}>{r.state || '—'}</td>
                <td style={{ padding: '12px 16px' }}><StatusBadge status={KYC_STATUS_LABELS[r.kycStatus] ?? 'Pending'} /></td>
                <td style={{ padding: '12px 16px', color: 'var(--slate)' }}>{new Date(r.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: 32, textAlign: 'center', color: 'var(--slate)' }}>
                  {search ? 'No accounts match your search.' : 'No personal accounts registered yet.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
          <span style={{ fontSize: 12, color: 'var(--slate)' }}>Page {page + 1} of {totalPages}</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid var(--divider)', background: '#fff', fontSize: 12.5, fontWeight: 600, opacity: page === 0 ? 0.5 : 1 }}
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid var(--divider)', background: '#fff', fontSize: 12.5, fontWeight: 600, opacity: page >= totalPages - 1 ? 0.5 : 1 }}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
