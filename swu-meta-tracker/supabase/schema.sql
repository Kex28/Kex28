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

-- Meta eras from GET /metas: competitive periods defined by card pool and
-- ban list (e.g. "A Lawless Time"). Reference data — the upstream API has
-- no archetype-share endpoint, so "current meta" share/win-rate is computed
-- from decklists by the current_meta view in phase2.sql.
create table if not exists meta_eras (
  id              text primary key,
  name            text not null,
  format          text,
  starts_on       date,
  ends_on         date,
  last_updated_at timestamptz not null default now()
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
  foreach t in array array['sets', 'cards', 'archetypes', 'meta_eras'] loop
    execute format('drop trigger if exists touch_%I on %I', t, t);
    execute format(
      'create trigger touch_%I before update on %I for each row execute function touch_last_updated_at()',
      t, t);
  end loop;
end $$;

-- RLS: anonymous frontend gets read-only access; writes happen only through
-- the service-role key used by the sync job (service role bypasses RLS).
alter table sets       enable row level security;
alter table cards      enable row level security;
alter table archetypes enable row level security;
alter table meta_eras  enable row level security;

drop policy if exists "public read sets" on sets;
create policy "public read sets" on sets for select using (true);
drop policy if exists "public read cards" on cards;
create policy "public read cards" on cards for select using (true);
drop policy if exists "public read archetypes" on archetypes;
create policy "public read archetypes" on archetypes for select using (true);
drop policy if exists "public read meta_eras" on meta_eras;
create policy "public read meta_eras" on meta_eras for select using (true);
