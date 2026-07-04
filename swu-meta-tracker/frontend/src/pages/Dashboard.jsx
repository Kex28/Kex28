import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchCurrentMeta } from '../lib/data.js'
import { pct } from '../lib/format.js'

export default function Dashboard() {
  const [state, setState] = useState({ status: 'loading' })

  useEffect(() => {
    fetchCurrentMeta()
      .then(({ rows, source }) => setState({ status: 'ready', rows, source }))
      .catch((err) => setState({ status: 'error', message: err.message }))
  }, [])

  const lastUpdated = state.rows?.[0]?.last_updated_at

  return (
    <>
      <p className="-mt-4 mb-6 text-sm text-slate-500 dark:text-slate-400">
        Current meta snapshot
        {lastUpdated && <> · updated {new Date(lastUpdated).toLocaleString()}</>}
        {state.source === 'sample' && (
          <span className="ml-2 rounded-full bg-amber-200/70 px-2 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-500/20 dark:text-amber-300">
            sample data
          </span>
        )}
      </p>

      {state.status === 'loading' && (
        <div className="neu-card p-8 text-center text-slate-500 dark:text-slate-400">
          Loading meta…
        </div>
      )}

      {state.status === 'error' && (
        <div className="neu-card p-8 text-sm text-red-600 dark:text-red-400">
          {state.message}
        </div>
      )}

      {state.status === 'ready' && (
        <div className="neu-card overflow-x-auto p-2 sm:p-4">
          <table className="w-full border-collapse text-sm sm:text-base">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <th className="px-3 py-3 font-semibold">Archetype</th>
                <th className="px-3 py-3 text-right font-semibold">Meta share</th>
                <th className="px-3 py-3 text-right font-semibold">Win rate</th>
                <th className="px-3 py-3 text-right font-semibold">Decks</th>
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
                    {(row.leader || row.base) && (
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {[row.leader, row.base].filter(Boolean).join(' · ')}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">{pct(row.meta_share)}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{pct(row.win_rate)}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{row.deck_count ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
