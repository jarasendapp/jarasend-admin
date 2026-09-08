import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAdminAuth } from '../context/AdminAuthContext'
import StatusBadge from '../components/StatusBadge'

const STATUS_FILTERS = ['Pending', 'Approved', 'Rejected', 'All']
const STATUS_LABELS = { pending: 'Pending', approved: 'Approved', rejected: 'Rejected' }

export default function KycManagement() {
  const { adminProfile } = useAdminAuth()
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('Pending')
  const [selectedId, setSelectedId] = useState(null)
  const [actionError, setActionError] = useState('')
  const [actioning, setActioning] = useState(false)
  // The action awaiting confirmation - null when no dialog is open.
  const [pendingAction, setPendingAction] = useState(null)
  const [viewingDoc, setViewingDoc] = useState(null) // { label, base64 } | null

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const { data: kyc, error: kycError } = await supabase
        .from('kyc_records')
        .select('*')
        .order('submitted_at', { ascending: false })
      if (kycError) throw kycError

      const userIds = [...new Set((kyc ?? []).map((k) => k.user_id))]
      const { data: profiles, error: profilesError } = userIds.length
        ? await supabase.from('profiles').select('id, full_name, surname, phone, email, date_of_birth, house_number, street_name, town, state, country, business_name, business_house_number, business_street_name, business_town, business_state, business_country').in('id', userIds)
        : { data: [], error: null }
      if (profilesError) throw profilesError

      const profileById = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]))

      setRecords((kyc ?? []).map((k) => ({ ...k, profile: profileById[k.user_id] })))
    } catch (err) {
      setError(err.message || 'Could not load KYC records.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    if (filter === 'All') return records
    return records.filter((r) => STATUS_LABELS[r.status] === filter)
  }, [records, filter])

  const selected = records.find((r) => r.id === selectedId) ?? filtered[0] ?? null

  async function confirmDecision(reason) {
    const { record, newStatus } = pendingAction
    setActioning(true)
    setActionError('')
    try {
      const update = {
        status: newStatus,
        reviewed_at: new Date().toISOString(),
        reviewed_by: adminProfile.id,
      }
      if (newStatus === 'rejected') update.rejection_reason = reason

      const { error: updateError } = await supabase.from('kyc_records').update(update).eq('id', record.id)
      if (updateError) throw updateError
      setPendingAction(null)
      await load()
    } catch (err) {
      setActionError(err.message || 'Could not update this record.')
    } finally {
      setActioning(false)
    }
  }

  return (
    <div style={{ padding: 28, display: 'flex', gap: 20, height: 'calc(100vh - 56px)' }}>
      <div className="no-print" style={{ width: 380, flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
        <h1 style={{ fontSize: 22, marginBottom: 4 }}>KYC management</h1>
        <p style={{ color: 'var(--slate)', fontSize: 13, marginTop: 0, marginBottom: 16 }}>
          {loading ? 'Loading…' : `${filtered.length} ${filter.toLowerCase()} submission${filtered.length === 1 ? '' : 's'}`}
        </p>

        <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              style={{
                fontSize: 11.5, fontWeight: 600, padding: '6px 12px', borderRadius: 20,
                border: `1px solid ${filter === s ? 'var(--navy)' : 'var(--divider)'}`,
                background: filter === s ? 'var(--navy)' : '#fff',
                color: filter === s ? '#fff' : 'var(--text)',
              }}
            >
              {s}
            </button>
          ))}
        </div>

        {error && (
          <div style={{ background: 'var(--error-tint)', color: 'var(--error)', borderRadius: 10, padding: '10px 12px', fontSize: 12.5, marginBottom: 12 }}>
            {error}
          </div>
        )}

        <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map((r) => (
            <button
              key={r.id}
              onClick={() => setSelectedId(r.id)}
              style={{
                textAlign: 'left', background: selected?.id === r.id ? 'var(--green-tint)' : '#fff',
                border: `1px solid ${selected?.id === r.id ? 'var(--green)' : 'var(--divider)'}`,
                borderRadius: 12, padding: 12,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>
                  {r.profile?.full_name} {r.profile?.surname}
                </span>
                <StatusBadge status={STATUS_LABELS[r.status] ?? 'Pending'} />
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--slate)', textTransform: 'capitalize' }}>
                {r.role} · {r.id_type} · {new Date(r.submitted_at).toLocaleDateString()}
              </div>
            </button>
          ))}
          {!loading && filtered.length === 0 && (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--slate)', fontSize: 13 }}>
              No {filter.toLowerCase()} submissions.
            </div>
          )}
        </div>
      </div>

      <div className="kyc-detail-panel" style={{ flex: 1, background: '#fff', border: '1px solid var(--divider)', borderRadius: 14, padding: 24, overflowY: 'auto' }}>
        {!selected ? (
          <div style={{ color: 'var(--slate)', fontSize: 13, textAlign: 'center', marginTop: 60 }}>
            Select a submission to review it.
          </div>
        ) : (
          <KycDetail
            record={selected}
            onRequestDecision={(newStatus) => setPendingAction({ record: selected, newStatus })}
            actionError={actionError}
            onViewDocument={(label, base64) => setViewingDoc({ label, base64 })}
          />
        )}
      </div>

      {pendingAction && (
        <ConfirmDialog
          action={pendingAction}
          actioning={actioning}
          onCancel={() => setPendingAction(null)}
          onConfirm={confirmDecision}
        />
      )}
      {viewingDoc && (
        <DocumentLightbox doc={viewingDoc} onClose={() => setViewingDoc(null)} />
      )}
    </div>
  )
}

