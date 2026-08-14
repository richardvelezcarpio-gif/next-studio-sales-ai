-- PostgreSQL privileges allow authenticated requests to reach RLS policies.
-- RLS remains enabled and remains responsible for row-level isolation.
grant usage on schema public to authenticated;

grant select, insert, update on table public.profiles to authenticated;
grant select, insert, update, delete on table public.prospects to authenticated;
grant select, insert, update, delete on table public.prospect_notes to authenticated;
grant select, insert, update, delete on table public.activities to authenticated;
grant select, insert, update, delete on table public.follow_ups to authenticated;
grant select, insert, update, delete on table public.tasks to authenticated;
grant select, insert, update, delete on table public.communications to authenticated;
grant select, insert, update, delete on table public.communication_drafts to authenticated;
grant select, insert, update, delete on table public.automation_rules to authenticated;
grant select, insert, update, delete on table public.automation_logs to authenticated;
grant select, insert, update, delete on table public.message_templates to authenticated;
grant select, insert, update, delete on table public.services to authenticated;
grant select, insert, update, delete on table public.sales_goals to authenticated;
grant select, insert, update, delete on table public.ai_results to authenticated;

-- Do not grant CRM-table privileges to anon. Existing RLS policies continue to
-- enforce user_id = auth.uid(), or id = auth.uid() for profiles.
