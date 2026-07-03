-- SWU Meta Tracker — Phase 1 schema
-- Run this in the Supabase SQL editor (or via supabase db push) once,
-- before the first sync.

create table if not exists sets (
  code            text primary key,
  name            text not null,
  released_at     date,
  last_updated_at timestamptz not null default now()
);

create table if not exists cards (
  id              text primary key,
  name            text not null,
  set_code        text references sets(code),
  card_type       text,
  aspects         text[] not null default '{}',
  cost            int,
  image_url       text,
  last_updated_at timestamptz not null default now()
);

create table if not exists archetypes (
  id              text primary key,
  name            text not null,
  leader          text,
  base            text,
  aspects         text[] not null default '{}',
  last_updated_at timestamptz not null default now()
);

-- One row per archetype per daily snapshot; the sync upserts on
-- (snapshot_date, archetype_id), so re-running the same day refreshes
-- in place instead of duplicating. Keeping history here is what Phase 2's
-- trend windows will read.
create table if not exists meta_snapshot_entries (
  snapshot_date   date not null,
  archetype_id    text not null references archetypes(id),
  meta_share      double precision, -- fraction 0..1
  win_rate        double precision, -- fraction 0..1
  deck_count      int,
  last_updated_at timestamptz not null default now(),
  primary key (snapshot_date, archetype_id)
);

-- Refresh last_updated_at on every upsert, so the "last updated" display
-- reflects the most recent sync touch, not row creation.
create or replace function touch_last_updated_at()
returns trigger language plpgsql as $$
begin
  new.last_updated_at := now();
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['sets', 'cards', 'archetypes', 'meta_snapshot_entries'] loop
    execute format('drop trigger if exists touch_%I on %I', t, t);
    execute format(
      'create trigger touch_%I before update on %I for each row execute function touch_last_updated_at()',
      t, t);
  end loop;
end $$;

-- What the frontend's Phase 1 page reads: latest snapshot joined to
-- archetype names.
create or replace view current_meta as
select
  e.snapshot_date,
  e.archetype_id,
  a.name,
  a.leader,
  a.base,
  a.aspects,
  e.meta_share,
  e.win_rate,
  e.deck_count,
  e.last_updated_at
from meta_snapshot_entries e
join archetypes a on a.id = e.archetype_id
where e.snapshot_date = (select max(snapshot_date) from meta_snapshot_entries);

-- RLS: anonymous frontend gets read-only access; writes happen only through
-- the service-role key used by the sync job (service role bypasses RLS).
alter table sets                  enable row level security;
alter table cards                 enable row level security;
alter table archetypes            enable row level security;
alter table meta_snapshot_entries enable row level security;

drop policy if exists "public read sets" on sets;
create policy "public read sets" on sets for select using (true);
drop policy if exists "public read cards" on cards;
create policy "public read cards" on cards for select using (true);
drop policy if exists "public read archetypes" on archetypes;
create policy "public read archetypes" on archetypes for select using (true);
drop policy if exists "public read meta" on meta_snapshot_entries;
create policy "public read meta" on meta_snapshot_entries for select using (true);
