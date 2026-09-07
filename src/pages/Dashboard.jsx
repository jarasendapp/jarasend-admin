import { useEffect, useState } from 'react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { supabase } from '../lib/supabase'
import KpiCard from '../components/KpiCard'

// Wallet balances, transaction counts, and revenue are now genuinely
// live, pulled from Supabase. GetAnchor and SMS costs remain sample —
// genuinely dependent on those third-party integrations, which aren't
// built yet.
const SAMPLE_ANCHOR_FEES = 18200          // GetAnchor's per-transaction processing fee
const SAMPLE_SMS_FEES = 4800              // SMS provider charges for redemption codes

function formatNaira(n) {
  return '₦' + n.toLocaleString('en-NG')
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [stats, setStats] = useState({
    totalCustomers: 0, totalAgents: 0,
    pendingCustomerKyc: 0, pendingAgentKyc: 0,
    approvedCustomers: 0, approvedAgents: 0,
    rejectedCustomers: 0, rejectedAgents: 0,
    growthByMonth: [],
    realGrossFees: 0, realOnboardingFees: 0, realAgentCommission: 0,
    realWalletTotal: 0, pendingPickup: 0, completedPickup: 0, dailyTx: [],
  })

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [
          { count: totalCustomers },
          { count: totalAgents },
          { count: pendingCustomerKyc },
          { count: pendingAgentKyc },
          { count: approvedCustomers },
          { count: approvedAgents },
          { count: rejectedCustomers },
          { count: rejectedAgents },
          { data: recentProfiles },
          { data: revenueRows, error: revenueError },
          { data: personalWallets, error: personalWalletsError },
          { data: agentWallets, error: agentWalletsError },
          { count: pendingPickup },
          { count: completedPickup },
          { data: recentTx, error: recentTxError },
        ] = await Promise.all([
          supabase.from('profiles').select('*', { count: 'exact', head: true }).contains('roles', ['personal']),
          supabase.from('profiles').select('*', { count: 'exact', head: true }).contains('roles', ['agent']),
          supabase.from('kyc_records').select('*', { count: 'exact', head: true }).eq('role', 'personal').eq('status', 'pending'),
          supabase.from('kyc_records').select('*', { count: 'exact', head: true }).eq('role', 'agent').eq('status', 'pending'),
          supabase.from('kyc_records').select('*', { count: 'exact', head: true }).eq('role', 'personal').eq('status', 'approved'),
          supabase.from('kyc_records').select('*', { count: 'exact', head: true }).eq('role', 'agent').eq('status', 'approved'),
          supabase.from('kyc_records').select('*', { count: 'exact', head: true }).eq('role', 'personal').eq('status', 'rejected'),
          supabase.from('kyc_records').select('*', { count: 'exact', head: true }).eq('role', 'agent').eq('status', 'rejected'),
          supabase.from('profiles').select('created_at').order('created_at', { ascending: true }),
          supabase.from('company_revenue').select('type, amount'),
          supabase.from('wallets').select('available'),
          supabase.from('agent_accounts').select('float'),
          supabase.from('transactions').select('*', { count: 'exact', head: true }).eq('type', 'send').eq('status', 'pendingCollection'),
          supabase.from('transactions').select('*', { count: 'exact', head: true }).eq('type', 'send').eq('status', 'collected'),
          supabase.from('transactions').select('date_time').eq('type', 'send').order('date_time', { ascending: false }).limit(1000),
        ])
        if (revenueError) throw revenueError
        if (personalWalletsError) throw personalWalletsError
        if (agentWalletsError) throw agentWalletsError
        if (recentTxError) throw recentTxError

        if (cancelled) return

        // Bucket real signups by month for the growth chart.
        const monthCounts = {}
        for (const row of recentProfiles ?? []) {
          const d = new Date(row.created_at)
          const key = d.toLocaleString('en-US', { month: 'short' })
          monthCounts[key] = (monthCounts[key] ?? 0) + 1
        }
        const growthByMonth = Object.entries(monthCounts).map(([month, count]) => ({ month, count }))

        const realGrossFees = (revenueRows ?? []).filter((r) => r.type === 'transaction_fee').reduce((sum, r) => sum + Number(r.amount), 0)
        const realOnboardingFees = (revenueRows ?? []).filter((r) => r.type === 'onboarding_fee').reduce((sum, r) => sum + Number(r.amount), 0)
        const realAgentCommission = (revenueRows ?? []).filter((r) => r.type === 'agent_commission').reduce((sum, r) => sum + Number(r.amount), 0)

        const realWalletTotal = (personalWallets ?? []).reduce((sum, w) => sum + Number(w.available), 0)
          + (agentWallets ?? []).reduce((sum, a) => sum + Number(a.float), 0)

        // Bucket the last 7 days of send transactions by day for the chart.
        const dayCounts = {}
        const dayOrder = []
        for (const row of recentTx ?? []) {
          const d = new Date(row.date_time)
          const key = d.toLocaleDateString('en-US', { weekday: 'short' })
          if (!(key in dayCounts)) dayOrder.push(key)
          dayCounts[key] = (dayCounts[key] ?? 0) + 1
        }
        const dailyTx = dayOrder.slice(0, 7).reverse().map((day) => ({ day, count: dayCounts[day] }))

        setStats({
          totalCustomers: totalCustomers ?? 0,
          totalAgents: totalAgents ?? 0,
          pendingCustomerKyc: pendingCustomerKyc ?? 0,
          pendingAgentKyc: pendingAgentKyc ?? 0,
          approvedCustomers: approvedCustomers ?? 0,
          approvedAgents: approvedAgents ?? 0,
          rejectedCustomers: rejectedCustomers ?? 0,
          rejectedAgents: rejectedAgents ?? 0,
          growthByMonth,
          realGrossFees,
          realOnboardingFees,
          realAgentCommission,
          realWalletTotal,
          pendingPickup: pendingPickup ?? 0,
          completedPickup: completedPickup ?? 0,
          dailyTx,
        })
      } catch (err) {
        if (!cancelled) setError(err.message || 'Could not load dashboard data.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [])

  return (
    <div style={{ padding: 28 }}>
      <h1 style={{ fontSize: 22, marginBottom: 4 }}>Dashboard</h1>
      <p style={{ color: 'var(--slate)', fontSize: 13, marginTop: 0, marginBottom: 24 }}>
        Real-time overview of registrations, verification, and activity.
      </p>

      {error && (
        <div style={{ background: 'var(--error-tint)', color: 'var(--error)', borderRadius: 10, padding: '12px 14px', fontSize: 13, marginBottom: 20 }}>
          {error}
        </div>
      )}

      <SectionLabel>Registrations & KYC — live data</SectionLabel>
      <div style={grid}>
        <KpiCard label="Total customers" value={loading ? '—' : stats.totalCustomers} icon="👤" tint="navy" />
        <KpiCard label="Total agents" value={loading ? '—' : stats.totalAgents} icon="🧑‍💼" tint="navy" />
        <KpiCard label="Pending customer KYC" value={loading ? '—' : stats.pendingCustomerKyc} icon="⏳" tint="gold" />
        <KpiCard label="Pending agent KYC" value={loading ? '—' : stats.pendingAgentKyc} icon="⏳" tint="gold" />
        <KpiCard label="Approved customers" value={loading ? '—' : stats.approvedCustomers} icon="✅" tint="green" />
        <KpiCard label="Approved agents" value={loading ? '—' : stats.approvedAgents} icon="✅" tint="green" />
        <KpiCard label="Rejected customers" value={loading ? '—' : stats.rejectedCustomers} icon="✕" tint="gold" />
        <KpiCard label="Rejected agents" value={loading ? '—' : stats.rejectedAgents} icon="✕" tint="gold" />
      </div>

      <SectionLabel>Money & transactions — fees & commission now live, rest still sample</SectionLabel>
      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 16, marginBottom: 14 }}>
        <RevenueBreakdown realGrossFees={stats.realGrossFees} realOnboardingFees={stats.realOnboardingFees} realAgentCommission={stats.realAgentCommission} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <KpiCard label="Total wallet balance" value={formatNaira(stats.realWalletTotal)} icon="💰" tint="navy" />
          <KpiCard label="Pending cash pickup" value={stats.pendingPickup} icon="⏳" tint="gold" />
          <KpiCard label="Completed cash pickup" value={stats.completedPickup} icon="✅" tint="green" />
          <KpiCard
            label="Net margin"
            value={
              stats.realGrossFees + stats.realOnboardingFees > 0
                ? (((stats.realGrossFees + stats.realOnboardingFees - stats.realAgentCommission - SAMPLE_ANCHOR_FEES - SAMPLE_SMS_FEES) / (stats.realGrossFees + stats.realOnboardingFees)) * 100).toFixed(1) + '%'
                : '—'
            }
            icon="📊" tint="green" sample
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 8 }}>
        <ChartCard title="Customer & agent signups by month" sample={false}>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={stats.growthByMonth}>
              <CartesianGrid stroke="#F0F2F5" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="var(--green-dark)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Daily transaction trend (last 7 days)" sample={false}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stats.dailyTx}>
              <CartesianGrid stroke="#F0F2F5" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="var(--green)" radius={[6, 6, 3, 3]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  )
}

