-- Threads are created automatically when a property is mirrored from the
-- CRM sync -- never by hand. Extend crm_sync_apply to create one thread per
-- upserted property (idempotent: ON CONFLICT DO NOTHING against the unique
-- constraint on threads.property_id), and backfill threads for any
-- properties that were already mirrored before this migration ran.

insert into public.threads (property_id)
select id from public.properties
on conflict (property_id) do nothing;

create or replace function public.crm_sync_apply(
  p_clients jsonb,
  p_properties jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_clients_written integer := 0;
  v_properties_written integer := 0;
  v_property_ids uuid[];
begin
  with upserted as (
    insert into public.clients (
      external_crm_ref, first_name, last_name, name, email, phone, language
    )
    select
      c->>'external_crm_ref',
      c->>'first_name',
      c->>'last_name',
      c->>'name',
      c->>'email',
      c->>'phone',
      c->>'language'
    from jsonb_array_elements(p_clients) as c
    on conflict (external_crm_ref) do update set
      first_name = excluded.first_name,
      last_name = excluded.last_name,
      name = excluded.name,
      email = excluded.email,
      phone = excluded.phone,
      language = excluded.language,
      updated_at = now()
    returning 1
  )
  select count(*) into v_clients_written from upserted;

  with upserted as (
    insert into public.properties (
      external_crm_ref, client_id, prop_ref, address, zip, city, notes, is_active
    )
    select
      p->>'external_crm_ref',
      (select id from public.clients where external_crm_ref = p->>'client_external_ref'),
      p->>'external_crm_ref',
      p->>'address',
      p->>'zip',
      p->>'city',
      p->>'notes',
      (p->>'is_active')::boolean
    from jsonb_array_elements(p_properties) as p
    where exists (
      select 1 from public.clients where external_crm_ref = p->>'client_external_ref'
    )
    on conflict (external_crm_ref) do update set
      client_id = excluded.client_id,
      address = excluded.address,
      zip = excluded.zip,
      city = excluded.city,
      notes = excluded.notes,
      is_active = excluded.is_active,
      updated_at = now()
    returning id
  )
  select array_agg(id) into v_property_ids from upserted;

  v_properties_written := coalesce(array_length(v_property_ids, 1), 0);

  insert into public.threads (property_id)
  select unnest(v_property_ids)
  on conflict (property_id) do nothing;

  return jsonb_build_object(
    'clients_written', v_clients_written,
    'properties_written', v_properties_written
  );
end;
$$;

revoke all on function public.crm_sync_apply(jsonb, jsonb) from public;
revoke execute on function public.crm_sync_apply(jsonb, jsonb) from anon;
revoke execute on function public.crm_sync_apply(jsonb, jsonb) from authenticated;
grant execute on function public.crm_sync_apply(jsonb, jsonb) to service_role;
