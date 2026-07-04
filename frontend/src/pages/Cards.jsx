import { useEffect, useMemo, useState } from 'react'
import DeltaBadge from '../components/DeltaBadge.jsx'
import { fetchCardTrendsOverall } from '../lib/data.js'
import { pct } from '../lib/format.js'

const MOVER_THRESHOLD = 0.04

export default function Cards() {
  const [state, setState] = useState({ status: 'loading' })
  const [query, setQuery] = useState('')

  useEffect(() => {
    fetchCardTrendsOverall()
      .then(({ rows, source }) => setState({ status: 'ready', rows, source }))
      .catch((err) => setState({ status: 'error', message: err.message }))
  }, [])

  const filtered = useMemo(() => {
    if (state.status !== 'ready') return []
    const q = query.trim().toLowerCase()
    const rows = q
      ? state.rows.filter((r) => r.card_name.toLowerCase().includes(q))
      : state.rows
    return [...rows].sort((a, b) => (b.recent_rate ?? 0) - (a.recent_rate ?? 0))
  }, [state, query])

  if (state.status === 'loading') {
    return (
      <div className="neu-card p-8 text-center text-slate-500 dark:text-slate-400">
        Loading cards…
      </div>
    )
  }
  if (state.status === 'error') {
    return (
      <div className="neu-card p-8 text-sm text-red-600 dark:text-red-400">{state.message}</div>
    )
  }

  const movers = state.rows.filter((r) => Math.abs(r.rate_delta) >= MOVER_THRESHOLD)
  const rising = movers.filter((r) => r.rate_delta > 0).slice(0, 3)
  const falling = movers.filter((r) => r.rate_delta < 0).slice(0, 3)

  return (
    <div className="space-y-6">
      <p className="-mt-4 text-sm text-slate-500 dark:text-slate-400">
        Play rates across every deck in the meta, trailing 14 days vs. the 14 before
        {state.source === 'sample' && (
          <span className="ml-2 rounded-full bg-amber-200/70 px-2 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-500/20 dark:text-amber-300">
            sample data
          </span>
        )}
      </p>

      <div className="grid gap-6 sm:grid-cols-2">
        {[
          ['Seeing more play', rising],
          ['Seeing less play', falling],
        ].map(([title, rows]) => (
          <div key={title} className="neu-card p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {title}
            </h2>
            {rows.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">No big moves.</p>
            ) : (
              <ul className="space-y-3">
                {rows.map((card) => (
                  <li key={card.card_id} className="flex items-baseline justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate font-semibold">{card.card_name}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        in {pct(card.prior_rate, 0)} → {pct(card.recent_rate, 0)} of all decks
                      </div>
                    </div>
                    <div className="shrink-0 text-sm tabular-nums">
                      <DeltaBadge value={card.rate_delta} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search cards…"
        aria-label="Search cards"
        className="w-full rounded-xl border border-slate-300/60 bg-white/60 px-4 py-2.5 text-sm outline-none focus:border-blue-500 dark:border-slate-600/60 dark:bg-slate-800/60"
      />

      <div className="neu-card overflow-x-auto p-2 sm:p-4">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <th className="px-3 py-3 font-semibold">Card</th>
              <th className="px-3 py-3 text-right font-semibold">2 wks ago</th>
              <th className="px-3 py-3 text-right font-semibold">Now</th>
              <th className="px-3 py-3 text-right font-semibold">Δ</th>
              <th className="px-3 py-3 text-right font-semibold">Decks</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((card) => (
              <tr
                key={card.card_id}
                className="border-t border-slate-300/50 dark:border-slate-600/40"
              >
                <td className="px-3 py-2.5 font-medium">{card.card_name}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{pct(card.prior_rate, 0)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{pct(card.recent_rate, 0)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">
                  <DeltaBadge value={card.rate_delta} />
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums">{card.recent_decks}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-slate-500 dark:text-slate-400">
                  No cards match "{query}".
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
