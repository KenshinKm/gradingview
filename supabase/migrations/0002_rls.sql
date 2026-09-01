-- ============================================================
-- Row Level Security
-- Every table is owner-scoped. The service role (used only in
-- trusted server routes) bypasses RLS.
-- ============================================================

alter table public.profiles         enable row level security;
alter table public.subscriptions    enable row level security;
alter table public.assignments      enable row level security;
alter table public.grading_attempts enable row level security;
alter table public.submission_files enable row level security;
alter table public.usage_events     enable row level security;

-- ---------- profiles ----------
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- ---------- subscriptions (read-only for users; writes via service role) ----------
drop policy if exists "subscriptions_select_own" on public.subscriptions;
create policy "subscriptions_select_own" on public.subscriptions
  for select using (auth.uid() = user_id);

-- ---------- assignments ----------
drop policy if exists "assignments_all_own" on public.assignments;
create policy "assignments_all_own" on public.assignments
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- grading_attempts ----------
drop policy if exists "grading_attempts_select_own" on public.grading_attempts;
create policy "grading_attempts_select_own" on public.grading_attempts
  for select using (auth.uid() = user_id);

drop policy if exists "grading_attempts_delete_own" on public.grading_attempts;
create policy "grading_attempts_delete_own" on public.grading_attempts
  for delete using (auth.uid() = user_id);

-- ---------- submission_files ----------
drop policy if exists "submission_files_select_own" on public.submission_files;
create policy "submission_files_select_own" on public.submission_files
  for select using (auth.uid() = user_id);

drop policy if exists "submission_files_delete_own" on public.submission_files;
create policy "submission_files_delete_own" on public.submission_files
  for delete using (auth.uid() = user_id);

-- ---------- usage_events (read-only for users) ----------
drop policy if exists "usage_events_select_own" on public.usage_events;
create policy "usage_events_select_own" on public.usage_events
  for select using (auth.uid() = user_id);
