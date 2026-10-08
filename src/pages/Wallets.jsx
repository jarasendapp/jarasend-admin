import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import TableToolbar from '../components/TableToolbar'
import DetailModal, { DetailRow, DetailSectionLabel } from '../components/DetailModal'

// All money from the backend is in kobo.
function formatNaira(kobo) {
  return '₦' + (Number(kobo) / 100).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
// Commission points: 1 point = ₦1
function formatPoints(p) {
  return '₦' + Number(p).toLocaleString('en-NG')
}
function fmtDateTime(v) {
  return v ? new Date(v).toLocaleString() : '—'
}
function fmtDay(v) {
  if (!v) return '—'
  const d = new Date(`${String(v).slice(0, 10)}T00:00:00`)
  return isNaN(d) ? String(v) : d.toLocaleDateString()
}

const td = { padding: '12px 16px' }
const smallBtn = {
  fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 8, border: '1px solid var(--divider)',
  background: '#fff', color: 'var(--navy)',
}

export default function Wallets() {
  const [tab, setTab] = useState('personal')
  const [personalWallets, setPersonalWallets] = useState([])
  const [agentWallets, setAgentWallets] = useState([])
  const [personalTx, setPersonalTx] = useState([])
  const [agentTx, setAgentTx] = useState([])
  const [balances, setBalances] = useState({})
  const [balLoading, setBalLoading] = useState(false)
  const [balError, setBalError] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [hoverKey, setHoverKey] = useState(null)

  // Detail modal state
  const [selected, setSelected] = useState(null) // { kind: 'personal' | 'agent', row }
  const [detailRows, setDetailRows] = useState([])
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')

  useEffect(() => { load() }, [])

  async function fetchBalances(ids) {
    const accountIds = [...new Set(ids.filter(Boolean))]
    if (accountIds.length === 0) { setBalances({}); return }
    setBalLoading(true)
    setBalError('')
    try {
      const { data, error } = await supabase.functions.invoke('admin-api', { body: { action: 'balances', account_ids: accountIds } })
      if (error) throw new Error(error.message)
      if (!data?.ok) throw new Error(data?.error || 'Could not read live balances.')
      setBalances(data.balances ?? {})
    } catch (err) {
      setBalError(err.message || 'Could not read live balances.')
    } finally {
      setBalLoading(false)
    }
  }

  function balanceCell(accountId) {
    if (balLoading) return <span style={{ color: 'var(--slate)' }}>…</span>
    const v = accountId ? balances[accountId] : null
    return v === null || v === undefined ? '—' : formatNaira(v)
  }

  async function load() {
    setLoading(true)
    setLoadError('')
    try {
      const [{ data: wallets, error: walletsError }, { data: agents, error: agentsError }] = await Promise.all([
        supabase.rpc('admin_personal_wallets'),
        supabase.rpc('admin_agent_wallets'),
      ])
      if (walletsError) throw walletsError
      if (agentsError) throw agentsError

      const [{ data: sendTx, error: sendError }, { data: payoutTx, error: payoutError }] = await Promise.all([
        supabase.from('transactions').select('*').eq('type', 'send').order('date_time', { ascending: false }).limit(50),
        supabase.from('transactions').select('*').eq('type', 'send').eq('status', 'collected').order('date_time', { ascending: false }).limit(50),
      ])
      if (sendError) throw sendError
      if (payoutError) throw payoutError

      const allUserIds = [...new Set([
        ...(sendTx ?? []).map((t) => t.user_id),
        ...(payoutTx ?? []).map((t) => t.agent_id),
      ].filter(Boolean))]
      const { data: profileRows, error: profileError } = allUserIds.length
        ? await supabase.from('profiles').select('id, full_name, surname').in('id', allUserIds)
        : { data: [], error: null }
      if (profileError) throw profileError
      const profiles = Object.fromEntries((profileRows ?? []).map((p) => [p.id, p]))

      const pw = (wallets ?? []).map((w) => ({
        userId: w.user_id,
        name: w.full_name || w.user_id,
        phone: w.phone || '—',
        accountId: w.anchor_account_id || null,
        reserved: Number(w.reserved_kobo) || 0,
        reversed: Number(w.reversed_kobo) || 0,
        reversedCount: Number(w.reversed_count) || 0,
        lastReversedAt: w.last_reversed_at,
        sentTotal: Number(w.sent_total_kobo) || 0,
        sentCount: Number(w.sent_count) || 0,
      }))
      const aw = (agents ?? []).map((a) => ({
        userId: a.user_id,
        name: a.business_name || a.full_name || a.user_id,
        fullName: a.full_name || '',
        businessName: a.business_name || '',
        location: a.location || '—',
        accountId: a.anchor_account_id || null,
        today: Number(a.commission_today_points) || 0,
        total: Number(a.commission_total_points) || 0,
        commissionBalance: Number(a.commission_balance_points) || 0,
        received: Number(a.cash_received_kobo) || 0,
        payouts: Number(a.payouts_count) || 0,
        withdrawn: Number(a.withdrawn_kobo) || 0,
        commissionPaid: Number(a.commission_paid_kobo) || 0,
      }))
      setPersonalWallets(pw)
      setAgentWallets(aw)
      setPersonalTx((sendTx ?? []).map((t) => ({
        ...t,
        amount: Number(t.amount),
        sender: t.sender_name_snapshot || (profiles[t.user_id] ? `${profiles[t.user_id].full_name} ${profiles[t.user_id].surname}` : 'Deleted user'),
      })))
      setAgentTx((payoutTx ?? []).map((t) => ({
        ...t,
        amount: Number(t.amount),
        agentName: t.agent_id ? (t.agent_name_snapshot || (profiles[t.agent_id] ? `${profiles[t.agent_id].full_name} ${profiles[t.agent_id].surname}` : 'Deleted user')) : '—',
      })))
      setLoading(false)
      fetchBalances([...pw.map((w) => w.accountId), ...aw.map((a) => a.accountId)])
    } catch (err) {
      setLoadError(err.message || 'Could not load wallet data.')
      setLoading(false)
    }
  }

  async function openDetail(kind, row) {
    setSelected({ kind, row })
    setDetailRows([])
    setDetailError('')
    setDetailLoading(true)
    try {
      const { data, error } = kind === 'personal'
        ? await supabase.rpc('admin_user_reversals', { p_user: row.userId })
        : await supabase.rpc('admin_agent_commission_daily', { p_agent: row.userId, p_days: 60 })
      if (error) throw error
      setDetailRows(data ?? [])
    } catch (err) {
      setDetailError(err.message || 'Could not load details.')
    } finally {
      setDetailLoading(false)
    }
  }

  function closeDetail() { setSelected(null) }

  const refreshBtn = (
    <button className="no-print" onClick={() => fetchBalances([...personalWallets.map((w) => w.accountId), ...agentWallets.map((a) => a.accountId)])} disabled={balLoading} style={smallBtn}>
      {balLoading ? 'Refreshing…' : 'Refresh'}
    </button>
  )
  const balNote = balError ? (
    <span style={{ fontSize: 12, color: 'var(--error)', marginRight: 10 }}>{balError}</span>
  ) : null

  return (
    <div style={{ padding: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: 22, marginBottom: 4 }}>Wallets</h1>
          <p style={{ color: 'var(--slate)', fontSize: 13, marginTop: 0 }}>
            Live balances, plus who each transaction actually went to and when. Click a row for details.
          </p>
        </div>
      </div>

      {loadError && (
        <div style={{ padding: 14, background: '#FEF2F2', color: 'var(--error)', borderRadius: 10, fontSize: 13, margin: '16px 0' }}>{loadError}</div>
      )}

      <div style={{ display: 'flex', gap: 8, margin: '20px 0 18px' }}>
        {['personal', 'agent'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              fontSize: 12.5, fontWeight: 600, padding: '8px 16px', borderRadius: 20,
              border: `1px solid ${tab === t ? 'var(--navy)' : 'var(--divider)'}`,
              background: tab === t ? 'var(--navy)' : '#fff',
              color: tab === t ? '#fff' : 'var(--text)', textTransform: 'capitalize',
            }}
          >
            {t} wallets
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ color: 'var(--slate)', fontSize: 13 }}>Loading…</div>
      ) : tab === 'personal' ? (
        <>
          <SectionHeader title="Balances" />
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            {balNote}
            {refreshBtn}
            <TableToolbar
              filename="personal-wallets"
              rows={personalWallets}
              columns={[
                { label: 'Customer', value: (w) => w.name },
                { label: 'Phone', value: (w) => w.phone },
                { label: 'Available balance', value: (w) => { const v = w.accountId ? balances[w.accountId] : null; return v === null || v === undefined ? '' : v / 100 } },
                { label: 'Reserved', value: (w) => w.reserved / 100 },
                { label: 'Reversed', value: (w) => w.reversed / 100 },
                { label: 'Reversed count', value: (w) => w.reversedCount },
                { label: 'Last reversed', value: (w) => (w.lastReversedAt ? fmtDateTime(w.lastReversedAt) : '') },
                { label: 'Sent total', value: (w) => w.sentTotal / 100 },
              ]}
            />
          </div>
          <Table
            headers={['Customer', 'Phone', 'Available balance', 'Reserved', 'Reversed', 'Sent total']}
            rows={personalWallets}
            keyFn={(w) => w.userId}
            emptyMessage="No personal wallets yet."
            onRowClick={(w) => openDetail('personal', w)}
            hoverKey={hoverKey}
            setHoverKey={setHoverKey}
            renderRow={(w) => (
              <>
                <td style={{ ...td, fontWeight: 600 }}>{w.name}</td>
                <td style={td} className="mono">{w.phone}</td>
                <td style={{ ...td, fontWeight: 600 }} className="mono">{balanceCell(w.accountId)}</td>
                <td style={{ ...td, color: 'var(--slate)' }} className="mono">{formatNaira(w.reserved)}</td>
                <td style={{ ...td, color: 'var(--slate)' }}>
                  <div className="mono">{formatNaira(w.reversed)}</div>
                  {w.reversedCount > 0 && (
                    <div style={{ fontSize: 11, marginTop: 2 }}>
                      {w.reversedCount} reversal{w.reversedCount === 1 ? '' : 's'}{w.lastReversedAt ? ` · last ${fmtDateTime(w.lastReversedAt)}` : ''}
                    </div>
                  )}
                </td>
                <td style={{ ...td, color: 'var(--slate)' }} className="mono">{formatNaira(w.sentTotal)}</td>
              </>
            )}
          />

          <SectionHeader title="Recent send transactions" />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
            <TableToolbar
              filename="personal-transactions"
              rows={personalTx}
              columns={[
                { label: 'Sender', value: (t) => t.sender },
                { label: 'Receiver phone', value: (t) => t.counterparty_mobile },
                { label: 'Amount', value: (t) => t.amount },
                { label: 'Date & time', value: (t) => t.date_time },
              ]}
            />
          </div>
          <Table
            headers={['Sender', 'Receiver phone', 'Amount', 'Date & time']}
            rows={personalTx}
            keyFn={(t) => t.reference}
            emptyMessage="No send transactions yet."
            renderRow={(t) => (
              <>
                <td style={{ padding: '12px 16px', fontWeight: 600 }}>{t.sender}</td>
                <td style={{ padding: '12px 16px' }} className="mono">{t.counterparty_mobile || '—'}</td>
                <td style={{ padding: '12px 16px', fontWeight: 600 }} className="mono">{'₦' + t.amount.toLocaleString('en-NG')}</td>
                <td style={{ padding: '12px 16px', color: 'var(--slate)' }}>{new Date(t.date_time).toLocaleString()}</td>
              </>
            )}
          />
        </>
      ) : (
        <>
          <SectionHeader title="Balances" />
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            {balNote}
            {refreshBtn}
            <TableToolbar
              filename="agent-wallets"
              rows={agentWallets}
              columns={[
                { label: 'Agent', value: (w) => w.name },
                { label: 'Location', value: (w) => w.location },
                { label: 'Wallet balance', value: (w) => { const v = w.accountId ? balances[w.accountId] : null; return v === null || v === undefined ? '' : v / 100 } },
                { label: 'Commission earned today', value: (w) => w.today },
                { label: 'Commission earned total', value: (w) => w.total },
                { label: 'Total cash received', value: (w) => w.received / 100 },
                { label: 'Total cash withdrawn', value: (w) => w.withdrawn / 100 },
                { label: 'Commission paid out', value: (w) => w.commissionPaid / 100 },
              ]}
            />
          </div>
          <Table
            headers={['Agent', 'Location', 'Wallet balance', 'Commission earned today', 'Commission earned total', 'Total cash received', 'Total cash withdrawn', 'Commission paid out']}
            rows={agentWallets}
            keyFn={(w) => w.userId}
            emptyMessage="No agent wallets yet."
            onRowClick={(w) => openDetail('agent', w)}
            hoverKey={hoverKey}
            setHoverKey={setHoverKey}
            renderRow={(w) => (
              <>
                <td style={{ ...td, fontWeight: 600 }}>{w.name}</td>
                <td style={{ ...td, color: 'var(--slate)' }}>{w.location}</td>
                <td style={{ ...td, fontWeight: 600 }} className="mono">{balanceCell(w.accountId)}</td>
                <td style={td} className="mono">{formatPoints(w.today)}</td>
                <td style={td} className="mono">{formatPoints(w.total)}</td>
                <td style={{ ...td, color: 'var(--slate)' }} className="mono">{formatNaira(w.received)}</td>
                <td style={{ ...td, color: 'var(--slate)' }} className="mono">{formatNaira(w.withdrawn)}</td>
                <td style={{ ...td, color: 'var(--slate)' }} className="mono">{formatNaira(w.commissionPaid)}</td>
              </>
            )}
          />

          <SectionHeader title="Recent payout transactions" />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
            <TableToolbar
              filename="agent-transactions"
              rows={agentTx}
              columns={[
                { label: 'Agent', value: (t) => t.agentName },
                { label: 'Receiver phone', value: (t) => t.counterparty_mobile },
                { label: 'Amount', value: (t) => t.amount },
                { label: 'Date & time', value: (t) => t.date_time },
              ]}
            />
          </div>
          <Table
            headers={['Agent', 'Receiver phone', 'Amount', 'Date & time']}
            rows={agentTx}
            keyFn={(t) => t.reference}
            emptyMessage="No payout transactions yet."
            renderRow={(t) => (
              <>
                <td style={{ padding: '12px 16px', fontWeight: 600 }}>{t.agentName}</td>
                <td style={{ padding: '12px 16px' }} className="mono">{t.counterparty_mobile || '—'}</td>
                <td style={{ padding: '12px 16px', fontWeight: 600 }} className="mono">{'₦' + t.amount.toLocaleString('en-NG')}</td>
                <td style={{ padding: '12px 16px', color: 'var(--slate)' }}>{new Date(t.date_time).toLocaleString()}</td>
              </>
            )}
          />
        </>
      )}

      {selected?.kind === 'personal' && (
        <DetailModal title={selected.row.name} onClose={closeDetail} loading={detailLoading} error={detailError} width={760}>
          <DetailRow label="Phone" value={selected.row.phone} mono />
          <DetailRow label="Available balance" value={balanceCell(selected.row.accountId)} mono />
          <DetailRow label="Reserved" value={formatNaira(selected.row.reserved)} mono />
          <DetailRow label="Reversed" value={`${formatNaira(selected.row.reversed)} (${selected.row.reversedCount})`} mono />
          <DetailRow label="Last reversed" value={fmtDateTime(selected.row.lastReversedAt)} />
          <DetailRow label="Sent total" value={`${formatNaira(selected.row.sentTotal)} (${selected.row.sentCount} sends)`} mono />
          <DetailSectionLabel>Reversals</DetailSectionLabel>
          <MiniTable
            headers={['Reference', 'Receiver phone', 'Amount', 'Fee', 'Sent', 'Reversed']}
            rows={detailRows}
            keyFn={(r, i) => r.reference || i}
            empty="No reversals for this customer."
            renderRow={(r) => (
              <>
                <td style={mtd} className="mono">{r.reference}</td>
                <td style={mtd} className="mono">{r.receiver_phone || '—'}</td>
                <td style={mtd} className="mono">{formatNaira(r.amount_kobo)}</td>
                <td style={mtd} className="mono">{formatNaira(r.fee_kobo)}</td>
                <td style={mtd}>{fmtDateTime(r.sent_at)}</td>
                <td style={mtd}>{fmtDateTime(r.reversed_at)}</td>
              </>
            )}
          />
        </DetailModal>
      )}

      {selected?.kind === 'agent' && (
        <DetailModal title={selected.row.name} onClose={closeDetail} loading={detailLoading} error={detailError} width={640}>
          {selected.row.businessName && selected.row.fullName && <DetailRow label="Agent name" value={selected.row.fullName} />}
          <DetailRow label="Location" value={selected.row.location} />
          <DetailRow label="Wallet balance" value={balanceCell(selected.row.accountId)} mono />
          <DetailRow label="Commission earned today" value={formatPoints(selected.row.today)} mono />
          <DetailRow label="Commission earned total" value={formatPoints(selected.row.total)} mono />
          <DetailRow label="Total cash received" value={formatNaira(selected.row.received)} mono />
          <DetailRow label="Total cash withdrawn" value={formatNaira(selected.row.withdrawn)} mono />
          <DetailRow label="Commission paid out" value={formatNaira(selected.row.commissionPaid)} mono />
          <DetailSectionLabel>Day by day (last 60 days)</DetailSectionLabel>
          <MiniTable
            headers={['Date', 'Commission', 'Payouts', 'Cash paid out']}
            rows={detailRows}
            keyFn={(r, i) => r.day || i}
            empty="No activity in this period."
            renderRow={(r) => (
              <>
                <td style={mtd}>{fmtDay(r.day)}</td>
                <td style={mtd} className="mono">{formatPoints(Number(r.points) || 0)}</td>
                <td style={mtd} className="mono">{Number(r.payouts) || 0}</td>
                <td style={mtd} className="mono">{formatNaira(Number(r.paid_out_kobo) || 0)}</td>
              </>
            )}
          />
        </DetailModal>
      )}
    </div>
  )
}

