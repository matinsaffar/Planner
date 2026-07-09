-- Run this once in the Supabase SQL editor (Project > SQL Editor > New query).
-- Creates all tables with Row Level Security so that each row is only
-- readable/writable by the authenticated user who owns it (user_id = auth.uid()).
-- This is what makes the app "only accessible by me" even though the
-- Vercel URL itself is public: without logging in, no data can be read or written.

create table if not exists categories (
  id text primary key,
  user_id uuid not null default auth.uid(),
  name text, color text, icon text, banner text, gif text, archived boolean default false
);
create table if not exists subcategories (
  id text primary key,
  user_id uuid not null default auth.uid(),
  category_id text, title text, color text, icon text, vitality text, gif text, archived boolean default false
);
create table if not exists tasks (
  id text primary key,
  user_id uuid not null default auth.uid(),
  title text, category text, subcategory text, duration integer,
  date text, time text, status text, notes text, color text,
  subtasks jsonb default '[]', goals jsonb default '[]',
  created_at bigint, started_at bigint, finished_at bigint
);
create table if not exists reminders (
  id text primary key,
  user_id uuid not null default auth.uid(),
  title text, date text, time text, notes text, hidden boolean default false
);
create table if not exists blocks (
  id text primary key,
  user_id uuid not null default auth.uid(),
  title text, date text, start_time text, end_time text, repeat text
);
create table if not exists goals (
  id text primary key,
  user_id uuid not null default auth.uid(),
  category text, subcategory text, type text, title text,
  start_date text, deadline text, status text, target integer, progress integer
);

alter table categories enable row level security;
alter table subcategories enable row level security;
alter table tasks enable row level security;
alter table reminders enable row level security;
alter table blocks enable row level security;
alter table goals enable row level security;

do $$
declare t text;
begin
  for t in select unnest(array['categories','subcategories','tasks','reminders','blocks','goals'])
  loop
    execute format('create policy "owner_select" on %I for select using (auth.uid() = user_id);', t);
    execute format('create policy "owner_insert" on %I for insert with check (auth.uid() = user_id);', t);
    execute format('create policy "owner_update" on %I for update using (auth.uid() = user_id);', t);
    execute format('create policy "owner_delete" on %I for delete using (auth.uid() = user_id);', t);
  end loop;
end $$;


-- Migration for Hall of Goals feature (achieved badges + check-in streaks)
alter table goals add column if not exists achieved boolean default false;
alter table goals add column if not exists badge text;
alter table goals add column if not exists achieved_at bigint;
alter table goals add column if not exists checkins jsonb default '[]';
