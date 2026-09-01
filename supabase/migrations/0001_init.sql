-- ============================================================
-- GradingView initial schema
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- profiles ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  -- 'free' | 'student' | 'student_plus'
  plan text not null default 'free',
  -- lifetime free grade tracking (fast-path; usage_events is the audit source of truth)
  free_grade_used boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- subscriptions ----------
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text unique,
  plan text not null default 'free',
  -- Stripe subscription status: active, trialing, past_due, canceled, incomplete, etc.
  subscription_status text not null default 'inactive',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists subscriptions_user_id_key on public.subscriptions (user_id);
create index if not exists subscriptions_customer_idx on public.subscriptions (stripe_customer_id);

-- ---------- assignments ----------
create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default 'Untitled assignment',
  course text,
  -- Free-form hint about the work type: essay, worksheet, quiz, practice_test,
  -- mixed, etc. Optional; the AI adapts regardless.
  work_type text not null default 'unspecified',
  -- 'not_specified' | 'mla' | 'apa' | 'chicago' | 'other'
  citation_style text not null default 'not_specified',
  -- Consolidated grading-materials text (extracted from files + pasted text).
  grading_materials_text text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists assignments_user_idx on public.assignments (user_id, created_at desc);

-- ---------- grading_attempts ----------
create table if not exists public.grading_attempts (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  draft_number int not null default 1,
  -- Consolidated text of the student's submitted work (pasted + extracted).
  work_text text not null default '',
  -- 'pending' | 'processing' | 'complete' | 'failed'
  status text not null default 'pending',
  score numeric,
  letter_grade text,
  estimated_range_low numeric,
  estimated_range_high numeric,
  -- 'rubric' | 'answer_key' | 'ai_inferred' | 'mixed'
  scoring_basis text,
  -- Full validated structured feedback (GradeResult JSON).
  result jsonb,
  error_message text,
  -- Was any part of scoring inferred (no rubric / answer key provided)?
  inferred_rubric boolean not null default false,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists grading_attempts_assignment_idx
  on public.grading_attempts (assignment_id, draft_number);
create index if not exists grading_attempts_user_idx
  on public.grading_attempts (user_id, created_at desc);

-- ---------- submission_files (uploaded documents/images) ----------
create table if not exists public.submission_files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  assignment_id uuid references public.assignments (id) on delete cascade,
  grading_attempt_id uuid references public.grading_attempts (id) on delete set null,
  -- 'grading_material' | 'work'
  role text not null,
  -- user-defined order within its role (page ordering for multi-photo uploads)
  sort_order int not null default 0,
  storage_path text not null,
  original_name text not null,
  mime_type text not null,
  size_bytes bigint not null default 0,
  -- 'pending' | 'extracted' | 'failed'
  extraction_status text not null default 'pending',
  extracted_text text,
  created_at timestamptz not null default now()
);
create index if not exists submission_files_assignment_idx
  on public.submission_files (assignment_id, role, sort_order);
create index if not exists submission_files_user_idx on public.submission_files (user_id);

-- ---------- usage_events ----------
-- Audit trail for credit consumption. One row per successful grading attempt.
create table if not exists public.usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  grading_attempt_id uuid references public.grading_attempts (id) on delete set null,
  -- 'free_grade' | 'paid_grade'
  event_type text not null,
  plan text not null,
  -- Billing period this consumption counts against (paid plans).
  period_start timestamptz,
  period_end timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists usage_events_user_idx on public.usage_events (user_id, created_at desc);
create index if not exists usage_events_period_idx
  on public.usage_events (user_id, period_start, period_end);

-- ---------- updated_at trigger ----------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists subscriptions_set_updated_at on public.subscriptions;
create trigger subscriptions_set_updated_at before update on public.subscriptions
  for each row execute function public.set_updated_at();

drop trigger if exists assignments_set_updated_at on public.assignments;
create trigger assignments_set_updated_at before update on public.assignments
  for each row execute function public.set_updated_at();

-- ---------- new user -> profile ----------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;

  insert into public.subscriptions (user_id, plan, subscription_status)
  values (new.id, 'free', 'inactive')
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
