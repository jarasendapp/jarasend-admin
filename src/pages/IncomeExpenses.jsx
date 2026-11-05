import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import KpiCard from '../components/KpiCard'
import TableToolbar from '../components/TableToolbar'

// Super admin only: the route is not in any other role's permission list, and the database
// rules (is_super_admin) refuse everyone else even if they call the data directly.

const naira = (n) => '₦' + Number(n).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const PERIODS = [
  { id: 'today', label: 'Today' },
  { id: '7d', label: 'Last 7 days' },
  { id: '30d', label: 'Last 30 days' },
  { id: 'month', label: 'This month' },
  { id: 'year', label: 'This year' },
  { id: 'all', label: 'All time' },
]

const CATEGORIES = [
  { id: 'sms', label: 'SMS charges (KudiSMS)' },
  { id: 'kyc', label: 'KYC verification invoice (Dojah)' },
  { id: 'anchor', label: 'Anchor / bank charges' },
  { id: 'hosting', label: 'Hosting, Supabase, Firebase' },
  { id: 'other', label: 'Other' },
]
const catLabel = (id) => CATEGORIES.find((c) => c.id === id)?.label ?? id

function periodStart(id) {
  const now = new Date()
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (id === 'today') return d
  if (id === '7d') { d.setDate(d.getDate() - 6); return d }
  if (id === '30d') { d.setDate(d.getDate() - 29); return d }
  if (id === 'month') return new Date(now.getFullYear(), now.getMonth(), 1)
  if (id === 'year') return new Date(now.getFullYear(), 0, 1)
  return null
}

const card = { background: '#fff', border: '1px solid var(--divider)', borderRadius: 14, padding: 20 }
const th = { textAlign: 'left', padding: '8px 6px', color: 'var(--slate)', fontSize: 11, fontWeight: 700 }
const td = { padding: '9px 6px', fontSize: 13, borderBottom: '1px solid var(--divider)' }
const input = { padding: '10px 12px', borderRadius: 10, border: '1px solid var(--divider)', fontSize: 13.5, fontFamily: 'inherit' }

