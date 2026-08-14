-- Phase 6 extends the existing private follow-up records without changing prior migrations.
alter table public.follow_ups
  add column if not exists type text not null default 'other',
  add column if not exists note text,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists rescheduled_from timestamptz;

update public.follow_ups set status = 'pending' where status is null or status = 'open';
alter table public.follow_ups alter column status set default 'pending';

alter table public.follow_ups
  drop constraint if exists follow_ups_type_check,
  add constraint follow_ups_type_check check (type in ('call', 'email', 'whatsapp', 'meeting', 'other')),
  drop constraint if exists follow_ups_status_check,
  add constraint follow_ups_status_check check (status in ('pending', 'completed', 'overdue'));

create index if not exists follow_ups_due_at_idx on public.follow_ups (due_at);
create index if not exists communications_user_created_idx on public.communications (user_id, created_at desc);
create index if not exists communication_drafts_user_updated_idx on public.communication_drafts (user_id, updated_at desc);
create index if not exists automation_rules_user_active_idx on public.automation_rules (user_id, active);

-- Existing authenticated grants and RLS policies from migrations 002/003 remain unchanged.
