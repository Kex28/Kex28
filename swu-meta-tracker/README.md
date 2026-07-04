# SWU Meta Tracker

A personal site for tracking the competitive Star Wars: Unlimited meta — which
decks are rising, falling, and which decks counter the current top of the field.

**Status: Phase 1 (MVP).** The pipeline pulls the open (keyless) swuapi.com
endpoints — sets, cards, archetypes, current meta — into Supabase, and the web
app shows the current-meta table (archetype, meta share, win rate) with the
full app shell (all routes, hamburger nav, dark mode) in place for later phases.

## Layout

```
swu-meta-tracker/
├── supabase/migrations/   Postgres schema (full data model incl. Phase 2+ tables, RLS)
├── pipeline/              Python sync job: swuapi.com -> Supabase
└── web/                   React frontend (Vite + Tailwind + Framer Motion)
.github/workflows/sync.yml Daily scheduled pull (+ manual trigger)
```

## Getting started

### 1. Supabase

Create a project at supabase.com, then run
`supabase/migrations/0001_init.sql` in the SQL editor (or via `supabase db push`).

### 2. Pipeline

```bash
cd pipeline
python -m venv .venv && source .venv/bin/activate
pip install -e '.[dev]'

# Offline end-to-end run (bundled fixtures, JSON output to ./out):
SWU_FIXTURES=1 python -m swu_pipeline.sync

# Live run:
export SUPABASE_URL=https://<project>.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=<service role key>   # server-side only, never in the web app
python -m swu_pipeline.sync

pytest   # tests run fully offline
```

Environment variables: `SWUAPI_BASE_URL` (default `https://api.swuapi.com`),
`SWUAPI_KEY` (Phase 2+ gated endpoints), `SWU_FIXTURES=1` (offline fixtures),
`SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`, `SWU_OUT_DIR` (offline output dir).

### 3. Web app

```bash
cd web
npm install
cp .env.example .env    # fill in your Supabase URL + anon key
npm run dev
```

Without a `.env` the app runs in demo mode on bundled sample data (with a
visible notice), so the UI can be developed and reviewed with no backend.

### 4. Scheduled sync

`.github/workflows/sync.yml` runs daily at 06:00 UTC and on manual dispatch.
Add repo secrets: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and (Phase 2+)
`SWUAPI_KEY`.

## Data freshness

Every pulled row carries `last_updated_at`, and each pipeline run is recorded
in `sync_runs`; the UI stamps pages with the latest successful run. Sync is
refresh-based — new data appears on the next page load, never mid-session.

## Unverified assumptions (check before Phase 2)

- **swuapi.com endpoint shapes are unconfirmed** — this environment couldn't
  reach the live API, so paths and payloads follow the project spec and live in
  exactly two places: `pipeline/swu_pipeline/swuapi.py` (paths) and the
  `map_*` functions in `sync.py` (payload shapes). Fixtures under
  `pipeline/swu_pipeline/fixtures/` document the assumed shapes.
- Rate limits, uptime, and scrape freshness need confirming with swuapi.com.
- The gated API key (tournaments/matches/decklists) must be secured before
  Phase 2.

## Build phases

1. **MVP (this)** — open endpoints → Supabase → current-meta table.
2. **Trends** — trailing-window risers/fallers, meta-share line charts
   (add Recharts), gated endpoints.
3. **Core** — counter-meta detector, tournament drill-down, card-level trends.
4. **Polish** — watchlist, accounts/saved decks (Supabase Auth; schema and RLS
   already in place).

## Design notes

Neumorphic surfaces with high-contrast ink for data (per spec: soft shadows for
chrome, readable text where it matters). Dark mode has its own tuned
shadow/highlight tokens, not inverted light values — see `web/src/index.css`.
The accent blue was validated ≥ 3:1 against both surfaces; meta-share bars
always print their value so color never carries meaning alone.