function KycDetail({ record, onRequestDecision, actionError, onViewDocument }) {
  const isAgent = record.role === 'agent'
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 18 }}>{record.profile?.full_name} {record.profile?.surname}</h2>
          <p style={{ color: 'var(--slate)', fontSize: 12.5, marginTop: 4 }}>
            {record.profile?.phone} · {record.profile?.email || 'no email'}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <StatusBadge status={STATUS_LABELS[record.status] ?? 'Pending'} />
          <button
            className="no-print"
            onClick={() => window.print()}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
              borderRadius: 10, border: '1px solid var(--divider)', background: '#fff',
              fontSize: 12.5, fontWeight: 600, color: 'var(--navy)',
            }}
          >
            🖨 Print
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
        <Field label="Role" value={record.role} capitalize />
        <Field label="ID type" value={record.id_type} />
        <Field label="ID number" value={record.id_number} mono />
        <Field label="BVN" value={record.bvn || '—'} mono />
        <Field label="Submitted" value={new Date(record.submitted_at).toLocaleString()} />
        {isAgent && <Field label="Company registration number" value={record.company_reg_number || '—'} mono />}
      </div>

      <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--slate)', letterSpacing: 0.3, textTransform: 'uppercase', margin: '4px 0 12px' }}>
        Registration information
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
        <Field label="Date of birth" value={record.profile?.date_of_birth ? new Date(record.profile.date_of_birth).toLocaleDateString() : '—'} />
        <Field label="Home address" value={formatAddress(record.profile, 'house_number', 'street_name', 'town', 'state', 'country')} />
        {isAgent && <Field label="Business name" value={record.profile?.business_name || '—'} />}
        {isAgent && <Field label="Business address" value={formatAddress(record.profile, 'business_house_number', 'business_street_name', 'business_town', 'business_state', 'business_country')} />}
      </div>

      {isAgent && (
        <>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--slate)', letterSpacing: 0.3, textTransform: 'uppercase', margin: '4px 0 12px' }}>
            Bank details (withdrawal destination)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
            <Field label="Bank name" value={record.bank_name || '—'} />
            <Field label="Account number" value={record.bank_account_number || '—'} mono />
            <Field label="Account name" value={record.bank_account_name || '—'} />
          </div>
        </>
      )}

      {record.status !== 'pending' && (record.reviewed_by || record.rejection_reason) && (
        <div style={{ background: 'var(--bg)', borderRadius: 10, padding: 14, marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--slate)', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 6 }}>
            Decision record
          </div>
          {record.reviewed_at && (
            <p style={{ fontSize: 12.5, margin: '0 0 4px' }}>Reviewed {new Date(record.reviewed_at).toLocaleString()}</p>
          )}
          {record.rejection_reason && (
            <p style={{ fontSize: 12.5, margin: 0, color: 'var(--error)' }}>Reason: {record.rejection_reason}</p>
          )}
        </div>
      )}

      {actionError && (
        <div style={{ background: 'var(--error-tint)', color: 'var(--error)', borderRadius: 10, padding: '10px 12px', fontSize: 12.5, marginBottom: 16 }}>
          {actionError}
        </div>
      )}

      <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--slate)', letterSpacing: 0.3, textTransform: 'uppercase', margin: '4px 0 12px' }}>
        Uploaded documents
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12, marginBottom: 24 }}>
        <DocImage label="Government ID" base64={record.id_image_base64} onClick={() => onViewDocument('Government ID', record.id_image_base64)} />
        <DocImage label="Selfie" base64={record.selfie_image_base64} onClick={() => onViewDocument('Selfie', record.selfie_image_base64)} />
        {isAgent && <DocImage label="Business photo" base64={record.business_photo_base64} onClick={() => onViewDocument('Business photo', record.business_photo_base64)} />}
        {isAgent && <DocImage label="Company registration certificate" base64={record.company_reg_cert_base64} onClick={() => onViewDocument('Company registration certificate', record.company_reg_cert_base64)} />}
      </div>

      {record.status === 'approved' && (
        <ResubmissionPanel record={record} />
      )}

      {record.status === 'pending' && (
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => onRequestDecision('approved')}
            style={{
              padding: '11px 22px', borderRadius: 10, border: 'none', background: 'var(--green)',
              color: '#fff', fontWeight: 600, fontSize: 13.5,
            }}
          >
            Approve
          </button>
          <button
            onClick={() => onRequestDecision('rejected')}
            style={{
              padding: '11px 22px', borderRadius: 10, border: '1px solid var(--error)', background: '#fff',
              color: 'var(--error)', fontWeight: 600, fontSize: 13.5,
            }}
          >
            Reject
          </button>
        </div>
      )}
    </div>
  )
}

