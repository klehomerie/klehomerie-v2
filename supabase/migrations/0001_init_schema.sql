-- Slice 1: core vault schema (clients, properties, documents) plus the
-- bookkeeping tables the CRM sync writes to.
--
-- Google Drive is the document of record. This schema stores metadata and
-- drive_file_id only -- never file bytes. If this app disappears, every
-- document referenced here must still be readable directly in Drive.
--
-- Supabase project region must be EU Central (Frankfurt). This is set at
-- project creation time in the dashboard, not in SQL -- see project README.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- clients
--
-- System of record for client and property data is the Klehomerie CRM
-- Google Sheet. This table is a read-only mirror, written only by the
-- "Sync from CRM" action (via the service role) and by the operator invite
-- flow (which only ever sets auth_user_id on an existing row).
-- ---------------------------------------------------------------------------
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  external_crm_ref text unique, -- normalized ClientID from 01_Clients (trim/upper/strip hyphens)
  first_name text,
  last_name text,
  name text not null, -- "First Last", or "Unknown" if both are blank. Never FullName -- that column embeds a comma.
  email text not null,
  phone text,
  language text not null default 'en', -- en | fr | el. First token of the sheet's Language column.
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.clients.external_crm_ref is
  'Normalized ClientID from the CRM Google Sheet (01_Clients). Null for a client created outside the CRM sync.';
comment on column public.clients.auth_user_id is
  'Set once, by the operator invite flow, when a portal invite is sent. Never set by the CRM sync.';

-- ---------------------------------------------------------------------------
-- properties
-- ---------------------------------------------------------------------------
create table public.properties (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  external_crm_ref text unique, -- normalized PropertyID from 02_Properties
  prop_ref text not null, -- Klehomerie-facing reference; mirrors external_crm_ref today
  address text not null,
  zip text,
  city text,
  notes text,
  drive_folder_id text, -- set on first document upload; never parsed from VaultFolderURL
  is_active boolean not null default true, -- CRM Status = 'Active'; false = mirrored, hidden from portal
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index properties_client_id_idx on public.properties(client_id);

comment on column public.properties.drive_folder_id is
  'Created by the app on first document upload, inside workspace folder 1heud2_HZ7fvH0xtdoZpprC31VFNlGifi. The CRM sheet is never written back to.';

-- ---------------------------------------------------------------------------
-- documents
-- ---------------------------------------------------------------------------
create type public.document_type as enum (
  'quotation',
  'invoice',
  'inspection_report',
  'delivery_note',
  'other'
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  doc_type public.document_type not null,
  title text not null,
  drive_file_id text not null,
  mime_type text not null,
  uploaded_by uuid references auth.users(id),
  uploaded_at timestamptz not null default now(),
  superseded_by uuid references public.documents(id)
);

create index documents_property_id_idx on public.documents(property_id);

-- ---------------------------------------------------------------------------
-- CRM sync bookkeeping (Sheets -> Supabase, one-way, read-only mirror)
-- ---------------------------------------------------------------------------
create table public.sync_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  rows_read integer not null default 0,
  rows_written integer not null default 0,
  rows_skipped integer not null default 0,
  error text
);

create table public.sync_issues (
  id uuid primary key default gen_random_uuid(),
  run_id uuid references public.sync_runs(id) on delete cascade,
  tab text not null, -- '01_Clients' | '02_Properties'
  raw_value jsonb not null,
  reason text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Row Level Security. Enabled on every table, no exceptions.
--
-- Clients read only their own data through the anon/authenticated Supabase
-- client, bound by their session. Every write in Slice 1 (CRM sync, document
-- upload, invites) goes through the service role from a server action that
-- is itself gated on the operator allowlist -- the service role bypasses
-- RLS by design, which is why these tables carry no insert/update/delete
-- policy for authenticated users at all.
-- ---------------------------------------------------------------------------
alter table public.clients enable row level security;
alter table public.properties enable row level security;
alter table public.documents enable row level security;
alter table public.sync_runs enable row level security;
alter table public.sync_issues enable row level security;

create policy "clients read own row"
  on public.clients for select
  to authenticated
  using (auth_user_id = auth.uid());

create policy "clients read own properties"
  on public.properties for select
  to authenticated
  using (
    is_active = true
    and client_id in (select id from public.clients where auth_user_id = auth.uid())
  );

create policy "clients read own documents"
  on public.documents for select
  to authenticated
  using (
    property_id in (
      select p.id from public.properties p
      join public.clients c on c.id = p.client_id
      where c.auth_user_id = auth.uid() and p.is_active = true
    )
  );

-- sync_runs and sync_issues carry no policies for anon/authenticated on
-- purpose: RLS with zero matching policies denies everyone except the
-- service role. Only the CRM sync (an operator-gated server action) ever
-- reads or writes these.

-- ---------------------------------------------------------------------------
-- Placeholders for future slices. Do not build against these yet.
-- ---------------------------------------------------------------------------
-- Slice 2 attaches here: an append-only authorization_ledger table recording
-- every client authorization decision (approve / decline / auto-approved
-- under the emergency mobilization cap). No destructive UPDATE, ever. The
-- EUR 150 emergency mobilization cap is enforced by a trigger written at the
-- same time as the expense/mobilization table that introduces it -- not
-- simulated here against tables that do not exist in Slice 1.

-- Slice 3 attaches here: financial tables. Money as integer cents, VAT
-- stored as a separate field (never baked into a gross figure), and
-- project_line_item kept as a free-form Project Float Tracker line, never
-- sharing a table or enum with the fixed six-value asset_class Lot taxonomy.
-- Append-only on anything touching money.
