import { useEffect, useState } from 'react'
import NeuCard from '../components/NeuCard'
import PageHeader from '../components/PageHeader'
import { formatDateTime } from '../lib/format'
import { supabase } from '../lib/supabase'

export default function About() {
  const [lastRun, setLastRun] = useState(null)

  useEffect(() => {
    if (!supabase) return
    supabase
      .from('sync_runs')
      .select('job,finished_at,status,detail')
      .order('started_at', { ascending: false })
      .limit(1)
      .then(({ data }) => setLastRun(data?.[0] ?? null))
  }, [])

  return (
    <div>
      <PageHeader title="About" subtitle="Data sources, freshness, and methodology." />

      <div className="grid max-w-3xl grid-cols-1 gap-5">
        <NeuCard>
          <h2 className="font-semibold">Last data pull</h2>
          {lastRun ? (
            <p className="mt-2 text-sm text-ink-secondary">
              <span className={lastRun.status === 'ok' ? 'text-delta-up' : 'text-delta-down'}>
                {lastRun.status === 'ok' ? '✓' : '✕'} {lastRun.job}
              </span>{' '}
              finished {formatDateTime(lastRun.finished_at)}
              {lastRun.detail ? ` — ${lastRun.detail}` : ''}
            </p>
          ) : (
            <p className="mt-2 text-sm text-ink-secondary">
              No sync has run yet (or Supabase isn't configured).
            </p>
          )}
          <p className="mt-2 text-sm text-ink-muted">
            Data refreshes on a daily schedule. Pages show whatever was current when they loaded —
            refresh to pick up a newer pull.
          </p>
        </NeuCard>

        <NeuCard>
          <h2 className="font-semibold">Data sources</h2>
          <p className="mt-2 text-sm text-ink-secondary">
            Tournament results, matches, standings, decklists, and archetypes come from
            api.swuapi.com, a community-run aggregator sourced from Melee.gg and swu-db.com. Card
            data and images are pulled server-side and served from our own database, so nothing on
            this site links out.
          </p>
        </NeuCard>

        <NeuCard>
          <h2 className="font-semibold">Methodology</h2>
          <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-ink-secondary">
            <li>
              Rising/falling decks compare meta share in a trailing 14-day window against the prior
              14 days, weighted so small-event swings don't outrank large-event swings.
            </li>
            <li>
              Counter-meta candidates are decks with a strong record specifically against the
              current top 3–5 archetypes despite a mediocre overall record.
            </li>
            <li>
              "Why is this deck moving" diffs the archetype's most-played cards between the two
              windows — a card jumping from ~20% to ~80% inclusion is a likely driver.
            </li>
          </ul>
        </NeuCard>
      </div>
    </div>
  )
}
