import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function ApiMonitoring() {
  const [status, setStatus] = useState('idle') // idle | checking | up | down
  const [latencyMs, setLatencyMs] = useState(null)
  const [error, setError] = useState('')
  const [lastChecked, setLastChecked] = useState(null)

  async function runCheck() {
    setStatus('checking')
    setError('')
    const start = performance.now()
    try {
      const { error: err } = await supabase.from('profiles').select('id', { count: 'exact', head: true })
      if (err) throw err
      setLatencyMs(Math.round(performance.now() - start))
      setStatus('up')
    } catch (err) {
      setError(err.message || 'Connection failed.')
      setStatus('down')
    } finally {
      setLastChecked(new Date())
    }
  }

  return (
    <div style={{ padding: 28 }}>
      <h1 style={{ fontSize: 22, marginBottom: 4 }}>API monitoring</h1>
      <p style={{ color: 'var(--slate)', fontSize: 13, marginTop: 0, marginBottom: 24 }}>
        A live check that this dashboard can reach Supabase, plus real recent activity from each sandbox integration.
      </p>

      <div style={{ background: '#fff', border: '1px solid var(--divider)', borderRadius: 14, padding: 24, maxWidth: 480, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{
            width: 12, height: 12, borderRadius: 6,
            background: status === 'up' ? 'var(--green)' : status === 'down' ? 'var(--error)' : '#D0D5DD',
          }} />
          <span style={{ fontSize: 15, fontWeight: 600 }}>
            {status === 'idle' && 'Not checked yet'}
            {status === 'checking' && 'Checking…'}
            {status === 'up' && 'Supabase reachable'}
            {status === 'down' && 'Connection failed'}
          </span>
        </div>

        {status === 'up' && (
          <p style={{ fontSize: 12.5, color: 'var(--slate)', margin: '0 0 16px' }}>
            Query completed in <strong className="mono">{latencyMs}ms</strong>
          </p>
        )}
        {status === 'down' && (
          <div style={{ background: 'var(--error-tint)', color: 'var(--error)', borderRadius: 10, padding: '10px 12px', fontSize: 12.5, marginBottom: 16 }}>
            {error}
          </div>
        )}
        {lastChecked && (
          <p style={{ fontSize: 11.5, color: 'var(--slate)', margin: '0 0 16px' }}>
            Last checked {lastChecked.toLocaleTimeString()}
          </p>
        )}

        <button
          onClick={runCheck}
          disabled={status === 'checking'}
          style={{
            padding: '10px 20px', borderRadius: 10, border: 'none', background: 'var(--navy)',
            color: '#fff', fontWeight: 600, fontSize: 13, opacity: status === 'checking' ? 0.6 : 1,
          }}
        >
          {status === 'idle' ? 'Run check' : 'Check again'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        <DojahCard />
        <AnchorCard />
        <KudiSmsCard />
      </div>

      <div style={{ background: '#fff', border: '1px solid var(--divider)', borderRadius: 14, padding: 22, maxWidth: 760 }}>
        <h3 style={{ fontSize: 14, marginBottom: 8 }}>What this doesn't cover yet</h3>
        <p style={{ fontSize: 12.5, color: 'var(--slate)', lineHeight: 1.7, marginTop: 0 }}>
          The three cards above show real, actual activity pulled from Supabase — not live pings to
          Dojah, Anchor, or KudiSMS directly. That's deliberate: those providers' secret keys live
          only in the mobile app's build configuration, and this dashboard runs in a browser, where
          anything embedded in it is visible to anyone who opens the network tab. So instead, these
          cards reflect the most recent genuine call each integration made, based on what actually
          got written to the database. Deeper monitoring (per-endpoint error rates, uptime
          percentages, request volume) needs dedicated infrastructure that doesn't exist yet —
          building fake charts for that would look official without meaning anything, so this page
          stays limited to what it can honestly show right now.
        </p>
      </div>
    </div>
  )
}

function IntegrationCard({ title, loading, error, children }) {
  return (
    <div style={{ background: '#fff', border: '1px solid var(--divider)', borderRadius: 14, padding: 18 }}>
      <h3 style={{ fontSize: 13.5, marginBottom: 12 }}>{title}</h3>
      {loading ? (
        <p style={{ fontSize: 12, color: 'var(--slate)' }}>Loading…</p>
      ) : error ? (
        <p style={{ fontSize: 12, color: 'var(--error)' }}>{error}</p>
      ) : (
        children
      )}
    </div>
  )
}

function DojahCard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const { data: rows, error: err } = await supabase
          .from('kyc_records')
          .select('dojah_bvn_checked, dojah_bvn_matched, dojah_bvn_error, submitted_at')
          .eq('dojah_bvn_checked', true)
          .order('submitted_at', { ascending: false })
          .limit(1)
        if (err) throw err
        setData(rows?.[0] || null)
      } catch (err) {
        setError(err.message || 'Could not load Dojah activity.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <IntegrationCard title="Dojah (BVN/NIN)" loading={loading} error={error}>
      {data ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: 5, background: data.dojah_bvn_error ? 'var(--error)' : data.dojah_bvn_matched ? 'var(--green)' : '#D0D5DD' }} />
            <span style={{ fontSize: 12.5, fontWeight: 600 }}>
              {data.dojah_bvn_error ? 'Last call errored' : data.dojah_bvn_matched ? 'Last call matched' : 'Last call — no match'}
            </span>
          </div>
          <p style={{ fontSize: 11.5, color: 'var(--slate)', margin: 0 }}>{new Date(data.submitted_at).toLocaleString()}</p>
          {data.dojah_bvn_error && <p style={{ fontSize: 11.5, color: 'var(--error)', marginTop: 6 }}>{data.dojah_bvn_error}</p>}
        </>
      ) : (
        <p style={{ fontSize: 12, color: 'var(--slate)' }}>No Dojah calls recorded yet.</p>
      )}
    </IntegrationCard>
  )
}

