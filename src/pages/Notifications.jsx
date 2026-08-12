import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import TableToolbar from '../components/TableToolbar'
import PeriodDropdown, { filterByPeriod } from '../components/PeriodDropdown'

const TYPE_LABELS = {
  moneySent: 'Money sent', moneyReceived: 'Money received', pickupCompleted: 'Pickup completed',
  pinChanged: 'PIN changed', profileUpdated: 'Profile updated', kycUpdate: 'KYC update', security: 'Security',
}

export default function Notifications() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('All')
  const [period, setPeriod] = useState('All time')

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const { data: notifs, error: notifsError } = await supabase
          .from('notifications')
          .select('id, user_id, type, title, body, read, created_at')
          .order('created_at', { ascending: false })
          .limit(500)
        if (notifsError) throw notifsError

        const userIds = [...new Set((notifs ?? []).map((n) => n.user_id))]
        const { data: profiles, error: profilesError } = userIds.length
          ? await supabase.from('profiles').select('id, full_name, surname, phone').in('id', userIds)
          : { data: [], error: null }
        if (profilesError) throw profilesError

        const profileById = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]))

        if (cancelled) return
        setRows((notifs ?? []).map((n) => ({ ...n, profile: profileById[n.user_id] })))
      } catch (err) {
        if (!cancelled) setError(err.message || 'Could not load notifications.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const base = rows.filter((r) => {
      const matchesType = typeFilter === 'All' || r.type === typeFilter
      const matchesSearch = !q ||
        r.profile?.full_name?.toLowerCase().includes(q) ||
        r.profile?.phone?.toLowerCase().includes(q) ||
        r.title?.toLowerCase().includes(q)
      return matchesType && matchesSearch
    })
    return filterByPeriod(base, period, (r) => new Date(r.created_at))
  }, [rows, search, typeFilter, period])

  return (
    <div style={{ padding: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: 22, marginBottom: 4 }}>Notifications</h1>
          <p style={{ color: 'var(--slate)', fontSize: 13, marginTop: 0 }}>
            {loading ? 'Loading…' : `Most recent ${rows.length} notifications sent`}
          </p>
        </div>
        <input
          type="text"
          placeholder="Search name, phone, or title…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            minWidth: 260, padding: '8px 14px', borderRadius: 20,
            border: '1px solid var(--divider)', fontSize: 12.5, fontFamily: 'inherit',
          }}
        />
      </div>

      <div className="no-print" style={{ margin: '16px 0', display: 'flex', gap: 8, alignItems: 'center' }}>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 10, border: '1px solid var(--divider)', fontSize: 12.5, fontFamily: 'inherit' }}
        >
          <option value="All">All notification types</option>
          {Object.entries(TYPE_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        <PeriodDropdown value={period} onChange={setPeriod} />
        <TableToolbar
          filename="notifications"
          rows={filtered}
          columns={[
            { label: 'User', value: (r) => r.profile ? `${r.profile.full_name} ${r.profile.surname}` : '' },
            { label: 'Phone', value: (r) => r.profile?.phone || '' },
            { label: 'Type', value: (r) => TYPE_LABELS[r.type] ?? r.type },
            { label: 'Title', value: (r) => r.title },
            { label: 'Body', value: (r) => r.body },
            { label: 'Read', value: (r) => r.read ? 'Read' : 'Unread' },
            { label: 'Sent', value: (r) => new Date(r.created_at).toLocaleString() },
          ]}
        />
      </div>

      {error && (
        <div style={{ background: 'var(--error-tint)', color: 'var(--error)', borderRadius: 10, padding: '12px 14px', fontSize: 13, marginBottom: 16 }}>
          {error}
        </div>
      )}

      <div style={{ background: '#fff', border: '1px solid var(--divider)', borderRadius: 14, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
          <thead>
            <tr style={{ background: '#FAFBFC', borderBottom: '1px solid var(--divider)' }}>
              {['User', 'Phone', 'Type', 'Title', 'Body', 'Read', 'Sent'].map((h) => (
                <th key={h} style={{ textAlign: 'left', padding: '11px 16px', fontWeight: 700, color: 'var(--slate)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.3 }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} style={{ borderBottom: '1px solid var(--divider)' }}>
                <td style={{ padding: '12px 16px', fontWeight: 600 }}>{r.profile ? `${r.profile.full_name} ${r.profile.surname}` : '—'}</td>
                <td style={{ padding: '12px 16px' }} className="mono">{r.profile?.phone || '—'}</td>
                <td style={{ padding: '12px 16px' }}>{TYPE_LABELS[r.type] ?? r.type}</td>
                <td style={{ padding: '12px 16px', fontWeight: 600 }}>{r.title}</td>
                <td style={{ padding: '12px 16px', color: 'var(--slate)', maxWidth: 260 }}>{r.body}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{
                    fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                    background: r.read ? 'var(--green-tint)' : 'var(--gold-tint)',
                    color: r.read ? 'var(--green-dark)' : '#854F0B',
                  }}>
                    {r.read ? 'Read' : 'Unread'}
                  </span>
                </td>
                <td style={{ padding: '12px 16px', color: 'var(--slate)' }}>{new Date(r.created_at).toLocaleString()}</td>
              </tr>
            ))}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: 32, textAlign: 'center', color: 'var(--slate)' }}>
                  No notifications match this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
