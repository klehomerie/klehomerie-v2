-- Slice 2: per-property thread, chat messages/reactions, and the
-- append-only client-authorization ledger.
--
-- Read this migration alongside the append-only design note: an
-- "authorization" is a lineage of rows sharing item_id (never the row's
-- own id, which is unique per event). The first row in a lineage is the
-- operator's pending ask (item_id = its own id). A decision -- approve,
-- decline, or a client superseding a pending ask -- is NEVER an UPDATE to
-- that row; it is a brand new row carrying the SAME item_id and a
-- terminal status. "Current state, computed at read time" means: the row
-- with the latest created_at for a given item_id. This is what makes
-- "no UPDATE, no DELETE, enforced by trigger" and "the previous one
-- marked superseded" both literally true at once.

-- ---------------------------------------------------------------------------
-- Reusable append-only guard: unconditionally blocks UPDATE/DELETE, on any
-- table it's attached to, for any role including the table owner.
-- ---------------------------------------------------------------------------
create or replace function public.forbid_mutation() returns trigger
language plpgsql as $$
begin
  raise exception '% is append-only; % is not permitted', TG_TABLE_NAME, TG_OP;
end;
$$;

-- ---------------------------------------------------------------------------
-- vendors
--
-- Not a Slice 2 screen -- there is no vendor CRUD UI yet -- but
-- authorizations.vendor_id needs a real table to reference, and the
-- project's domain-model rules require these screening fields to be
-- first-class from the moment vendors exist at all, not bolted on later.
-- ---------------------------------------------------------------------------
create table public.vendors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  gemi_registered boolean not null default false,
  public_rating numeric,
  years_active integer,
  internal_rating text,
  referral_status text,
  created_at timestamptz not null default now()
);

alter table public.vendors enable row level security;
-- No policies for anon/authenticated: service role only, same pattern as
-- sync_runs/sync_issues in 0001.

-- ---------------------------------------------------------------------------
-- operators
--
-- Mirrors the OPERATOR_EMAILS allowlist into the database so RLS policies
-- can check "is this authenticated user the operator" without embedding
-- the email list in SQL. Auto-populated by the app's own auth callback
-- the first time an allowlisted email signs in -- never edited by hand.
-- ---------------------------------------------------------------------------
create table public.operators (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);

alter table public.operators enable row level security;
-- No select/insert/update policies: this table is written and read only
-- via the service role and via is_operator() below (SECURITY DEFINER, so
-- it can read this table without the caller needing a policy of their own).

create or replace function public.is_operator() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.operators where auth_user_id = auth.uid());
$$;

revoke all on function public.is_operator() from public;
grant execute on function public.is_operator() to authenticated, anon;