function ConfirmDialog({ action, actioning, onCancel, onConfirm }) {
  const [reason, setReason] = useState('')
  const isReject = action.newStatus === 'rejected'
  const name = `${action.record.profile?.full_name ?? ''} ${action.record.profile?.surname ?? ''}`.trim()
  const canConfirm = !isReject || reason.trim().length > 0

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(11,31,58,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
    }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: 420 }}>
        <h3 style={{ fontSize: 16, marginBottom: 8 }}>
          {isReject ? 'Reject' : 'Approve'} {name}'s verification?
        </h3>
        <p style={{ fontSize: 12.5, color: 'var(--slate)', marginTop: 0, marginBottom: 16 }}>
          {isReject
            ? "They'll be blocked from sending money until this is resolved. The reason below is sent to them automatically, in-app and as a notification."
            : "They'll immediately be able to send money."}
        </p>

        {isReject && (
          <>
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 500, marginBottom: 6 }}>Reason for rejection (required)</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="e.g. ID photo is blurry and the number isn't readable"
              style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--divider)', fontSize: 13, fontFamily: 'inherit', marginBottom: 16, resize: 'vertical' }}
            />
          </>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            disabled={actioning}
            style={{ padding: '10px 18px', borderRadius: 10, border: '1px solid var(--divider)', background: '#fff', fontWeight: 600, fontSize: 13 }}
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(reason.trim())}
            disabled={actioning || !canConfirm}
            style={{
              padding: '10px 18px', borderRadius: 10, border: 'none',
              background: isReject ? 'var(--error)' : 'var(--green)', color: '#fff', fontWeight: 600, fontSize: 13,
              opacity: actioning || !canConfirm ? 0.6 : 1,
            }}
          >
            {actioning ? 'Saving…' : `Confirm ${isReject ? 'rejection' : 'approval'}`}
          </button>
        </div>
      </div>
    </div>
  )
}

function formatAddress(profile, houseKey, streetKey, townKey, stateKey, countryKey) {
  if (!profile) return '—'
  const parts = [profile[houseKey], profile[streetKey], profile[townKey], profile[stateKey], profile[countryKey]].filter(Boolean)
  return parts.length ? parts.join(', ') : '—'
}

function Field({ label, value, mono, capitalize }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--slate)', marginBottom: 3 }}>{label}</div>
      <div className={mono ? 'mono' : undefined} style={{ fontSize: 13, fontWeight: 600, textTransform: capitalize ? 'capitalize' : 'none' }}>
        {value}
      </div>
    </div>
  )
}

function DocumentLightbox({ doc, onClose }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(11,31,58,0.85)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: 24,
      }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: 700, width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>{doc.label}</span>
          <button
            onClick={onClose}
            style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', borderRadius: 8, padding: '6px 14px', fontSize: 13, fontWeight: 600 }}
          >
            Close
          </button>
        </div>
        <img
          src={`data:image/jpeg;base64,${doc.base64}`}
          alt={doc.label}
          style={{ width: '100%', borderRadius: 12, display: 'block' }}
        />
      </div>
    </div>
  )
}

