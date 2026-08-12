import { useState } from 'react'
import TableToolbar from '../components/TableToolbar'

// This is the ACTUAL formula from the mobile app's transaction repository
// (calculateAgentCommission) — not an approximation. Below ₦5,000 sent,
// no commission. From ₦5,000 up, ₦3 per ₦5,000 band. Kept identical here
// so this page can never drift out of sync with what agents actually earn.
function calculateAgentCommission(amount) {
  if (amount < 5000) return 0
  const band = Math.floor((amount - 5000) / 5000) + 1
  return band * 3
}

const MIN_COMMISSION_WITHDRAWAL = 100

function formatNaira(n) {
  return '₦' + n.toLocaleString('en-NG')
}

// Sample aggregate figures — actual commission PAID totals require
// centralized transaction data, which doesn't exist yet (still
// offline/per-device). The band structure and rules above are real;
// only the totals below are illustrative.
const SAMPLE_TOP_EARNERS = [
  { name: 'Chidi Okonkwo', location: 'Onitsha', paid: 18400 },
  { name: 'Amaka Eze', location: 'Ikeja', paid: 15200 },
  { name: 'Ibrahim Musa', location: 'Kano', paid: 12900 },
  { name: 'Ngozi Adeyemi', location: 'Port Harcourt', paid: 11300 },
  { name: 'Tunde Bakare', location: 'Ibadan', paid: 9800 },
]
const SAMPLE_TOTAL_PAID_THIS_MONTH = 96200

const BAND_PREVIEW = [4999, 5000, 10000, 15000, 20000, 30000, 50000, 100000]

export default function Commission() {
  const [calcAmount, setCalcAmount] = useState('')
  const calcResult = calcAmount ? calculateAgentCommission(Number(calcAmount)) : null

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
            No commission below ₦5,000 sent. ₦3 per ₦5,000 band above that.
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
        <span className="no-print" style={{ fontSize: 9.5, fontWeight: 700, background: 'var(--gold-tint)', color: '#854F0B', padding: '2px 7px', borderRadius: 20 }}>
          SAMPLE DATA
        </span>
        <div style={{ marginLeft: 'auto' }}>
          <TableToolbar
            filename="top-earning-agents"
            rows={SAMPLE_TOP_EARNERS}
            columns={[
              { label: 'Agent', value: (a) => a.name },
              { label: 'Location', value: (a) => a.location },
              { label: 'Commission paid', value: (a) => a.paid },
            ]}
          />
        </div>
      </div>
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
            {SAMPLE_TOP_EARNERS.map((a) => (
              <tr key={a.name} style={{ borderBottom: '1px solid var(--divider)' }}>
                <td style={{ padding: '12px 16px', fontWeight: 600 }}>{a.name}</td>
                <td style={{ padding: '12px 16px', color: 'var(--slate)' }}>{a.location}</td>
                <td style={{ padding: '12px 16px', fontWeight: 600 }} className="mono">{formatNaira(a.paid)}</td>
              </tr>
            ))}
            <tr>
              <td style={{ padding: '12px 16px', fontWeight: 700 }} colSpan={2}>Total paid this month</td>
              <td style={{ padding: '12px 16px', fontWeight: 700 }} className="mono">{formatNaira(SAMPLE_TOTAL_PAID_THIS_MONTH)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
