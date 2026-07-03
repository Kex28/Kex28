import { useMeta } from "../lib/useMeta";

export default function About() {
  const { lastUpdatedAt, isSample } = useMeta();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">About</h1>

      <section className="neu-card space-y-3 px-6 py-5 text-sm leading-relaxed">
        <h2 className="font-semibold">Data sources</h2>
        <p style={{ color: "var(--ink-muted)" }}>
          Tournament results, archetypes, and meta stats come from the community-run swuapi.com
          aggregator (which sources Melee.gg and swu-db.com). Card data and images are pulled
          server-side and stored in our own database — nothing on this site links out to external
          services.
        </p>
      </section>

      <section className="neu-card space-y-3 px-6 py-5 text-sm leading-relaxed">
        <h2 className="font-semibold">Freshness</h2>
        <p style={{ color: "var(--ink-muted)" }}>
          {isSample
            ? "Currently showing bundled sample data — the live pipeline hasn't been connected yet."
            : lastUpdatedAt
              ? `Data last synced ${new Date(lastUpdatedAt).toLocaleString()}.`
              : "No sync has run yet."}{" "}
          A scheduled job pulls new data daily; pages show whatever was current when they loaded,
          so refresh to pick up the latest sync.
        </p>
      </section>

      <section className="neu-card space-y-3 px-6 py-5 text-sm leading-relaxed">
        <h2 className="font-semibold">Methodology</h2>
        <p style={{ color: "var(--ink-muted)" }}>
          Meta share is the fraction of decklists an archetype represents in the snapshot window.
          Rising/falling comparisons (Phase 2) use trailing 14-day windows weighted by event size.
          Counter-meta detection (Phase 3) looks at win rate specifically against the current top
          archetypes rather than overall record.
        </p>
      </section>
    </div>
  );
}
