import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAdminAuth } from '../context/AdminAuthContext'

export default function Login() {
  const { login, status, checkError } = useAdminAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Once a login succeeds and the admin_users check confirms it, leave
  // this page — without this, a fully successful login has nothing that
  // ever moves the person forward, and it would just look like nothing
  // happened at all.
  if (status === 'admin') {
    return <Navigate to="/" replace />
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
    } catch (err) {
      setError(err.message || 'Could not sign in.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--navy)', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <img src="/jarasend_icon.png" alt="" style={{ width: 56, height: 56, borderRadius: 14 }} />
        <span style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600, fontSize: 26, color: '#fff' }}>
          Jara<span style={{ color: 'var(--gold)' }}>Send</span>
        </span>
      </div>
      <div style={{ width: 380, background: '#fff', borderRadius: 16, padding: 36 }}>
        <h1 style={{ fontSize: 18, marginBottom: 4 }}>Admin sign in</h1>
        <p style={{ color: 'var(--slate)', fontSize: 13, marginTop: 0, marginBottom: 28 }}>
          Sign in with your administrator account.
        </p>

        {status === 'notAdmin' && (
          <div style={{ background: 'var(--error-tint)', color: 'var(--error)', borderRadius: 10, padding: '10px 12px', fontSize: 12.5, marginBottom: 16 }}>
            That account isn't registered as an administrator.
          </div>
        )}
        {status === 'checkFailed' && (
          <div style={{ background: 'var(--error-tint)', color: 'var(--error)', borderRadius: 10, padding: '10px 12px', fontSize: 12.5, marginBottom: 16 }}>
            Couldn't verify your admin status — {checkError || 'please try signing in again.'}
          </div>
        )}
        {error && (
          <div style={{ background: 'var(--error-tint)', color: 'var(--error)', borderRadius: 10, padding: '10px 12px', fontSize: 12.5, marginBottom: 16 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <label style={{ display: 'block', fontSize: 12.5, fontWeight: 500, marginBottom: 6 }}>Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
          />
          <label style={{ display: 'block', fontSize: 12.5, fontWeight: 500, marginBottom: 6, marginTop: 16 }}>Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
          />
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', marginTop: 24, padding: '12px', borderRadius: 10, border: 'none',
              background: 'var(--navy)', color: '#fff', fontWeight: 600, fontSize: 14,
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}

const inputStyle = {
  width: '100%', padding: '11px 12px', borderRadius: 10,
  border: '1px solid var(--divider)', fontSize: 14, fontFamily: 'inherit',
}