const mtd = { padding: '8px 10px', whiteSpace: 'nowrap' }

function MiniTable({ headers, rows, keyFn, renderRow, empty }) {
  return (
    <div style={{ overflowX: 'auto', border: '1px solid var(--divider)', borderRadius: 10 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ background: '#FAFBFC', borderBottom: '1px solid var(--divider)' }}>
            {headers.map((h) => (
              <th key={h} style={{ textAlign: 'left', padding: '8px 10px', fontWeight: 700, color: 'var(--slate)', fontSize: 10.5, textTransform: 'uppercase', letterSpacing: 0.3, whiteSpace: 'nowrap' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={headers.length} style={{ padding: 18, textAlign: 'center', color: 'var(--slate)' }}>{empty}</td></tr>
          ) : (
            rows.map((r, i) => (
              <tr key={keyFn(r, i)} style={{ borderBottom: '1px solid var(--divider)' }}>{renderRow(r)}</tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

function SectionHeader({ title }) {
  return (
    <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--slate)', letterSpacing: 0.3, textTransform: 'uppercase', margin: '22px 0 10px' }}>
      {title}
    </div>
  )
}

function Table({ headers, rows, keyFn, renderRow, emptyMessage, onRowClick, hoverKey, setHoverKey }) {
  return (
    <div style={{ background: '#fff', border: '1px solid var(--divider)', borderRadius: 14, overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
        <thead>
          <tr style={{ background: '#FAFBFC', borderBottom: '1px solid var(--divider)' }}>
            {headers.map((h) => (
              <th key={h} style={{ textAlign: 'left', padding: '11px 16px', fontWeight: 700, color: 'var(--slate)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.3 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={headers.length} style={{ padding: 24, textAlign: 'center', color: 'var(--slate)' }}>{emptyMessage}</td></tr>
          ) : (
            rows.map((r) => (
              <tr
                key={keyFn(r)}
                onClick={onRowClick ? () => onRowClick(r) : undefined}
                onMouseEnter={onRowClick ? () => setHoverKey(keyFn(r)) : undefined}
                onMouseLeave={onRowClick ? () => setHoverKey(null) : undefined}
                style={{
                  borderBottom: '1px solid var(--divider)',
                  ...(onRowClick ? { cursor: 'pointer', background: hoverKey === keyFn(r) ? '#F5F7FA' : undefined } : null),
                }}
              >
                {renderRow(r)}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