function AnchorCard() {
  const [count, setCount] = useState(0)
  const [latest, setLatest] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const { count: c, error: countErr } = await supabase.from('anchor_accounts').select('*', { count: 'exact', head: true })
        if (countErr) throw countErr
        setCount(c || 0)

        const { data: rows, error: err } = await supabase
          .from('anchor_accounts')
          .select('virtual_account_number, verified, created_at')
          .order('created_at', { ascending: false })
          .limit(1)
        if (err) throw err
        setLatest(rows?.[0] || null)
      } catch (err) {
        setError(err.message || 'Could not load Anchor activity.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <IntegrationCard title="Anchor (virtual accounts)" loading={loading} error={error}>
      <p style={{ fontSize: 12.5, marginBottom: 8 }}>
        <strong className="mono">{count}</strong> virtual account{count === 1 ? '' : 's'} issued
      </p>
      {latest ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: 5, background: latest.verified ? 'var(--green)' : '#D0D5DD' }} />
            <span style={{ fontSize: 12.5, fontWeight: 600 }}>Most recent — {latest.verified ? 'verified' : 'unverified'}</span>
          </div>
          <p style={{ fontSize: 11.5, color: 'var(--slate)', margin: 0 }}>{new Date(latest.created_at).toLocaleString()}</p>
        </>
      ) : (
        <p style={{ fontSize: 12, color: 'var(--slate)' }}>No virtual accounts issued yet.</p>
      )}
    </IntegrationCard>
  )
}

function KudiSmsCard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const { data: rows, error: err } = await supabase
          .from('transactions')
          .select('claim_sms_sent, date_time')
          .not('claim_sms_sent', 'is', null)
          .order('date_time', { ascending: false })
          .limit(50)
        if (err) throw err
        const sent = (rows || []).filter((r) => r.claim_sms_sent === true).length
        setStats({ total: (rows || []).length, sent, latest: rows?.[0] || null })
      } catch (err) {
        setError(err.message || 'Could not load KudiSMS activity.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <IntegrationCard title="KudiSMS (claim codes)" loading={loading} error={error}>
      {stats && stats.total > 0 ? (
        <>
          <p style={{ fontSize: 12.5, marginBottom: 8 }}>
            <strong className="mono">{stats.sent}/{stats.total}</strong> of last {stats.total} sent successfully
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: 5, background: stats.latest?.claim_sms_sent ? 'var(--green)' : 'var(--error)' }} />
            <span style={{ fontSize: 12.5, fontWeight: 600 }}>Most recent — {stats.latest?.claim_sms_sent ? 'delivered' : 'failed'}</span>
          </div>
          <p style={{ fontSize: 11.5, color: 'var(--slate)', margin: 0 }}>{new Date(stats.latest.date_time).toLocaleString()}</p>
        </>
      ) : (
        <p style={{ fontSize: 12, color: 'var(--slate)' }}>No SMS deliveries recorded yet.</p>
      )}
    </IntegrationCard>
  )
}
