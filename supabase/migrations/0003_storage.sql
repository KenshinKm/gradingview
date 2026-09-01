-- ============================================================
-- Supabase Storage bucket + policies
-- Files are stored under: <bucket>/<user_id>/<assignment_id>/<file_id>-<name>
-- The first path segment is always the owner's uid.
-- ============================================================

insert into storage.buckets (id, name, public)
values ('gradingview-uploads', 'gradingview-uploads', false)
on conflict (id) do nothing;

drop policy if exists "uploads_read_own" on storage.objects;
create policy "uploads_read_own" on storage.objects
  for select using (
    bucket_id = 'gradingview-uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "uploads_insert_own" on storage.objects;
create policy "uploads_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'gradingview-uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "uploads_update_own" on storage.objects;
create policy "uploads_update_own" on storage.objects
  for update using (
    bucket_id = 'gradingview-uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "uploads_delete_own" on storage.objects;
create policy "uploads_delete_own" on storage.objects
  for delete using (
    bucket_id = 'gradingview-uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
