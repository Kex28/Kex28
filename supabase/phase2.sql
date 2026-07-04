-- SWU Meta Tracker — Phase 2 schema (run after schema.sql)
-- Adds tournaments/decklists/matches plus the trend views the frontend
-- reads. Requires the swuapi.com API key on the sync side to populate.

create table if not exists tournaments (
  id              text primary key,
  name            text not null,
  date            date,
  tier            text,
  player_count    int,
  last_updated_at timestamptz not null default now()
);

create table if not exists decklists (
  id              text primary key,
  tournament_id   text not null references tournaments(id),
  archetype_id    text references archetypes(id),
  player          text,
  placement       int,
  last_updated_at timestamptz not null default now()
);

-- One row per match PER PERSPECTIVE (two rows per played match), so
-- per-archetype win rates are a plain avg over a deck's own rows.
create table if not exists matches (
  id                   text primary key,
  tournament_id        text not null references tournaments(id),
  round                int,
  decklist_id          text not null references decklists(id),
  opponent_decklist_id text references decklists(id),
  result               text check (result in ('win', 'loss', 'draw')),
  last_updated_at      timestamptz not null default now()
);

create index if not exists decklists_tournament_idx on decklists (tournament_id);
create index if not exists decklists_archetype_idx on decklists (archetype_id);
create index if not exists matches_decklist_idx on matches (decklist_id);

do $$
declare t text;
begin
  foreach t in array array['tournaments', 'decklists', 'matches'] loop
    execute format('drop trigger if exists touch_%I on %I', t, t);
    execute format(
      'create trigger touch_%I before update on %I for each row execute function touch_last_updated_at()',
      t, t);
  end loop;
end $$;

alter table tournaments enable row level security;
alter table decklists   enable row level security;
alter table matches     enable row level security;

drop policy if exists "public read tournaments" on tournaments;
create policy "public read tournaments" on tournaments for select using (true);
drop policy if exists "public read decklists" on decklists;
create policy "public read decklists" on decklists for select using (true);
drop policy if exists "public read matches" on matches;
create policy "public read matches" on matches for select using (true);

-- Weekly meta share per archetype (the line chart's data).
create or replace view meta_share_weekly as
select
  date_trunc('week', t.date)::date as week,
  d.archetype_id,
  a.name,
  count(*)::int as deck_count,
  count(*)::float / sum(count(*)) over (partition by date_trunc('week', t.date)) as meta_share
from decklists d
join tournaments t on t.id = d.tournament_id
join archetypes a on a.id = d.archetype_id
group by 1, 2, 3;

-- Trailing 14-day window vs. the prior 14 days (the spec's riser/faller
-- calculation), with per-window win rates from matches. NOTE: anchored on
-- current_date; the Python mirror in backend/swu_sync/trends.py anchors on
-- the newest tournament date instead so fixture output is date-stable.
create or replace view archetype_trends as
with windowed_decks as (
  select d.id, d.archetype_id,
         case when t.date >= current_date - 14 then 'recent'
              when t.date >= current_date - 28 then 'prior' end as w
  from decklists d
  join tournaments t on t.id = d.tournament_id
  where t.date >= current_date - 28 and d.archetype_id is not null
),
counts as (
  select archetype_id,
    count(*) filter (where w = 'recent') as recent_decks,
    count(*) filter (where w = 'prior')  as prior_decks
  from windowed_decks group by archetype_id
),
totals as (
  select sum(recent_decks) as recent_total, sum(prior_decks) as prior_total from counts
),
winrates as (
  select wd.archetype_id,
    avg(case m.result when 'win' then 1.0 when 'draw' then 0.5 else 0.0 end)
      filter (where wd.w = 'recent') as recent_win_rate,
    avg(case m.result when 'win' then 1.0 when 'draw' then 0.5 else 0.0 end)
      filter (where wd.w = 'prior')  as prior_win_rate
  from matches m
  join windowed_decks wd on wd.id = m.decklist_id
  where m.result is not null
  group by wd.archetype_id
)
select
  c.archetype_id,
  a.name, a.leader, a.base,
  c.recent_decks, c.prior_decks,
  c.recent_decks::float / nullif(t.recent_total, 0) as recent_share,
  c.prior_decks::float  / nullif(t.prior_total, 0)  as prior_share,
  c.recent_decks::float / nullif(t.recent_total, 0)
    - c.prior_decks::float / nullif(t.prior_total, 0) as share_delta,
  w.recent_win_rate, w.prior_win_rate,
  w.recent_win_rate - w.prior_win_rate as win_rate_delta
from counts c
cross join totals t
join archetypes a on a.id = c.archetype_id
left join winrates w on w.archetype_id = c.archetype_id
order by share_delta desc nulls last;
