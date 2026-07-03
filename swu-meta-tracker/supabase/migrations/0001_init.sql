-- SWU Meta Tracker — initial schema (all phases).
-- Apply with the Supabase SQL editor or `supabase db push`.

-- ---------------------------------------------------------------------------
-- Pulled data (written only by the sync pipeline via the service-role key).
-- Every pulled table carries last_updated_at, which powers the "last updated"
-- stamp shown across the site.
-- ---------------------------------------------------------------------------

create table if not exists archetypes (
  id              bigint generated always as identity primary key,
  swuapi_id       text unique,                 -- id on api.swuapi.com, for upserts
  name            text not null,
  leader          text,
  base            text,
  aspects         text[] default '{}',
  last_updated_at timestamptz not null default now()
);

create table if not exists cards (
  id              bigint generated always as identity primary key,
  swudb_id        text unique,                 -- set code + number, e.g. "SOR_010"
  name            text not null,
  set_code        text,
  card_number     text,
  card_type       text,
  aspects         text[] default '{}',
  cost            int,
  rarity          text,
  image_url       text,                        -- served from our own storage, not swu-db.com
  last_updated_at timestamptz not null default now()
);

create table if not exists tournaments (
  id              bigint generated always as identity primary key,
  swuapi_id       text unique,
  name            text not null,
  date            date,
  tier            text,                        -- e.g. Planetary Qualifier, Regional
  player_count    int,
  last_updated_at timestamptz not null default now()
);

create table if not exists decklists (
  id              bigint generated always as identity primary key,
  swuapi_id       text unique,
  tournament_id   bigint references tournaments (id) on delete cascade,
  archetype_id    bigint references archetypes (id),
  player          text,
  placement       int,
  cards_json      jsonb,
  last_updated_at timestamptz not null default now()
);

create table if not exists matches (
  id                   bigint generated always as identity primary key,
  swuapi_id            text unique,
  tournament_id        bigint references tournaments (id) on delete cascade,
  decklist_id          bigint references decklists (id),
  opponent_decklist_id bigint references decklists (id),
  round                int,
  result               text,                   -- win / loss / draw from decklist_id's side
  last_updated_at      timestamptz not null default now()
);

-- Point-in-time meta readings from the open /meta endpoint (Phase 1).
-- Each sync appends one row per archetype, so trends fall out of the history.
create table if not exists meta_snapshots (
  id              bigint generated always as identity primary key,
  archetype_id    bigint not null references archetypes (id) on delete cascade,
  captured_at     timestamptz not null,
  meta_share      numeric,                     -- 0..1
  win_rate        numeric,                     -- 0..1
  deck_count      int,
  last_updated_at timestamptz not null default now(),
  unique (archetype_id, captured_at)
);

-- One row per pipeline run — powers the About page and freshness checks.
create table if not exists sync_runs (
  id          bigint generated always as identity primary key,
  job         text not null,                   -- e.g. "phase1"
  started_at  timestamptz not null default now(),
  finished_at timestamptz,
  status      text not null default 'running', -- running / ok / error
  detail      text
);

-- ---------------------------------------------------------------------------
-- Per-user data (Supabase Auth owns the users; profiles + saved decks here).
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
  swudb_deck_id text,
  deck_name     text not null,
  cards_json    jsonb,                          -- cached in-app so nothing links out
  saved_at      timestamptz not null default now()
);

create table if not exists watchlist (
  id           bigint generated always as identity primary key,
  user_id      uuid not null references auth.users (id) on delete cascade,
  archetype_id bigint not null references archetypes (id) on delete cascade,
  created_at   timestamptz not null default now(),
  unique (user_id, archetype_id)
);

-- ---------------------------------------------------------------------------
-- Row-level security. Pulled data is readable by everyone (anon + logged in)
-- and written only by the service-role key, which bypasses RLS. Personal
-- tables are readable/writable only by their owner.
-- ---------------------------------------------------------------------------

alter table archetypes     enable row level security;
alter table cards          enable row level security;
alter table tournaments    enable row level security;
alter table decklists      enable row level security;
alter table matches        enable row level security;
alter table meta_snapshots enable row level security;
alter table sync_runs      enable row level security;
alter table profiles       enable row level security;
alter table saved_decks    enable row level security;
alter table watchlist      enable row level security;

create policy "public read" on archetypes     for select using (true);
create policy "public read" on cards          for select using (true);
create policy "public read" on tournaments    for select using (true);
create policy "public read" on decklists      for select using (true);
create policy "public read" on matches        for select using (true);
create policy "public read" on meta_snapshots for select using (true);
create policy "public read" on sync_runs      for select using (true);

create policy "own profile read"   on profiles for select using (auth.uid() = id);
create policy "own profile insert" on profiles for insert with check (auth.uid() = id);
create policy "own profile update" on profiles for update using (auth.uid() = id);

create policy "own decks" on saved_decks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own watchlist" on watchlist
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Convenience view: the latest meta snapshot per archetype, joined to names.
-- The frontend's Phase 1 table reads this.
-- ---------------------------------------------------------------------------

create or replace view current_meta as
select distinct on (s.archetype_id)
  s.archetype_id,
  a.name,
  a.leader,
  a.base,
  a.aspects,
  s.meta_share,
  s.win_rate,
  s.deck_count,
  s.captured_at,
  s.last_updated_at
from meta_snapshots s
join archetypes a on a.id = s.archetype_id
order by s.archetype_id, s.captured_at desc;
