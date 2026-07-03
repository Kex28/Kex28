-- SWU Meta Tracker — Supabase schema
-- Run in the Supabase SQL editor (or via `supabase db push`) on a fresh project.
--
-- Covers the full core data model from docs/SPEC.md. Phase 1 only writes to
-- `archetypes`, `cards`, and `meta_snapshots`; the rest are created now so the
-- schema doesn't need migrating when Phase 2+ lands.

-- ---------------------------------------------------------------------------
-- Pulled data (owned by the sync pipeline, read-only for site users)
-- ---------------------------------------------------------------------------

create table if not exists archetypes (
  id              text primary key,          -- swuapi archetype id
  name            text not null,
  leader          text,
  base            text,
  aspect          text,
  last_updated_at timestamptz not null default now()
);

create table if not exists cards (
  id              text primary key,          -- swu-db card id (set/number)
  name            text not null,
  set_code        text,
  card_number     text,
  type            text,
  aspects         text[],
  cost            int,
  rarity          text,
  image_url       text,                      -- our own storage URL, never a hotlink out
  raw             jsonb,                     -- full upstream payload, landed as-is
  last_updated_at timestamptz not null default now()
);

-- Point-in-time meta readings from the open "current meta" endpoint.
-- Keeping every snapshot (rather than overwriting) gives Phase 2 its
-- meta-share-over-time series for free.
create table if not exists meta_snapshots (
  id              bigint generated always as identity primary key,
  archetype_id    text not null references archetypes (id),
  snapshot_date   date not null,
  meta_share      numeric(6, 4),             -- 0.1234 = 12.34%
  win_rate        numeric(6, 4),
  deck_count      int,
  source          text not null default 'swuapi',
  last_updated_at timestamptz not null default now(),
  unique (archetype_id, snapshot_date, source)
);

create table if not exists tournaments (
  id              text primary key,          -- swuapi tournament id
  name            text not null,
  date            date,
  tier            text,                      -- e.g. Planetary Qualifier, Regional
  player_count    int,
  last_updated_at timestamptz not null default now()
);

create table if not exists decklists (
  id              text primary key,          -- swuapi decklist id
  tournament_id   text references tournaments (id),
  archetype_id    text references archetypes (id),
  player          text,
  placement       int,
  cards_json      jsonb,                     -- raw list; card-frequency diffs read this
  last_updated_at timestamptz not null default now()
);

create table if not exists matches (
  id                   text primary key,     -- swuapi match id
  tournament_id        text references tournaments (id),
  decklist_id          text references decklists (id),
  opponent_decklist_id text references decklists (id),
  round                int,
  result               text,                 -- win / loss / draw / bye from decklist_id's POV
  last_updated_at      timestamptz not null default now()
);

create index if not exists idx_meta_snapshots_date on meta_snapshots (snapshot_date);
create index if not exists idx_decklists_tournament on decklists (tournament_id);
create index if not exists idx_decklists_archetype on decklists (archetype_id);
create index if not exists idx_matches_tournament on matches (tournament_id);
create index if not exists idx_tournaments_date on tournaments (date);

-- ---------------------------------------------------------------------------
-- Per-user data (Supabase Auth owns auth.users; this extends it)
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
  cards_json    jsonb not null,              -- cached in-app so nothing links out to SWUDB
  saved_at      timestamptz not null default now()
);

create table if not exists watchlist (
  id           bigint generated always as identity primary key,
  user_id      uuid not null references auth.users (id) on delete cascade,
  archetype_id text not null references archetypes (id),
  added_at     timestamptz not null default now(),
  unique (user_id, archetype_id)
);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- Pulled tables: anyone logged in (and the anon key, for now) can read;
-- only the service-role key used by the sync job can write.
-- Per-user tables: each user sees and edits only their own rows.
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

create policy "public read" on archetypes     for select using (true);
create policy "public read" on cards          for select using (true);
create policy "public read" on meta_snapshots for select using (true);
create policy "public read" on tournaments    for select using (true);
create policy "public read" on decklists      for select using (true);
create policy "public read" on matches        for select using (true);
-- No insert/update/delete policies on pulled tables: the sync job writes with
-- the service-role key, which bypasses RLS.

create policy "own profile"     on profiles    for all using (auth.uid() = id)      with check (auth.uid() = id);
create policy "own saved decks" on saved_decks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own watchlist"   on watchlist   for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
