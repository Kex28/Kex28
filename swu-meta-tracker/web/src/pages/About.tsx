export default function About() {
  return (
    <div className="max-w-2xl space-y-6 pt-2">
      <h1 className="text-2xl font-semibold tracking-tight">About</h1>

      <section className="neu-card p-6">
        <h2 className="font-semibold">Data sources</h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--ink-2)]">
          Tournament results, matches, standings, decklists, and archetypes come from
          api.swuapi.com, a community-run aggregator sourced from Melee.gg and
          swu-db.com. Card data and images are pulled server-side and stored in our own
          database and storage — nothing on this site links out to external services.
        </p>
      </section>

      <section className="neu-card p-6">
        <h2 className="font-semibold">Freshness</h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--ink-2)]">
          Data is pulled on a schedule (daily, plus manual runs after big events), not
          live. Every page shows when its data was last updated; new data appears on
          the next page load after a sync completes.
        </p>
      </section>

      <section className="neu-card p-6">
        <h2 className="font-semibold">Methodology</h2>
        <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-relaxed text-[var(--ink-2)]">
          <li>
            <strong className="text-[var(--ink)]">Meta share</strong> — an archetype's
            portion of all decks in the current window.
          </li>
          <li>
            <strong className="text-[var(--ink)]">Rising / falling</strong> (Phase 2) —
            trailing-window comparison, weighted so small-event swings don't outrank
            large-event swings.
          </li>
          <li>
            <strong className="text-[var(--ink)]">Counter-meta</strong> (Phase 3) — win
            rate specifically against the current top archetypes, not overall record.
          </li>
        </ul>
      </section>
    </div>
  );
}