function SectionLabel({ children }) {
  return (
    <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--slate)', letterSpacing: 0.3, textTransform: 'uppercase', margin: '22px 0 12px' }}>
      {children}
    </div>
  )
}

function RevenueBreakdown({ realGrossFees, realOnboardingFees, realAgentCommission }) {
  const totalRealRevenue = realGrossFees + realOnboardingFees
  const netRevenue = totalRealRevenue - realAgentCommission - SAMPLE_ANCHOR_FEES - SAMPLE_SMS_FEES

  const rows = [
    { label: 'Transaction fees (1.020% per send)', value: realGrossFees, kind: 'total', live: true },
    { label: 'Agent onboarding fees', value: realOnboardingFees, kind: 'total', live: true },
    { label: 'Agent commission paid', value: -realAgentCommission, kind: 'expense', live: true },
    { label: 'Anchor (GetAnchor) processing fees', value: -SAMPLE_ANCHOR_FEES, kind: 'expense', live: false },
    { label: 'SMS charges fees', value: -SAMPLE_SMS_FEES, kind: 'expense', live: false },
  ]

  return (
    <div style={{ background: '#fff', border: '1px solid var(--divider)', borderRadius: 14, padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ fontSize: 14 }}>Revenue breakdown</h3>
        <span style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--slate)' }}>
          Fees genuinely tracked live — commission/Anchor/SMS still sample
        </span>
      </div>

      {rows.map((row) => (
        <div key={row.label} style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '9px 0', borderBottom: '1px solid var(--divider)',
        }}>
          <span style={{ fontSize: 13, color: row.kind === 'total' ? 'var(--navy)' : 'var(--slate)', fontWeight: row.kind === 'total' ? 600 : 400, display: 'flex', alignItems: 'center', gap: 8 }}>
            {row.label}
            <span style={{
              fontSize: 8.5, fontWeight: 700, padding: '1px 6px', borderRadius: 20,
              background: row.live ? 'var(--green-tint)' : 'var(--gold-tint)',
              color: row.live ? 'var(--green-dark)' : '#854F0B',
            }}>
              {row.live ? 'LIVE' : 'SAMPLE'}
            </span>
          </span>
          <span className="mono" style={{ fontSize: 13.5, fontWeight: 600, color: row.value < 0 ? 'var(--error)' : 'var(--navy)' }}>
            {row.value < 0 ? '–' : ''}{formatNaira(Math.abs(row.value))}
          </span>
        </div>
      ))}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 14 }}>
        <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--navy)' }}>
          Total amount company made (after expenses)
        </span>
        <span className="mono" style={{ fontSize: 17, fontWeight: 700, color: 'var(--green-dark)' }}>
          {formatNaira(netRevenue)}
        </span>
      </div>
    </div>
  )
}

function ChartCard({ title, sample, children }) {
  return (
    <div style={{ background: '#fff', border: '1px solid var(--divider)', borderRadius: 14, padding: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ fontSize: 14 }}>{title}</h3>
        {sample && (
          <span style={{ fontSize: 9.5, fontWeight: 700, background: 'var(--gold-tint)', color: '#854F0B', padding: '2px 7px', borderRadius: 20 }}>
            SAMPLE DATA
          </span>
        )}
      </div>
      {children}
    </div>
  )
}

const grid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
  gap: 14,
}
