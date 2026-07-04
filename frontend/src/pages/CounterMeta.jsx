import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchCounterMeta } from '../lib/data.js'
import { pct } from '../lib/format.js'

// A counter pick reads well into the top decks while being unremarkable
// (or worse) overall — that gap is the whole point of the page.
const isCounterPick = (row) =>
  row.vs_top_win_rate != null &&
  row.vs_top_win_rate >= 0.52 &&
  row.vs_top_win_rate - (row.overall_win_rate ?? 0) >= 0.03

export default function CounterMeta() {
  const [state, setState] = useState({ status: 'loading' })

  useEffect(() => {
    fetchCounterMeta()
      .then(({ tops, rows, source }) => setState({ status: 'ready', tops, rows, source }))
      .catch((err) => setState({ status: 'error', message: err.message }))
  }, [])

  if (state.status === 'loading') {
    return (
      <div className="neu-card p-8 text-center text-slate-500 dark:text-slate-400">
        Loading matchups…
      </div>
    )
  }
  if (state.status === 'error') {
    return (
      <div className="neu-card p-8 text-sm text-red-600 dark:text-red-400">{state.message}</div>
    )
  }

  const picks = state.rows.filter(isCounterPick)

  return (
    <div className="space-y-6">
      <p className="-mt-4 text-sm text-slate-500 dark:text-slate-400">
        Win rates against the current top decks ({state.tops.map((t) => t.name).join(', ')}),
        trailing 28 days
        {state.source === 'sample' && (
          <span className="ml-2 rounded-full bg-amber-200/70 px-2 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-500/20 dark:text-amber-300">
            sample data
          </span>
        )}
      </p>

      <div className="neu-card p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Counter picks
        </h2>
        {picks.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No archetype currently beats the top decks meaningfully harder than it beats the
            field.
          </p>
        ) : (
          <ul className="space-y-3">
            {picks.map((row) => (
              <li key={row.archetype_id} className="flex items-baseline justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    to={`/archetypes/${row.archetype_id}`}
                    className="font-semibold hover:underline"
                  >
                    {row.name}
                  </Link>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {pct(row.vs_top_win_rate)} vs top decks · {pct(row.overall_win_rate)} overall
                    · {pct(row.recent_share)} of the field
                  </div>
                </div>
                <span className="shrink-0 rounded-full bg-green-200/70 px-2 py-0.5 text-xs font-medium text-green-900 dark:bg-green-500/20 dark:text-green-300">
                  +{((row.vs_top_win_rate - row.overall_win_rate) * 100).toFixed(1)}pp vs top
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="neu-card overflow-x-auto p-2 sm:p-4">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <th className="px-3 py-3 font-semibold">Archetype</th>
              {state.tops.map((t) => (
                <th key={t.id} className="px-3 py-3 text-right font-semibold">
                  vs {t.name.split(' ')[0]}
                </th>
              ))}
              <th className="px-3 py-3 text-right font-semibold">vs top 3</th>
              <th className="px-3 py-3 text-right font-semibold">Overall</th>
            </tr>
          </thead>
          <tbody>
            {state.rows.map((row) => (
              <tr
                key={row.archetype_id}
                className="border-t border-slate-300/50 dark:border-slate-600/40"
              >
                <td className="px-3 py-3">
                  <Link
                    to={`/archetypes/${row.archetype_id}`}
                    className="font-semibold hover:underline"
                  >
                    {row.name}
                  </Link>
                  {isCounterPick(row) && (
                    <span className="ml-2 rounded-full bg-green-200/70 px-2 py-0.5 text-xs font-medium text-green-900 dark:bg-green-500/20 dark:text-green-300">
                      counter pick
                    </span>
                  )}
                </td>
                {state.tops.map((t) => {
                  const matchup = row.matchups?.[t.id]
                  return (
                    <td key={t.id} className="px-3 py-3 text-right tabular-nums">
                      {matchup ? pct(matchup.win_rate) : '—'}
                      {matchup && (
                        <span className="ml-1 text-xs text-slate-400 dark:text-slate-500">
                          ({matchup.n})
                        </span>
                      )}
                    </td>
                  )
                })}
                <td className="px-3 py-3 text-right font-semibold tabular-nums">
                  {pct(row.vs_top_win_rate)}
                </td>
                <td className="px-3 py-3 text-right tabular-nums">{pct(row.overall_win_rate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-400 dark:text-slate-500">
        Mirror matches are excluded from vs-top numbers; matchups with fewer than 10 recorded
        matches don't get a vs-top rating. Sample counts are shown in parentheses.
      </p>
    </div>
  )
}
