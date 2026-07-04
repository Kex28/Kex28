import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import CountUp from '../components/CountUp.jsx'
import DeltaBadge from '../components/DeltaBadge.jsx'
import { useAuth } from '../lib/auth.jsx'
import { fetchCardTrends, fetchCurrentMeta, fetchTrends } from '../lib/data.js'
import { pct } from '../lib/format.js'
import { fetchWatchlist, toggleWatch } from '../lib/userData.js'

// Only flag cards whose inclusion rate moved meaningfully between windows.
const MOVER_THRESHOLD = 0.08

export default function ArchetypeDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [state, setState] = useState({ status: 'loading' })
  const [watched, setWatched] = useState(false)

  useEffect(() => {
    if (!user) return
    fetchWatchlist()
      .then((ids) => setWatched(ids.includes(id)))
      .catch(() => {})
  }, [user, id])

  const onToggleWatch = async () => {
    if (!user) {
      navigate('/login')
      return
    }
    await toggleWatch(id, watched, user.id)
    setWatched(!watched)
  }

  useEffect(() => {
    setState({ status: 'loading' })
    Promise.all([fetchCurrentMeta(), fetchTrends(), fetchCardTrends(id)])
      .then(([meta, trends, cards]) => {
        const summary = meta.rows.find((r) => r.archetype_id === id)
        const trend = trends.rows.find((r) => r.archetype_id === id)
        if (!summary && !trend) throw new Error('Archetype not found')
        setState({
          status: 'ready',
          summary,
          trend,
          cards: cards.rows,
          source: cards.source,
        })
      })
      .catch((err) => setState({ status: 'error', message: err.message }))
  }, [id])

  if (state.status === 'loading') {
    return (
      <div className="neu-card p-8 text-center text-slate-500 dark:text-slate-400">
        Loading archetype…
      </div>
    )
  }
  if (state.status === 'error') {
    return (
      <div className="neu-card p-8 text-sm text-red-600 dark:text-red-400">{state.message}</div>
    )
  }

  const { summary, trend, cards } = state
  const name = summary?.name ?? trend?.name ?? id
  const movers = cards.filter((c) => Math.abs(c.rate_delta) >= MOVER_THRESHOLD)
  const rising = movers.filter((c) => c.rate_delta > 0)
  const falling = movers.filter((c) => c.rate_delta < 0)

  return (
    <div className="space-y-6">
      <div className="-mt-4">
        <Link
          to="/archetypes"
          className="text-sm text-slate-500 hover:underline dark:text-slate-400"
        >
          ← All archetypes
        </Link>
        <div className="mt-2 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">{name}</h2>
            {summary && (summary.leader || summary.base) && (
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {[summary.leader, summary.base].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>
          <button
            onClick={onToggleWatch}
            aria-label={watched ? 'Remove from watchlist' : 'Add to watchlist'}
            title={
              user
                ? watched
                  ? 'Remove from watchlist'
                  : 'Add to watchlist'
                : 'Log in to watch this archetype'
            }
            className={`neu-button h-11 w-11 text-lg ${watched ? 'text-amber-500' : ''}`}
          >
            {watched ? '★' : '☆'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          ['Meta share', <CountUp key="s" value={summary?.meta_share} format={(v) => pct(v)} />],
          ['Win rate', <CountUp key="r" value={summary?.win_rate} format={(v) => pct(v)} />],
          ['Share Δ (14d)', <DeltaBadge key="d" value={trend?.share_delta} />],
          ['WR Δ (14d)', <DeltaBadge key="w" value={trend?.win_rate_delta} />],
        ].map(([label, value]) => (
          <div key={label} className="neu-card p-4">
            <div className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {label}
            </div>
            <div className="mt-1 text-lg font-bold tabular-nums">{value}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {[
          ['Cards on the rise', rising],
          ['Cards being cut', falling],
        ].map(([title, rows]) => (
          <div key={title} className="neu-card p-5">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {title}
            </h3>
            {rows.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No big moves in the last two weeks.
              </p>
            ) : (
              <ul className="space-y-3">
                {rows.map((card) => (
                  <li key={card.card_id} className="flex items-baseline justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate font-semibold">{card.card_name}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        in {pct(card.prior_rate, 0)} → {pct(card.recent_rate, 0)} of lists
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

      <div className="neu-card overflow-x-auto p-2 sm:p-4">
        <h3 className="px-3 pt-3 text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          All cards
        </h3>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <th className="px-3 py-3 font-semibold">Card</th>
              <th className="px-3 py-3 text-right font-semibold">2 wks ago</th>
              <th className="px-3 py-3 text-right font-semibold">Now</th>
              <th className="px-3 py-3 text-right font-semibold">Δ</th>
            </tr>
          </thead>
          <tbody>
            {cards.map((card) => (
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-400 dark:text-slate-500">
        Inclusion rate = share of this archetype's decklists playing the card, trailing 14 days
        vs. the 14 before.
      </p>
    </div>
  )
}
