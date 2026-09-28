-- Admin UUID has been set from the user-provided Supabase dashboard screenshot.
-- 2. Create a public Storage bucket named "songs" in the Supabase Dashboard.
-- Public means anyone can listen to and download published audio. RLS below
-- limits uploads, changes, and deletes to the configured admin account.

create table if not exists public.tracks (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(title) between 1 and 100),
  artist text not null check (length(artist) between 1 and 100),
  description text not null default '' check (length(description) <= 180),
  storage_path text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.site_settings (
  key text primary key,
  value text not null
);

alter table public.tracks enable row level security;
alter table public.site_settings enable row level security;

grant select on public.tracks to anon, authenticated;
grant insert, update, delete on public.tracks to authenticated;
grant select on public.site_settings to anon, authenticated;
grant insert, update, delete on public.site_settings to authenticated;

drop policy if exists "Public can read tracks" on public.tracks;
create policy "Public can read tracks"
  on public.tracks for select to anon, authenticated
  using (true);

drop policy if exists "Admin manages tracks" on public.tracks;
create policy "Admin manages tracks"
  on public.tracks for all to authenticated
  using ((select auth.uid()) = 'd61bf090-0b0d-46cc-bea4-3f8873c7d88a'::uuid)
  with check ((select auth.uid()) = 'd61bf090-0b0d-46cc-bea4-3f8873c7d88a'::uuid);

drop policy if exists "Public can read site settings" on public.site_settings;
create policy "Public can read site settings"
  on public.site_settings for select to anon, authenticated
  using (true);

drop policy if exists "Admin manages site settings" on public.site_settings;
create policy "Admin manages site settings"
  on public.site_settings for all to authenticated
  using ((select auth.uid()) = 'd61bf090-0b0d-46cc-bea4-3f8873c7d88a'::uuid)
  with check ((select auth.uid()) = 'd61bf090-0b0d-46cc-bea4-3f8873c7d88a'::uuid);

insert into public.site_settings (key, value) values
  ('page_title', 'Музика, що торкається серця.'),
  ('page_description', 'Християнські пісні Іванки — щирі мелодії про віру, любов і світло, яке ми несемо одне одному.')
on conflict (key) do nothing;

-- Audio bucket policies. Create the "songs" bucket as PUBLIC in the dashboard.
drop policy if exists "Admin uploads songs" on storage.objects;
create policy "Admin uploads songs"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'songs' and (select auth.uid()) = 'd61bf090-0b0d-46cc-bea4-3f8873c7d88a'::uuid);

drop policy if exists "Admin updates songs" on storage.objects;
create policy "Admin updates songs"
  on storage.objects for update to authenticated
  using (bucket_id = 'songs' and (select auth.uid()) = 'd61bf090-0b0d-46cc-bea4-3f8873c7d88a'::uuid)
  with check (bucket_id = 'songs' and (select auth.uid()) = 'd61bf090-0b0d-46cc-bea4-3f8873c7d88a'::uuid);

drop policy if exists "Admin deletes songs" on storage.objects;
create policy "Admin deletes songs"
  on storage.objects for delete to authenticated
  using (bucket_id = 'songs' and (select auth.uid()) = 'd61bf090-0b0d-46cc-bea4-3f8873c7d88a'::uuid);
