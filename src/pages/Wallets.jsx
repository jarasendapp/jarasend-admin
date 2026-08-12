import { useState } from 'react'
import TableToolbar from '../components/TableToolbar'

function formatNaira(n) {
  return '₦' + n.toLocaleString('en-NG')
}

// Sample data, matching the exact shape of the real wallets/agent_accounts
// tables — these tables exist in Supabase but aren't written to yet,
// since wallet operations are still handled entirely on-device (offline),
// pending the GetAnchor banking integration.
const SAMPLE_PERSONAL_WALLETS = [
  { name: 'Blessing Nwachukwu', phone: '0803 214 7765', available: 42500, reserved: 15000, reversedTotal: 0 },
  { name: 'Emeka Obi', phone: '0706 552 8801', available: 18200, reserved: 0, reversedTotal: 18000 },
  { name: 'Fatima Bello', phone: '0912 340 6612', available: 63000, reserved: 22000, reversedTotal: 0 },
  { name: 'Segun Adekunle', phone: '0814 776 2290', available: 9800, reserved: 0, reversedTotal: 0 },
]

const SAMPLE_AGENT_WALLETS = [
  { name: 'Chidi Okonkwo', location: 'Onitsha', float: 284000, commission: 4200, received: 612000, withdrawn: 328000 },
  { name: 'Amaka Eze', location: 'Ikeja', float: 195000, commission: 3100, received: 445000, withdrawn: 250000 },
  { name: 'Ibrahim Musa', location: 'Kano', float: 340000, commission: 2900, received: 380000, withdrawn: 40000 },
]

export default function Wallets() {
  const [tab, setTab] = useState('personal')

  return (
    <div style={{ padding: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: 22, marginBottom: 4 }}>Wallets</h1>
          <p style={{ color: 'var(--slate)', fontSize: 13, marginTop: 0 }}>
            Personal wallet balances and agent float/commission.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className="no-print" style={{ fontSize: 9.5, fontWeight: 700, background: 'var(--gold-tint)', color: '#854F0B', padding: '3px 9px', borderRadius: 20 }}>
            SAMPLE DATA
          </span>
          {tab === 'personal' ? (
            <TableToolbar
              filename="personal-wallets"
              rows={SAMPLE_PERSONAL_WALLETS}
              columns={[
                { label: 'Customer', value: (w) => w.name },
                { label: 'Phone', value: (w) => w.phone },
                { label: 'Available', value: (w) => w.available },
                { label: 'Reserved', value: (w) => w.reserved },
                { label: 'Reversed total', value: (w) => w.reversedTotal },
              ]}
            />
          ) : (
            <TableToolbar
              filename="agent-wallets"
              rows={SAMPLE_AGENT_WALLETS}
              columns={[
                { label: 'Agent', value: (w) => w.name },
                { label: 'Location', value: (w) => w.location },
                { label: 'Float', value: (w) => w.float },
                { label: 'Commission balance', value: (w) => w.commission },
                { label: 'Total cash received', value: (w) => w.received },
                { label: 'Total cash withdrawn', value: (w) => w.withdrawn },
              ]}
            />
          )}
        </div>
      </div>

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

      {tab === 'personal' ? (
        <div style={{ background: '#fff', border: '1px solid var(--divider)', borderRadius: 14, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
            <thead>
              <tr style={{ background: '#FAFBFC', borderBottom: '1px solid var(--divider)' }}>
                {['Customer', 'Phone', 'Available', 'Reserved', 'Reversed total'].map((h) => (
                  <th key={h} style={{ textAlign: 'left', padding: '11px 16px', fontWeight: 700, color: 'var(--slate)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.3 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SAMPLE_PERSONAL_WALLETS.map((w) => (
                <tr key={w.phone} style={{ borderBottom: '1px solid var(--divider)' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 600 }}>{w.name}</td>
                  <td style={{ padding: '12px 16px' }} className="mono">{w.phone}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 600 }} className="mono">{formatNaira(w.available)}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--slate)' }} className="mono">{formatNaira(w.reserved)}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--slate)' }} className="mono">{formatNaira(w.reversedTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid var(--divider)', borderRadius: 14, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
            <thead>
              <tr style={{ background: '#FAFBFC', borderBottom: '1px solid var(--divider)' }}>
                {['Agent', 'Location', 'Float', 'Commission balance', 'Total cash received', 'Total cash withdrawn'].map((h) => (
                  <th key={h} style={{ textAlign: 'left', padding: '11px 16px', fontWeight: 700, color: 'var(--slate)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.3 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SAMPLE_AGENT_WALLETS.map((w) => (
                <tr key={w.name} style={{ borderBottom: '1px solid var(--divider)' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 600 }}>{w.name}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--slate)' }}>{w.location}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 600 }} className="mono">{formatNaira(w.float)}</td>
                  <td style={{ padding: '12px 16px' }} className="mono">{formatNaira(w.commission)}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--slate)' }} className="mono">{formatNaira(w.received)}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--slate)' }} className="mono">{formatNaira(w.withdrawn)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
