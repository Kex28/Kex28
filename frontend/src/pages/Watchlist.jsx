import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import DeltaBadge from '../components/DeltaBadge.jsx'
import { useAuth } from '../lib/auth.jsx'
import { fetchCurrentMeta, fetchTrends } from '../lib/data.js'
import { pct } from '../lib/format.js'
import { fetchWatchlist, toggleWatch } from '../lib/userData.js'

export default function Watchlist() {
  const { user, loading } = useAuth()
  const [state, setState] = useState({ status: 'loading' })

  useEffect(() => {
    if (loading) return
    if (!user) {
      setState({ status: 'signedout' })
      return
    }
    Promise.all([fetchWatchlist(), fetchCurrentMeta(), fetchTrends()])
      .then(([watched, meta, trends]) => {
        const trendById = Object.fromEntries(trends.rows.map((r) => [r.archetype_id, r]))
        const rows = watched.map((id) => {
          const summary = meta.rows.find((r) => r.archetype_id === id)
          return {
            archetype_id: id,
            name: summary?.name ?? trendById[id]?.name ?? id,
            leader: summary?.leader,
            base: summary?.base,
            meta_share: summary?.meta_share,
            win_rate: summary?.win_rate,
            share_delta: trendById[id]?.share_delta,
            win_rate_delta: trendById[id]?.win_rate_delta,
          }
        })
        setState({ status: 'ready', rows })
      })
      .catch((err) => setState({ status: 'error', message: err.message }))
  }, [user, loading])

  const unwatch = async (id) => {
    await toggleWatch(id, true, user.id)
    setState((s) => ({ ...s, rows: s.rows.filter((r) => r.archetype_id !== id) }))
  }

  if (state.status === 'signedout') {
    return (
      <div className="neu-card p-8 text-center text-sm text-slate-500 dark:text-slate-400">
        <Link to="/login" className="font-semibold text-blue-700 hover:underline dark:text-blue-400">
          Log in
        </Link>{' '}
        to keep a personal watchlist.
      </div>
    )
  }
  if (state.status === 'loading') {
    return (
      <div className="neu-card p-8 text-center text-slate-500 dark:text-slate-400">
        Loading watchlist…
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
        Archetypes you follow — add more with the ☆ button on any archetype page
      </p>
      {state.rows.length === 0 ? (
        <div className="neu-card p-8 text-center text-sm text-slate-500 dark:text-slate-400">
          Nothing watched yet. Browse{' '}
          <Link
            to="/archetypes"
            className="font-semibold text-blue-700 hover:underline dark:text-blue-400"
          >
            archetypes
          </Link>{' '}
          and star the ones you care about.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {state.rows.map((row) => (
            <div key={row.archetype_id} className="neu-card p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    to={`/archetypes/${row.archetype_id}`}
                    className="font-semibold hover:underline"
                  >
                    {row.name}
                  </Link>
                  {(row.leader || row.base) && (
                    <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      {[row.leader, row.base].filter(Boolean).join(' · ')}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => unwatch(row.archetype_id)}
                  aria-label={`Unwatch ${row.name}`}
                  title="Remove from watchlist"
                  className="neu-button h-9 w-9 text-sm"
                >
                  ★
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm tabular-nums">
                <span>
                  <span className="text-slate-500 dark:text-slate-400">share </span>
                  <span className="font-semibold">{pct(row.meta_share)}</span>{' '}
                  <DeltaBadge value={row.share_delta} />
                </span>
                <span>
                  <span className="text-slate-500 dark:text-slate-400">WR </span>
                  <span className="font-semibold">{pct(row.win_rate)}</span>{' '}
                  <DeltaBadge value={row.win_rate_delta} />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
