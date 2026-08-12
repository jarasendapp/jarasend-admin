import TableToolbar from '../components/TableToolbar'

function formatNaira(n) {
  return '₦' + n.toLocaleString('en-NG')
}

// Sample data — settlement (reconciling what agents have paid out in
// cash against what they're owed back) depends on real transaction
// volume, which isn't centralized yet.
const SAMPLE_SETTLEMENTS = [
  { agent: 'Chidi Okonkwo', location: 'Onitsha', owed: 612000, settled: 580000, status: 'Pending' },
  { agent: 'Amaka Eze', location: 'Ikeja', owed: 445000, settled: 445000, status: 'Completed' },
  { agent: 'Ibrahim Musa', location: 'Kano', owed: 380000, settled: 250000, status: 'Pending' },
  { agent: 'Ngozi Adeyemi', location: 'Port Harcourt', owed: 298000, settled: 298000, status: 'Completed' },
  { agent: 'Tunde Bakare', location: 'Ibadan', owed: 176000, settled: 0, status: 'Pending' },
]

export default function Settlement() {
  const totalOwed = SAMPLE_SETTLEMENTS.reduce((s, r) => s + r.owed, 0)
  const totalSettled = SAMPLE_SETTLEMENTS.reduce((s, r) => s + r.settled, 0)
  const outstanding = totalOwed - totalSettled

  return (
    <div style={{ padding: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: 22, marginBottom: 4 }}>Settlement</h1>
          <p style={{ color: 'var(--slate)', fontSize: 13, marginTop: 0 }}>
            Reconciling what agents have paid out against what's been settled back to them.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className="no-print" style={{ fontSize: 9.5, fontWeight: 700, background: 'var(--gold-tint)', color: '#854F0B', padding: '3px 9px', borderRadius: 20 }}>
            SAMPLE DATA
          </span>
          <TableToolbar
            filename="settlement"
            rows={SAMPLE_SETTLEMENTS}
            columns={[
              { label: 'Agent', value: (s) => s.agent },
              { label: 'Location', value: (s) => s.location },
              { label: 'Owed', value: (s) => s.owed },
              { label: 'Settled', value: (s) => s.settled },
              { label: 'Outstanding', value: (s) => s.owed - s.settled },
              { label: 'Status', value: (s) => s.status },
            ]}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, margin: '20px 0' }}>
        {[
          { label: 'Total owed to agents', value: totalOwed },
          { label: 'Total settled', value: totalSettled },
          { label: 'Outstanding', value: outstanding },
        ].map((k) => (
          <div key={k.label} style={{ background: '#fff', border: '1px solid var(--divider)', borderRadius: 14, padding: 16 }}>
            <div style={{ fontSize: 11.5, color: 'var(--slate)', marginBottom: 6 }}>{k.label}</div>
            <div className="mono" style={{ fontSize: 19, fontWeight: 700, color: 'var(--navy)' }}>{formatNaira(k.value)}</div>
          </div>
        ))}
      </div>

      <div style={{ background: '#fff', border: '1px solid var(--divider)', borderRadius: 14, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
          <thead>
            <tr style={{ background: '#FAFBFC', borderBottom: '1px solid var(--divider)' }}>
              {['Agent', 'Location', 'Owed', 'Settled', 'Outstanding', 'Status'].map((h) => (
                <th key={h} style={{ textAlign: 'left', padding: '11px 16px', fontWeight: 700, color: 'var(--slate)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.3 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SAMPLE_SETTLEMENTS.map((s) => (
              <tr key={s.agent} style={{ borderBottom: '1px solid var(--divider)' }}>
                <td style={{ padding: '12px 16px', fontWeight: 600 }}>{s.agent}</td>
                <td style={{ padding: '12px 16px', color: 'var(--slate)' }}>{s.location}</td>
                <td style={{ padding: '12px 16px' }} className="mono">{formatNaira(s.owed)}</td>
                <td style={{ padding: '12px 16px' }} className="mono">{formatNaira(s.settled)}</td>
                <td style={{ padding: '12px 16px', fontWeight: 600, color: s.owed - s.settled > 0 ? 'var(--error)' : 'var(--green-dark)' }} className="mono">
                  {formatNaira(s.owed - s.settled)}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{
                    fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                    background: s.status === 'Completed' ? 'var(--green-tint)' : 'var(--gold-tint)',
                    color: s.status === 'Completed' ? 'var(--green-dark)' : '#854F0B',
                  }}>
                    {s.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
