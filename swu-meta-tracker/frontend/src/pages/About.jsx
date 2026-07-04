import { useEffect, useState } from 'react'
import { fetchCurrentMeta } from '../lib/data.js'

export default function About() {
  const [lastUpdated, setLastUpdated] = useState(null)

  useEffect(() => {
    fetchCurrentMeta()
      .then(({ rows }) => setLastUpdated(rows[0]?.last_updated_at))
      .catch(() => {})
  }, [])

  return (
    <div className="neu-card space-y-5 p-6 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
      <section>
        <h2 className="mb-1 font-bold text-slate-800 dark:text-slate-100">Data sources</h2>
        <p>
          Tournament results, decklists, matches, and archetype data come from the community-run
          swuapi.com aggregator (which sources Melee.gg and swu-db.com). Card data is cached in
          our own database — nothing on this site links out.
        </p>
      </section>
      <section>
        <h2 className="mb-1 font-bold text-slate-800 dark:text-slate-100">Freshness</h2>
        <p>
          Data is pulled once a day by a scheduled job, not live. Every page shows the timestamp
          of the pull it's displaying; refresh to pick up a newer one.
          {lastUpdated && (
            <>
              {' '}
              Current data is from{' '}
              <span className="font-semibold">{new Date(lastUpdated).toLocaleString()}</span>.
            </>
          )}
        </p>
      </section>
      <section>
        <h2 className="mb-1 font-bold text-slate-800 dark:text-slate-100">Methodology</h2>
        <ul className="list-inside list-disc space-y-1">
          <li>
            <span className="font-semibold">Rising / falling:</span> meta share in the trailing
            14 days vs. the 14 days before.
          </li>
          <li>
            <span className="font-semibold">Counter meta:</span> win rate specifically against
            the current top 3 archetypes (mirrors excluded, minimum 10 matches) vs. overall
            record, trailing 28 days.
          </li>
          <li>
            <span className="font-semibold">Card trends:</span> share of an archetype's
            decklists playing a card, same 14-day windows.
          </li>
          <li>
            <span className="font-semibold">Win rates:</span> wins count 1, draws 0.5, losses 0.
          </li>
        </ul>
      </section>
    </div>
  )
}
