-- Supabase grants EXECUTE on every new public-schema function to anon and
-- authenticated by default (via ALTER DEFAULT PRIVILEGES), independently of
-- the "revoke all ... from public" in 0002_crm_sync_function.sql, which only
-- revokes the PUBLIC pseudo-role grant. That left crm_sync_apply -- a
-- SECURITY DEFINER function -- callable by anyone holding the anon key via
-- /rest/v1/rpc/crm_sync_apply, letting an unauthenticated caller write
-- arbitrary rows into clients/properties. Caught by Supabase's own security
-- advisor after applying 0002 against the live project; closing it here so
-- a fresh deploy of these migrations never reintroduces the gap.
revoke execute on function public.crm_sync_apply(jsonb, jsonb) from anon;
revoke execute on function public.crm_sync_apply(jsonb, jsonb) from authenticated;
