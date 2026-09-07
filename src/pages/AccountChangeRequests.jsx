import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAdminAuth } from '../context/AdminAuthContext'
import StatusBadge from '../components/StatusBadge'

const STATUS_LABELS = { pending: 'Pending', approved: 'Approved', rejected: 'Rejected' }

export default function AccountChangeRequests() {
  const { adminProfile } = useAdminAuth()
  const [requests, setRequests] = useState([])
  const [profiles, setProfiles] = useState({})
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [pendingAction, setPendingAction] = useState(null) // { request, newStatus }
  const [reviewNotes, setReviewNotes] = useState('')
  const [actioning, setActioning] = useState(false)
  const [actionError, setActionError] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    setLoadError('')
    try {
      const { data, error } = await supabase
        .from('account_change_requests')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      setRequests(data ?? [])

      const userIds = [...new Set((data ?? []).map((r) => r.user_id))]
      if (userIds.length) {
        const { data: profileRows, error: profileError } = await supabase
          .from('profiles')
          .select('id, full_name, surname, phone, email, business_name')
          .in('id', userIds)
        if (profileError) throw profileError
        setProfiles(Object.fromEntries((profileRows ?? []).map((p) => [p.id, p])))
      }
    } catch (err) {
      setLoadError(err.message || 'Could not load account change requests.')
    } finally {
      setLoading(false)
    }
  }

  async function confirmDecision() {
    const { request, newStatus } = pendingAction
    setActioning(true)
    setActionError('')
    try {
      const update = {
        status: newStatus,
        reviewed_at: new Date().toISOString(),
        reviewed_by: adminProfile.id,
      }
      if (newStatus === 'rejected') update.review_notes = reviewNotes
      const { error } = await supabase.from('account_change_requests').update(update).eq('id', request.id)
      if (error) throw error
      setPendingAction(null)
      setReviewNotes('')
      await load()
    } catch (err) {
      setActionError(err.message || 'Could not update this request.')
    } finally {
      setActioning(false)
    }
  }

  const pendingCount = requests.filter((r) => r.status === 'pending').length

  return (
    <div style={{ padding: 28 }}>
      <h1 style={{ fontSize: 22, marginBottom: 4 }}>Account Change Requests</h1>
      <p style={{ color: 'var(--slate)', fontSize: 13, marginTop: 0, marginBottom: 24 }}>
        Agents requesting a change to their withdrawal bank account — {pendingCount} pending review.
      </p>

      {loadError && (
        <div style={{ padding: 14, background: '#FEF2F2', color: 'var(--error)', borderRadius: 10, fontSize: 13, marginBottom: 18 }}>{loadError}</div>
      )}

      {loading ? (
        <div style={{ color: 'var(--slate)', fontSize: 13 }}>Loading…</div>
      ) : requests.length === 0 ? (
        <div style={{ color: 'var(--slate)', fontSize: 13 }}>No account change requests yet.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {requests.map((r) => {
            const profile = profiles[r.user_id]
            return (
              <div key={r.id} style={{ background: '#fff', border: '1px solid var(--divider)', borderRadius: 14, padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                  <div>
                    <div style={{ fontSize: 14.5, fontWeight: 700 }}>{profile ? `${profile.full_name} ${profile.surname}` : r.user_id}</div>
                    <div style={{ fontSize: 12, color: 'var(--slate)' }}>{profile?.business_name} {profile?.phone ? `· ${profile.phone}` : ''}</div>
                  </div>
                  <StatusBadge status={STATUS_LABELS[r.status] ?? r.status} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 14 }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--slate)', textTransform: 'uppercase', marginBottom: 6 }}>Current account</div>
                    <div style={{ fontSize: 13 }}>{r.current_bank_name || '—'}</div>
                    <div style={{ fontSize: 13, fontFamily: 'monospace' }}>{r.current_bank_account_number || '—'}</div>
                    <div style={{ fontSize: 13 }}>{r.current_bank_account_name || '—'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--green-dark)', textTransform: 'uppercase', marginBottom: 6 }}>Requested account</div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{r.requested_bank_name}</div>
                    <div style={{ fontSize: 13, fontFamily: 'monospace', fontWeight: 600 }}>{r.requested_bank_account_number}</div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{r.requested_bank_account_name}</div>
                  </div>
                </div>

                <div style={{ fontSize: 12.5, color: 'var(--slate)', marginBottom: r.status === 'pending' ? 16 : 0 }}>
                  <strong style={{ color: 'var(--ink)' }}>Reason: </strong>{r.reason}
                </div>

                {r.status !== 'pending' && r.review_notes && (
                  <div style={{ fontSize: 12.5, color: 'var(--error)', marginTop: 8 }}>
                    <strong>Admin notes: </strong>{r.review_notes}
                  </div>
                )}

                {r.status === 'pending' && (
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      onClick={() => setPendingAction({ request: r, newStatus: 'approved' })}
                      style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: 'var(--green-dark)', color: '#fff', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => setPendingAction({ request: r, newStatus: 'rejected' })}
                      style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--error)', background: '#fff', color: 'var(--error)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}
                    >
                      Reject
                    </button>
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
            <h3 style={{ fontSize: 16, marginTop: 0, marginBottom: 8 }}>
              {pendingAction.newStatus === 'approved' ? 'Approve this request?' : 'Reject this request?'}
            </h3>
            <p style={{ fontSize: 13, color: 'var(--slate)', marginBottom: 16 }}>
              {pendingAction.newStatus === 'approved'
                ? 'The agent\'s withdrawal account will be updated to the requested details immediately.'
                : 'The agent will keep their current withdrawal account. They\'ll be notified this request was not approved.'}
            </p>
            {pendingAction.newStatus === 'rejected' && (
              <>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 500, marginBottom: 6 }}>Reason for rejection (optional, shown to the agent)</label>
                <textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  rows={3}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--divider)', fontSize: 13, fontFamily: 'inherit', marginBottom: 16, boxSizing: 'border-box' }}
                />
              </>
            )}
            {actionError && <div style={{ color: 'var(--error)', fontSize: 12.5, marginBottom: 12 }}>{actionError}</div>}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setPendingAction(null); setReviewNotes(''); setActionError('') }}
                disabled={actioning}
                style={{ padding: '9px 16px', borderRadius: 8, border: '1px solid var(--divider)', background: '#fff', fontSize: 12.5, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={confirmDecision}
                disabled={actioning}
                style={{ padding: '9px 16px', borderRadius: 8, border: 'none', background: pendingAction.newStatus === 'approved' ? 'var(--green-dark)' : 'var(--error)', color: '#fff', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}
              >
                {actioning ? 'Saving…' : `Confirm ${pendingAction.newStatus === 'approved' ? 'approval' : 'rejection'}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
