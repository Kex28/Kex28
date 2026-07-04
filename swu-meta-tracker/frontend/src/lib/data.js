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

const nameMap = (list) => Object.fromEntries(list.map((x) => [x.id, x.name]))

// { tops: [{id, name}], rows: [{ archetype_id, name, overall_win_rate,
//   overall_n, vs_top_win_rate, vs_top_n, recent_share,
//   matchups: {topId: {win_rate, n}} }] } sorted by vs_top_win_rate desc.
export async function fetchCounterMeta() {
  if (useSupabase()) {
    const [tops, rows, matchups, trendRows] = await Promise.all([
      supabaseSelect('top_archetypes?select=*'),
      supabaseSelect('counter_meta?select=*&order=vs_top_win_rate.desc.nullslast'),
      supabaseSelect('counter_meta_matchups?select=*'),
      supabaseSelect('archetype_trends?select=archetype_id,recent_share'),
    ])
    const shareById = Object.fromEntries(trendRows.map((r) => [r.archetype_id, r.recent_share]))
    const matchupsById = {}
    for (const m of matchups) {
      matchupsById[m.archetype_id] ??= {}
      matchupsById[m.archetype_id][m.opponent_archetype_id] = { win_rate: m.win_rate, n: m.n }
    }
    return {
      tops: tops.map((t) => ({ id: t.archetype_id, name: t.name })),
      rows: rows.map((r) => ({
        ...r,
        recent_share: shareById[r.archetype_id],
        matchups: matchupsById[r.archetype_id] ?? {},
      })),
      source: 'supabase',
    }
  }
  const data = await sampleData()
  const names = nameMap(data.archetypes)
  const shareById = Object.fromEntries(data.trends.map((r) => [r.archetype_id, r.recent_share]))
  return {
    tops: data.top_archetypes.map((id) => ({ id, name: names[id] ?? id })),
    rows: data.counter_meta.map((r) => ({
      ...r,
      name: names[r.archetype_id] ?? r.archetype_id,
      recent_share: shareById[r.archetype_id],
    })),
    source: 'sample',
  }
}

// Rows: { id, name, date, tier, player_count, deck_count } newest first.
export async function fetchTournaments() {
  if (useSupabase()) {
    const rows = await supabaseSelect('tournaments?select=*,decklists(count)&order=date.desc')
    return {
      rows: rows.map(({ decklists, ...t }) => ({ ...t, deck_count: decklists?.[0]?.count ?? 0 })),
      source: 'supabase',
    }
  }
  const data = await sampleData()
  return {
    rows: data.tournaments.map(({ archetypes, standings, ...t }) => t),
    source: 'sample',
  }
}

// { tournament, archetypes: [{archetype_id, name, decks, share, win_rate}],
//   standings: [{placement, player, archetype_id, name}] }
export async function fetchTournamentDetail(id) {
  if (useSupabase()) {
    const [[tournament], archetypes, standings] = await Promise.all([
      supabaseSelect(`tournaments?id=eq.${id}&select=*`),
      supabaseSelect(`tournament_archetypes?tournament_id=eq.${id}&select=*&order=decks.desc`),
      supabaseSelect(
        `decklists?tournament_id=eq.${id}&select=placement,player,archetype_id,archetypes(name)&order=placement.asc&limit=8`,
      ),
    ])
    if (!tournament) throw new Error('Tournament not found')
    return {
      tournament,
      archetypes,
      standings: standings.map((s) => ({ ...s, name: s.archetypes?.name ?? s.archetype_id })),
      source: 'supabase',
    }
  }
  const data = await sampleData()
  const summary = data.tournaments.find((t) => t.id === id)
  if (!summary) throw new Error('Tournament not found')
  const names = nameMap(data.archetypes)
  const { archetypes, standings, ...tournament } = summary
  return {
    tournament,
    archetypes: archetypes.map((r) => ({ ...r, name: names[r.archetype_id] ?? r.archetype_id })),
    standings: standings.map((s) => ({ ...s, name: names[s.archetype_id] ?? s.archetype_id })),
    source: 'sample',
  }
}

// Rows for one archetype: { card_id, card_name, recent_rate, prior_rate,
// rate_delta } sorted by |rate_delta| desc.
export async function fetchCardTrends(archetypeId) {
  if (useSupabase()) {
    const rows = await supabaseSelect(`card_trends?archetype_id=eq.${archetypeId}&select=*`)
    rows.sort((a, b) => Math.abs(b.rate_delta) - Math.abs(a.rate_delta))
    return { rows, source: 'supabase' }
  }
  const data = await sampleData()
  const cardNames = nameMap(data.cards)
  return {
    rows: data.card_trends
      .filter((r) => r.archetype_id === archetypeId)
      .map((r) => ({ ...r, card_name: cardNames[r.card_id] ?? r.card_id })),
    source: 'sample',
  }
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
