import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchCurrentMeta } from '../lib/data.js'
import { pct } from '../lib/format.js'

export default function Archetypes() {
  const [state, setState] = useState({ status: 'loading' })

  useEffect(() => {
    fetchCurrentMeta()
      .then(({ rows, source }) => setState({ status: 'ready', rows, source }))
      .catch((err) => setState({ status: 'error', message: err.message }))
  }, [])

  if (state.status === 'loading') {
    return (
      <div className="neu-card p-8 text-center text-slate-500 dark:text-slate-400">
        Loading archetypes…
      </div>
    )
  }
  if (state.status === 'error') {
    return (
      <div className="neu-card p-8 text-sm text-red-600 dark:text-red-400">{state.message}</div>
    )
  }

  return (
    <div className="space-y-6">
      <p className="-mt-4 text-sm text-slate-500 dark:text-slate-400">
        Every tracked archetype — open one for its card trends
        {state.source === 'sample' && (
          <span className="ml-2 rounded-full bg-amber-200/70 px-2 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-500/20 dark:text-amber-300">
            sample data
          </span>
        )}
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {state.rows.map((row) => (
          <Link
            key={row.archetype_id}
            to={`/archetypes/${row.archetype_id}`}
            className="neu-card block p-5"
          >
            <div className="font-semibold">{row.name}</div>
            {(row.leader || row.base) && (
              <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {[row.leader, row.base].filter(Boolean).join(' · ')}
              </div>
            )}
            <div className="mt-3 flex gap-6 text-sm tabular-nums">
              <span>
                <span className="text-slate-500 dark:text-slate-400">share </span>
                <span className="font-semibold">{pct(row.meta_share)}</span>
              </span>
              <span>
                <span className="text-slate-500 dark:text-slate-400">WR </span>
                <span className="font-semibold">{pct(row.win_rate)}</span>
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
