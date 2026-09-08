import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

// Shows the current lock state for a specific (userId, role) pair and
// lets an admin lock, unlock, or resolve a pending appeal — all in one
// place, reused identically on both the Personal Accounts and Agent
// Accounts detail views, since locking works the same way for both.
export default function AccountLockPanel({ userId, role }) {
  const [lock, setLock] = useState(null) // most recent row, or null if never locked
  const [loading, setLoading] = useState(true)
  const [reasonInput, setReasonInput] = useState('')
  const [showLockForm, setShowLockForm] = useState(false)
  const [responseInput, setResponseInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { load() }, [userId, role])

  async function load() {
    setLoading(true)
    setError('')
    try {
      const { data, error: err } = await supabase
        .from('account_locks')
        .select('*')
        .eq('user_id', userId)
        .eq('role', role)
        .order('locked_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (err) throw err
      setLock(data)
    } catch (e) {
      setError(e.message || 'Could not load lock status.')
    } finally {
      setLoading(false)
    }
  }

  const isActive = lock && (lock.status === 'locked' || lock.status === 'appealed')

  async function submitLock() {
    if (!reasonInput.trim()) return
    setBusy(true)
    setError('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { error: err } = await supabase.from('account_locks').insert({
        user_id: userId, role, status: 'locked', reason: reasonInput.trim(), locked_by: user?.id,
      })
      if (err) throw err
      setReasonInput('')
      setShowLockForm(false)
      await load()
    } catch (e) {
      setError(e.message || 'Could not lock this account.')
    } finally {
      setBusy(false)
    }
  }

  async function unlock() {
    setBusy(true)
    setError('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { error: err } = await supabase.from('account_locks').update({
        status: 'approved', reviewed_by: user?.id, reviewed_at: new Date().toISOString(),
        admin_response: responseInput.trim() || null,
      }).eq('id', lock.id)
      if (err) throw err
      setResponseInput('')
      await load()
    } catch (e) {
      setError(e.message || 'Could not unlock this account.')
    } finally {
      setBusy(false)
    }
  }

  async function declineAppeal() {
    setBusy(true)
    setError('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { error: err } = await supabase.from('account_locks').update({
        status: 'declined', reviewed_by: user?.id, reviewed_at: new Date().toISOString(),
        admin_response: responseInput.trim() || null,
      }).eq('id', lock.id)
      if (err) throw err
      setResponseInput('')
      await load()
    } catch (e) {
      setError(e.message || 'Could not decline this appeal.')
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <p style={{ fontSize: 12.5, color: 'var(--slate)' }}>Loading lock status…</p>

  return (
    <div style={{ marginTop: 8 }}>
      {error && (
        <div style={{ background: 'var(--error-tint)', color: 'var(--error)', borderRadius: 10, padding: '9px 12px', fontSize: 12.5, marginBottom: 10 }}>{error}</div>
      )}

      {!isActive && !showLockForm && (
        <button
          onClick={() => setShowLockForm(true)}
          style={{ padding: '8px 16px', borderRadius: 10, border: '1px solid var(--error)', background: '#fff', color: 'var(--error)', fontSize: 12.5, fontWeight: 600 }}
        >
          🔒 Lock this account
        </button>
      )}

      {!isActive && showLockForm && (
        <div style={{ background: 'var(--error-tint)', borderRadius: 12, padding: 14 }}>
          <label style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--error)' }}>Reason for locking (shown to the account holder)</label>
          <textarea
            value={reasonInput}
            onChange={(e) => setReasonInput(e.target.value)}
            rows={3}
            style={{ width: '100%', marginTop: 6, padding: 10, borderRadius: 8, border: '1px solid var(--divider)', fontSize: 13, fontFamily: 'inherit', resize: 'vertical' }}
            placeholder="e.g. Suspicious transaction pattern flagged for review…"
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button onClick={submitLock} disabled={busy || !reasonInput.trim()} style={{ padding: '8px 16px', borderRadius: 10, border: 'none', background: 'var(--error)', color: '#fff', fontSize: 12.5, fontWeight: 600 }}>
              {busy ? 'Locking…' : 'Confirm lock'}
            </button>
            <button onClick={() => { setShowLockForm(false); setReasonInput('') }} style={{ padding: '8px 16px', borderRadius: 10, border: '1px solid var(--divider)', background: '#fff', fontSize: 12.5, fontWeight: 600 }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {isActive && (
        <div style={{ background: 'var(--error-tint)', borderRadius: 12, padding: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--error)' }}>
              {lock.status === 'appealed' ? '🔒 Locked — appeal pending' : '🔒 Locked'}
            </span>
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--text)', marginBottom: 6 }}><strong>Reason:</strong> {lock.reason || '—'}</div>
          {lock.status === 'appealed' && (
            <div style={{ fontSize: 12.5, color: 'var(--text)', marginBottom: 10, background: '#fff', borderRadius: 8, padding: 10 }}>
              <strong>Appeal:</strong> {lock.appeal_text}
            </div>
          )}
          <label style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--slate)' }}>Response note (optional, shown to the user)</label>
          <textarea
            value={responseInput}
            onChange={(e) => setResponseInput(e.target.value)}
            rows={2}
            style={{ width: '100%', marginTop: 6, marginBottom: 10, padding: 10, borderRadius: 8, border: '1px solid var(--divider)', fontSize: 13, fontFamily: 'inherit', resize: 'vertical' }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={unlock} disabled={busy} style={{ padding: '8px 16px', borderRadius: 10, border: 'none', background: 'var(--green-dark)', color: '#fff', fontSize: 12.5, fontWeight: 600 }}>
              {busy ? 'Working…' : (lock.status === 'appealed' ? 'Approve appeal & unlock' : 'Unlock')}
            </button>
            {lock.status === 'appealed' && (
              <button onClick={declineAppeal} disabled={busy} style={{ padding: '8px 16px', borderRadius: 10, border: '1px solid var(--error)', background: '#fff', color: 'var(--error)', fontSize: 12.5, fontWeight: 600 }}>
                Decline appeal
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
