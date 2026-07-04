import { useEffect, useState } from "react";
import MetaTable from "../components/MetaTable";
import StatTile from "../components/StatTile";
import { fetchMetaSnapshot } from "../lib/data";
import type { MetaSnapshot } from "../lib/types";

const stampFmt = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" });

export default function Dashboard() {
  const [snapshot, setSnapshot] = useState<MetaSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMetaSnapshot().then(setSnapshot).catch((e: Error) => setError(e.message));
  }, []);

  if (error) {
    return (
      <div className="neu-card mt-6 p-6">
        <h1 className="text-xl font-semibold">Couldn't load meta data</h1>
        <p className="mt-2 text-sm text-[var(--ink-2)]">{error}. Try refreshing the page.</p>
      </div>
    );
  }

  if (!snapshot) {
    return <p className="mt-8 text-sm text-[var(--ink-muted)]">Loading current meta…</p>;
  }

  const { rows } = snapshot;
  const totalDecks = rows.reduce((sum, r) => sum + (r.deckCount ?? 0), 0);
  const top = rows[0];

  return (
    <div className="space-y-6 pt-2">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Current meta</h1>
        <p className="mt-1 text-sm text-[var(--ink-2)]">
          {snapshot.sourceWindow ? `Window: ${snapshot.sourceWindow.replaceAll("-", " ")} · ` : ""}
          Data updated{" "}
          <time dateTime={snapshot.lastSyncAt ?? snapshot.capturedAt}>
            {stampFmt.format(new Date(snapshot.lastSyncAt ?? snapshot.capturedAt))}
          </time>
        </p>
        {snapshot.demo && (
          <p className="neu-inset mt-3 inline-block rounded-xl px-4 py-2 text-xs font-medium text-[var(--ink-2)]">
            Showing bundled sample data — set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to go live.
          </p>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="neu-card p-6">
          <p className="text-sm text-[var(--ink-2)]">
            No meta snapshots yet — run the sync pipeline, then refresh.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <StatTile
              label="Archetypes tracked"
              value={rows.length}
              format={(n) => Math.round(n).toString()}
            />
            <StatTile
              label="Decks in sample"
              value={totalDecks}
              format={(n) => Math.round(n).toLocaleString("en")}
            />
            <StatTile
              label="Top meta share"
              value={top.metaShare * 100}
              format={(n) => `${n.toFixed(1)}%`}
              caption={top.archetype.name}
            />
          </div>

          <MetaTable rows={rows} />
        </>
      )}
    </div>
  );
}
