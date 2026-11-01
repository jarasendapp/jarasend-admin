# JaraSend Admin Dashboard

React + Vite admin portal, talking directly to the same Supabase project as the JaraSend mobile app. First module built: **Dashboard** (live registration/KYC stats + sample transaction data). More modules (Personal accounts, Agent accounts, KYC review, Transactions, etc.) are being added incrementally — the full navigation is already in place with placeholder pages for anything not built yet.

## What's real data vs sample data

- **Registrations, KYC status** → genuinely live, pulled straight from Supabase.
- **Transactions, Wallets, Cash pickup, Revenue** → sample/illustrative data only, clearly labeled "SAMPLE DATA" on every card. This data currently lives only on individual phones (not centralized), so there's nothing real for a web dashboard to show yet — this will switch to live data once transactions move to Supabase (planned alongside the GetAnchor banking integration).
- **Net revenue** = gross transaction fees minus agent commission paid out, per your instruction — currently calculated from sample figures, same formula will apply to real figures later.

## Local setup

1. `npm install`
2. Copy `.env.example` to `.env`, fill in your Supabase URL and publishable key (same values the mobile app uses — find them at Supabase → Project Settings → Data API)
3. `npm run dev` — opens at `http://localhost:5173`

## Creating your first admin login

The admin dashboard requires a *separate* login from regular app users — being a customer or agent doesn't grant admin access.

1. Supabase dashboard → **Authentication → Users → Add user** — create a login with an email and password for yourself
2. Copy that user's UUID
3. Supabase → **SQL Editor**, run:
   ```sql
   insert into public.admin_users (id, full_name, role)
   values ('paste-the-uuid-here', 'Your Name', 'super_admin');
   ```
4. Sign in at the dashboard with that email/password

Valid roles: `super_admin`, `finance_admin`, `support`, `compliance`, `operations` — matching the five admin role types from the original specification. Role-based permission restrictions (e.g., Support can't touch Settings) aren't enforced yet — everyone who's in `admin_users` currently sees everything. That's a planned follow-up, not an oversight.

## Deployment (Firebase Hosting)

This repo includes `.github/workflows/deploy.yml`, set up the same way as the mobile app's CI. Deploys to your project's default Hosting site — attach a custom domain to that site directly from the Firebase console whenever you're ready (Hosting → Add custom domain).

1. **Firebase Hosting service account**: `firebase init hosting:github` from the Firebase CLI (or create one manually) — this generates a service account key
2. Add three GitHub repo secrets (**Settings → Secrets and variables → Actions**):
   - `FIREBASE_SERVICE_ACCOUNT` — the JSON key from step 1
   - `SUPABASE_URL`
   - `SUPABASE_PUBLISHABLE_KEY`
3. Edit `.github/workflows/deploy.yml` — replace `your-firebase-project-id` with your actual Firebase project ID
4. Push to `main` — the workflow builds and deploys automatically

## Database changes required

Run the latest `JaraSend_Supabase_Schema.sql` against your Supabase project if you haven't already — it includes the new `admin_users` table and the RLS policies that let admins read every user's data (not just their own, which is what the mobile app's policies correctly restrict to).

## Tech stack

React 19, Vite, `@supabase/supabase-js`, `react-router-dom`, `recharts`. No custom backend — talks to Supabase directly, consistent with how the rest of this project has been built throughout.
