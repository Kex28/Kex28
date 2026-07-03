# SWU Meta Tracker

Phase 1 (MVP) of the meta tracker described in
[`docs/swu-meta-tracker-spec.md`](../docs/swu-meta-tracker-spec.md): pull
cards / archetypes / current meta from api.swuapi.com's open endpoints into
Supabase, and render one page — a table of archetype, meta share, and win
rate — to prove the pipeline end to end.

## Layout

- `backend/` — Python sync job (`sync.py`) plus the swuapi.com client and
  Supabase loader. `fixtures/` holds sample payloads so everything runs
  without network access or a Supabase project.
- `supabase/schema.sql` — tables, `current_meta` view, `last_updated_at`
  triggers, and read-only RLS policies. Run once in the Supabase SQL editor.
- `frontend/` — Vite + React + Tailwind app. One page: the current-meta
  table, with a dark-mode toggle and neumorphic-lite styling per the spec.
- `../.github/workflows/swu-sync.yml` — daily cron that runs the sync.

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
   `supabase/schema.sql` in its SQL editor.
3. Backend env: set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
   (Project Settings → API), then `python sync.py` loads the live pull.
4. Frontend env: copy `frontend/.env.example` to `frontend/.env.local` and
   fill in `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` (the anon key is
   browser-safe; RLS keeps it read-only).
5. Cron: add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` as GitHub Actions
   secrets (repo Settings → Secrets and variables → Actions) so the daily
   workflow can write. Trigger it once manually from the Actions tab to test.
6. Deploy the frontend to Vercel with root directory `swu-meta-tracker/frontend`
   and the two `VITE_*` env vars.

## Phase 2 prerequisites (from the spec)

- Request the free swuapi.com API key (their site/Discord) — needed for
  tournaments, matches, and decklists.
- Confirm rate limits and scrape freshness with swuapi.com.
