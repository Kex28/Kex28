# SWU Meta Tracker — Project Spec

## What this is

A personal website/app for tracking the competitive Star Wars: Unlimited meta, built to help me improve as a player by seeing what decks are rising, falling, and which decks can counter the current meta.

## Data source

- **api.swuapi.com** — community-run API aggregating tournament results, matches, standings, decklists, and archetypes, sourced from Melee.gg (tournament platform) and swu-db.com (card data).
  - Public, no key needed: cards, sets, archetypes, current meta lists.
  - Requires a free API key (Bearer token): tournaments, matches, players, decklists. Key requested via their site/Discord — **confirm this is secured before building Phase 2+**.
- Rate limits, uptime, and scrape freshness are unverified — confirm directly with swuapi.com before treating it as sole source of truth.

## Feature list (plain English)

- Automatically pulls in tournament results, decklists, and match data on a schedule (daily, or after big events)
- Shows which decks are gaining popularity and winning more, over time
- Shows which decks are losing popularity or win rate, and surfaces likely reasons (card swaps, a new ban, a new set, bad matchups against what's currently popular)
- Flags "counter-meta" decks — not top-tier overall, but strong specifically against the current top decks
- Lets me click into a single tournament or a whole weekend and see round-by-round results, standings, and matchup breakdowns as graphs
- Tracks individual cards — which ones are showing up more or less inside a given archetype over time
- Filters everything by leader, base, aspect, date range, or tournament tier (Planetary Qualifier, Regional, etc.)
- Lets me save specific decks/archetypes to a personal watchlist for updates

## Navigation bar

1. Home / Dashboard — snapshot of the current meta
2. Meta Trends — rising and falling decks
3. Counter Meta — outlier/tech decks that beat the top decks
4. Tournaments — browse and drill into events by weekend/week
5. Archetypes — browse/search all decks and their stats
6. Cards — card-level play-rate trends
7. Watchlist — decks/archetypes I'm personally tracking
8. My Decks — personal profile page, decks saved from SWUDB, rendered in-app
9. About — data sources, last update time, methodology notes
10. Login/Profile — account access, teammates each get their own login

## Additional requirements

- **Accounts/login:** multi-user, so teammates can log in and use the site, not just me.
- **Per-user profiles:** each person can save/track their own decks. Deck data pulled from SWUDB, but saved and displayed inside this site — not a redirect out to SWUDB.
- **Everything stays in-app:** no linking out to swuapi.com, SWUDB, Melee.gg, etc. — deck lists, card images, and stats all render natively on this site.
- **Data freshness:** every piece of pulled data (meta stats, tournament results, decklists) shows the date/time it was last updated, so it's clear how current the info is at a glance.
- **Sync behaviour:** refresh-based, not live. Pages show whatever data was current when loaded; new data from a scheduled pull appears on next page load/refresh, not automatically mid-session. No real-time sync needed between teammates viewing the same page.

## Design & UX

- **Style:** Neumorphism — soft, embossed shadows and tactile-feeling cards/buttons/toggles, layered on solid, high-contrast text and clear borders where readability matters (charts, tables, key stats). Avoid pure/strict neumorphism throughout, since low-contrast same-color-on-same-color styling is a known accessibility problem and works against a data-heavy site that needs to be quickly scannable.
- **Reference:** flowninja.com — clean card-based sections, big stat callouts, structured grid layout, generous spacing. Confirm specific visual details (shadow depth, button styling) with reference screenshots if closer matching is wanted.
- **Dark mode:** required, with a toggle. Since neumorphism relies on subtle shadow contrast, dark mode needs its own tuned shadow/highlight values — don't just invert the light-mode colors.
- **Responsive:** must work well on modern phones, tablets, and desktop — mobile-first layout, touch-friendly tap targets (neumorphic buttons especially need enough size/padding to stay tappable, not just decorative).
- **Overall feel:** minimal, uncluttered — generous whitespace, restrained color palette, no dense/busy layouts even on data-heavy pages (Meta Trends, Tournaments). Favor showing one clear insight at a time over cramming everything onto one screen.
- **Navigation:** hamburger menu (collapsible), not a persistent full nav bar — keeps the interface clean, and works naturally across phone/tablet/desktop rather than needing a separate mobile nav pattern.
- **Motion:** small, purposeful animations for personality — e.g. cards gently pressing on tap (fits the neumorphic style), numbers counting up on stat reveals, smooth transitions when switching between trend views. Keep it subtle and fast, not flashy or slow enough to feel like it's in the way.

## Suggested stack

- **Backend/data pulls:** Python
- **Database:** Supabase (Postgres + auto-generated REST API)
- **Auth:** Supabase Auth (built-in login/signup, works naturally with the same DB — covers the multi-user/teammate login requirement with no extra service)
- **Card data/images:** pulled server-side from swu-db.com's public API and stored/served from our own DB and storage, so the site never links out to it directly
- **Frontend:** React + Recharts + Tailwind CSS (Tailwind's utility classes make dark-mode variants and consistent shadow/spacing tokens for neumorphic styling straightforward to maintain) + Framer Motion (for the small tap/transition/counting-up animations)
- **Hosting:** Vercel (frontend) + Supabase (DB + Auth) + GitHub Actions cron (scheduled swuapi.com poll)

## Build phases

**Phase 1 — MVP:** Pull cards/archetypes/current meta (open endpoints, no key) into Supabase. One page: table of archetype, meta share, win rate. Goal is proving the pipeline end to end.

**Phase 2 — Trends:** Add trailing-window comparison (e.g. this 2 weeks vs. prior 2 weeks) to flag risers/fallers. Line charts of meta share over time. Requires the gated API key for tournaments/matches/decklists.

**Phase 3 — Core features:** Counter-meta detector, tournament weekend drill-down, card-level play-rate trends inside an archetype.

**Phase 4 — Polish:** Watchlist and whatever proves most useful week to week.

## Core data model

**Tables**

- `archetypes` (id, name, leader, base, aspect)
- `tournaments` (id, name, date, tier, player_count)
- `decklists` (id, tournament_id, archetype_id, player, placement)
- `matches` (id, tournament_id, decklist_id, opponent_decklist_id, result)
- `users` (id, email, display_name, team) — managed by Supabase Auth
- `saved_decks` (id, user_id, swudb_deck_id, deck_name, cards_json, saved_at) — teammates' personal decks, card data cached in-app so nothing links out to SWUDB
- All pulled tables (`archetypes`, `tournaments`, `decklists`, `matches`) get a `last_updated_at` timestamp column, set whenever a sync job writes/refreshes a row — this powers the "last updated" display across every page

**Pull sequence**

1. `/tournaments?since=<date>` — new events since last run
2. Per new tournament: `/tournaments/:id/standings` and `/tournaments/:id/decklists` → populate `decklists`
3. `/matches?tournament_id=:id` → populate `matches`
4. Land raw data first; compute nothing during the pull itself

## Key calculations

**Rising/falling archetypes** — compare meta share in a recent window (e.g. trailing 14 days) vs. the prior window of the same length, weighted so small-event swings don't outrank large-event swings:

```sql
SELECT archetype_id,
  COUNT(*) FILTER (WHERE date >= now() - interval '14 days') AS recent_count,
  COUNT(*) FILTER (WHERE date < now() - interval '14 days' AND date >= now() - interval '28 days') AS prior_count
FROM decklists JOIN tournaments ON ...
GROUP BY archetype_id
```

**"Why" a deck is rising/falling** — diff the top 10 card frequency list for an archetype between the recent and prior windows. A card jumping from ~20% to ~80% inclusion is a likely driver. This is analysis logic, not something the API returns directly.

**Counter-meta detection** — compute an archetype's win rate specifically against the current top 3–5 archetypes (not its overall win rate). Strong record there + mediocre overall record = counter-meta candidate. Requires joining `matches` to `decklists` to identify what each side was playing.

**Weekend/week rollups** — pull all tournaments in a date range via `/tournaments`, join in `standings` and `matches`, aggregate into bar/line charts: archetype share and win rate over the period, Swiss round win-rate curves, etc.
