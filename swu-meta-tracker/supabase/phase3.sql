-- SWU Meta Tracker — Phase 3 schema (run after schema.sql and phase2.sql)
-- Adds decklist card contents plus the counter-meta, card-trend, and
-- tournament-breakdown views.

-- card_id is a soft reference on purpose: live decklists may mention cards
-- our cards table hasn't pulled yet, and that shouldn't fail the sync.
create table if not exists decklist_cards (
  decklist_id     text not null references decklists(id),
  card_id         text not null,
  count           int not null default 1,
  last_updated_at timestamptz not null default now(),
  primary key (decklist_id, card_id)
);

create index if not exists decklist_cards_card_idx on decklist_cards (card_id);

drop trigger if exists touch_decklist_cards on decklist_cards;
create trigger touch_decklist_cards before update on decklist_cards
  for each row execute function touch_last_updated_at();

alter table decklist_cards enable row level security;
drop policy if exists "public read decklist_cards" on decklist_cards;
create policy "public read decklist_cards" on decklist_cards for select using (true);

-- The current top archetypes (by trailing-14-day share) that counter-meta
-- win rates are measured against.
create or replace view top_archetypes as
select archetype_id, name, recent_share
from archetype_trends
order by recent_share desc nulls last
limit 3;

-- Per-archetype record over the trailing 28 days: overall win rate vs.
-- win rate specifically against the top archetypes (mirrors excluded).
-- Strong vs-top + ordinary overall = counter-meta candidate.
create or replace view counter_meta as
with recent_matches as (
  select m.result,
         d.archetype_id,
         od.archetype_id as opponent_archetype_id
  from matches m
  join decklists d on d.id = m.decklist_id
  join decklists od on od.id = m.opponent_decklist_id
  join tournaments t on t.id = m.tournament_id
  where t.date >= current_date - 28 and m.result is not null
),
scored as (
  select *,
         case result when 'win' then 1.0 when 'draw' then 0.5 else 0.0 end as score,
         opponent_archetype_id in (select archetype_id from top_archetypes)
           and opponent_archetype_id <> archetype_id as is_vs_top
  from recent_matches
)
select
  s.archetype_id,
  a.name,
  avg(s.score) as overall_win_rate,
  count(*)::int as overall_n,
  case when count(*) filter (where s.is_vs_top) >= 10
       then avg(s.score) filter (where s.is_vs_top) end as vs_top_win_rate,
  count(*) filter (where s.is_vs_top)::int as vs_top_n
from scored s
join archetypes a on a.id = s.archetype_id
group by s.archetype_id, a.name
order by vs_top_win_rate desc nulls last;

-- Per-matchup breakdown against each top archetype (frontend pivots this
-- into the vs-#1 / vs-#2 / vs-#3 columns).
create or replace view counter_meta_matchups as
select
  d.archetype_id,
  od.archetype_id as opponent_archetype_id,
  oa.name as opponent_name,
  avg(case m.result when 'win' then 1.0 when 'draw' then 0.5 else 0.0 end) as win_rate,
  count(*)::int as n
from matches m
join decklists d on d.id = m.decklist_id
join decklists od on od.id = m.opponent_decklist_id
join archetypes oa on oa.id = od.archetype_id
join tournaments t on t.id = m.tournament_id
where t.date >= current_date - 28
  and m.result is not null
  and od.archetype_id in (select archetype_id from top_archetypes)
  and od.archetype_id <> d.archetype_id
group by d.archetype_id, od.archetype_id, oa.name;

-- Card inclusion rates inside an archetype, trailing 14 days vs. the 14
-- before (the "why is this deck changing" view).
create or replace view card_trends as
with windowed_decks as (
  select d.id, d.archetype_id,
         case when t.date >= current_date - 14 then 'recent'
              when t.date >= current_date - 28 then 'prior' end as w
  from decklists d
  join tournaments t on t.id = d.tournament_id
  where t.date >= current_date - 28
),
totals as (
  select archetype_id,
    count(*) filter (where w = 'recent') as recent_decks,
    count(*) filter (where w = 'prior')  as prior_decks
  from windowed_decks group by archetype_id
)
select
  wd.archetype_id,
  dc.card_id,
  coalesce(c.name, dc.card_id) as card_name,
  count(*) filter (where wd.w = 'recent')::float / nullif(tt.recent_decks, 0) as recent_rate,
  count(*) filter (where wd.w = 'prior')::float  / nullif(tt.prior_decks, 0)  as prior_rate,
  coalesce(count(*) filter (where wd.w = 'recent')::float / nullif(tt.recent_decks, 0), 0)
    - coalesce(count(*) filter (where wd.w = 'prior')::float / nullif(tt.prior_decks, 0), 0)
    as rate_delta
from decklist_cards dc
join windowed_decks wd on wd.id = dc.decklist_id
join totals tt on tt.archetype_id = wd.archetype_id
left join cards c on c.id = dc.card_id
group by wd.archetype_id, dc.card_id, c.name, tt.recent_decks, tt.prior_decks;

-- Archetype breakdown within each tournament (share + event win rate).
create or replace view tournament_archetypes as
with event_wr as (
  select m.tournament_id, d.archetype_id,
         avg(case m.result when 'win' then 1.0 when 'draw' then 0.5 else 0.0 end) as win_rate
  from matches m
  join decklists d on d.id = m.decklist_id
  where m.result is not null
  group by m.tournament_id, d.archetype_id
)
select
  d.tournament_id,
  d.archetype_id,
  a.name,
  count(*)::int as decks,
  count(*)::float / sum(count(*)) over (partition by d.tournament_id) as share,
  w.win_rate
from decklists d
join archetypes a on a.id = d.archetype_id
left join event_wr w on w.tournament_id = d.tournament_id and w.archetype_id = d.archetype_id
group by d.tournament_id, d.archetype_id, a.name, w.win_rate;
