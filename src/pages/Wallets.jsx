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

// Individual send transactions — who each Personal customer sent money
// to, when. Distinct from the aggregate balances above.
const SAMPLE_PERSONAL_TRANSACTIONS = [
  { sender: 'Blessing Nwachukwu', receiverPhone: '0813 227 6650', amount: 25000, date: '2026-08-10', time: '09:14' },
  { sender: 'Emeka Obi', receiverPhone: '0706 118 4423', amount: 8000, date: '2026-08-10', time: '10:31' },
  { sender: 'Fatima Bello', receiverPhone: '0902 774 1123', amount: 15000, date: '2026-08-09', time: '18:02' },
  { sender: 'Segun Adekunle', receiverPhone: '0815 662 3390', amount: 40000, date: '2026-08-09', time: '14:47' },
]

// Individual payouts — which phone number each agent paid cash to, with
// the agent's own ID, when. Distinct from the aggregate float/commission
// balances above.
const SAMPLE_AGENT_TRANSACTIONS = [
  { agent: 'Chidi Okonkwo', agentId: 'AGT-1042', receiverPhone: '0803 214 7765', amount: 25000, date: '2026-08-10', time: '11:02' },
  { agent: 'Amaka Eze', agentId: 'AGT-1087', receiverPhone: '0706 552 8801', amount: 8000, date: '2026-08-10', time: '10:58' },
  { agent: 'Ibrahim Musa', agentId: 'AGT-1129', receiverPhone: '0708 552 0091', amount: 9500, date: '2026-08-09', time: '13:40' },
  { agent: 'Chidi Okonkwo', agentId: 'AGT-1042', receiverPhone: '0912 340 6612', amount: 15000, date: '2026-08-09', time: '09:20' },
]

export default function Wallets() {
  const [tab, setTab] = useState('personal')

  return (
    <div style={{ padding: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: 22, marginBottom: 4 }}>Wallets</h1>
          <p style={{ color: 'var(--slate)', fontSize: 13, marginTop: 0 }}>
            Balances, plus who each transaction actually went to and when.
          </p>
        </div>
        <span className="no-print" style={{ fontSize: 9.5, fontWeight: 700, background: 'var(--gold-tint)', color: '#854F0B', padding: '3px 9px', borderRadius: 20, marginTop: 4 }}>
          SAMPLE DATA
        </span>
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
        <>
          <SectionHeader title="Balances" />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
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
          </div>
          <Table
            headers={['Customer', 'Phone', 'Available', 'Reserved', 'Reversed total']}
            rows={SAMPLE_PERSONAL_WALLETS}
            keyFn={(w) => w.phone}
            renderRow={(w) => (
              <>
                <td style={{ padding: '12px 16px', fontWeight: 600 }}>{w.name}</td>
                <td style={{ padding: '12px 16px' }} className="mono">{w.phone}</td>
                <td style={{ padding: '12px 16px', fontWeight: 600 }} className="mono">{formatNaira(w.available)}</td>
                <td style={{ padding: '12px 16px', color: 'var(--slate)' }} className="mono">{formatNaira(w.reserved)}</td>
                <td style={{ padding: '12px 16px', color: 'var(--slate)' }} className="mono">{formatNaira(w.reversedTotal)}</td>
              </>
            )}
          />

          <SectionHeader title="Recent send transactions" />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
            <TableToolbar
              filename="personal-transactions"
              rows={SAMPLE_PERSONAL_TRANSACTIONS}
              columns={[
                { label: 'Sender', value: (t) => t.sender },
                { label: 'Receiver phone', value: (t) => t.receiverPhone },
                { label: 'Amount', value: (t) => t.amount },
                { label: 'Date', value: (t) => t.date },
                { label: 'Time', value: (t) => t.time },
              ]}
            />
          </div>
          <Table
            headers={['Sender', 'Receiver phone', 'Amount', 'Date', 'Time']}
            rows={SAMPLE_PERSONAL_TRANSACTIONS}
            keyFn={(t) => `${t.sender}-${t.date}-${t.time}`}
            renderRow={(t) => (
              <>
                <td style={{ padding: '12px 16px', fontWeight: 600 }}>{t.sender}</td>
                <td style={{ padding: '12px 16px' }} className="mono">{t.receiverPhone}</td>
                <td style={{ padding: '12px 16px', fontWeight: 600 }} className="mono">{formatNaira(t.amount)}</td>
                <td style={{ padding: '12px 16px', color: 'var(--slate)' }}>{t.date}</td>
                <td style={{ padding: '12px 16px', color: 'var(--slate)' }} className="mono">{t.time}</td>
              </>
            )}
          />
        </>
      ) : (
        <>
          <SectionHeader title="Balances" />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
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
          </div>
          <Table
            headers={['Agent', 'Location', 'Float', 'Commission balance', 'Total cash received', 'Total cash withdrawn']}
            rows={SAMPLE_AGENT_WALLETS}
            keyFn={(w) => w.name}
            renderRow={(w) => (
              <>
                <td style={{ padding: '12px 16px', fontWeight: 600 }}>{w.name}</td>
                <td style={{ padding: '12px 16px', color: 'var(--slate)' }}>{w.location}</td>
                <td style={{ padding: '12px 16px', fontWeight: 600 }} className="mono">{formatNaira(w.float)}</td>
                <td style={{ padding: '12px 16px' }} className="mono">{formatNaira(w.commission)}</td>
                <td style={{ padding: '12px 16px', color: 'var(--slate)' }} className="mono">{formatNaira(w.received)}</td>
                <td style={{ padding: '12px 16px', color: 'var(--slate)' }} className="mono">{formatNaira(w.withdrawn)}</td>
              </>
            )}
          />

          <SectionHeader title="Recent payout transactions" />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
            <TableToolbar
              filename="agent-transactions"
              rows={SAMPLE_AGENT_TRANSACTIONS}
              columns={[
                { label: 'Agent', value: (t) => t.agent },
                { label: 'Agent ID', value: (t) => t.agentId },
                { label: 'Receiver phone', value: (t) => t.receiverPhone },
                { label: 'Amount', value: (t) => t.amount },
                { label: 'Date', value: (t) => t.date },
                { label: 'Time', value: (t) => t.time },
              ]}
            />
          </div>
          <Table
            headers={['Agent', 'Agent ID', 'Receiver phone', 'Amount', 'Date', 'Time']}
            rows={SAMPLE_AGENT_TRANSACTIONS}
            keyFn={(t) => `${t.agentId}-${t.date}-${t.time}`}
            renderRow={(t) => (
              <>
                <td style={{ padding: '12px 16px', fontWeight: 600 }}>{t.agent}</td>
                <td style={{ padding: '12px 16px' }} className="mono">{t.agentId}</td>
                <td style={{ padding: '12px 16px' }} className="mono">{t.receiverPhone}</td>
                <td style={{ padding: '12px 16px', fontWeight: 600 }} className="mono">{formatNaira(t.amount)}</td>
                <td style={{ padding: '12px 16px', color: 'var(--slate)' }}>{t.date}</td>
                <td style={{ padding: '12px 16px', color: 'var(--slate)' }} className="mono">{t.time}</td>
              </>
            )}
          />
        </>
      )}
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

function Table({ headers, rows, keyFn, renderRow }) {
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
          {rows.map((r) => (
            <tr key={keyFn(r)} style={{ borderBottom: '1px solid var(--divider)' }}>
              {renderRow(r)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
