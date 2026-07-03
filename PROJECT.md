# SWU Meta Tracker

A personal web app for tracking the competitive **Star Wars: Unlimited** meta —
which decks are rising, falling, and which decks counter the current top of the
field. Built for me and my teammates, each with their own login.

Full product spec: [`docs/SPEC.md`](docs/SPEC.md)

> This repo doubles as my GitHub profile repo, so the root `README.md` stays as
> the profile page — project docs live here.

## Layout

| Path | What it is |
|---|---|
| `supabase/schema.sql` | Full Postgres schema (tables, RLS policies, `latest_meta` view) — run in the Supabase SQL editor |
| `etl/` | Python sync job (`swu-sync`) pulling swuapi.com into Supabase |
| `frontend/` | React + Vite + Tailwind app (neumorphic UI, dark mode, hamburger nav) |
| `.github/workflows/sync.yml` | Daily 06:00 UTC scheduled pull (GitHub Actions cron) |
| `.github/workflows/ci.yml` | ETL tests + frontend build on every push/PR |

## Current status — Phase 1 (MVP)

The pipeline is proven end to end:

- **Pull**: `swu-sync` hits the open (keyless) swuapi endpoints — `/archetypes`,
  `/meta`, `/cards` — and lands them in Supabase. Every pull writes a
  `meta_snapshots` row per archetype, so daily snapshots accumulate into the
  time series Phase 2's trend charts need. Raw payloads are landed untouched
  into `raw` jsonb columns; nothing is computed during the pull.
- **Store**: all pulled tables carry `last_updated_at`, which powers the "data
  last updated" line on every page.
- **Show**: the Dashboard renders the latest snapshot — stat callouts plus the
  archetype / meta share / win rate table. All other nav destinations exist as
  labeled placeholders so the information architecture is real from day one.

The frontend runs in **demo mode on bundled sample data** whenever Supabase env
vars are absent, so you can develop and preview the UI with zero setup.

## Setup

### 1. Supabase

Create a project at supabase.com, then paste `supabase/schema.sql` into the SQL
editor and run it. Grab from Project Settings → API:

- Project URL
- `anon` public key (frontend)
- `service_role` key (sync job only — never expose to the frontend)

### 2. Sync job (local run)

```bash
cd etl
python -m venv .venv && .venv/bin/pip install -e ".[dev]"

# no credentials needed to try it:
.venv/bin/swu-sync --fixtures            # offline, bundled sample data
.venv/bin/swu-sync --dry-run             # live pull, prints instead of writing

# real run:
export SUPABASE_URL=https://<project>.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
.venv/bin/swu-sync                       # archetypes + meta snapshot
.venv/bin/swu-sync --with-cards          # also refresh the card catalogue

.venv/bin/pytest                         # tests (no network needed)
```

### 3. Scheduled pulls (GitHub Actions)

Add repo secrets under Settings → Secrets and variables → Actions:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SWUAPI_KEY` — optional until Phase 2 (gated endpoints)

The cron runs daily at 06:00 UTC and refreshes the card catalogue on Mondays.
Trigger it manually from the Actions tab via *Run workflow*.

### 4. Frontend

```bash
cd frontend
npm install
cp .env.example .env.local   # fill in VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY,
                             # or leave empty for demo mode
npm run dev
```

Deploy to Vercel with root directory `frontend/` and the two `VITE_*` env vars.

### 5. Accounts

Team is invite-only: create teammate accounts in the Supabase dashboard
(Authentication → Users → Invite). Everyone signs in on the Login page;
`saved_decks` and `watchlist` are per-user via row-level security.

## Roadmap

- **Phase 1 — MVP** ✅ open-endpoint pull → Supabase → dashboard table
- **Phase 2 — Trends**: trailing-window risers/fallers, meta-share line charts
  (Recharts). **Blocked on securing the swuapi API key** — confirm it before
  building, per spec.
- **Phase 3 — Core**: counter-meta detector, tournament weekend drill-down,
  card-level play-rate trends.
- **Phase 4 — Polish**: watchlist, My Decks (SWUDB import, cached in-app),
  whatever proves most useful week to week.

## Known unknowns

- **api.swuapi.com response shapes are unverified** (the API wasn't reachable
  from the build environment). The client tolerates both bare-array and
  `{"data": [...]}` envelopes and aliases common field names
  (`etl/swu_sync/transforms.py`), and the first real `--dry-run` will show
  exactly what comes back. Rate limits and scrape freshness also need
  confirming with swuapi.com before treating it as sole source of truth.
- Card **images** aren't pulled yet (Phase 3/4): plan is server-side download
  from swu-db.com into Supabase Storage so the site never links out.
