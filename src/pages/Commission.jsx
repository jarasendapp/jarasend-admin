import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import TableToolbar from '../components/TableToolbar'

// This is the ACTUAL formula from the mobile app's transaction repository
// (calculateAgentCommission) — not an approximation. Below ₦5,000 sent,
// no commission. From ₦5,000 up, ₦1 per ₦5,000 band. Kept identical here
// so this page can never drift out of sync with what agents actually earn.
function calculateAgentCommission(amount) {
  if (amount < 5000) return 0
  const band = Math.floor((amount - 5000) / 5000) + 1
  return band * 1
}

const MIN_COMMISSION_WITHDRAWAL = 100

function formatNaira(n, decimals = 0) {
  return '₦' + n.toLocaleString('en-NG', { minimumFractionDigits: decimals, maximumFractionDigits: Math.max(decimals, 2) })
}

const BAND_PREVIEW = [4999, 5000, 10000, 15000, 20000, 30000, 50000, 100000]

export default function Commission() {
  const [calcAmount, setCalcAmount] = useState('')
  const calcResult = calcAmount ? calculateAgentCommission(Number(calcAmount)) : null

  const [topEarners, setTopEarners] = useState([])
  const [totalPaidThisMonth, setTotalPaidThisMonth] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    setLoadError('')
    try {
      const monthStart = new Date()
      monthStart.setDate(1)
      monthStart.setHours(0, 0, 0, 0)

      const { data: rows, error } = await supabase
        .from('company_revenue')
        .select('related_user_id, amount')
        .eq('type', 'agent_commission')
        .gte('created_at', monthStart.toISOString())
      if (error) throw error

      const totals = {}
      for (const r of rows ?? []) {
        totals[r.related_user_id] = (totals[r.related_user_id] ?? 0) + Number(r.amount)
      }
      const total = Object.values(totals).reduce((s, v) => s + v, 0)
      setTotalPaidThisMonth(total)

      const userIds = Object.keys(totals)
      const { data: profileRows, error: profileError } = userIds.length
        ? await supabase.from('profiles').select('id, full_name, surname, business_town').in('id', userIds)
        : { data: [], error: null }
      if (profileError) throw profileError
      const profiles = Object.fromEntries((profileRows ?? []).map((p) => [p.id, p]))

      const earners = userIds
        .map((id) => ({
          id,
          name: profiles[id] ? `${profiles[id].full_name} ${profiles[id].surname}` : id,
          location: profiles[id]?.business_town || '—',
          paid: totals[id],
        }))
        .sort((a, b) => b.paid - a.paid)
        .slice(0, 10)
      setTopEarners(earners)
    } catch (err) {
      setLoadError(err.message || 'Could not load commission data.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: 28 }}>
      <h1 style={{ fontSize: 22, marginBottom: 4 }}>Commission</h1>
      <p style={{ color: 'var(--slate)', fontSize: 13, marginTop: 0, marginBottom: 24 }}>
        How agent commission is calculated, and what's been paid out.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div style={{ background: '#fff', border: '1px solid var(--divider)', borderRadius: 14, padding: 22 }}>
          <h3 style={{ fontSize: 14, marginBottom: 4 }}>Commission structure</h3>
          <p style={{ fontSize: 12, color: 'var(--slate)', marginTop: 0, marginBottom: 16 }}>
            No commission below ₦5,000 sent. ₦1 per ₦5,000 band above that.
          </p>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--divider)' }}>
                <th style={{ textAlign: 'left', padding: '8px 4px', color: 'var(--slate)', fontSize: 11, fontWeight: 700 }}>Amount sent</th>
                <th style={{ textAlign: 'right', padding: '8px 4px', color: 'var(--slate)', fontSize: 11, fontWeight: 700 }}>Agent earns</th>
              </tr>
            </thead>
            <tbody>
              {BAND_PREVIEW.map((amt) => (
                <tr key={amt} style={{ borderBottom: '1px solid var(--divider)' }}>
                  <td style={{ padding: '8px 4px' }} className="mono">{formatNaira(amt)}</td>
                  <td style={{ padding: '8px 4px', textAlign: 'right', fontWeight: 600 }} className="mono">
                    {formatNaira(calculateAgentCommission(amt))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ fontSize: 11.5, color: 'var(--slate)', marginTop: 14 }}>
            Minimum commission withdrawal: <strong>{formatNaira(MIN_COMMISSION_WITHDRAWAL)}</strong> (100 points).
          </p>
        </div>

        <div style={{ background: '#fff', border: '1px solid var(--divider)', borderRadius: 14, padding: 22 }}>
          <h3 style={{ fontSize: 14, marginBottom: 4 }}>Commission calculator</h3>
          <p style={{ fontSize: 12, color: 'var(--slate)', marginTop: 0, marginBottom: 16 }}>
            Enter a transfer amount to check what an agent would earn on it — useful for support queries.
          </p>
          <label style={{ display: 'block', fontSize: 12.5, fontWeight: 500, marginBottom: 6 }}>Amount sent (₦)</label>
          <input
            type="number"
            value={calcAmount}
            onChange={(e) => setCalcAmount(e.target.value)}
            placeholder="e.g. 25000"
            style={{ width: '100%', padding: '11px 12px', borderRadius: 10, border: '1px solid var(--divider)', fontSize: 14, fontFamily: 'inherit' }}
          />
          {calcResult !== null && (
            <div style={{ marginTop: 16, padding: 16, background: 'var(--green-tint)', borderRadius: 10 }}>
              <div style={{ fontSize: 11, color: 'var(--green-dark)' }}>Agent commission</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--green-dark)' }} className="mono">{formatNaira(calcResult)}</div>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '28px 0 14px' }}>
        <h3 style={{ fontSize: 14 }}>Top earning agents this month</h3>
        <div style={{ marginLeft: 'auto' }}>
          <TableToolbar
            filename="top-earning-agents"
            rows={topEarners}
            columns={[
              { label: 'Agent', value: (a) => a.name },
              { label: 'Location', value: (a) => a.location },
              { label: 'Commission paid', value: (a) => a.paid },
            ]}
          />
        </div>
      </div>
      {loadError && (
        <div style={{ padding: 14, background: '#FEF2F2', color: 'var(--error)', borderRadius: 10, fontSize: 13, marginBottom: 14 }}>{loadError}</div>
      )}
      <div style={{ background: '#fff', border: '1px solid var(--divider)', borderRadius: 14, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
          <thead>
            <tr style={{ background: '#FAFBFC', borderBottom: '1px solid var(--divider)' }}>
              {['Agent', 'Location', 'Commission paid'].map((h) => (
                <th key={h} style={{ textAlign: 'left', padding: '11px 16px', fontWeight: 700, color: 'var(--slate)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.3 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={3} style={{ padding: 24, textAlign: 'center', color: 'var(--slate)' }}>Loading…</td></tr>
            ) : topEarners.length === 0 ? (
              <tr><td colSpan={3} style={{ padding: 24, textAlign: 'center', color: 'var(--slate)' }}>No commission paid yet this month.</td></tr>
            ) : (
              topEarners.map((a) => (
                <tr key={a.id} style={{ borderBottom: '1px solid var(--divider)' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 600 }}>{a.name}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--slate)' }}>{a.location}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 600 }} className="mono">{formatNaira(a.paid, 2)}</td>
                </tr>
              ))
            )}
            <tr>
              <td style={{ padding: '12px 16px', fontWeight: 700 }} colSpan={2}>Total paid this month</td>
              <td style={{ padding: '12px 16px', fontWeight: 700 }} className="mono">{formatNaira(totalPaidThisMonth, 2)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
