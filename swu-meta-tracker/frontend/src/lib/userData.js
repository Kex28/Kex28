import { supabase } from './auth.jsx'

// Per-user watchlist and saved decks. Supabase mode goes through the
// supabase-js client (so the user's auth token applies and RLS scopes
// rows to them); demo mode persists to localStorage.

const WATCHLIST_KEY = 'swu-demo-watchlist'
const DECKS_KEY = 'swu-demo-decks'

const readLocal = (key) => JSON.parse(localStorage.getItem(key) ?? '[]')
const writeLocal = (key, value) => localStorage.setItem(key, JSON.stringify(value))

// ---- watchlist: a list of archetype ids ----

export async function fetchWatchlist() {
  if (supabase) {
    const { data, error } = await supabase.from('watchlist').select('archetype_id')
    if (error) throw new Error(error.message)
    return data.map((r) => r.archetype_id)
  }
  return readLocal(WATCHLIST_KEY)
}

export async function toggleWatch(archetypeId, isWatched, userId) {
  if (supabase) {
    const { error } = isWatched
      ? await supabase.from('watchlist').delete().eq('archetype_id', archetypeId)
      : await supabase.from('watchlist').insert({ archetype_id: archetypeId, user_id: userId })
    if (error) throw new Error(error.message)
    return
  }
  const list = readLocal(WATCHLIST_KEY)
  writeLocal(
    WATCHLIST_KEY,
    isWatched ? list.filter((id) => id !== archetypeId) : [...list, archetypeId],
  )
}

// ---- saved decks: { id, deck_name, leader, base, swudb_deck_id,
//      cards_json: [{id?, name, count}], saved_at } ----

export async function fetchDecks() {
  if (supabase) {
    const { data, error } = await supabase
      .from('saved_decks')
      .select('*')
      .order('saved_at', { ascending: false })
    if (error) throw new Error(error.message)
    return data
  }
  return readLocal(DECKS_KEY)
}

export async function saveDeck(deck, userId) {
  if (supabase) {
    const { error } = await supabase.from('saved_decks').insert({ ...deck, user_id: userId })
    if (error) throw new Error(error.message)
    return
  }
  const decks = readLocal(DECKS_KEY)
  writeLocal(DECKS_KEY, [
    { ...deck, id: `demo-${Date.now()}`, saved_at: new Date().toISOString() },
    ...decks,
  ])
}

export async function deleteDeck(id) {
  if (supabase) {
    const { error } = await supabase.from('saved_decks').delete().eq('id', id)
    if (error) throw new Error(error.message)
    return
  }
  writeLocal(DECKS_KEY, readLocal(DECKS_KEY).filter((d) => d.id !== id))
}

// ---- SWUDB import ----
//
// SWUDB's "Export deck to JSON" produces roughly:
//   { metadata: {name, author}, leader: {id, count}, base: {id, count},
//     deck: [{id, name?, count}], sideboard: [...] }
// Field presence varies (name inside deck entries isn't guaranteed), so
// parse defensively and accept a couple of simpler shapes too.
export function parseSwudbDeck(text) {
  let raw
  try {
    raw = JSON.parse(text)
  } catch {
    throw new Error("That doesn't look like JSON — use SWUDB's “Export deck to JSON”.")
  }

  const cardEntry = (c) => ({
    id: c.id ?? c.card_id ?? null,
    name: c.name ?? c.cardName ?? c.id ?? 'Unknown card',
    count: c.count ?? c.quantity ?? 1,
  })
  const refName = (ref) =>
    typeof ref === 'string' ? ref : (ref?.name ?? ref?.id ?? null)

  const main = raw.deck ?? raw.cards ?? raw.mainboard
  if (!Array.isArray(main) || main.length === 0) {
    throw new Error('No card list found — expected a "deck" or "cards" array.')
  }

  return {
    deck_name: raw.metadata?.name ?? raw.name ?? 'Imported deck',
    swudb_deck_id: raw.metadata?.id ?? raw.deckID ?? null,
    leader: refName(raw.leader),
    base: refName(raw.base),
    cards_json: main.map(cardEntry),
  }
}

export const EXAMPLE_DECK_JSON = JSON.stringify(
  {
    metadata: { name: 'Sabine ECL Aggro (example)' },
    leader: { id: 'SOR_010', name: 'Sabine Wren' },
    base: { id: 'SOR_023', name: 'Energy Conversion Lab' },
    deck: [
      { id: 'SOR_218', name: 'Battlefield Marine', count: 3 },
      { id: 'SOR_129', name: 'Wing Leader', count: 3 },
      { id: 'SOR_510', name: 'Daring Raid', count: 3 },
      { id: 'SOR_512', name: 'Surprise Strike', count: 3 },
      { id: 'SHD_419', name: 'Fireball', count: 3 },
      { id: 'SOR_413', name: 'Sabine Wren', count: 3 },
      { id: 'TWI_130', name: 'Clone Dive Trooper', count: 3 },
      { id: 'SOR_128', name: 'Green Squadron A-Wing', count: 3 },
    ],
  },
  null,
  2,
)
