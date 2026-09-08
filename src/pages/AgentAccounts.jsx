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

export default function AgentAccounts() {
  const [rows, setRows] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)

  useEffect(() => {
    let cancelled = false
    const timeout = setTimeout(async () => {
      setLoading(true)
      setError(null)
      try {
        let query = supabase
          .from('profiles')
          .select('id, full_name, surname, phone, email, state, business_name, business_state, created_at', { count: 'exact' })
          .contains('roles', ['agent'])

        const q = search.trim()
        if (q) {
          query = query.or(`full_name.ilike.%${q}%,surname.ilike.%${q}%,phone.ilike.%${q}%,email.ilike.%${q}%,business_name.ilike.%${q}%`)
        }

        const from = page * PAGE_SIZE
        const { data: profiles, count, error: profilesError } = await query
          .order('created_at', { ascending: false })
          .range(from, from + PAGE_SIZE - 1)
        if (profilesError) throw profilesError

        const userIds = (profiles ?? []).map((p) => p.id)
        const { data: kycRows, error: kycError } = userIds.length
          ? await supabase.from('kyc_records').select('user_id, status').eq('role', 'agent').in('user_id', userIds)
          : { data: [], error: null }
        if (kycError) throw kycError

        const { data: agentRows, error: agentError } = userIds.length
          ? await supabase.from('agent_accounts').select('user_id, agent_number').in('user_id', userIds)
          : { data: [], error: null }
        if (agentError) throw agentError

        const kycByUser = Object.fromEntries((kycRows ?? []).map((k) => [k.user_id, k.status]))
        const agentNumberByUser = Object.fromEntries((agentRows ?? []).map((a) => [a.user_id, a.agent_number]))

        if (cancelled) return
        setRows((profiles ?? []).map((p) => ({ ...p, kycStatus: kycByUser[p.id] ?? 'notStarted', agentNumber: agentNumberByUser[p.id] ?? null })))
        setTotalCount(count ?? 0)
      } catch (err) {
        if (!cancelled) setError(err.message || 'Could not load agent accounts.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, 300)

    return () => { cancelled = true; clearTimeout(timeout) }
  }, [search, page])

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

      const { data: agentAccount, error: agentError } = await supabase
        .from('agent_accounts')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()
      if (agentError) throw agentError

      const { data: kyc, error: kycError } = await supabase
        .from('kyc_records')
        .select('status, id_type, id_number, company_reg_number, bvn, bank_name, bank_account_number, bank_account_name, submitted_at')
        .eq('user_id', userId)
        .eq('role', 'agent')
        .maybeSingle()
      if (kycError) throw kycError

      setDetail({ profile, agentAccount, kyc })
    } catch (err) {
      setDetailError(err.message || 'Could not load this agent\'s details.')
    } finally {
      setDetailLoading(false)
    }
  }

  async function fetchAllForExport() {
    let query = supabase
      .from('profiles')
      .select('id, full_name, surname, phone, email, state, business_name, business_state, created_at')
      .contains('roles', ['agent'])
    const q = search.trim()
    if (q) {
      query = query.or(`full_name.ilike.%${q}%,surname.ilike.%${q}%,phone.ilike.%${q}%,email.ilike.%${q}%,business_name.ilike.%${q}%`)
    }
    const { data: profiles, error: profilesError } = await query.order('created_at', { ascending: false })
    if (profilesError) throw profilesError

    const userIds = (profiles ?? []).map((p) => p.id)
    const { data: kycRows, error: kycError } = userIds.length
      ? await supabase.from('kyc_records').select('user_id, status').eq('role', 'agent').in('user_id', userIds)
      : { data: [], error: null }
    if (kycError) throw kycError

    const { data: agentRows, error: agentError } = userIds.length
      ? await supabase.from('agent_accounts').select('user_id, agent_number').in('user_id', userIds)
      : { data: [], error: null }
    if (agentError) throw agentError

    const kycByUser = Object.fromEntries((kycRows ?? []).map((k) => [k.user_id, k.status]))
    const agentNumberByUser = Object.fromEntries((agentRows ?? []).map((a) => [a.user_id, a.agent_number]))
    return (profiles ?? []).map((p) => ({ ...p, kycStatus: kycByUser[p.id] ?? 'notStarted', agentNumber: agentNumberByUser[p.id] ?? null }))
  }

  async function handleExport() {
    setExporting(true)
    try {
      const all = await fetchAllForExport()
      exportToCsv('agent-accounts', all, [
        { label: 'Full name', value: (r) => `${r.full_name} ${r.surname}` },
        { label: 'Agent ID', value: (r) => r.agentNumber ? `AGT-${r.agentNumber}` : 'Not yet assigned' },
        { label: 'Business name', value: (r) => r.business_name || '' },
        { label: 'Phone', value: (r) => r.phone },
        { label: 'Email', value: (r) => r.email || '' },
        { label: 'Business state', value: (r) => r.business_state || '' },
        { label: 'KYC status', value: (r) => KYC_STATUS_LABELS[r.kycStatus] ?? 'Pending' },
        { label: 'Joined', value: (r) => new Date(r.created_at).toLocaleDateString() },
      ])
    } catch (err) {
      setError(err.message || 'Could not export agents.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div style={{ padding: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, marginBottom: 4 }}>Agent accounts</h1>
          <p style={{ color: 'var(--slate)', fontSize: 13, marginTop: 0 }}>
            {loading ? 'Loading…' : `${totalCount} registered ${totalCount === 1 ? 'agent' : 'agents'}`}
          </p>
        </div>
        <div className="no-print" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Search name, business, phone, or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              minWidth: 260, padding: '8px 14px', borderRadius: 20,
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
              {['Full name', 'Agent ID', 'Business name', 'Phone', 'Email', 'Business state', 'KYC status', 'Joined'].map((h) => (
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
                <td style={{ padding: '12px 16px' }} className="mono">
                  {r.agentNumber ? `AGT-${r.agentNumber}` : <span style={{ color: 'var(--slate)', fontStyle: 'italic' }}>Not yet assigned</span>}
                </td>
                <td style={{ padding: '12px 16px' }}>{r.business_name || '—'}</td>
                <td style={{ padding: '12px 16px' }} className="mono">{r.phone}</td>
                <td style={{ padding: '12px 16px', color: 'var(--slate)' }}>{r.email || '—'}</td>
                <td style={{ padding: '12px 16px' }}>{r.business_state || '—'}</td>
                <td style={{ padding: '12px 16px' }}><StatusBadge status={KYC_STATUS_LABELS[r.kycStatus] ?? 'Pending'} /></td>
                <td style={{ padding: '12px 16px', color: 'var(--slate)' }}>{new Date(r.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={8} style={{ padding: 32, textAlign: 'center', color: 'var(--slate)' }}>
                  {search ? 'No agents match your search.' : 'No agent accounts registered yet.'}
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
          title={detail ? `${detail.profile.full_name} ${detail.profile.surname}` : 'Agent details'}
          onClose={() => setSelectedId(null)}
          loading={detailLoading}
          error={detailError}
        >
          {detail && (
            <>
              <DetailRow label="Agent ID" value={detail.agentAccount?.agent_number ? `AGT-${detail.agentAccount.agent_number}` : 'Not yet assigned'} mono />
              <DetailRow label="Phone" value={detail.profile.phone} mono />
              <DetailRow label="Email" value={detail.profile.email || '—'} />
              <DetailRow label="Date of birth" value={detail.profile.date_of_birth ? new Date(detail.profile.date_of_birth).toLocaleDateString() : '—'} />
              <DetailRow label="Home address" value={formatAddress(detail.profile, 'house_number', 'street_name', 'town', 'state', 'country')} />
              <DetailRow label="Joined" value={new Date(detail.profile.created_at).toLocaleDateString()} />

              <DetailSectionLabel>Business</DetailSectionLabel>
              <DetailRow label="Business name" value={detail.profile.business_name || '—'} />
              <DetailRow label="Business address" value={formatAddress(detail.profile, 'business_house_number', 'business_street_name', 'business_town', 'business_state', 'business_country')} />

              <DetailSectionLabel>KYC</DetailSectionLabel>
              <DetailRow label="Status" value={<StatusBadge status={KYC_STATUS_LABELS[detail.kyc?.status] ?? 'Not started'} />} />
              <DetailRow label="ID type" value={detail.kyc?.id_type || '—'} />
              <DetailRow label="ID number" value={detail.kyc?.id_number || '—'} mono />
              <DetailRow label="BVN" value={detail.kyc?.bvn || '—'} mono />
              <DetailRow label="Company registration number" value={detail.kyc?.company_reg_number || '—'} mono />

              <DetailSectionLabel>Bank details (withdrawal destination)</DetailSectionLabel>
              <DetailRow label="Bank name" value={detail.kyc?.bank_name || '—'} />
              <DetailRow label="Account number" value={detail.kyc?.bank_account_number || '—'} mono />
              <DetailRow label="Account name" value={detail.kyc?.bank_account_name || '—'} />

              <DetailSectionLabel>Wallet</DetailSectionLabel>
              <DetailRow label="Float" value={detail.agentAccount ? formatNaira(detail.agentAccount.float) : '—'} mono />
              <DetailRow label="Commission balance" value={detail.agentAccount ? formatNaira(detail.agentAccount.commission) : '—'} mono />
              <DetailRow label="Total cash received" value={detail.agentAccount ? formatNaira(detail.agentAccount.total_cash_received) : '—'} mono />
              <DetailRow label="Total cash withdrawn" value={detail.agentAccount ? formatNaira(detail.agentAccount.total_cash_withdrawn) : '—'} mono />

              <DetailSectionLabel>Account status</DetailSectionLabel>
              <AccountLockPanel userId={selectedId} role="agent" />
            </>
          )}
        </DetailModal>
      )}
    </div>
  )
}

function formatAddress(profile, houseKey, streetKey, townKey, stateKey, countryKey) {
  if (!profile) return '—'
  const parts = [profile[houseKey], profile[streetKey], profile[townKey], profile[stateKey], profile[countryKey]].filter(Boolean)
  return parts.length ? parts.join(', ') : '—'
}

function formatNaira(n) {
  return '₦' + Number(n).toLocaleString('en-NG')
}
