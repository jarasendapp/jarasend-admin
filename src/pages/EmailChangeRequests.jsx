import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import StatusBadge from '../components/StatusBadge'

const STATUS_LABELS = { pending: 'Pending', approved: 'Approved', rejected: 'Rejected' }

export default function EmailChangeRequests() {
  const [requests, setRequests] = useState([])
  const [profiles, setProfiles] = useState({})
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [pendingAction, setPendingAction] = useState(null) // { request, approve }
  const [notes, setNotes] = useState('')
  const [actioning, setActioning] = useState(false)
  const [actionError, setActionError] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    setLoadError('')
    try {
      const { data, error } = await supabase.from('email_change_requests').select('*').order('created_at', { ascending: false })
      if (error) throw error
      setRequests(data ?? [])
      const ids = [...new Set((data ?? []).map((r) => r.user_id).filter(Boolean))]
      if (ids.length) {
        const { data: rows, error: pErr } = await supabase.from('profiles').select('id, full_name, surname, phone').in('id', ids)
        if (pErr) throw pErr
        setProfiles(Object.fromEntries((rows ?? []).map((p) => [p.id, p])))
      }
    } catch (err) {
      setLoadError(err.message || 'Could not load email change requests.')
    } finally {
      setLoading(false)
    }
  }

  async function confirmDecision() {
    setActioning(true)
    setActionError('')
    try {
      // The database function does the whole job (and checks you are an admin).
      const { error } = await supabase.rpc('decide_email_change', {
        p_request: pendingAction.request.id,
        p_approve: pendingAction.approve,
        p_notes: notes.trim() || null,
      })
      if (error) throw error
      setPendingAction(null)
      setNotes('')
      await load()
    } catch (err) {
      setActionError(err.message || 'Could not save the decision.')
    } finally {
      setActioning(false)
    }
  }

  const pendingCount = requests.filter((r) => r.status === 'pending').length
  const btn = { padding: '8px 16px', borderRadius: 8, fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }

  return (
    <div style={{ padding: 28 }}>
      <h1 style={{ fontSize: 22, marginBottom: 4 }}>Email Change Requests</h1>
      <p style={{ color: 'var(--slate)', fontSize: 13, marginTop: 0, marginBottom: 24 }}>
        The registered email receives password-reset codes, so it changes only with a reason and your approval — {pendingCount} pending.
        Confirm the person's identity (for example by phone) before approving.
      </p>
      {loadError && <div style={{ padding: 14, background: '#FEF2F2', color: 'var(--error)', borderRadius: 10, fontSize: 13, marginBottom: 18 }}>{loadError}</div>}
      {loading ? (
        <div style={{ color: 'var(--slate)', fontSize: 13 }}>Loading…</div>
      ) : requests.length === 0 ? (
        <div style={{ color: 'var(--slate)', fontSize: 13 }}>No email change requests yet.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {requests.map((r) => {
            const p = profiles[r.user_id]
            return (
              <div key={r.id} style={{ background: '#fff', border: '1px solid var(--divider)', borderRadius: 14, padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 14.5, fontWeight: 700 }}>{p ? `${p.full_name} ${p.surname ?? ''}` : r.user_id}</div>
                    <div style={{ fontSize: 12, color: 'var(--slate)' }}>{p?.phone}</div>
                  </div>
                  <StatusBadge status={STATUS_LABELS[r.status] ?? r.status} />
                </div>
                <div style={{ fontSize: 13, marginBottom: 6 }}>From <strong>{r.current_email || '—'}</strong> to <strong>{r.requested_email}</strong></div>
                <div style={{ fontSize: 12.5, color: 'var(--slate)', marginBottom: 10 }}><strong style={{ color: 'var(--ink)' }}>Reason: </strong>{r.reason}</div>
                {r.status !== 'pending' && r.review_notes && <div style={{ fontSize: 12.5, color: 'var(--slate)' }}><strong>Admin notes: </strong>{r.review_notes}</div>}
                {r.status === 'pending' && (
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={() => setPendingAction({ request: r, approve: true })} style={{ ...btn, border: 'none', background: 'var(--green-dark)', color: '#fff' }}>Approve</button>
                    <button onClick={() => setPendingAction({ request: r, approve: false })} style={{ ...btn, border: '1px solid var(--error)', background: '#fff', color: 'var(--error)' }}>Reject</button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
      {pendingAction && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: 24, width: 420 }}>
            <h3 style={{ fontSize: 16, marginTop: 0 }}>{pendingAction.approve ? 'Approve this email change?' : 'Reject this request?'}</h3>
            <p style={{ fontSize: 13, color: 'var(--slate)' }}>
              {pendingAction.approve
                ? `The login and contact email become ${pendingAction.request.requested_email} immediately.`
                : 'The email stays as it is and the person is told the request was declined.'}
            </p>
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 500, marginBottom: 6 }}>Note (optional, kept on record{pendingAction.approve ? '' : ' and shown to the person'})</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--divider)', fontSize: 13, fontFamily: 'inherit', marginBottom: 16, boxSizing: 'border-box' }} />
            {actionError && <div style={{ color: 'var(--error)', fontSize: 12.5, marginBottom: 12 }}>{actionError}</div>}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button disabled={actioning} onClick={() => { setPendingAction(null); setNotes(''); setActionError('') }} style={{ ...btn, border: '1px solid var(--divider)', background: '#fff' }}>Cancel</button>
              <button disabled={actioning} onClick={confirmDecision} style={{ ...btn, border: 'none', background: pendingAction.approve ? 'var(--green-dark)' : 'var(--error)', color: '#fff' }}>{actioning ? 'Saving…' : 'Confirm'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
