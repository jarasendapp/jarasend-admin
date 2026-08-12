import { useEffect, useMemo, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { supabase } from '../lib/supabase'

export default function Analytics() {
  const [profiles, setProfiles] = useState([])
  const [kycRecords, setKycRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [{ data: p, error: pErr }, { data: k, error: kErr }] = await Promise.all([
          supabase.from('profiles').select('id, roles, state, business_state, created_at'),
          supabase.from('kyc_records').select('status, role'),
        ])
        if (pErr) throw pErr
        if (kErr) throw kErr
        if (cancelled) return
        setProfiles(p ?? [])
        setKycRecords(k ?? [])
      } catch (err) {
        if (!cancelled) setError(err.message || 'Could not load analytics.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const stateBreakdown = useMemo(() => {
    const counts = {}
    for (const p of profiles) {
      const isAgent = p.roles?.includes('agent')
      const state = isAgent ? p.business_state : p.state
      if (!state) continue
      counts[state] = (counts[state] ?? 0) + 1
    }
    return Object.entries(counts)
      .map(([state, count]) => ({ state, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
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

  return (
    <div style={{ padding: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: 22, marginBottom: 4 }}>Analytics</h1>
          <p style={{ color: 'var(--slate)', fontSize: 13, marginTop: 0, marginBottom: 24 }}>
            {loading ? 'Loading…' : 'Real registration and verification data.'}
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        <StatCard label="Personal accounts" value={personalCount} />
        <StatCard label="Agent accounts" value={agentCount} />
        <StatCard label="KYC approval rate" value={`${kycStats.approvalRate}%`} />
        <StatCard label="Total KYC submissions" value={kycStats.total} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16 }}>
        <div style={{ background: '#fff', border: '1px solid var(--divider)', borderRadius: 14, padding: 18 }}>
          <h3 style={{ fontSize: 14, marginBottom: 12 }}>Users by state (top 10)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={stateBreakdown} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid stroke="#F0F2F5" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <YAxis type="category" dataKey="state" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={110} />
              <Tooltip />
              <Bar dataKey="count" fill="var(--green)" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background: '#fff', border: '1px solid var(--divider)', borderRadius: 14, padding: 18 }}>
          <h3 style={{ fontSize: 14, marginBottom: 16 }}>KYC outcomes</h3>
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
                <div style={{
                  height: '100%', width: kycStats.total ? `${(s.value / kycStats.total) * 100}%` : '0%',
                  background: s.color, borderRadius: 4,
                }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value }) {
  return (
    <div style={{ background: '#fff', border: '1px solid var(--divider)', borderRadius: 14, padding: 16 }}>
      <div className="num" style={{ fontSize: 22, fontWeight: 600, marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--slate)' }}>{label}</div>
    </div>
  )
}
