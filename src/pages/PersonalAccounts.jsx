import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import StatusBadge from '../components/StatusBadge'
import { exportToCsv } from '../lib/exportCsv'
import DetailModal, { DetailRow, DetailSectionLabel } from '../components/DetailModal'
import AccountLockPanel from '../components/AccountLockPanel'

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

  const [exporting, setExporting] = useState(false)

  const [selectedId, setSelectedId] = useState(null)
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState(null)

  async function openDetail(userId) {
    setSelectedId(userId)
    setDetail(null)
    setDetailError(null)
    setDetailLoading(true)
    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      if (profileError) throw profileError

      const { data: wallet, error: walletError } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()
      if (walletError) throw walletError

      const { data: kyc, error: kycError } = await supabase
        .from('kyc_records')
        .select('status, id_type, id_number, bvn, submitted_at')
        .eq('user_id', userId)
        .eq('role', 'personal')
        .maybeSingle()
      if (kycError) throw kycError

      setDetail({ profile, wallet, kyc })
    } catch (err) {
      setDetailError(err.message || 'Could not load this account\'s details.')
    } finally {
      setDetailLoading(false)
    }
  }

  async function fetchAllForExport() {
    let query = supabase
      .from('profiles')
      .select('id, full_name, surname, phone, email, state, created_at')
      .contains('roles', ['personal'])
    const q = search.trim()
    if (q) {
      query = query.or(`full_name.ilike.%${q}%,surname.ilike.%${q}%,phone.ilike.%${q}%,email.ilike.%${q}%`)
    }
    const { data: profiles, error: profilesError } = await query.order('created_at', { ascending: false })
    if (profilesError) throw profilesError

    const userIds = (profiles ?? []).map((p) => p.id)
    const { data: kycRows, error: kycError } = userIds.length
      ? await supabase.from('kyc_records').select('user_id, status').eq('role', 'personal').in('user_id', userIds)
      : { data: [], error: null }
    if (kycError) throw kycError
    const kycByUser = Object.fromEntries((kycRows ?? []).map((k) => [k.user_id, k.status]))
    return (profiles ?? []).map((p) => ({ ...p, kycStatus: kycByUser[p.id] ?? 'notStarted' }))
  }

  async function handleExport() {
    setExporting(true)
    try {
      const all = await fetchAllForExport()
      exportToCsv('personal-accounts', all, [
        { label: 'Full name', value: (r) => `${r.full_name} ${r.surname}` },
        { label: 'Phone', value: (r) => r.phone },
        { label: 'Email', value: (r) => r.email || '' },
        { label: 'State', value: (r) => r.state || '' },
        { label: 'KYC status', value: (r) => KYC_STATUS_LABELS[r.kycStatus] ?? 'Pending' },
        { label: 'Joined', value: (r) => new Date(r.created_at).toLocaleDateString() },
      ])
    } catch (err) {
      setError(err.message || 'Could not export accounts.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div style={{ padding: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, marginBottom: 4 }}>Personal accounts</h1>
          <p style={{ color: 'var(--slate)', fontSize: 13, marginTop: 0 }}>
            {loading ? 'Loading…' : `${totalCount} registered ${totalCount === 1 ? 'account' : 'accounts'}`}
          </p>
        </div>
        <div className="no-print" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Search name, phone, or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              minWidth: 240, padding: '8px 14px', borderRadius: 20,
              border: '1px solid var(--divider)', fontSize: 12.5, fontFamily: 'inherit',
            }}
          />
          <button
            onClick={handleExport}
            disabled={exporting}
            style={{ padding: '8px 14px', borderRadius: 10, border: '1px solid var(--divider)', background: '#fff', fontSize: 12.5, fontWeight: 600, color: 'var(--navy)', opacity: exporting ? 0.6 : 1 }}
          >
            {exporting ? 'Exporting…' : '⬇ Export CSV'}
          </button>
          <button
            onClick={() => window.print()}
            style={{ padding: '8px 14px', borderRadius: 10, border: '1px solid var(--divider)', background: '#fff', fontSize: 12.5, fontWeight: 600, color: 'var(--navy)' }}
          >
            🖨 Print
          </button>
        </div>
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
              <tr
                key={r.id}
                onClick={() => openDetail(r.id)}
                style={{ borderBottom: '1px solid var(--divider)', cursor: 'pointer' }}
              >
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

      {selectedId && (
        <DetailModal
          title={detail ? `${detail.profile.full_name} ${detail.profile.surname}` : 'Personal account details'}
          onClose={() => setSelectedId(null)}
          loading={detailLoading}
          error={detailError}
        >
          {detail && (
            <>
              <DetailRow label="Phone" value={detail.profile.phone} mono />
              <DetailRow label="Email" value={detail.profile.email || '—'} />
              <DetailRow label="Date of birth" value={detail.profile.date_of_birth ? new Date(detail.profile.date_of_birth).toLocaleDateString() : '—'} />
              <DetailRow label="Home address" value={formatAddress(detail.profile)} />
              <DetailRow label="Joined" value={new Date(detail.profile.created_at).toLocaleDateString()} />

              <DetailSectionLabel>KYC</DetailSectionLabel>
              <DetailRow label="Status" value={<StatusBadge status={KYC_STATUS_LABELS[detail.kyc?.status] ?? 'Not started'} />} />
              <DetailRow label="ID type" value={detail.kyc?.id_type || '—'} />
              <DetailRow label="ID number" value={detail.kyc?.id_number || '—'} mono />
              <DetailRow label="BVN" value={detail.kyc?.bvn || '—'} mono />

              <DetailSectionLabel>Wallet</DetailSectionLabel>
              <DetailRow label="Available" value={detail.wallet ? formatNaira(detail.wallet.available) : '—'} mono />
              <DetailRow label="Reserved" value={detail.wallet ? formatNaira(detail.wallet.reserved) : '—'} mono />
              <DetailRow label="Reversed total" value={detail.wallet ? formatNaira(detail.wallet.reversed_total) : '—'} mono />

              <DetailSectionLabel>Account status</DetailSectionLabel>
              <AccountLockPanel userId={selectedId} role="personal" />
            </>
          )}
        </DetailModal>
      )}
    </div>
  )
}

function formatAddress(profile) {
  if (!profile) return '—'
  const parts = [profile.house_number, profile.street_name, profile.town, profile.state, profile.country].filter(Boolean)
  return parts.length ? parts.join(', ') : '—'
}

function formatNaira(n) {
  return '₦' + Number(n).toLocaleString('en-NG')
}
