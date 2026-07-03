import { useEffect, useState } from 'react'
import { fetchCurrentMeta } from './lib/data.js'

const pct = (v) =>
  v == null ? '—' : `${(v * 100).toFixed(1)}%`

function ThemeToggle() {
  const [dark, setDark] = useState(() =>
    document.documentElement.classList.contains('dark'),
  )
  const toggle = () => {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.theme = next ? 'dark' : 'light'
  }
  return (
    <button
      onClick={toggle}
      aria-label="Toggle dark mode"
      className="neu-button h-11 w-11 text-lg"
    >
      {dark ? '☀️' : '🌙'}
    </button>
  )
}

export default function App() {
  const [state, setState] = useState({ status: 'loading' })

  useEffect(() => {
    fetchCurrentMeta()
      .then(({ rows, source }) => setState({ status: 'ready', rows, source }))
      .catch((err) => setState({ status: 'error', message: err.message }))
  }, [])

  const lastUpdated = state.rows?.[0]?.last_updated_at

  return (
    <div className="min-h-screen bg-surface text-slate-800 dark:bg-surface-dark dark:text-slate-100">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
        <header className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              SWU Meta Tracker
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Current meta snapshot
              {lastUpdated && (
                <> · updated {new Date(lastUpdated).toLocaleString()}</>
              )}
              {state.source === 'sample' && (
                <span className="ml-2 rounded-full bg-amber-200/70 px-2 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-500/20 dark:text-amber-300">
                  sample data
                </span>
              )}
            </p>
          </div>
          <ThemeToggle />
        </header>

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
                      <div className="font-semibold">{row.name}</div>
                      {(row.leader || row.base) && (
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {[row.leader, row.base].filter(Boolean).join(' · ')}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {pct(row.meta_share)}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {pct(row.win_rate)}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {row.deck_count ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <footer className="mt-8 text-center text-xs text-slate-400 dark:text-slate-500">
          Phase 1 · data via swuapi.com · refresh-based (no live sync)
        </footer>
      </div>
    </div>
  )
}
