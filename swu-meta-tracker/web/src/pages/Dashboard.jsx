import { useEffect, useState } from 'react'
import LastUpdated from '../components/LastUpdated'
import NeuCard from '../components/NeuCard'
import PageHeader from '../components/PageHeader'
import SetupNotice from '../components/SetupNotice'
import StatTile from '../components/StatTile'
import { formatPercent } from '../lib/format'
import { supabase } from '../lib/supabase'

export default function Dashboard() {
  const [rows, setRows] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!supabase) return
    supabase
      .from('current_meta')
      .select('*')
      .order('meta_share', { ascending: false, nullsFirst: false })
      .then(({ data, error: queryError }) => {
        if (queryError) setError(queryError.message)
        else setRows(data)
      })
  }, [])

  if (!supabase) {
    return (
      <div>
        <PageHeader title="Dashboard" subtitle="Snapshot of the current competitive meta." />
        <SetupNotice />
      </div>
    )
  }

  const topDeck = rows?.[0]
  const totalDecks = rows?.reduce((sum, row) => sum + (row.deck_count ?? 0), 0)
  const lastUpdated = rows?.reduce(
    (latest, row) => (row.last_updated_at > (latest ?? '') ? row.last_updated_at : latest),
    null,
  )

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Snapshot of the current competitive meta.">
        <LastUpdated timestamp={lastUpdated} />
      </PageHeader>

      {error && (
        <NeuCard inset className="mb-6 max-w-xl">
          <p className="text-sm text-delta-down">Couldn't load meta data: {error}</p>
        </NeuCard>
      )}

      {rows && rows.length === 0 && (
        <NeuCard inset className="max-w-xl">
          <p className="font-medium">No meta data yet</p>
          <p className="mt-2 text-sm text-ink-secondary">
            The database is empty. Run the sync pipeline (or wait for the scheduled GitHub Action)
            and refresh — this page shows whatever data was current when it loaded.
          </p>
        </NeuCard>
      )}

      {rows && rows.length > 0 && (
        <>
          <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-3">
            <StatTile label="Archetypes tracked" value={rows.length} format={(n) => String(Math.round(n))} />
            <StatTile
              label={`Top deck share — ${topDeck?.name ?? ''}`}
              value={topDeck?.meta_share != null ? topDeck.meta_share * 100 : null}
              format={(n) => `${n.toFixed(1)}%`}
            />
            <StatTile
              label="Decks in snapshot"
              value={totalDecks || null}
              format={(n) => String(Math.round(n))}
            />
          </div>

          <NeuCard className="overflow-x-auto p-0">
            <table className="w-full min-w-[28rem] text-left text-sm">
              <caption className="sr-only">
                Current meta: archetype, meta share, and win rate
              </caption>
              <thead>
                <tr className="border-b border-hairline text-ink-secondary">
                  <th scope="col" className="px-5 py-3 font-medium">Archetype</th>
                  <th scope="col" className="px-5 py-3 font-medium">Leader / Base</th>
                  <th scope="col" className="px-5 py-3 text-right font-medium">Meta share</th>
                  <th scope="col" className="px-5 py-3 text-right font-medium">Win rate</th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {rows.map((row) => (
                  <tr key={row.archetype_id} className="border-b border-hairline last:border-0">
                    <td className="px-5 py-3 font-medium">{row.name}</td>
                    <td className="px-5 py-3 text-ink-secondary">
                      {[row.leader, row.base].filter(Boolean).join(' / ') || '—'}
                    </td>
                    <td className="px-5 py-3 text-right">{formatPercent(row.meta_share)}</td>
                    <td className="px-5 py-3 text-right">{formatPercent(row.win_rate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </NeuCard>
        </>
      )}
    </div>
  )
}
