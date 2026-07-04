import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import ShareBarChart from '../components/ShareBarChart.jsx'
import { fetchTournamentDetail } from '../lib/data.js'
import { longDate, pct, tierLabel } from '../lib/format.js'

export default function TournamentDetail() {
  const { id } = useParams()
  const [state, setState] = useState({ status: 'loading' })

  useEffect(() => {
    setState({ status: 'loading' })
    fetchTournamentDetail(id)
      .then((detail) => setState({ status: 'ready', ...detail }))
      .catch((err) => setState({ status: 'error', message: err.message }))
  }, [id])

  if (state.status === 'loading') {
    return (
      <div className="neu-card p-8 text-center text-slate-500 dark:text-slate-400">
        Loading event…
      </div>
    )
  }
  if (state.status === 'error') {
    return (
      <div className="neu-card p-8 text-sm text-red-600 dark:text-red-400">{state.message}</div>
    )
  }

  const { tournament, archetypes, standings } = state

  return (
    <div className="space-y-6">
      <div className="-mt-4">
        <Link
          to="/tournaments"
          className="text-sm text-slate-500 hover:underline dark:text-slate-400"
        >
          ← All tournaments
        </Link>
        <h2 className="mt-2 text-xl font-bold">{tournament.name}</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {longDate(tournament.date)} · {tierLabel(tournament.tier)} · {tournament.player_count} players
        </p>
      </div>

      <div className="neu-card p-5">
        <h3 className="mb-1 text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Field breakdown
        </h3>
        <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
          Share of decklists per archetype — hover a bar for the event win rate
        </p>
        <ShareBarChart rows={archetypes} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="neu-card overflow-x-auto p-2 sm:p-4">
          <h3 className="px-3 pt-3 text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Top standings
          </h3>
          <table className="w-full border-collapse text-sm">
            <tbody>
              {standings.map((row) => (
                <tr
                  key={row.placement}
                  className="border-t border-slate-300/50 first:border-t-0 dark:border-slate-600/40"
                >
                  <td className="w-10 px-3 py-2.5 text-right font-semibold tabular-nums">
                    {row.placement}
                  </td>
                  <td className="px-3 py-2.5">{row.player}</td>
                  <td className="px-3 py-2.5 text-right">
                    <Link
                      to={`/archetypes/${row.archetype_id}`}
                      className="text-slate-500 hover:underline dark:text-slate-400"
                    >
                      {row.name}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="neu-card overflow-x-auto p-2 sm:p-4">
          <h3 className="px-3 pt-3 text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Event win rates
          </h3>
          <table className="w-full border-collapse text-sm">
            <tbody>
              {archetypes.map((row) => (
                <tr
                  key={row.archetype_id}
                  className="border-t border-slate-300/50 first:border-t-0 dark:border-slate-600/40"
                >
                  <td className="px-3 py-2.5">
                    <Link
                      to={`/archetypes/${row.archetype_id}`}
                      className="font-medium hover:underline"
                    >
                      {row.name}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-slate-500 dark:text-slate-400">
                    {row.decks} decks
                  </td>
                  <td className="px-3 py-2.5 text-right font-semibold tabular-nums">
                    {pct(row.win_rate)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
