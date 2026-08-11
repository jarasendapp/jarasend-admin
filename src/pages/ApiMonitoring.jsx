import { useState } from 'react'
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
        A live check that this dashboard can actually reach Supabase.
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

      <div style={{ background: '#fff', border: '1px solid var(--divider)', borderRadius: 14, padding: 22, maxWidth: 560 }}>
        <h3 style={{ fontSize: 14, marginBottom: 8 }}>What this doesn't cover yet</h3>
        <p style={{ fontSize: 12.5, color: 'var(--slate)', lineHeight: 1.7, marginTop: 0 }}>
          This is a genuine, live connectivity check — not a placeholder. But deeper API
          monitoring (per-endpoint error rates, historical uptime percentages, request
          volume over time) needs dedicated monitoring infrastructure that doesn't exist
          yet. Building fake charts for that would look official without meaning anything,
          so this page stays limited to what it can honestly show right now.
        </p>
      </div>
    </div>
  )
}
