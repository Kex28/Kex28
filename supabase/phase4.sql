-- SWU Meta Tracker — Phase 4 schema (run after schema.sql/phase2.sql/phase3.sql)
-- Per-user data: watchlist and saved decks. Users come from Supabase Auth
-- (enable Email provider in Authentication -> Providers); auth.uid() is
-- the logged-in user's id, and RLS keeps every row private to its owner.

create table if not exists watchlist (
  user_id      uuid not null references auth.users(id) on delete cascade,
  archetype_id text not null references archetypes(id),
  created_at   timestamptz not null default now(),
  primary key (user_id, archetype_id)
);

alter table watchlist enable row level security;

drop policy if exists "own watchlist select" on watchlist;
create policy "own watchlist select" on watchlist
  for select using (auth.uid() = user_id);
drop policy if exists "own watchlist insert" on watchlist;
create policy "own watchlist insert" on watchlist
  for insert with check (auth.uid() = user_id);
drop policy if exists "own watchlist delete" on watchlist;
create policy "own watchlist delete" on watchlist
  for delete using (auth.uid() = user_id);

-- Decks saved from SWUDB, card data cached in cards_json so the deck
-- renders entirely in-app (no link-outs), matching the spec.
create table if not exists saved_decks (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  swudb_deck_id text,
  deck_name     text not null,
  leader        text,
  base          text,
  cards_json    jsonb not null default '[]',
  saved_at      timestamptz not null default now()
);

create index if not exists saved_decks_user_idx on saved_decks (user_id);

alter table saved_decks enable row level security;

drop policy if exists "own decks select" on saved_decks;
create policy "own decks select" on saved_decks
  for select using (auth.uid() = user_id);
drop policy if exists "own decks insert" on saved_decks;
create policy "own decks insert" on saved_decks
  for insert with check (auth.uid() = user_id);
drop policy if exists "own decks update" on saved_decks;
create policy "own decks update" on saved_decks
  for update using (auth.uid() = user_id);
drop policy if exists "own decks delete" on saved_decks;
create policy "own decks delete" on saved_decks
  for delete using (auth.uid() = user_id);
