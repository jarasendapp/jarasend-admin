import { useEffect, useMemo, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts'
import { supabase } from '../lib/supabase'

function formatNaira(n) {
  return '₦' + n.toLocaleString('en-NG')
}

const TABS = ['Overview', 'Revenue', 'Expenses', 'Transactions', 'Agents']

export default function Analytics() {
  const [tab, setTab] = useState('Overview')
  const [profiles, setProfiles] = useState([])
  const [kycRecords, setKycRecords] = useState([])
  const [revenueRows, setRevenueRows] = useState([])
  const [transactions, setTransactions] = useState([])
  const [agentAccounts, setAgentAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [
          { data: p, error: pErr },
          { data: k, error: kErr },
          { data: rev, error: revErr },
          { data: tx, error: txErr },
          { data: agents, error: agentsErr },
        ] = await Promise.all([
          supabase.from('profiles').select('id, roles, state, business_state, created_at'),
          supabase.from('kyc_records').select('status, role'),
          supabase.from('company_revenue').select('type, amount, created_at'),
          supabase.from('transactions').select('type, status, amount, fee, date_time'),
          supabase.from('agent_accounts').select('user_id, float, commission, total_cash_received, total_cash_withdrawn'),
        ])
        if (pErr) throw pErr
        if (kErr) throw kErr
        if (revErr) throw revErr
        if (txErr) throw txErr
        if (agentsErr) throw agentsErr
        if (cancelled) return
        setProfiles(p ?? [])
        setKycRecords(k ?? [])
        setRevenueRows((rev ?? []).map((r) => ({ ...r, amount: Number(r.amount) })))
        setTransactions((tx ?? []).map((t) => ({ ...t, amount: Number(t.amount), fee: Number(t.fee) })))
        setAgentAccounts((agents ?? []).map((a) => ({ ...a, float: Number(a.float), commission: Number(a.commission), received: Number(a.total_cash_received), withdrawn: Number(a.total_cash_withdrawn) })))
      } catch (err) {
        if (!cancelled) setError(err.message || 'Could not load analytics.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  // ---- Overview ----
  const stateBreakdown = useMemo(() => {
    const counts = {}
    for (const p of profiles) {
      const isAgent = p.roles?.includes('agent')
      const state = isAgent ? p.business_state : p.state
      if (!state) continue
      counts[state] = (counts[state] ?? 0) + 1
    }
    return Object.entries(counts).map(([state, count]) => ({ state, count })).sort((a, b) => b.count - a.count).slice(0, 10)
  }, [profiles])

  const kycStats = useMemo(() => {
    const byStatus = { approved: 0, pending: 0, rejected: 0 }
    for (const k of kycRecords) {
      if (byStatus[k.status] !== undefined) byStatus[k.status] += 1
    }
    const total = byStatus.approved + byStatus.pending + byStatus.rejected
    const approvalRate = total > 0 ? ((byStatus.approved / total) * 100).toFixed(1) : '0.0'
    return { ...byStatus, total, approvalRate }
  }, [kycRecords])

  const personalCount = profiles.filter((p) => p.roles?.includes('personal')).length
  const agentCount = profiles.filter((p) => p.roles?.includes('agent')).length

  // ---- Revenue ----
  const revenueTotals = useMemo(() => {
    const totals = { transaction_fee: 0, onboarding_fee: 0 }
    for (const r of revenueRows) {
      if (r.type === 'transaction_fee' || r.type === 'onboarding_fee') totals[r.type] += r.amount
    }
    return totals
  }, [revenueRows])

  const revenueByDay = useMemo(() => {
    const days = {}
    for (const r of revenueRows) {
      if (r.type !== 'transaction_fee' && r.type !== 'onboarding_fee') continue
      const key = new Date(r.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
      days[key] = (days[key] ?? 0) + r.amount
    }
    return Object.entries(days).map(([day, amount]) => ({ day, amount })).slice(-14)
  }, [revenueRows])

  // ---- Expenses ----
  const commissionTotal = useMemo(() => revenueRows.filter((r) => r.type === 'agent_commission').reduce((s, r) => s + r.amount, 0), [revenueRows])
  const floatOutstanding = useMemo(() => agentAccounts.reduce((s, a) => s + a.float, 0), [agentAccounts])

  // ---- Transactions ----
  const txByType = useMemo(() => {
    const counts = {}
    for (const t of transactions) counts[t.type] = (counts[t.type] ?? 0) + 1
    return Object.entries(counts).map(([type, count]) => ({ type, count }))
  }, [transactions])

  const txByStatus = useMemo(() => {
    const counts = {}
    for (const t of transactions) counts[t.status] = (counts[t.status] ?? 0) + 1
    return Object.entries(counts).map(([status, count]) => ({ status, count }))
  }, [transactions])

  const totalVolume = useMemo(() => transactions.reduce((s, t) => s + t.amount, 0), [transactions])

  // ---- Agents ----
  const activeAgentCount = agentAccounts.filter((a) => a.received > 0).length
  const avgFloat = agentAccounts.length ? floatOutstanding / agentAccounts.length : 0

  const PIE_COLORS = ['#0B1F3A', '#2E8B57', '#854F0B', '#B91C1C', '#6366F1']

  return (
    <div style={{ padding: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: 22, marginBottom: 4 }}>Analytics</h1>
          <p style={{ color: 'var(--slate)', fontSize: 13, marginTop: 0, marginBottom: 20 }}>
            {loading ? 'Loading…' : 'Live across users, revenue, expenses, transactions, and agents.'}
          </p>
        </div>
        <button
          className="no-print"
          onClick={() => window.print()}
          style={{ padding: '8px 14px', borderRadius: 10, border: '1px solid var(--divider)', background: '#fff', fontSize: 12.5, fontWeight: 600, color: 'var(--navy)' }}
        >
          🖨 Print
        </button>
      </div>

      {error && (
        <div style={{ background: 'var(--error-tint)', color: 'var(--error)', borderRadius: 10, padding: '12px 14px', fontSize: 13, marginBottom: 20 }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 22 }}>
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              fontSize: 12.5, fontWeight: 600, padding: '8px 16px', borderRadius: 20,
              border: `1px solid ${tab === t ? 'var(--navy)' : 'var(--divider)'}`,
              background: tab === t ? 'var(--navy)' : '#fff',
              color: tab === t ? '#fff' : 'var(--text)', cursor: 'pointer',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Overview' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
            <StatCard label="Personal accounts" value={personalCount} />
            <StatCard label="Agent accounts" value={agentCount} />
            <StatCard label="KYC approval rate" value={`${kycStats.approvalRate}%`} />
            <StatCard label="Total KYC submissions" value={kycStats.total} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16 }}>
            <ChartPanel title="Users by state (top 10)">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={stateBreakdown} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid stroke="#F0F2F5" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="state" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={110} />
                  <Tooltip />
                  <Bar dataKey="count" fill="var(--green)" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartPanel>
            <ChartPanel title="KYC outcomes">
              {[
                { label: 'Approved', value: kycStats.approved, color: 'var(--green-dark)' },
                { label: 'Pending', value: kycStats.pending, color: '#854F0B' },
                { label: 'Rejected', value: kycStats.rejected, color: 'var(--error)' },
              ].map((s) => (
                <div key={s.label} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 4 }}>
                    <span>{s.label}</span>
                    <span style={{ fontWeight: 600 }}>{s.value}</span>
                  </div>
                  <div style={{ height: 6, background: '#F0F2F5', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: kycStats.total ? `${(s.value / kycStats.total) * 100}%` : '0%', background: s.color, borderRadius: 4 }} />
                  </div>
                </div>
              ))}
            </ChartPanel>
          </div>
        </>
      )}

      {tab === 'Revenue' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
            <StatCard label="Transaction fees" value={formatNaira(revenueTotals.transaction_fee)} />
            <StatCard label="Onboarding fees" value={formatNaira(revenueTotals.onboarding_fee)} />
            <StatCard label="Total revenue" value={formatNaira(revenueTotals.transaction_fee + revenueTotals.onboarding_fee)} />
          </div>
          <ChartPanel title="Revenue over time">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenueByDay}>
                <CartesianGrid stroke="#F0F2F5" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => formatNaira(v)} />
                <Line type="monotone" dataKey="amount" stroke="var(--green-dark)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartPanel>
        </>
      )}

      {tab === 'Expenses' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
            <StatCard label="Agent commission paid" value={formatNaira(commissionTotal)} />
            <StatCard label="Float outstanding to agents" value={formatNaira(floatOutstanding)} />
            <StatCard label="Net revenue" value={formatNaira(revenueTotals.transaction_fee + revenueTotals.onboarding_fee - commissionTotal)} />
          </div>
          <ChartPanel title="Note">
            <p style={{ fontSize: 12.5, color: 'var(--slate)', lineHeight: 1.6, margin: 0 }}>
              GetAnchor processing fees and SMS delivery charges aren't included here — those third-party integrations aren't connected yet, so there's no real cost data to show for them.
            </p>
          </ChartPanel>
        </>
      )}

      {tab === 'Transactions' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
            <StatCard label="Total transactions" value={transactions.length} />
            <StatCard label="Total volume" value={formatNaira(totalVolume)} />
            <StatCard label="Average transaction" value={formatNaira(transactions.length ? totalVolume / transactions.length : 0)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <ChartPanel title="By type">
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={txByType} dataKey="count" nameKey="type" cx="50%" cy="50%" outerRadius={90} label>
                    {txByType.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </ChartPanel>
            <ChartPanel title="By status">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={txByStatus}>
                  <CartesianGrid stroke="#F0F2F5" vertical={false} />
                  <XAxis dataKey="status" tick={{ fontSize: 10.5 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="var(--navy)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartPanel>
          </div>
        </>
      )}

      {tab === 'Agents' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
            <StatCard label="Total agents" value={agentAccounts.length} />
            <StatCard label="Active agents" value={activeAgentCount} />
            <StatCard label="Average float" value={formatNaira(avgFloat)} />
            <StatCard label="Total float outstanding" value={formatNaira(floatOutstanding)} />
          </div>
          <ChartPanel title="Note">
            <p style={{ fontSize: 12.5, color: 'var(--slate)', lineHeight: 1.6, margin: 0 }}>
              "Active" means an agent has received at least one cash pickup. See the Commission page for a ranked list of top earners this month, and the Wallets page for individual agent balances.
            </p>
          </ChartPanel>
        </>
      )}
    </div>
  )
}

function StatCard({ label, value }) {
  return (
    <div style={{ background: '#fff', border: '1px solid var(--divider)', borderRadius: 14, padding: 16 }}>
      <div className="num" style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--slate)' }}>{label}</div>
    </div>
  )
}

function ChartPanel({ title, children }) {
  return (
    <div style={{ background: '#fff', border: '1px solid var(--divider)', borderRadius: 14, padding: 18, marginBottom: 16 }}>
      <h3 style={{ fontSize: 14, marginBottom: 12 }}>{title}</h3>
      {children}
    </div>
  )
}
