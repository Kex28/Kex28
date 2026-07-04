// Data access for the Phase 1 meta table.
//
// With VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY set (production), reads the
// `current_meta` view over Supabase's REST API. Without them (local dev),
// falls back to /sample-data.json, which `python sync.py --fixtures
// --json-out public/sample-data.json` produces — so the whole pipeline can be
// exercised with no Supabase project at all.
//
// Rows returned: { archetype_id, name, leader, base, meta_share, win_rate,
// deck_count, last_updated_at } with meta_share / win_rate as 0..1 fractions.

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

const useSupabase = () => Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)

async function supabaseSelect(query) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${query}`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
  })
  if (!res.ok) throw new Error(`Supabase request failed (${res.status})`)
  return res.json()
}

let samplePromise
function sampleData() {
  samplePromise ??= fetch('/sample-data.json').then((res) => {
    if (!res.ok) {
      throw new Error(
        'No Supabase config and no sample data. Run: cd backend && python sync.py --fixtures --json-out ../frontend/public/sample-data.json',
      )
    }
    return res.json()
  })
  return samplePromise
}

export async function fetchCurrentMeta() {
  if (useSupabase()) {
    const rows = await supabaseSelect('current_meta?select=*&order=meta_share.desc')
    return { rows, source: 'supabase' }
  }
  const data = await sampleData()
  const archetypesById = Object.fromEntries(data.archetypes.map((a) => [a.id, a]))
  const rows = data.meta_entries
    .map((entry) => ({
      ...entry,
      ...(archetypesById[entry.archetype_id] ?? { name: entry.archetype_id }),
      last_updated_at: data.last_updated_at,
    }))
    .sort((a, b) => (b.meta_share ?? 0) - (a.meta_share ?? 0))
  return { rows, source: 'sample' }
}

// Rows: { archetype_id, name, recent_share, prior_share, share_delta,
// recent_win_rate, win_rate_delta, ... } sorted by share_delta desc.
export async function fetchTrends() {
  if (useSupabase()) {
    const rows = await supabaseSelect('archetype_trends?select=*&order=share_delta.desc.nullslast')
    return { rows, source: 'supabase' }
  }
  const data = await sampleData()
  const nameById = Object.fromEntries(data.archetypes.map((a) => [a.id, a.name]))
  const rows = data.trends.map((row) => ({
    name: nameById[row.archetype_id] ?? row.archetype_id,
    ...row,
  }))
  return { rows, source: 'sample' }
}

// Rows: { week: 'YYYY-MM-DD', archetype_id, name, meta_share }
export async function fetchWeeklyShares() {
  if (useSupabase()) {
    const rows = await supabaseSelect('meta_share_weekly?select=*&order=week.asc')
    return { rows, source: 'supabase' }
  }
  const data = await sampleData()
  const nameById = Object.fromEntries(data.archetypes.map((a) => [a.id, a.name]))
  const rows = data.weekly_shares.map((row) => ({
    name: nameById[row.archetype_id] ?? row.archetype_id,
    ...row,
  }))
  return { rows, source: 'sample' }
}
