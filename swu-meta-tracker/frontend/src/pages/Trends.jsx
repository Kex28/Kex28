import { useEffect, useState } from 'react'
import MetaShareChart from '../components/MetaShareChart.jsx'
import { fetchTrends, fetchWeeklyShares } from '../lib/data.js'

const pct = (v) => (v == null ? '—' : `${(v * 100).toFixed(1)}%`)
const deltaPp = (v) =>
  v == null ? '—' : `${v >= 0 ? '+' : '−'}${Math.abs(v * 100).toFixed(1)}pp`

function DeltaBadge({ value }) {
  if (value == null) return <span>—</span>
  const rising = value >= 0
  return (
    <span
      className={
        rising
          ? 'font-semibold text-green-800 dark:text-green-400'
          : 'font-semibold text-red-700 dark:text-red-400'
      }
    >
      {rising ? '▲' : '▼'} {deltaPp(value)}
    </span>
  )
}

function MoverCard({ title, rows }) {
  return (
    <div className="neu-card p-5">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {title}
      </h2>
      {rows.length === 0 && (
        <p className="text-sm text-slate-500 dark:text-slate-400">Nothing significant.</p>
      )}
      <ul className="space-y-3">
        {rows.map((row) => (
          <li key={row.archetype_id} className="flex items-baseline justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate font-semibold">{row.name}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {pct(row.prior_share)} → {pct(row.recent_share)} share · WR{' '}
                {pct(row.recent_win_rate)}
              </div>
            </div>
            <div className="shrink-0 text-sm tabular-nums">
              <DeltaBadge value={row.share_delta} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function Trends() {
  const [state, setState] = useState({ status: 'loading' })

  useEffect(() => {
    Promise.all([fetchTrends(), fetchWeeklyShares()])
      .then(([trends, weekly]) =>
        setState({
          status: 'ready',
          trends: trends.rows,
          weekly: weekly.rows,
          source: trends.source,
        }),
      )
      .catch((err) => setState({ status: 'error', message: err.message }))
  }, [])

  if (state.status === 'loading') {
    return (
      <div className="neu-card p-8 text-center text-slate-500 dark:text-slate-400">
        Loading trends…
      </div>
    )
  }
  if (state.status === 'error') {
    return (
      <div className="neu-card p-8 text-sm text-red-600 dark:text-red-400">{state.message}</div>
    )
  }

  const withDelta = state.trends.filter((r) => r.share_delta != null)
  const risers = withDelta.filter((r) => r.share_delta > 0).slice(0, 3)
  const fallers = withDelta
    .filter((r) => r.share_delta < 0)
    .sort((a, b) => a.share_delta - b.share_delta)
    .slice(0, 3)

  return (
    <div className="space-y-6">
      <p className="-mt-4 text-sm text-slate-500 dark:text-slate-400">
        Trailing 14 days vs. the 14 days before
        {state.source === 'sample' && (
          <span className="ml-2 rounded-full bg-amber-200/70 px-2 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-500/20 dark:text-amber-300">
            sample data
          </span>
        )}
      </p>

      <div className="grid gap-6 sm:grid-cols-2">
        <MoverCard title="Rising" rows={risers} />
        <MoverCard title="Falling" rows={fallers} />
      </div>

      <div className="neu-card p-5">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Meta share over time
        </h2>
        <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
          Weekly share of decklists, top 4 archetypes
        </p>
        <MetaShareChart rows={state.weekly} />
      </div>

      <div className="neu-card overflow-x-auto p-2 sm:p-4">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <th className="px-3 py-3 font-semibold">Archetype</th>
              <th className="px-3 py-3 text-right font-semibold">Share</th>
              <th className="px-3 py-3 text-right font-semibold">Δ Share</th>
              <th className="px-3 py-3 text-right font-semibold">Win rate</th>
              <th className="px-3 py-3 text-right font-semibold">Δ WR</th>
            </tr>
          </thead>
          <tbody>
            {state.trends.map((row) => (
              <tr
                key={row.archetype_id}
                className="border-t border-slate-300/50 dark:border-slate-600/40"
              >
                <td className="px-3 py-3 font-semibold">{row.name}</td>
                <td className="px-3 py-3 text-right tabular-nums">{pct(row.recent_share)}</td>
                <td className="px-3 py-3 text-right tabular-nums">
                  <DeltaBadge value={row.share_delta} />
                </td>
                <td className="px-3 py-3 text-right tabular-nums">{pct(row.recent_win_rate)}</td>
                <td className="px-3 py-3 text-right tabular-nums">{deltaPp(row.win_rate_delta)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