export default function IncomeExpenses() {
  const [period, setPeriod] = useState('month')
  const [entries, setEntries] = useState([])       // income + commission, amounts in naira
  const [expenses, setExpenses] = useState([])     // manual expenses
  const [kycChecks, setKycChecks] = useState(0)    // Dojah checks made in the period
  const [kycUnit, setKycUnit] = useState('')       // naira per check
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10), category: 'sms', amount: '', note: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [period])

  async function load() {
    setLoading(true)
    setError('')
    try {
      const from = periodStart(period)
      const fromIso = from ? from.toISOString() : null

      const { data: rev, error: revErr } = await supabase.rpc('admin_finance_entries')
      if (revErr) throw revErr
      setEntries((rev ?? []).map((r) => ({ type: r.type, amount: Number(r.amount_kobo) / 100, at: r.created_at })))

      let eq = supabase.from('company_expenses').select('*').order('spent_on', { ascending: false }).limit(500)
      if (from) eq = eq.gte('spent_on', from.toISOString().slice(0, 10))
      const { data: exp, error: expErr } = await eq
      if (expErr) throw expErr
      setExpenses((exp ?? []).map((e) => ({ ...e, amount: Number(e.amount_kobo) / 100 })))

      const { data: set } = await supabase.from('finance_settings').select('value').eq('key', 'kyc_unit_cost_naira').maybeSingle()
      setKycUnit(set?.value ?? '')

      const count = async (col) => {
        let q = supabase.from('kyc_records').select('*', { count: 'exact', head: true }).eq(col, true)
        if (fromIso) q = q.gte('submitted_at', fromIso)
        const { count: c } = await q
        return c ?? 0
      }
      setKycChecks((await count('dojah_bvn_checked')) + (await count('dojah_nin_checked')))
    } catch (err) {
      setError(err.message || 'Could not load income and expenses.')
    } finally {
      setLoading(false)
    }
  }

  const from = periodStart(period)
  const inPeriod = (iso) => !from || new Date(iso) >= from

  const totals = useMemo(() => {
    const sum = (type) => entries.filter((e) => e.type === type && inPeriod(e.at)).reduce((s, e) => s + e.amount, 0)
    const count = (type) => entries.filter((e) => e.type === type && inPeriod(e.at)).length
    const manual = (cat) => expenses.filter((e) => e.category === cat).reduce((s, e) => s + e.amount, 0)
    const sendFees = sum('transaction_fee')
    const agentFees = sum('onboarding_fee')
    const commission = sum('agent_commission')
    const kycAuto = (Number(kycUnit) || 0) * kycChecks
    const rows = [
      { label: 'Agent commission paid out', amount: commission, note: `${count('agent_commission')} payouts (automatic)` },
      { label: 'KYC verification fees (estimate)', amount: kycAuto, note: Number(kycUnit) > 0 ? `${kycChecks} checks × ${naira(kycUnit)}` : 'Set the price per check below' },
      ...CATEGORIES.map((c) => ({ label: c.label, amount: manual(c.id), note: 'entered by you' })),
    ]
    const income = sendFees + agentFees
    const expense = rows.reduce((s, r) => s + r.amount, 0)
    return { sendFees, agentFees, sendCount: count('transaction_fee'), agentCount: count('onboarding_fee'), rows, income, expense, net: income - expense }
  }, [entries, expenses, kycUnit, kycChecks, period])

  async function addExpense(e) {
    e.preventDefault()
    const amount = Number(form.amount)
    if (!(amount > 0)) { setError('Enter an amount greater than zero.'); return }
    setSaving(true)
    setError('')
    const { error: err } = await supabase.from('company_expenses').insert({
      spent_on: form.date, category: form.category, description: form.note.trim(), amount_kobo: Math.round(amount * 100),
    })
    setSaving(false)
    if (err) { setError(err.message); return }
    setForm({ ...form, amount: '', note: '' })
    load()
  }

  async function removeExpense(id) {
    if (!window.confirm('Delete this expense?')) return
    const { error: err } = await supabase.from('company_expenses').delete().eq('id', id)
    if (err) setError(err.message)
    else load()
  }

  async function saveKycUnit() {
    const v = String(Number(kycUnit) || 0)
    const { error: err } = await supabase.from('finance_settings').upsert({ key: 'kyc_unit_cost_naira', value: v, updated_at: new Date().toISOString() })
    if (err) setError(err.message)
    else { setKycUnit(v); load() }
  }

  const exportRows = [
    { section: 'Income', item: 'Sending fees (1.02%)', amount: totals.sendFees },
    { section: 'Income', item: 'Agent fees (once-off)', amount: totals.agentFees },
    ...totals.rows.map((r) => ({ section: 'Expense', item: r.label, amount: r.amount })),
    { section: 'Net', item: 'Profit / loss', amount: totals.net },
  ]

  return (
    <div style={{ padding: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, marginBottom: 4 }}>Income &amp; expenses</h1>
          <p style={{ color: 'var(--slate)', fontSize: 13, marginTop: 0 }}>
            What came into the company and what it cost to run. Visible to super admins only.
          </p>
        </div>
        <div className="no-print" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <select value={period} onChange={(e) => setPeriod(e.target.value)} style={input}>
            {PERIODS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
          <TableToolbar
            filename="income-and-expenses"
            rows={exportRows}
            columns={[
              { label: 'Section', value: (r) => r.section },
              { label: 'Item', value: (r) => r.item },
              { label: 'Amount (NGN)', value: (r) => r.amount },
            ]}
          />
        </div>
      </div>

      {error && <div style={{ background: 'var(--error-tint)', color: 'var(--error)', borderRadius: 10, padding: '10px 14px', fontSize: 13, margin: '14px 0' }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14, margin: '20px 0' }}>
        <KpiCard label="Total income" value={loading ? '—' : naira(totals.income)} icon="⬇" tint="green" />
        <KpiCard label="Total expenses" value={loading ? '—' : naira(totals.expense)} icon="⬆" tint="gold" />
        <KpiCard label={totals.net >= 0 ? 'Net profit' : 'Net loss'} value={loading ? '—' : naira(totals.net)} icon="📊" tint={totals.net >= 0 ? 'green' : 'gold'} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
        <div style={card}>
          <h3 style={{ fontSize: 14, marginBottom: 12 }}>Income</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><th style={th}>Source</th><th style={{ ...th, textAlign: 'right' }}>Count</th><th style={{ ...th, textAlign: 'right' }}>Amount</th></tr></thead>
            <tbody>
              <tr><td style={td}>Sending fees (1.02% of each claimed transfer)</td><td style={{ ...td, textAlign: 'right' }}>{totals.sendCount}</td><td style={{ ...td, textAlign: 'right' }} className="mono">{naira(totals.sendFees)}</td></tr>
              <tr><td style={td}>Agent fees (once-off ₦3,000)</td><td style={{ ...td, textAlign: 'right' }}>{totals.agentCount}</td><td style={{ ...td, textAlign: 'right' }} className="mono">{naira(totals.agentFees)}</td></tr>
              <tr><td style={{ ...td, fontWeight: 700 }}>Total income</td><td style={td}></td><td style={{ ...td, textAlign: 'right', fontWeight: 700 }} className="mono">{naira(totals.income)}</td></tr>
            </tbody>
          </table>
          <p style={{ fontSize: 11.5, color: 'var(--slate)', marginTop: 12 }}>Taken from real claimed transfers and agent payouts. A transfer that expired was refunded, so its fee is not counted.</p>
        </div>

        <div style={card}>
          <h3 style={{ fontSize: 14, marginBottom: 12 }}>Expenses</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><th style={th}>Expense</th><th style={{ ...th, textAlign: 'right' }}>Amount</th></tr></thead>
            <tbody>
              {totals.rows.map((r) => (
                <tr key={r.label}>
                  <td style={td}>{r.label}<div style={{ fontSize: 11, color: 'var(--slate)' }}>{r.note}</div></td>
                  <td style={{ ...td, textAlign: 'right' }} className="mono">{naira(r.amount)}</td>
                </tr>
              ))}
              <tr><td style={{ ...td, fontWeight: 700 }}>Total expenses</td><td style={{ ...td, textAlign: 'right', fontWeight: 700 }} className="mono">{naira(totals.expense)}</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="no-print" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginTop: 18 }}>
        <form onSubmit={addExpense} style={card}>
          <h3 style={{ fontSize: 14, marginBottom: 12 }}>Add an expense</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} style={input} />
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} style={input}>
              {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
            <input type="number" min="0" step="0.01" required placeholder="Amount (₦)" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} style={input} />
            <input type="text" placeholder="Note (e.g. KudiSMS top-up)" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} style={input} />
          </div>
          <button type="submit" disabled={saving} style={{ marginTop: 12, padding: '10px 18px', borderRadius: 10, border: 'none', background: 'var(--navy)', color: '#fff', fontWeight: 600, fontSize: 13 }}>
            {saving ? 'Saving…' : 'Add expense'}
          </button>

          <div style={{ marginTop: 22, paddingTop: 16, borderTop: '1px solid var(--divider)' }}>
            <h3 style={{ fontSize: 13.5, marginBottom: 6 }}>Price of one KYC check (Dojah)</h3>
            <p style={{ fontSize: 11.5, color: 'var(--slate)', marginTop: 0 }}>
              Each BVN or NIN check made in the period is counted and multiplied by this price. Use this <em>or</em> enter Dojah invoices above, not both.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="number" min="0" step="0.01" placeholder="₦ per check" value={kycUnit} onChange={(e) => setKycUnit(e.target.value)} style={{ ...input, width: 150 }} />
              <button type="button" onClick={saveKycUnit} style={{ padding: '10px 16px', borderRadius: 10, border: '1px solid var(--divider)', background: '#fff', fontWeight: 600, fontSize: 13 }}>Save price</button>
            </div>
          </div>
        </form>

        <div style={card}>
          <h3 style={{ fontSize: 14, marginBottom: 12 }}>Expenses you entered</h3>
          {expenses.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--slate)' }}>Nothing entered for this period.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr><th style={th}>Date</th><th style={th}>Category</th><th style={{ ...th, textAlign: 'right' }}>Amount</th><th style={th}></th></tr></thead>
              <tbody>
                {expenses.map((e) => (
                  <tr key={e.id}>
                    <td style={td}>{e.spent_on}</td>
                    <td style={td}>{catLabel(e.category)}<div style={{ fontSize: 11, color: 'var(--slate)' }}>{e.description}</div></td>
                    <td style={{ ...td, textAlign: 'right' }} className="mono">{naira(e.amount)}</td>
                    <td style={td}><button onClick={() => removeExpense(e.id)} style={{ border: 'none', background: 'none', color: 'var(--error)', fontSize: 12, cursor: 'pointer' }}>Delete</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
