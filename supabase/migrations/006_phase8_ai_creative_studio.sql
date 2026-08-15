-- Phase 8: private AI Creative Studio. Apply manually in Supabase; do not run from the client.
create table if not exists public.brand_kits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Next Studio',
  primary_color text not null default '#0874d1',
  secondary_color text not null default '#0f2a54',
  accent_color text not null default '#48b6e8',
  background_color text not null default '#ffffff',
  logo_path text,
  website text,
  default_cta text,
  visual_style text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.creative_assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  prospect_id uuid references public.prospects(id) on delete set null,
  service_id uuid references public.services(id) on delete set null,
  brand_kit_id uuid references public.brand_kits(id) on delete set null,
  creative_type text not null,
  format text not null,
  aspect_ratio text not null,
  width integer not null,
  height integer not null,
  prompt text not null,
  revised_prompt text,
  headline text,
  supporting_text text,
  cta text,
  caption text,
  hashtags text,
  storage_path text not null,
  mime_type text not null default 'image/png',
  provider text not null,
  model text,
  status text not null default 'ready',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists creative_assets_user_created_idx on public.creative_assets (user_id, created_at desc);
create index if not exists creative_assets_prospect_idx on public.creative_assets (prospect_id);
create index if not exists brand_kits_user_idx on public.brand_kits (user_id);

alter table public.brand_kits enable row level security;
alter table public.creative_assets enable row level security;

drop policy if exists brand_kits_owner on public.brand_kits;
create policy brand_kits_owner on public.brand_kits for all using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists creative_assets_owner on public.creative_assets;
create policy creative_assets_owner on public.creative_assets for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop trigger if exists set_owner on public.brand_kits;
create trigger set_owner before insert on public.brand_kits for each row execute function public.owner_row();
drop trigger if exists set_owner on public.creative_assets;
create trigger set_owner before insert on public.creative_assets for each row execute function public.owner_row();

grant select, insert, update, delete on public.brand_kits to authenticated;
grant select, insert, update, delete on public.creative_assets to authenticated;

insert into storage.buckets (id, name, public) values ('creative-assets', 'creative-assets', false) on conflict (id) do update set public = false;
drop policy if exists creative_assets_storage_select on storage.objects;
create policy creative_assets_storage_select on storage.objects for select to authenticated using (bucket_id = 'creative-assets' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists creative_assets_storage_insert on storage.objects;
create policy creative_assets_storage_insert on storage.objects for insert to authenticated with check (bucket_id = 'creative-assets' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists creative_assets_storage_update on storage.objects;
create policy creative_assets_storage_update on storage.objects for update to authenticated using (bucket_id = 'creative-assets' and (storage.foldername(name))[1] = auth.uid()::text) with check (bucket_id = 'creative-assets' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists creative_assets_storage_delete on storage.objects;
create policy creative_assets_storage_delete on storage.objects for delete to authenticated using (bucket_id = 'creative-assets' and (storage.foldername(name))[1] = auth.uid()::text);
