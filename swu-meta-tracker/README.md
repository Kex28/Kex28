# SWU Meta Tracker

Track the competitive Star Wars: Unlimited meta — which decks are rising, falling, and which can counter the current top decks. Full requirements live in [SPEC.md](./SPEC.md).

**Status: Phase 1 (MVP) built.** The pipeline pulls cards, archetypes, and the current meta from api.swuapi.com's open endpoints into Supabase; the site shows a dashboard table of archetype / meta share / win rate, a searchable archetype and card browser, an About page with data freshness, and multi-user login. Trends, counter-meta, and tournament drill-downs are stubbed pages that ship in Phases 2–4 (they need the gated swuapi.com API key).

## Layout

```
swu-meta-tracker/
├── SPEC.md                  Project spec (requirements, phases, calculations)
├── supabase/migrations/     Database schema — run in the Supabase SQL editor
├── pipeline/                Python sync job (swuapi.com -> Supabase)
└── web/                     React frontend (Vite + Tailwind + Framer Motion)
.github/workflows/sync.yml   Daily scheduled pull (GitHub Actions cron)
```

## Setup

### 1. Supabase (database + auth)

1. Create a free project at [supabase.com](https://supabase.com).
2. Open the SQL editor and run `supabase/migrations/0001_init.sql`. This creates every table (all phases), row-level security, and the `current_meta` view the dashboard reads.
3. From **Settings → API**, note three values: the project URL, the `anon` public key (safe for the browser), and the `service_role` key (server-only — never commit it or put it in the frontend).
4. Auth: email/password sign-in is on by default. Under **Authentication → Providers** you can disable public signups later and invite teammates manually if you want the site private.

### 2. Frontend (local dev)

```bash
cd swu-meta-tracker/web
cp .env.example .env.local     # fill in VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
npm install
npm run dev
```

Until the first sync runs, the dashboard shows an empty state — that's expected.

### 3. Pipeline (first pull)

```bash
cd swu-meta-tracker/pipeline
pip install -r requirements.txt
export SUPABASE_URL=https://YOUR-PROJECT.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=...   # server-side only
python -m swu_sync
```

Run the tests with `python -m unittest discover -s tests`.

> **Unverified assumption — check before relying on it:** api.swuapi.com could not be
> reached from the build environment, so its exact endpoint paths, response envelope, and
> field names are best guesses. The client parses responses tolerantly and the paths are
> overridable without code changes (`SWUAPI_BASE_URL`, `SWUAPI_CARDS_PATH`,
> `SWUAPI_ARCHETYPES_PATH`, `SWUAPI_META_PATH`) — on the first real run, check the logs
> and adjust these env vars if a path 404s. Also confirm rate limits and the Phase 2 API
> key process with swuapi.com (per SPEC.md) before building on it further.

### 4. Scheduled sync (GitHub Actions)

`.github/workflows/sync.yml` runs the pull daily at 06:00 UTC (and on demand via **Actions → Run workflow**). In the repo's **Settings → Secrets and variables → Actions**, add:

- Secrets: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and later `SWUAPI_API_KEY` (Phase 2).
- Variables (optional): `SWUAPI_BASE_URL` if the API base ever differs from the default.

### 5. Hosting (Vercel)

Import the repo in Vercel with root directory `swu-meta-tracker/web`, framework Vite. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as environment variables. Because the app uses client-side routing, add a rewrite of `/(.*)` → `/index.html` if deep links 404.

## Design notes

- **Neumorphism, tempered:** soft dual shadows on cards/buttons via CSS variables (`web/src/index.css`), with high-contrast ink tokens for text and tables so data stays scannable. Dark mode has its own tuned shadow set, not an inverted light mode.
- **Navigation:** hamburger drawer on every screen size; touch targets are ≥44px.
- **Motion:** tap-press on buttons, count-up on stat tiles (disabled under `prefers-reduced-motion`), 200ms drawer slide.
- **Freshness:** every page that shows pulled data renders a "Data last updated" stamp from the rows' `last_updated_at`; the About page shows the last sync run. Data is refresh-based — no live updates mid-session.

## What each phase still needs

- **Phase 2 (Trends):** the gated swuapi.com API key; pull tournaments/decklists/matches (schema is ready); riser/faller windows + Recharts line charts. `meta_snapshots` is already accumulating history with every Phase 1 sync, so trend lines have data from day one.
- **Phase 3 (Core):** counter-meta detector, tournament weekend drill-down, card play-rate trends (all SQL over tables that already exist).
- **Phase 4 (Polish):** watchlist UI and SWUDB deck import into `saved_decks` (tables + row-level security already in place).
