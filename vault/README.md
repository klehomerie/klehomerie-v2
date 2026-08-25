# Klehomerie Vault

Client communication and document vault portal. Next.js (App Router) + TypeScript
+ Tailwind, Supabase (Postgres + Auth, EU/Frankfurt), deployed on Netlify as its
own site, separate from the marketing site this subdirectory lives alongside.

Google Drive is the document of record. Supabase stores metadata and a
`drive_file_id` only, never file bytes. The Klehomerie CRM Google Sheet is the
system of record for clients and properties; Supabase holds a read-only
mirror, refreshed by the "Sync from CRM" button on `/admin`.

## Slice 1 scope

- `/admin` (operator only): upload documents to a property's Drive folder,
  send portal invites to CRM-synced clients, run the CRM sync.
- `/portal` (client): view your properties and download your documents.
- Magic-link auth only. No passwords, anywhere.

Out of scope for Slice 1 (do not build against): approvals, the financial
dashboard, notifications, PDF generation, ClickUp integration, a mobile app,
and any automatic/scheduled CRM sync (manual button only, for now).

## One-time setup (do this before the first deploy)

### 1. Create the Supabase project

1. Go to https://supabase.com/dashboard and click **New project**.
2. Name it `klehomerie-vault`.
3. Generate a database password and save it in your password manager -- you
   won't need to type it again.
4. Region: **Central EU (Frankfurt)**. This is required, not optional --
   client data must stay in the EU.
5. Click **Create new project** and wait for it to finish (a minute or two).

### 2. Run the migrations

There's no live database yet for a CLI to link to, so for Slice 1 the
migrations are applied by hand, in order:

1. In the Supabase dashboard, open **SQL Editor**.
2. Paste the contents of `supabase/migrations/0001_init_schema.sql` (at the
   repo root, not inside `vault/`) and click **Run**.
3. Paste the contents of `supabase/migrations/0002_crm_sync_function.sql`
   and click **Run**.

Any schema change from here on gets its own numbered file in
`supabase/migrations/` and is applied the same way -- never edit a table by
hand in the dashboard.

### 3. Get the Supabase API keys

**Settings -> API** in the Supabase dashboard has three values you'll need
for step 5 below: **Project URL**, the **anon public** key, and the
**service_role** key (click Reveal). The service_role key is a master key to
the whole database -- it goes into Netlify's environment variables and
nowhere else. Never paste it into chat, email, or a screenshot.

### 4. Create the Google service account

1. In Google Cloud Console, create (or reuse) a project, then **APIs &
   Services -> Enabled APIs** and enable the **Google Drive API** and
   **Google Sheets API**.
2. **IAM & Admin -> Service Accounts -> Create service account.** Any name is
   fine, e.g. `klehomerie-vault`.
3. Open the new service account, **Keys -> Add key -> Create new key ->
   JSON**. This downloads a `.json` file -- keep it, don't share it.
4. Share the CRM Google Sheet (`_Klehomerie_CRM_2026`) with the service
   account's email address (found in the JSON as `client_email`), as
   **Viewer**.
5. Share the Drive workspace folder (ID `1heud2_HZ7fvH0xtdoZpprC31VFNlGifi`)
   with the same email address, as **Editor** -- the app creates
   per-property folders and uploads files inside it.
6. Base64-encode the whole JSON file into one line, since a raw pasted key
   tends to get mangled by copy/paste (specifically its `\n` line breaks).
   In a terminal: `base64 -w0 your-key-file.json` (macOS: drop `-w0`, use
   `base64 -i your-key-file.json | tr -d '\n'`). That output is the value
   for `GOOGLE_SERVICE_ACCOUNT_KEY_BASE64` below.

### 5. Create the Netlify site

1. In Netlify, **Add new site -> Import an existing project**, and pick this
   GitHub repository.
2. Set **Base directory** to `vault`. Leave the build command and publish
   directory as detected (this app's own `netlify.toml` handles that).
3. Under **Site configuration -> Environment variables**, add each of these
   (see `.env.example` in this folder for the full list): `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
   `NEXT_PUBLIC_SITE_URL` (this site's own Netlify URL, once you know it),
   `OPERATOR_EMAILS` (your email address -- comma-separate more than one),
   `GOOGLE_SERVICE_ACCOUNT_KEY_BASE64`, `CRM_GOOGLE_SHEET_ID` (from the
   sheet's URL: `.../spreadsheets/d/THIS-PART/edit`).
4. Deploy.

### 6. Give yourself operator access

Supabase Auth has no users yet -- the first one has to be created manually:

1. In the Supabase dashboard, **Authentication -> Users -> Add user -> Send
   invite**, using the same email address you put in `OPERATOR_EMAILS`.
2. Follow the invite link from that email, which lands you on this app.
3. From then on, sign in at `/login` with that same email -- you'll always
   land on `/admin` because it matches `OPERATOR_EMAILS`.

## Local development

```bash
cp .env.example .env.local   # fill in the same values as step 5 above
npm install
npm run dev
```

## Architecture notes

- `src/proxy.ts` is Next.js 16's renamed `middleware.ts` (the `middleware`
  export is renamed `proxy`). It refreshes the Supabase session cookie and
  does an optimistic redirect for `/admin` and `/portal`. The real
  authorization boundary is Postgres Row Level Security plus the operator
  check repeated in `src/app/admin/layout.tsx` -- proxy checks are a
  convenience, not the security model.
- `src/lib/supabase/admin.ts` (service role) is imported only by files under
  `src/app/admin/` and `src/lib/crm-sync/`, all of which sit behind the
  operator check. It is never imported by anything that ships to the
  browser.
- Document downloads (`/api/documents/[id]/download`) aren't literal signed
  Drive URLs -- Drive has no such concept for arbitrary files. The route
  checks the visitor's own session against the same RLS-protected query the
  portal page uses, then streams the file bytes from Drive through the
  server. See the comment in that route for the reasoning.
- The CRM sync (`src/lib/crm-sync/`) is manual-trigger only, from the
  "Sync from CRM" button on `/admin`. No cron, no webhook -- see the project
  instructions for why.
