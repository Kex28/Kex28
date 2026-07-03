import { useMeta } from "../lib/useMeta";
import LastUpdated from "../components/LastUpdated";

export default function About() {
  const { snapshotAt, demo } = useMeta();

  return (
    <div className="flex flex-col gap-6 pt-4 max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight">About</h1>

      <section className="neu p-6 flex flex-col gap-3">
        <h2 className="font-semibold">Data sources</h2>
        <p className="text-sm leading-relaxed" style={{ color: "var(--ink-2)" }}>
          Tournament results, matches, standings, decklists, and archetypes come from{" "}
          <strong>api.swuapi.com</strong>, a community-run aggregator sourced from Melee.gg
          and swu-db.com. Card data and images are pulled server-side and served from this
          site's own storage — nothing here links out to external services.
        </p>
        <LastUpdated timestamp={snapshotAt} demo={demo} />
      </section>

      <section className="neu p-6 flex flex-col gap-3">
        <h2 className="font-semibold">Methodology</h2>
        <ul className="text-sm leading-relaxed list-disc pl-5 flex flex-col gap-2" style={{ color: "var(--ink-2)" }}>
          <li><strong>Meta share</strong> — an archetype's fraction of all decks in the current sample.</li>
          <li><strong>Win rate</strong> — match wins over total matches for the archetype, as reported upstream.</li>
          <li><strong>Rising / falling</strong> (Phase 2) — trailing 14-day window vs. the prior 14 days, weighted by event size so small-event swings don't outrank large-event swings.</li>
          <li><strong>Counter-meta</strong> (Phase 3) — win rate specifically against the current top 3–5 archetypes, not overall record.</li>
        </ul>
      </section>

      <section className="neu p-6 flex flex-col gap-3">
        <h2 className="font-semibold">Freshness</h2>
        <p className="text-sm leading-relaxed" style={{ color: "var(--ink-2)" }}>
          Data refreshes on a daily schedule (and after big events). Pages show whatever was
          current when they loaded; new data appears on the next refresh, not mid-session.
        </p>
      </section>
    </div>
  );
}