function DocImage({ label, base64, onClick }) {
  return (
    <div>
      {base64 ? (
        <img
          src={`data:image/jpeg;base64,${base64}`}
          alt={label}
          onClick={onClick}
          style={{
            width: '100%', aspectRatio: '1', borderRadius: 10, border: '1px solid var(--divider)',
            objectFit: 'cover', display: 'block', cursor: 'pointer',
          }}
        />
      ) : (
        <div style={{
          width: '100%', aspectRatio: '1', borderRadius: 10, border: '1px solid var(--divider)',
          background: '#F5F5F5', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: 11, color: 'var(--slate)' }}>Not uploaded</span>
        </div>
      )}
      <div style={{ fontSize: 11, color: 'var(--slate)', marginTop: 5 }}>{label}{base64 ? ' — click to view' : ''}</div>
    </div>
  )
}

// Lets an admin flag an already-approved KYC record for resubmission —
// e.g. a blurry ID photo discovered after approval — without reverting
// the whole record to pending/rejected. Shown only when record.status
// is 'approved'.
function ResubmissionPanel({ record }) {
  const [note, setNote] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [flagged, setFlagged] = useState(record.needs_resubmission)
  const [savedNote, setSavedNote] = useState(record.resubmission_note)

  async function submit() {
    if (!note.trim()) return
    setBusy(true)
    setError('')
    try {
      const { error: err } = await supabase.from('kyc_records').update({
        needs_resubmission: true,
        resubmission_note: note.trim(),
        resubmission_requested_at: new Date().toISOString(),
      }).eq('user_id', record.user_id).eq('role', record.role)
      if (err) throw err
      setFlagged(true)
      setSavedNote(note.trim())
      setShowForm(false)
      setNote('')
    } catch (e) {
      setError(e.message || 'Could not flag this record for resubmission.')
    } finally {
      setBusy(false)
    }
  }

  async function clear() {
    setBusy(true)
    setError('')
    try {
      const { error: err } = await supabase.from('kyc_records').update({
        needs_resubmission: false, resubmission_note: null,
      }).eq('user_id', record.user_id).eq('role', record.role)
      if (err) throw err
      setFlagged(false)
      setSavedNote(null)
    } catch (e) {
      setError(e.message || 'Could not clear the resubmission flag.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--slate)', letterSpacing: 0.3, textTransform: 'uppercase', marginBottom: 10 }}>
        Request resubmission
      </div>

      {error && (
        <div style={{ background: 'var(--error-tint)', color: 'var(--error)', borderRadius: 10, padding: '9px 12px', fontSize: 12.5, marginBottom: 10 }}>{error}</div>
      )}

      {flagged ? (
        <div style={{ background: 'var(--gold-tint)', borderRadius: 12, padding: 14 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: '#854F0B', marginBottom: 6 }}>⏳ Resubmission requested</div>
          <div style={{ fontSize: 12.5, color: 'var(--text)', marginBottom: 10 }}>{savedNote}</div>
          <button onClick={clear} disabled={busy} style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid var(--divider)', background: '#fff', fontSize: 12, fontWeight: 600 }}>
            {busy ? 'Working…' : 'Clear this request'}
          </button>
        </div>
      ) : showForm ? (
        <div style={{ background: 'var(--bg)', borderRadius: 12, padding: 14 }}>
          <label style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--slate)' }}>What needs to be redone (shown to the user)</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            style={{ width: '100%', marginTop: 6, padding: 10, borderRadius: 8, border: '1px solid var(--divider)', fontSize: 13, fontFamily: 'inherit', resize: 'vertical' }}
            placeholder="e.g. Your ID photo is too blurry to read — please retake it in good lighting."
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button onClick={submit} disabled={busy || !note.trim()} style={{ padding: '8px 16px', borderRadius: 10, border: 'none', background: 'var(--navy)', color: '#fff', fontSize: 12.5, fontWeight: 600 }}>
              {busy ? 'Sending…' : 'Request resubmission'}
            </button>
            <button onClick={() => { setShowForm(false); setNote('') }} style={{ padding: '8px 16px', borderRadius: 10, border: '1px solid var(--divider)', background: '#fff', fontSize: 12.5, fontWeight: 600 }}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          style={{ padding: '8px 16px', borderRadius: 10, border: '1px solid var(--divider)', background: '#fff', color: 'var(--navy)', fontSize: 12.5, fontWeight: 600 }}
        >
          Flag a document for resubmission
        </button>
      )}
    </div>
  )
}
