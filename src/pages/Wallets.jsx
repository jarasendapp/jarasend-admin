import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import TableToolbar from '../components/TableToolbar'

function formatNaira(n) {
  return '₦' + n.toLocaleString('en-NG')
}

export default function Wallets() {
  const [tab, setTab] = useState('personal')
  const [personalWallets, setPersonalWallets] = useState([])
  const [agentWallets, setAgentWallets] = useState([])
  const [personalTx, setPersonalTx] = useState([])
  const [agentTx, setAgentTx] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    setLoadError('')
    try {
      const [{ data: wallets, error: walletsError }, { data: agents, error: agentsError }] = await Promise.all([
        supabase.from('wallets').select('*'),
        supabase.from('agent_accounts').select('*'),
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
        ...(wallets ?? []).map((w) => w.user_id),
        ...(agents ?? []).map((a) => a.user_id),
        ...(sendTx ?? []).map((t) => t.user_id),
        ...(payoutTx ?? []).map((t) => t.agent_id).filter(Boolean),
      ])]
      const { data: profileRows, error: profileError } = allUserIds.length
        ? await supabase.from('profiles').select('id, full_name, surname, phone, business_name, business_town').in('id', allUserIds)
        : { data: [], error: null }
      if (profileError) throw profileError
      const profiles = Object.fromEntries((profileRows ?? []).map((p) => [p.id, p]))

      setPersonalWallets((wallets ?? []).map((w) => ({
        ...w,
        available: Number(w.available), reserved: Number(w.reserved), reversedTotal: Number(w.reversed_total),
        name: profiles[w.user_id] ? `${profiles[w.user_id].full_name} ${profiles[w.user_id].surname}` : w.user_id,
        phone: profiles[w.user_id]?.phone || '—',
      })))
      setAgentWallets((agents ?? []).map((a) => ({
        ...a,
        float: Number(a.float), commission: Number(a.commission), received: Number(a.total_cash_received), withdrawn: Number(a.total_cash_withdrawn),
        name: profiles[a.user_id] ? `${profiles[a.user_id].full_name} ${profiles[a.user_id].surname}` : a.user_id,
        location: profiles[a.user_id]?.business_town || '—',
      })))
      setPersonalTx((sendTx ?? []).map((t) => ({
        ...t,
        amount: Number(t.amount),
        sender: profiles[t.user_id] ? `${profiles[t.user_id].full_name} ${profiles[t.user_id].surname}` : t.user_id,
      })))
      setAgentTx((payoutTx ?? []).map((t) => ({
        ...t,
        amount: Number(t.amount),
        agentName: t.agent_id && profiles[t.agent_id] ? `${profiles[t.agent_id].full_name} ${profiles[t.agent_id].surname}` : '—',
      })))
    } catch (err) {
      setLoadError(err.message || 'Could not load wallet data.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: 22, marginBottom: 4 }}>Wallets</h1>
          <p style={{ color: 'var(--slate)', fontSize: 13, marginTop: 0 }}>
            Balances, plus who each transaction actually went to and when.
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
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
            <TableToolbar
              filename="personal-wallets"
              rows={personalWallets}
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
            rows={personalWallets}
            keyFn={(w) => w.user_id}
            emptyMessage="No personal wallets yet."
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
                <td style={{ padding: '12px 16px', fontWeight: 600 }} className="mono">{formatNaira(t.amount)}</td>
                <td style={{ padding: '12px 16px', color: 'var(--slate)' }}>{new Date(t.date_time).toLocaleString()}</td>
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
              rows={agentWallets}
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
            rows={agentWallets}
            keyFn={(w) => w.user_id}
            emptyMessage="No agent wallets yet."
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
                <td style={{ padding: '12px 16px', fontWeight: 600 }} className="mono">{formatNaira(t.amount)}</td>
                <td style={{ padding: '12px 16px', color: 'var(--slate)' }}>{new Date(t.date_time).toLocaleString()}</td>
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

function Table({ headers, rows, keyFn, renderRow, emptyMessage }) {
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
              <tr key={keyFn(r)} style={{ borderBottom: '1px solid var(--divider)' }}>
                {renderRow(r)}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
