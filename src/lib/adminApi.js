import { supabase } from './supabase'

// Calls the admin-api Edge Function and turns every failure into a plain reason.
export async function callAdminApi(body) {
  const { data, error } = await supabase.functions.invoke('admin-api', { body })
  if (error) {
    let why = ''
    let status = error.context?.status
    try { const b = await error.context?.json?.(); if (b?.error) why = b.error } catch {}
    if (!why && (status === 404 || /not found/i.test(error.message || ''))) {
      why = 'The admin-api function is not deployed under that exact name in Supabase (Edge Functions).'
    }
    if (!why && /failed to send|fetch/i.test(error.message || '')) {
      why = 'Could not reach the admin-api function (not deployed, or the network blocked it).'
    }
    throw new Error(why || error.message || 'admin-api did not answer.')
  }
  return data
}
