import { createClient } from '@supabase/supabase-js'

// Read from environment variables at build time — NEVER hardcode these.
// Vite exposes any env var prefixed with VITE_ to the client bundle.
// Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in a local
// .env file for development, and as build secrets in CI for deployment —
// same publishable key already used by the Flutter mobile app.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabasePublishableKey) {
  console.error(
    'Missing Supabase configuration. Create a .env file (see .env.example) ' +
    'with VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.'
  )
}

export const supabase = createClient(supabaseUrl, supabasePublishableKey)
