import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchCurrentMeta } from '../lib/data.js'
import { pct } from '../lib/format.js'

export default function Archetypes() {
  const [state, setState] = useState({ status: 'loading' })
  const [query, setQuery] = useState('')
  const [aspect, setAspect] = useState('all')

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

  const aspects = [...new Set(state.rows.flatMap((r) => r.aspects ?? []))].sort()
  const q = query.trim().toLowerCase()
  const visible = state.rows.filter(
    (row) =>
      (aspect === 'all' || (row.aspects ?? []).includes(aspect)) &&
      (!q ||
        [row.name, row.leader, row.base].some((f) => f?.toLowerCase().includes(q))),
  )

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

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by name, leader, or base…"
        aria-label="Search archetypes"
        className="w-full rounded-xl border border-slate-300/60 bg-white/60 px-4 py-2.5 text-sm outline-none focus:border-blue-500 dark:border-slate-600/60 dark:bg-slate-800/60"
      />

      <div className="flex flex-wrap gap-2">
        {['all', ...aspects].map((a) => (
          <button
            key={a}
            onClick={() => setAspect(a)}
            aria-pressed={aspect === a}
            className={`neu-button px-4 py-2 text-xs font-semibold ${
              aspect === a ? 'text-blue-700 dark:text-blue-400' : ''
            }`}
          >
            {a === 'all' ? 'All aspects' : a}
          </button>
        ))}
      </div>

      {visible.length === 0 && (
        <div className="neu-card p-8 text-center text-sm text-slate-500 dark:text-slate-400">
          No archetypes match these filters.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {visible.map((row) => (
          <Link
            key={row.archetype_id}
            to={`/archetypes/${row.archetype_id}`}
            className="neu-card neu-tap block p-5"
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
