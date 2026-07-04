-- SWU Meta Tracker — initial schema
-- Phase 1 uses: sets, cards, archetypes, meta_snapshots, sync_runs.
-- tournaments / decklists / matches / saved_decks are created now so the
-- Phase 2+ pipeline can land data without another migration.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Reference data (open swuapi.com endpoints, no API key required)
-- ---------------------------------------------------------------------------

create table if not exists sets (
  id              text primary key,          -- swuapi set code, e.g. "SOR"
  name            text not null,
  released_on     date,
  last_updated_at timestamptz not null default now()
);

create table if not exists cards (
  id              text primary key,          -- swuapi/swu-db card id
  set_id          text references sets (id),
  name            text not null,
  subtitle        text,
  type            text,                      -- Leader / Base / Unit / Event / Upgrade
  aspects         text[] not null default '{}',
  cost            int,
  rarity          text,
  image_url       text,                      -- our own storage URL, never a hotlink
  raw             jsonb,                     -- full upstream payload, landed as-is
  last_updated_at timestamptz not null default now()
);

create table if not exists archetypes (
  id              text primary key,          -- swuapi archetype id
  name            text not null,
  leader          text not null,
  base            text not null,
  aspect          text,
  last_updated_at timestamptz not null default now()
);

-- One row per archetype per pull of the "current meta" endpoint.
-- The latest snapshot batch is what the dashboard shows; keeping history
-- means Phase 2 trend charts need no backfill.
create table if not exists meta_snapshots (
  id              uuid primary key default gen_random_uuid(),
  archetype_id    text not null references archetypes (id),
  captured_at     timestamptz not null,
  meta_share      numeric(6, 4) not null,    -- 0.0821 = 8.21 % of the field
  win_rate        numeric(6, 4),             -- null when upstream omits it
  deck_count      int,
  match_count     int,
  source_window   text,                      -- upstream window label, e.g. "last-30-days"
  last_updated_at timestamptz not null default now(),
  unique (archetype_id, captured_at)
);

create index if not exists meta_snapshots_captured_at_idx
  on meta_snapshots (captured_at desc);

-- ---------------------------------------------------------------------------
-- Tournament data (gated swuapi.com endpoints, Phase 2+)
-- ---------------------------------------------------------------------------

create table if not exists tournaments (
  id              text primary key,
  name            text not null,
  date            date not null,
  tier            text,                      -- Planetary Qualifier, Regional, ...
  player_count    int,
  last_updated_at timestamptz not null default now()
);

create index if not exists tournaments_date_idx on tournaments (date desc);

create table if not exists decklists (
  id              text primary key,
  tournament_id   text not null references tournaments (id),
  archetype_id    text references archetypes (id),
  player          text,
  placement       int,
  cards_json      jsonb,
  last_updated_at timestamptz not null default now()
);

create index if not exists decklists_tournament_idx on decklists (tournament_id);
create index if not exists decklists_archetype_idx on decklists (archetype_id);

create table if not exists matches (
  id                   text primary key,
  tournament_id        text not null references tournaments (id),
  decklist_id          text references decklists (id),
  opponent_decklist_id text references decklists (id),
  round                int,
  result               text,                 -- win / loss / draw / bye
  last_updated_at      timestamptz not null default now()
);

create index if not exists matches_tournament_idx on matches (tournament_id);

-- ---------------------------------------------------------------------------
-- Per-user data (Supabase Auth owns auth.users; this references it)
-- ---------------------------------------------------------------------------

create table if not exists profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  team         text,
  created_at   timestamptz not null default now()
);

create table if not exists saved_decks (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  swudb_deck_id text not null,
  deck_name     text not null,
  cards_json    jsonb not null,              -- cached in-app; no outbound SWUDB links
  saved_at      timestamptz not null default now()
);

create index if not exists saved_decks_user_idx on saved_decks (user_id);

-- ---------------------------------------------------------------------------
-- Sync bookkeeping — powers the "last updated" stamp on every page
-- ---------------------------------------------------------------------------

create table if not exists sync_runs (
  id          uuid primary key default gen_random_uuid(),
  job         text not null,                 -- e.g. "phase1-open-endpoints"
  started_at  timestamptz not null,
  finished_at timestamptz,
  status      text not null default 'running',  -- running / ok / error
  detail      jsonb
);

create index if not exists sync_runs_job_idx on sync_runs (job, started_at desc);

-- ---------------------------------------------------------------------------
-- Row-level security
-- Pulled tables: readable by anyone (anon key), writable only by the
-- service-role key the pipeline uses (service role bypasses RLS).
-- saved_decks / profiles: each user sees and edits only their own rows.
-- ---------------------------------------------------------------------------

alter table sets           enable row level security;
alter table cards          enable row level security;
alter table archetypes     enable row level security;
alter table meta_snapshots enable row level security;
alter table tournaments    enable row level security;
alter table decklists      enable row level security;
alter table matches        enable row level security;
alter table sync_runs      enable row level security;
alter table profiles       enable row level security;
alter table saved_decks    enable row level security;

create policy "public read" on sets           for select using (true);
create policy "public read" on cards          for select using (true);
create policy "public read" on archetypes     for select using (true);
create policy "public read" on meta_snapshots for select using (true);
create policy "public read" on tournaments    for select using (true);
create policy "public read" on decklists      for select using (true);
create policy "public read" on matches        for select using (true);
create policy "public read" on sync_runs      for select using (true);

create policy "own profile read"   on profiles for select using (auth.uid() = id);
create policy "own profile upsert" on profiles for insert with check (auth.uid() = id);
create policy "own profile update" on profiles for update using (auth.uid() = id);

create policy "own decks read"   on saved_decks for select using (auth.uid() = user_id);
create policy "own decks insert" on saved_decks for insert with check (auth.uid() = user_id);
create policy "own decks update" on saved_decks for update using (auth.uid() = user_id);
create policy "own decks delete" on saved_decks for delete using (auth.uid() = user_id);
