-- Applied October 31, 2026. Auth-admin-only function; ordinary app audiences stay unchanged.
create or replace function public.wardrobe_connector_token_hook(event jsonb)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare claims jsonb := event->'claims';
begin
 if claims->>'client_id' = 'ead70a6a-6324-4585-8f03-012ea98a8e3e' then
  claims := jsonb_set(claims,'{aud}','"https://cdpiekcbvyvppaxbpwjz.supabase.co/functions/v1/wardrobe-connector-dev"'::jsonb);
 end if;
 return jsonb_build_object('claims',claims);
end $$;
revoke all on function public.wardrobe_connector_token_hook(jsonb) from public,anon,authenticated;
grant execute on function public.wardrobe_connector_token_hook(jsonb) to supabase_auth_admin;
