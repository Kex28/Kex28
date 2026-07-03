# SWU Meta Tracker

A personal site for tracking the competitive **Star Wars: Unlimited** meta — which decks are rising, falling, and which can counter the current top decks. Full spec: [docs/SPEC.md](docs/SPEC.md).

**Status: Phase 1 (MVP).** The goal of this phase is proving the pipeline end to end: pull archetypes / cards / current meta from the open swuapi.com endpoints into Supabase, and show one page — a table of archetype, meta share, and win rate.

## Layout

```
swu-meta-tracker/
├── docs/SPEC.md         Full project spec (features, phases, data model, calculations)
├── db/schema.sql        Supabase schema — full core data model + RLS policies
├── pipeline/            Python sync job (swuapi.com → Supabase)
└── web/                 React frontend (Vite + Tailwind v4 + Framer Motion)
.github/workflows/swu-sync.yml   Daily scheduled pull (lives at repo root)
```

## Setup

### 1. Supabase

1. Create a free project at [supabase.com](https://supabase.com).
2. Open the SQL editor and run `db/schema.sql`.
3. From **Settings → API**, note the project URL, the `anon` key (for the frontend), and the `service_role` key (for the pipeline only — never expose it in the browser).

### 2. Pipeline

```bash
cd swu-meta-tracker/pipeline
pip install -r requirements.txt

# Verify the pull works before writing anything:
python sync.py --dry-run

# Real run:
export SUPABASE_URL=https://your-project.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=...
python sync.py
```

> ⚠️ **swuapi.com endpoints are unverified.** The paths (`/archetypes`, `/cards`, `/meta`) and response field names in `swuapi_client.py` / `sync.py` are best guesses from the spec — they were not reachable from the environment this was built in. Check them against the live swuapi.com docs and adjust the constants at the top of `swuapi_client.py` and the `_norm_*` mappers in `sync.py` before the first real run. Rate limits and uptime are also unconfirmed.

### 3. Scheduled sync (GitHub Actions)

`.github/workflows/swu-sync.yml` runs daily at 09:00 UTC (plus a manual **Run workflow** button for after big events). Add these repository secrets under **Settings → Secrets and variables → Actions**:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SWUAPI_KEY` — optional; only needed from Phase 2 (tournaments/matches/decklists)

Until the secrets exist, the workflow runs but skips the sync harmlessly.

### 4. Frontend

```bash
cd swu-meta-tracker/web
npm install
cp .env.example .env.local   # fill in Supabase URL + anon key
npm run dev
```

Without `.env.local` the app still runs, showing clearly-labelled sample data — useful for working on the UI before Supabase is provisioned. For deployment, import the repo into Vercel with root directory `swu-meta-tracker/web` and set the two `VITE_*` env vars.

## What's built vs. what's next

**Built (Phase 1):**
- Full Supabase schema (all core tables from the spec, RLS policies, per-user tables ready for later phases)
- Python sync: open endpoints → raw landing in `archetypes`, `cards`, `meta_snapshots`, every row stamped `last_updated_at`
- Daily GitHub Actions cron with manual trigger
- Dashboard page: stat callouts + archetype table (meta share, win rate, deck count), "last updated" freshness stamp
- Design system per spec: neumorphic cards/buttons with high-contrast text, dark mode with separately tuned shadows, hamburger nav, mobile-first, count-up + press animations

**Next (Phase 2+, per the spec):**
- Secure the gated swuapi.com API key, then tournaments/matches/decklists pull
- Rising/falling trailing-window comparison + meta-share line charts
- Counter-meta detector, tournament drill-downs, card-level trends
- Supabase Auth login + watchlist + saved SWUDB decks
