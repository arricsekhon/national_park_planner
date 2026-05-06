-- Supabase schema for National Parks Hiker Planner.
-- Run this in the Supabase SQL editor after enabling email/password auth.

create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  park_code text not null,
  park_name text not null,
  park_states text,
  image_url text,
  created_at timestamptz not null default now(),
  unique (user_id, park_code)
);

create table if not exists public.visit_status (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  park_code text not null,
  status text not null check (status in ('want', 'been')),
  updated_at timestamptz not null default now(),
  unique (user_id, park_code)
);

create table if not exists public.park_ratings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  park_code text not null,
  stars integer not null check (stars between 1 and 5),
  review text,
  date date,
  updated_at timestamptz not null default now(),
  unique (user_id, park_code)
);

create table if not exists public.journal_entries (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  date date not null,
  park_code text,
  park_name text,
  rating integer not null check (rating between 1 and 5),
  notes text,
  photos text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.trips (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  start_date date,
  end_date date,
  stops jsonb not null default '[]'::jsonb,
  notes text,
  is_public boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.favorites enable row level security;
alter table public.visit_status enable row level security;
alter table public.park_ratings enable row level security;
alter table public.journal_entries enable row level security;
alter table public.trips enable row level security;

create policy "Users can manage their favorites"
on public.favorites for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can manage their visit statuses"
on public.visit_status for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can manage their park ratings"
on public.park_ratings for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can manage their journal entries"
on public.journal_entries for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can manage their trips"
on public.trips for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Anyone can read public trips"
on public.trips for select
using (is_public = true);

insert into storage.buckets (id, name, public)
values ('journal-photos', 'journal-photos', true)
on conflict (id) do nothing;

create policy "Users can upload journal photos"
on storage.objects for insert
with check (
  bucket_id = 'journal-photos'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Users can delete their journal photos"
on storage.objects for delete
using (
  bucket_id = 'journal-photos'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Anyone can read journal photos"
on storage.objects for select
using (bucket_id = 'journal-photos');
