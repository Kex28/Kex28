import { useMeta } from "../lib/useMeta";
import StatTile from "../components/StatTile";
import LastUpdated from "../components/LastUpdated";

const pct = (v) => `${(v * 100).toFixed(1)}%`;

/** Phase 1 MVP page: snapshot of the current meta — archetype, meta share,
 * win rate — proving the pipeline end to end. */
export default function Dashboard() {
  const { loading, rows, snapshotAt, error, demo } = useMeta();

  if (loading) {
    return <p className="py-12 text-center" style={{ color: "var(--ink-2)" }}>Loading the current meta…</p>;
  }
  if (error) {
    return (
      <div className="neu-inset p-6 mt-6">
        <p className="font-medium" style={{ color: "var(--down)" }}>Couldn't load meta data</p>
        <p className="text-sm mt-1" style={{ color: "var(--ink-2)" }}>{error}</p>
      </div>
    );
  }

  const top = rows[0];
  const totalDecks = rows.reduce((sum, r) => sum + (r.deck_count ?? 0), 0);
  const maxShare = Math.max(...rows.map((r) => r.meta_share ?? 0), 0.0001);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1 pt-4">
        <h1 className="text-2xl font-semibold tracking-tight">Current meta</h1>
        <LastUpdated timestamp={snapshotAt} demo={demo} />
      </div>

      {/* Stat callouts */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-6" aria-label="Meta at a glance">
        <StatTile label="Top deck" value={(top?.meta_share ?? 0) * 100}
                  format={(v) => `${v.toFixed(1)}%`} detail={top?.name ?? "—"} />
        <StatTile label="Archetypes tracked" value={rows.length} />
        <StatTile label="Decks in sample" value={totalDecks}
                  format={(v) => Math.round(v).toLocaleString()} />
      </section>

      {/* Archetype table — the Phase 1 deliverable */}
      <section className="neu p-4 sm:p-6" aria-label="Archetype meta table">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ color: "var(--ink)" }}>
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide" style={{ color: "var(--ink-3)" }}>
                <th className="py-2 pr-3 font-medium">Archetype</th>
                <th className="py-2 pr-3 font-medium hidden sm:table-cell">Leader / Base</th>
                <th className="py-2 pr-3 font-medium">Meta share</th>
                <th className="py-2 pr-3 font-medium text-right">Win rate</th>
                <th className="py-2 font-medium text-right hidden sm:table-cell">Decks</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.archetype_id} className="border-t" style={{ borderColor: "var(--ring)" }}>
                  <td className="py-3 pr-3 font-medium">{row.name}</td>
                  <td className="py-3 pr-3 hidden sm:table-cell" style={{ color: "var(--ink-2)" }}>
                    {row.leader} · {row.base}
                  </td>
                  <td className="py-3 pr-3 min-w-36">
                    <div className="flex items-center gap-2">
                      {/* thin mark, rounded data end, share bar scaled to max */}
                      <div className="neu-inset h-3 flex-1 overflow-hidden" aria-hidden="true">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${((row.meta_share ?? 0) / maxShare) * 100}%`,
                            background: "var(--accent)",
                          }}
                        />
                      </div>
                      <span className="tabular-nums w-12 text-right">{pct(row.meta_share ?? 0)}</span>
                    </div>
                  </td>
                  <td className="py-3 pr-3 text-right tabular-nums"
                      style={{ color: (row.win_rate ?? 0) >= 0.5 ? "var(--up)" : "var(--ink)" }}>
                    {pct(row.win_rate ?? 0)}
                  </td>
                  <td className="py-3 text-right tabular-nums hidden sm:table-cell"
                      style={{ color: "var(--ink-2)" }}>
                    {row.deck_count?.toLocaleString() ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
