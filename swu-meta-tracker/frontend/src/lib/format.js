export const pct = (v, digits = 1) => (v == null ? '—' : `${(v * 100).toFixed(digits)}%`)

export const deltaPp = (v) =>
  v == null ? '—' : `${v >= 0 ? '+' : '−'}${Math.abs(v * 100).toFixed(1)}pp`

// Official tier codes per swuapi.com/docs.
const TIER_NAMES = {
  PQ: 'Planetary Qualifier',
  SQ: 'Sector Qualifier',
  RQ: 'Regional Qualifier',
  GC: 'Galactic Championship',
  LCQ: 'Last Chance Qualifier',
  SS: 'Store Showdown',
  COM: 'Community',
  CAS: 'Casual Side Event',
}

export const tierLabel = (code) => TIER_NAMES[code] ?? code

export const longDate = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
