-- REVIEWED PLAN ONLY: not applied. Restrictive policies AND with existing owner policies.
-- Ordinary app sessions do not have a client_id claim. OAuth sessions must use the trip-scoped bridge.
begin;
create policy "connector no direct record access" on public.records
 as restrictive for all to authenticated
 using ((select auth.jwt()->>'client_id') is null)
 with check ((select auth.jwt()->>'client_id') is null);
create policy "connector no direct photo access" on storage.objects
 as restrictive for all to authenticated
 using ((select auth.jwt()->>'client_id') is null)
 with check ((select auth.jwt()->>'client_id') is null);
commit;
-- Rollback: drop only the two policies above. Never remove the existing owner policies.
