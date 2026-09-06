-- Per-network free-grade rate limiting.
-- Store a salted hash of the client IP behind each successful free grade so we
-- can cap free grades per network over a rolling window without tying the limit
-- to an email address (which throwaway signups defeat).

alter table public.usage_events
  add column if not exists ip_hash text;

-- Serves: count(*) where event_type = 'free_grade' and ip_hash = $1
--                    and created_at >= now() - interval '7 days'
create index if not exists usage_events_free_ip_idx
  on public.usage_events (ip_hash, created_at desc)
  where event_type = 'free_grade';
