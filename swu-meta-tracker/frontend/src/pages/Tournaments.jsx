import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchTournaments } from '../lib/data.js'
import { longDate } from '../lib/format.js'

// Group events into weekends (Mon–Sun buckets labelled by the Sunday).
function weekendKey(iso) {
  const d = new Date(`${iso}T00:00:00`)
  const sunday = new Date(d)
  sunday.setDate(d.getDate() + ((7 - d.getDay()) % 7))
  return sunday.toISOString().slice(0, 10)
}

export default function Tournaments() {
  const [state, setState] = useState({ status: 'loading' })

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

  const weekends = new Map()
  for (const t of state.rows) {
    const key = weekendKey(t.date)
    if (!weekends.has(key)) weekends.set(key, [])
    weekends.get(key).push(t)
  }

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

      {[...weekends.entries()].map(([key, events]) => (
        <section key={key}>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Weekend of {longDate(key)}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {events.map((t) => (
              <Link key={t.id} to={`/tournaments/${t.id}`} className="neu-card block p-5">
                <div className="font-semibold">{t.name}</div>
                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {longDate(t.date)} · {t.tier} · {t.player_count} players
                </div>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
