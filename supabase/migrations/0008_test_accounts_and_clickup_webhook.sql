-- Test accounts + Slice 2.5 (authorization -> ClickUp webhook).

-- ---------------------------------------------------------------------------
-- Test accounts
-- ---------------------------------------------------------------------------
alter table public.clients add column is_test_account boolean not null default false;

comment on column public.clients.is_test_account is
  'Set by hand in the Supabase dashboard, never by the CRM sync -- the sheet has no such column and must never gain one. Currently true only for ID001.';

-- Shared "real" scope for aggregates, totals, exports, charts, and
-- reports. Any future reporting query selects from these views instead of
-- the raw tables, so excluding test data is structural -- a query cannot
-- forget a WHERE clause that was never its to write. security_invoker
-- keeps the underlying RLS policies on clients/properties in force for
-- any caller other than the service role.
create view public.real_clients
  with (security_invoker = true) as
  select * from public.clients where is_test_account = false;

create view public.real_properties
  with (security_invoker = true) as
  select p.*
  from public.properties p
  join public.real_clients c on c.id = p.client_id;

comment on view public.real_clients is
  'Every aggregate/total/export/chart/report query must select from this view (or real_properties), never from clients/properties directly, to exclude test accounts.';

-- ---------------------------------------------------------------------------
-- Slice 2.5: authorization decisions notify ClickUp
-- ---------------------------------------------------------------------------

-- clickup_task_id is the one column allowed to change after an
-- authorization row is written -- set once, after the fact, by the
-- webhook handler, to record where the ClickUp task landed. Every other
-- column stays append-only. This replaces the blanket forbid-all-updates
-- trigger from 0004 with one that checks each column individually.
alter table public.authorizations add column clickup_task_id text;

create or replace function public.guard_authorization_update() returns trigger
language plpgsql as $$
begin
  if new.id is distinct from old.id
    or new.item_id is distinct from old.item_id
    or new.thread_id is distinct from old.thread_id
    or new.property_id is distinct from old.property_id
    or new.asset_class is distinct from old.asset_class
    or new.title is distinct from old.title
    or new.description is distinct from old.description
    or new.amount_net_cents is distinct from old.amount_net_cents
    or new.vat_rate is distinct from old.vat_rate
    or new.vendor_id is distinct from old.vendor_id
    or new.doc_id is distinct from old.doc_id
    or new.status is distinct from old.status
    or new.decided_at is distinct from old.decided_at
    or new.decided_by is distinct from old.decided_by
    or new.decided_ip is distinct from old.decided_ip
    or new.decided_user_agent is distinct from old.decided_user_agent
    or new.created_at is distinct from old.created_at
    or new.created_by is distinct from old.created_by
  then
    raise exception 'authorizations is append-only; only clickup_task_id may be set after the fact.';
  end if;
  return new;
end;
$$;

drop trigger if exists authorizations_forbid_update on public.authorizations;
create trigger authorizations_guard_update
  before update on public.authorizations
  for each row execute function public.guard_authorization_update();

-- Fires the webhook. Only carries the row id -- the handler does its own
-- joins (property, document, deciding client) with the admin client,
-- which keeps this trigger simple and the business logic in one place.
-- pg_net delivery is asynchronous and at-least-once by nature, which is
-- exactly why the handler dedupes on clickup_task_id.
create extension if not exists pg_net;

create or replace function public.notify_authorization_decided() returns trigger
language plpgsql as $$
begin
  if new.status not in ('approved', 'declined') then
    return new;
  end if;

  perform net.http_post(
    url := 'https://klehomerie-vault.netlify.app/api/webhooks/authorization-decided',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', '53193755e3828bcc89576cac6af25c40ecf192cb62c72d3136f6511f62041576'
    ),
    body := jsonb_build_object('authorization_id', new.id)
  );

  return new;
end;
$$;

create trigger authorizations_notify_clickup
  after insert on public.authorizations
  for each row execute function public.notify_authorization_decided();
