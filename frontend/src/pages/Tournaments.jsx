import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchTournaments } from '../lib/data.js'
import { longDate, tierLabel } from '../lib/format.js'

// Group events into weekends (Mon–Sun buckets labelled by the Sunday).
function weekendKey(iso) {
  const d = new Date(`${iso}T00:00:00`)
  const sunday = new Date(d)
  sunday.setDate(d.getDate() + ((7 - d.getDay()) % 7))
  return sunday.toISOString().slice(0, 10)
}

const RANGES = [
  { key: 'all', label: 'All time', days: null },
  { key: '14d', label: 'Last 2 weeks', days: 14 },
  { key: '28d', label: 'Last 4 weeks', days: 28 },
]

export default function Tournaments() {
  const [state, setState] = useState({ status: 'loading' })
  const [tier, setTier] = useState('all')
  const [range, setRange] = useState('all')

  useEffect(() => {
    fetchTournaments()
      .then(({ rows, source }) => setState({ status: 'ready', rows, source }))
      .catch((err) => setState({ status: 'error', message: err.message }))
  }, [])

  if (state.status === 'loading') {
    return (
      <div className="neu-card p-8 text-center text-slate-500 dark:text-slate-400">
        Loading tournaments…
      </div>
    )
  }
  if (state.status === 'error') {
    return (
      <div className="neu-card p-8 text-sm text-red-600 dark:text-red-400">{state.message}</div>
    )
  }

  const tiers = [...new Set(state.rows.map((t) => t.tier).filter(Boolean))].sort()
  // Ranges anchor on the newest event, so "Last 2 weeks" means the last
  // two weeks of recorded play, not of wall-clock time.
  const newest = state.rows.reduce((max, t) => (t.date > max ? t.date : max), '')
  const rangeDays = RANGES.find((r) => r.key === range)?.days
  const cutoff = rangeDays
    ? new Date(new Date(`${newest}T00:00:00`).getTime() - rangeDays * 86400_000)
    : null

  const visible = state.rows.filter(
    (t) =>
      (tier === 'all' || t.tier === tier) &&
      (!cutoff || new Date(`${t.date}T00:00:00`) > cutoff),
  )

  const weekends = new Map()
  for (const t of visible) {
    const key = weekendKey(t.date)
    if (!weekends.has(key)) weekends.set(key, [])
    weekends.get(key).push(t)
  }

  const selectClass =
    'rounded-xl border border-slate-300/60 bg-white/60 px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-slate-600/60 dark:bg-slate-800/60'

  return (
    <div className="space-y-8">
      <p className="-mt-4 text-sm text-slate-500 dark:text-slate-400">
        Browse events by weekend, newest first
        {state.source === 'sample' && (
          <span className="ml-2 rounded-full bg-amber-200/70 px-2 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-500/20 dark:text-amber-300">
            sample data
          </span>
        )}
      </p>

      <div className="flex flex-wrap gap-3">
        <select
          value={range}
          onChange={(e) => setRange(e.target.value)}
          aria-label="Date range"
          className={selectClass}
        >
          {RANGES.map((r) => (
            <option key={r.key} value={r.key}>
              {r.label}
            </option>
          ))}
        </select>
        <select
          value={tier}
          onChange={(e) => setTier(e.target.value)}
          aria-label="Tournament tier"
          className={selectClass}
        >
          <option value="all">All tiers</option>
          {tiers.map((t) => (
            <option key={t} value={t}>
              {tierLabel(t)}
            </option>
          ))}
        </select>
      </div>

      {visible.length === 0 && (
        <div className="neu-card p-8 text-center text-sm text-slate-500 dark:text-slate-400">
          No events match these filters.
        </div>
      )}

      {[...weekends.entries()].map(([key, events]) => (
        <section key={key}>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Weekend of {longDate(key)}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {events.map((t) => (
              <Link key={t.id} to={`/tournaments/${t.id}`} className="neu-card neu-tap block p-5">
                <div className="font-semibold">{t.name}</div>
                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {longDate(t.date)} · {tierLabel(t.tier)} · {t.player_count} players
                </div>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
