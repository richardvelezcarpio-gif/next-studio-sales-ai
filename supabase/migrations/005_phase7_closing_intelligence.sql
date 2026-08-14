-- Phase 7: additive closing fields for existing private prospects.
alter table public.prospects
  add column if not exists probability integer,
  add column if not exists expected_close_date date,
  add column if not exists next_step text,
  add column if not exists last_activity_at timestamptz,
  add column if not exists won_at timestamptz,
  add column if not exists lost_at timestamptz,
  add column if not exists competitor text,
  add column if not exists closing_notes text;

alter table public.prospects
  drop constraint if exists prospects_probability_check,
  add constraint prospects_probability_check check (probability is null or probability between 0 and 100);

create index if not exists prospects_expected_close_date_idx on public.prospects (expected_close_date);
create index if not exists prospects_won_at_idx on public.prospects (won_at);
create index if not exists prospects_lost_at_idx on public.prospects (lost_at);

-- RLS and authenticated-only grants from migrations 002/003 remain in force.
