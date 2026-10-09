import { supabase } from './supabase'

// Company revenue, worked out by the database from the real money records (claimed transfers,
// agent fees taken, commission paid to agents). Rows: { type, amount (naira), created_at, related_user_id }.
// type is 'transaction_fee', 'onboarding_fee' or 'agent_commission'.
export async function fetchRevenue() {
  const { data, error } = await supabase.rpc('admin_revenue_entries')
  if (error) return { data: null, error }
  return {
    data: (data ?? []).map((r) => ({
      type: r.type,
      amount: Number(r.amount_kobo) / 100,
      created_at: r.created_at,
      related_user_id: r.related_user_id,
    })),
    error: null,
  }
}