-- ---------------------------------------------------------------------------
-- threads: exactly one per property. Created automatically when a property
-- is mirrored from the CRM sync (see 0005) -- never created by hand, never
-- deleted.
-- ---------------------------------------------------------------------------
create table public.threads (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null unique references public.properties(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.threads enable row level security;

create policy "operators read all threads"
  on public.threads for select to authenticated
  using (is_operator());

create policy "clients read their own thread"
  on public.threads for select to authenticated
  using (
    property_id in (
      select p.id from public.properties p
      join public.clients c on c.id = p.client_id
      where c.auth_user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- authorizations: append-only ledger. See the migration header note above
-- for how "latest row per item_id" replaces mutable status.
-- ---------------------------------------------------------------------------
create type public.asset_class as enum (
  'lot_00', -- General Environment
  'lot_01', -- Electrical Systems
  'lot_02', -- Plumbing and HVAC
  'lot_03', -- Joinery and Closings
  'lot_04', -- Finishes and Surfaces
  'lot_05'  -- Amenities and White Goods
);

create type public.authorization_status as enum (
  'pending',
  'approved',
  'declined',
  'superseded'
);

create table public.authorizations (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null default gen_random_uuid(),
  thread_id uuid not null references public.threads(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  asset_class public.asset_class not null,
  title text not null,
  description text,
  amount_net_cents integer not null check (amount_net_cents >= 0),
  vat_rate numeric not null default 0.24,
  vendor_id uuid references public.vendors(id),
  doc_id uuid references public.documents(id),
  status public.authorization_status not null default 'pending',
  decided_at timestamptz,
  decided_by uuid references auth.users(id),
  decided_ip text,
  decided_user_agent text,
  created_at timestamptz not null default now(),
  created_by uuid not null references auth.users(id)
);

create index authorizations_item_id_idx on public.authorizations(item_id, created_at desc);
create index authorizations_thread_id_idx on public.authorizations(thread_id);

comment on column public.authorizations.item_id is
  'Groups the append-only lineage of one logical authorization. The first (pending) row in a lineage has item_id = its own id. A decision or a superseding event is a new row with the same item_id and a new id -- never an UPDATE to an earlier row.';

-- The EUR 150 (15000 cents) emergency mobilization cap: a row cannot reach
-- status 'approved' at or above that amount without decided_at, decided_by,
-- and decided_ip all present. Enforced here, in the data layer, not in the
-- UI -- per the project's standing architecture rules.
create or replace function public.enforce_mobilization_cap() returns trigger
language plpgsql as $$
begin
  if new.status = 'approved' and new.amount_net_cents >= 15000 then
    if new.decided_at is null or new.decided_by is null or new.decided_ip is null then
      raise exception 'Authorizations at or above the EUR 150 mobilization cap require decided_at, decided_by, and decided_ip.';
    end if;
  end if;
  return new;
end;
$$;

create trigger authorizations_enforce_mobilization_cap
  before insert on public.authorizations
  for each row execute function public.enforce_mobilization_cap();

create trigger authorizations_forbid_update
  before update on public.authorizations
  for each row execute function public.forbid_mutation();

create trigger authorizations_forbid_delete
  before delete on public.authorizations
  for each row execute function public.forbid_mutation();

alter table public.authorizations enable row level security;

create policy "operators read all authorizations"
  on public.authorizations for select to authenticated
  using (is_operator());

create policy "clients read their own authorizations"
  on public.authorizations for select to authenticated
  using (
    thread_id in (
      select t.id from public.threads t
      join public.properties p on p.id = t.property_id
      join public.clients c on c.id = p.client_id
      where c.auth_user_id = auth.uid()
    )
  );

-- Operators create the initial pending ask.
create policy "operators create authorization asks"
  on public.authorizations for insert to authenticated
  with check (
    is_operator()
    and created_by = auth.uid()
    and status = 'pending'
  );

-- Clients record a decision (or supersede a pending ask) on their own
-- property's authorizations. decided_at/decided_by/decided_ip/
-- decided_user_agent are supplied by the server action from the request,
-- never trusted from client input beyond this policy's own checks.
create policy "clients decide on their own authorizations"
  on public.authorizations for insert to authenticated
  with check (
    created_by = auth.uid()
    and status in ('approved', 'declined', 'superseded')
    and thread_id in (
      select t.id from public.threads t
      join public.properties p on p.id = t.property_id
      join public.clients c on c.id = p.client_id
      where c.auth_user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- messages
-- ---------------------------------------------------------------------------
create type public.author_role as enum ('operator', 'client', 'system');

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.threads(id) on delete cascade,
  author_id uuid not null references auth.users(id),
  author_role public.author_role not null,
  body text,
  ref_type text check (ref_type is null or ref_type = 'authorization'),
  ref_id uuid, -- when ref_type = 'authorization', this is an authorizations.item_id (not a row id) so the card always reflects the latest state
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  check (body is not null or ref_id is not null)
);

create index messages_thread_id_idx on public.messages(thread_id, created_at);

alter table public.messages enable row level security;

create policy "operators read all messages"
  on public.messages for select to authenticated
  using (is_operator());

create policy "clients read their own thread messages"
  on public.messages for select to authenticated
  using (
    thread_id in (
      select t.id from public.threads t
      join public.properties p on p.id = t.property_id
      join public.clients c on c.id = p.client_id
      where c.auth_user_id = auth.uid()
    )
  );

create policy "operators post as operator"
  on public.messages for insert to authenticated
  with check (
    author_id = auth.uid()
    and author_role = 'operator'
    and is_operator()
  );

create policy "clients post in their own thread"
  on public.messages for insert to authenticated
  with check (
    author_id = auth.uid()
    and author_role = 'client'
    and thread_id in (
      select t.id from public.threads t
      join public.properties p on p.id = t.property_id
      join public.clients c on c.id = p.client_id
      where c.auth_user_id = auth.uid()
    )
  );

-- 'system' messages (posted after a decision is recorded) are written only
-- by the service role -- no policy grants that role to authenticated users.

create policy "authors edit or withdraw their own messages"
  on public.messages for update to authenticated
  using (author_id = auth.uid())
  with check (author_id = auth.uid());

-- Edits are frozen 15 minutes after posting; withdrawing (setting
-- deleted_at) is allowed at any time and is not itself an edit. Every real
-- body edit is captured to message_edits before it's applied.
create or replace function public.guard_message_edit() returns trigger
language plpgsql as $$
begin
  if old.deleted_at is not null then
    raise exception 'Message already withdrawn.';
  end if;

  if new.deleted_at is not null then
    return new;
  end if;

  if new.body is distinct from old.body then
    if now() - old.created_at > interval '15 minutes' then
      raise exception 'Messages can only be edited within 15 minutes of posting.';
    end if;
    insert into public.message_edits (message_id, previous_body, edited_by)
    values (old.id, old.body, auth.uid());
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- message_edits: append-only audit of every body edit.
-- ---------------------------------------------------------------------------
create table public.message_edits (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  previous_body text not null,
  edited_at timestamptz not null default now(),
  edited_by uuid not null references auth.users(id)
);

create index message_edits_message_id_idx on public.message_edits(message_id);

alter table public.message_edits enable row level security;

create policy "operators read all message edits"
  on public.message_edits for select to authenticated
  using (is_operator());

create policy "clients read edits on their own thread messages"
  on public.message_edits for select to authenticated
  using (
    message_id in (
      select m.id from public.messages m
      join public.threads t on t.id = m.thread_id
      join public.properties p on p.id = t.property_id
      join public.clients c on c.id = p.client_id
      where c.auth_user_id = auth.uid()
    )
  );

create trigger message_edits_forbid_update
  before update on public.message_edits
  for each row execute function public.forbid_mutation();

create trigger message_edits_forbid_delete
  before delete on public.message_edits
  for each row execute function public.forbid_mutation();

-- Attach the edit-guard trigger now that message_edits exists.
create trigger messages_guard_edit
  before update on public.messages
  for each row execute function public.guard_message_edit();

-- ---------------------------------------------------------------------------
-- reactions
-- ---------------------------------------------------------------------------
create table public.reactions (
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  emoji text not null check (emoji in ('👍', '✅', '👀', '❓', '⚠️')),
  created_at timestamptz not null default now(),
  primary key (message_id, user_id, emoji)
);

alter table public.reactions enable row level security;

create policy "read reactions on visible messages"
  on public.reactions for select to authenticated
  using (
    is_operator()
    or message_id in (
      select m.id from public.messages m
      join public.threads t on t.id = m.thread_id
      join public.properties p on p.id = t.property_id
      join public.clients c on c.id = p.client_id
      where c.auth_user_id = auth.uid()
    )
  );

create policy "react to visible messages"
  on public.reactions for insert to authenticated
  with check (
    user_id = auth.uid()
    and (
      is_operator()
      or message_id in (
        select m.id from public.messages m
        join public.threads t on t.id = m.thread_id
        join public.properties p on p.id = t.property_id
        join public.clients c on c.id = p.client_id
        where c.auth_user_id = auth.uid()
      )
    )
  );

create policy "remove own reactions"
  on public.reactions for delete to authenticated
  using (user_id = auth.uid());

-- Hard rule: reactions are never valid on a message that carries an
-- authorization card. A reaction is not a decision.
create or replace function public.forbid_reaction_on_authorization() returns trigger
language plpgsql as $$
declare
  v_ref_type text;
begin
  select ref_type into v_ref_type from public.messages where id = new.message_id;
  if v_ref_type = 'authorization' then
    raise exception 'Reactions are disabled on authorization messages.';
  end if;
  return new;
end;
$$;

create trigger reactions_forbid_on_authorization
  before insert on public.reactions
  for each row execute function public.forbid_reaction_on_authorization();
