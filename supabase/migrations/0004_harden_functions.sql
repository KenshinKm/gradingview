-- ============================================================
-- Harden helper functions (addresses Supabase security linter):
--  * pin search_path on set_updated_at
--  * keep handle_new_user SECURITY DEFINER for the trigger, but
--    revoke direct RPC execution from API roles
-- ============================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
