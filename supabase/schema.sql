-- SWU Meta Tracker — Supabase schema
-- Run this in the Supabase SQL editor (or via `supabase db push`) to set up the database.
--
-- Design notes:
--   * Every pulled table carries `last_updated_at`, set by the sync job on each
--     write/refresh. This powers the "last updated" display across every page.
--   * `meta_snapshots` captures the open /meta endpoint on every scheduled pull.
--     Snapshotting the current meta daily gives us a time series for Phase 2
--     trend charts without needing the gated tournament endpoints.
--   * Pulled tables are world-readable (anon SELECT); only the service role
--     (used by the sync job) may write. Per-user tables (saved_decks, watchlist)
--     are locked to their owner via RLS.

-- ---------------------------------------------------------------------------
-- Pulled data (Phase 1: archetypes, cards, meta_snapshots; Phase 2+: the rest)
-- ---------------------------------------------------------------------------

create table if not exists archetypes (
  id              text primary key,              -- swuapi archetype id
  name            text not null,
  leader          text,
  base            text,
  aspect          text,
  last_updated_at timestamptz not null default now()
);

create table if not exists cards (
  id              text primary key,              -- swu-db card id
  name            text not null,
  set_code        text,
  card_number     text,
  aspects         text[],
  card_type       text,
  cost            int,
  image_url       text,                          -- our own storage URL, not swu-db's
  raw             jsonb,                         -- full upstream payload, land-raw-first
  last_updated_at timestamptz not null default now()
);

-- One row per archetype per pull of the open "current meta" endpoint.
create table if not exists meta_snapshots (
  id              bigint generated always as identity primary key,
  snapshot_at     timestamptz not null,          -- when the pull ran
  archetype_id    text not null references archetypes (id),
  meta_share      numeric,                       -- 0..1 share of the field
  win_rate        numeric,                       -- 0..1
  deck_count      int,
  raw             jsonb,
  last_updated_at timestamptz not null default now(),
  unique (snapshot_at, archetype_id)
);

create index if not exists meta_snapshots_snapshot_at_idx
  on meta_snapshots (snapshot_at desc);

-- ---------------------------------------------------------------------------
-- Phase 2+ tables (gated swuapi endpoints: tournaments / decklists / matches)
-- ---------------------------------------------------------------------------

create table if not exists tournaments (
  id              text primary key,
  name            text not null,
  date            date,
  tier            text,                          -- e.g. Planetary Qualifier, Regional
  player_count    int,
  raw             jsonb,
  last_updated_at timestamptz not null default now()
);

create index if not exists tournaments_date_idx on tournaments (date desc);

create table if not exists decklists (
  id              text primary key,
  tournament_id   text references tournaments (id),
  archetype_id    text references archetypes (id),
  player          text,
  placement       int,
  cards_json      jsonb,                         -- full 50-card list for card-trend diffs
  raw             jsonb,
  last_updated_at timestamptz not null default now()
);

create index if not exists decklists_tournament_idx on decklists (tournament_id);
create index if not exists decklists_archetype_idx  on decklists (archetype_id);

create table if not exists matches (
  id                   text primary key,
  tournament_id        text references tournaments (id),
  decklist_id          text references decklists (id),
  opponent_decklist_id text references decklists (id),
  round                int,
  result               text,                     -- win / loss / draw from decklist_id's side
  raw                  jsonb,
  last_updated_at      timestamptz not null default now()
);

create index if not exists matches_tournament_idx on matches (tournament_id);

-- ---------------------------------------------------------------------------
-- Per-user data (Supabase Auth owns the users; auth.users is built in)
-- ---------------------------------------------------------------------------

create table if not exists profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  team         text,
  created_at   timestamptz not null default now()
);

create table if not exists saved_decks (
  id            bigint generated always as identity primary key,
  user_id       uuid not null references auth.users (id) on delete cascade,
  swudb_deck_id text not null,
  deck_name     text not null,
  cards_json    jsonb not null,                  -- cached in-app; never link out to SWUDB
  saved_at      timestamptz not null default now()
);

create index if not exists saved_decks_user_idx on saved_decks (user_id);

create table if not exists watchlist (
  id           bigint generated always as identity primary key,
  user_id      uuid not null references auth.users (id) on delete cascade,
  archetype_id text not null references archetypes (id),
  created_at   timestamptz not null default now(),
  unique (user_id, archetype_id)
);

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------

alter table archetypes     enable row level security;
alter table cards          enable row level security;
alter table meta_snapshots enable row level security;
alter table tournaments    enable row level security;
alter table decklists      enable row level security;
alter table matches        enable row level security;
alter table profiles       enable row level security;
alter table saved_decks    enable row level security;
alter table watchlist      enable row level security;

-- Pulled data: anyone (including anon) can read; nobody but service_role writes.
create policy "public read" on archetypes     for select using (true);
create policy "public read" on cards          for select using (true);
create policy "public read" on meta_snapshots for select using (true);
create policy "public read" on tournaments    for select using (true);
create policy "public read" on decklists      for select using (true);
create policy "public read" on matches        for select using (true);

-- Profiles: users manage their own row; team members can read each other.
create policy "read profiles"  on profiles for select using (auth.role() = 'authenticated');
create policy "insert own profile" on profiles for insert with check (auth.uid() = id);
create policy "update own profile" on profiles for update using (auth.uid() = id);

-- Saved decks and watchlist: owner-only.
create policy "own saved_decks" on saved_decks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own watchlist" on watchlist
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Convenience view: the latest meta snapshot, joined to archetype details.
-- The Phase 1 dashboard reads this directly.
-- ---------------------------------------------------------------------------

create or replace view latest_meta as
select
  ms.archetype_id,
  a.name,
  a.leader,
  a.base,
  a.aspect,
  ms.meta_share,
  ms.win_rate,
  ms.deck_count,
  ms.snapshot_at,
  ms.last_updated_at
from meta_snapshots ms
join archetypes a on a.id = ms.archetype_id
where ms.snapshot_at = (select max(snapshot_at) from meta_snapshots);
