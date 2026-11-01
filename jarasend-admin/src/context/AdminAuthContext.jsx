import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AdminAuthContext = createContext(null)

export function AdminAuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [adminProfile, setAdminProfile] = useState(null)
  const [checkError, setCheckError] = useState('')
  // Four possible states: still checking, confirmed admin, confirmed
  // not-an-admin (e.g. someone's regular consumer-app login), or a
  // genuine error while trying to check — deliberately distinct from
  // "not an admin", since those aren't the same thing.
  const [status, setStatus] = useState('checking')

  async function checkAdminStatus(currentSession) {
    if (!currentSession) {
      setSession(null)
      setAdminProfile(null)
      setStatus('signedOut')
      return
    }
    setCheckError('')
    // "JWT issued at future" means the database's clock is a second or two behind
    // the sign-in server's clock. It clears by itself, so wait and retry a few times.
    let data = null
    let error = null
    let refreshed = false
    for (let attempt = 0; attempt < 5; attempt++) {
      const res = await supabase
        .from('admin_users')
        .select('*')
        .eq('id', currentSession.user.id)
        .maybeSingle()
      data = res.data
      error = res.error
      if (!error) break
      console.error('admin_users check failed', error)
      const text = `${error.message || ''} ${error.details || ''} ${error.hint || ''}`
      const clockSkew = /issued at future|not yet valid/i.test(text)
      const tokenProblem = /jwt|token/i.test(text) || error.code === 'PGRST301'
      if (!clockSkew && !tokenProblem && attempt >= 1) break
      // a bad token: get a fresh one once, then keep retrying
      if (tokenProblem && !refreshed) {
        refreshed = true
        const { data: r } = await supabase.auth.refreshSession()
        if (r?.session) currentSession = r.session
      }
      await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)))
    }

    if (error) {
      // A genuine query failure (e.g. a database-side issue) is NOT the
      // same thing as "confirmed not an admin" — don't claim something
      // we don't actually know, and don't sign them out, since they may
      // well be a genuine admin hitting a transient problem that's worth
      // letting them retry rather than losing their session over.
      setStatus('checkFailed')
      setCheckError([error.code, error.message, error.details, error.hint].filter(Boolean).join(' | ') || `Unknown error${error.status ? ' (HTTP ' + error.status + ')' : ''}. Press F12 and read the Console for details.`)
      return
    }
    if (!data) {
      // Authenticated with Supabase, but genuinely no admin_users row —
      // this is the real "not a recognised admin" case.
      await supabase.auth.signOut()
      setSession(null)
      setAdminProfile(null)
      setStatus('notAdmin')
      return
    }
    setSession(currentSession)
    setAdminProfile(data)
    setStatus('admin')
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      checkAdminStatus(session)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      checkAdminStatus(session)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  async function login(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    // onAuthStateChange above picks up the new session and runs the
    // admin_users check automatically.
  }

  // Lets the login page re-run the admin check without signing in again.
  async function recheck() {
    setStatus('checking')
    const { data: { session } } = await supabase.auth.getSession()
    await checkAdminStatus(session)
  }

  async function logout() {
    await supabase.auth.signOut()
  }

  return (
    <AdminAuthContext.Provider value={{ session, adminProfile, status, checkError, login, logout, recheck }}>
      {children}
    </AdminAuthContext.Provider>
  )
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext)
  if (!ctx) throw new Error('useAdminAuth must be used inside AdminAuthProvider')
  return ctx
}
