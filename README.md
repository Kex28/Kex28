# SWU Meta Tracker

Phases 1–3 of the meta tracker described in
[`docs/swu-meta-tracker-spec.md`](docs/swu-meta-tracker-spec.md):

- **Phase 1 (MVP):** pull cards / archetypes / current meta from
  api.swuapi.com's open endpoints into Supabase; Dashboard page with the
  archetype / meta share / win rate table.
- **Phase 2 (Trends):** pull tournaments / decklists / matches (needs the
  free swuapi.com API key), compare the trailing 14 days against the prior
  14 to flag risers/fallers, and chart weekly meta share over time on the
  Meta Trends page.
- **Phase 3 (Core features):** counter-meta detector (win rate vs. the
  current top 3 decks vs. overall record), tournament browser with
  per-event drill-down (field breakdown, standings, event win rates), and
  card-level play-rate trends inside each archetype.

## Layout

- `backend/` — Python sync job (`sync.py`) plus the swuapi.com client,
  Supabase loader, and the trend math used by the no-database dev path
  (`swu_sync/trends.py` — production reads the SQL views instead).
  `fixtures/` holds sample payloads so everything runs without network
  access or a Supabase project; `fixtures/generate_fixtures.py`
  deterministically regenerates the tournament/decklist/match ones.
- `supabase/schema.sql` — Phase 1 tables, `current_meta` view,
  `last_updated_at` triggers, read-only RLS. Run once in the SQL editor.
- `supabase/phase2.sql` — tournaments/decklists/matches tables plus the
  `meta_share_weekly` and `archetype_trends` views. Run after `schema.sql`.
- `supabase/phase3.sql` — `decklist_cards` table plus the `counter_meta`,
  `counter_meta_matchups`, `card_trends`, and `tournament_archetypes`
  views. Run after `phase2.sql`.
- `frontend/` — Vite + React + Tailwind + Recharts app. Hamburger nav,
  dark-mode toggle, neumorphic-lite styling. Pages: Dashboard, Meta
  Trends, Counter Meta, Tournaments (with per-event drill-down), and
  Archetypes (with per-archetype card trends).
- `.github/workflows/swu-sync.yml` — daily cron that runs the sync.

## Run it locally (no Supabase needed)

```bash
cd backend
pip install -r requirements.txt
python sync.py --fixtures --json-out ../frontend/public/sample-data.json

cd ../frontend
npm install
npm run dev   # open the printed URL; the page shows a "sample data" badge
```

## Wire up the real pipeline

1. **Verify the API first.** The response shapes of api.swuapi.com are
   unverified — it was unreachable from the sandbox this was built in. Hit
   the open endpoints yourself and reconcile paths/field names in
   `backend/swu_sync/swuapi_client.py` (everything upstream-specific lives
   there, including the `normalize_*` mappers). Update `fixtures/*.json` to
   match real payloads while you're at it.
2. Create a free [Supabase](https://supabase.com) project and run
   `supabase/schema.sql`, `supabase/phase2.sql`, then `supabase/phase3.sql`,
   in its SQL editor.
3. Backend env: set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
   (Project Settings → API), plus `SWUAPI_API_KEY` for the Phase 2
   endpoints (without it the sync still runs, but skips
   tournaments/decklists/matches). Then `python sync.py` loads the live pull.
4. Frontend env: copy `frontend/.env.example` to `frontend/.env.local` and
   fill in `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` (the anon key is
   browser-safe; RLS keeps it read-only).
5. Cron: add `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and
   `SWUAPI_API_KEY` as GitHub Actions secrets (repo Settings → Secrets and
   variables → Actions) so the daily workflow can write. Trigger it once
   manually from the Actions tab to test.
6. Deploy the frontend to Vercel with root directory `frontend`
   and the two `VITE_*` env vars.

Reminders from the spec: the swuapi.com API key is free but requested via
their site/Discord, and their rate limits / scrape freshness are still
unconfirmed.
