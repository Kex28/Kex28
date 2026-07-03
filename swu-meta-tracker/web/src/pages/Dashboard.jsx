import { motion } from "framer-motion";
import { useMeta } from "../lib/useMeta";
import StatCallout from "../components/StatCallout";

const pct = (v) => (v == null ? "—" : `${(v * 100).toFixed(1)}%`);

function Freshness({ lastUpdatedAt, isSample }) {
  if (isSample) {
    return (
      <span
        className="neu-inset inline-block px-3 py-1.5 text-xs font-medium"
        style={{ color: "var(--ink-muted)" }}
      >
        Sample data — connect Supabase to see the live meta
      </span>
    );
  }
  if (!lastUpdatedAt) return null;
  return (
    <span className="text-xs" style={{ color: "var(--ink-muted)" }}>
      Last updated {new Date(lastUpdatedAt).toLocaleString()}
    </span>
  );
}

export default function Dashboard() {
  const { rows, lastUpdatedAt, isSample, loading, error } = useMeta();

  const top = rows[0];
  const totalDecks = rows.reduce((sum, r) => sum + (r.deckCount ?? 0), 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Current Meta</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--ink-muted)" }}>
            Snapshot of competitive Star Wars: Unlimited right now.
          </p>
        </div>
        <Freshness lastUpdatedAt={lastUpdatedAt} isSample={isSample} />
      </div>

      {error && (
        <div className="neu-card border px-5 py-4 text-sm" style={{ borderColor: "var(--line)" }}>
          Couldn't load meta data: {error}
        </div>
      )}

      {loading ? (
        <div className="neu-card px-5 py-10 text-center text-sm" style={{ color: "var(--ink-muted)" }}>
          Loading…
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCallout label="Archetypes tracked" value={rows.length} format={(v) => Math.round(v)} />
            <StatCallout label="Top meta share" value={top?.metaShare ?? null} format={pct} />
            <StatCallout label="Decks in snapshot" value={totalDecks || null} format={(v) => Math.round(v).toLocaleString()} />
          </div>

          <motion.div
            className="neu-card overflow-hidden"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr
                    className="border-b text-left text-xs uppercase tracking-wide"
                    style={{ borderColor: "var(--line)", color: "var(--ink-muted)" }}
                  >
                    <th className="px-5 py-4 font-semibold">Archetype</th>
                    <th className="hidden px-5 py-4 font-semibold sm:table-cell">Leader / Base</th>
                    <th className="px-5 py-4 text-right font-semibold">Meta share</th>
                    <th className="px-5 py-4 text-right font-semibold">Win rate</th>
                    <th className="hidden px-5 py-4 text-right font-semibold sm:table-cell">Decks</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr
                      key={r.archetype}
                      className="border-b last:border-0"
                      style={{ borderColor: "var(--line)" }}
                    >
                      <td className="px-5 py-4 font-medium">{r.archetype}</td>
                      <td className="hidden px-5 py-4 sm:table-cell" style={{ color: "var(--ink-muted)" }}>
                        {[r.leader, r.base].filter(Boolean).join(" / ") || "—"}
                      </td>
                      <td className="px-5 py-4 text-right tabular-nums">{pct(r.metaShare)}</td>
                      <td
                        className="px-5 py-4 text-right font-semibold tabular-nums"
                        style={{
                          color:
                            r.winRate == null
                              ? "var(--ink-muted)"
                              : r.winRate >= 0.5
                                ? "var(--accent)"
                                : "var(--ink)",
                        }}
                      >
                        {pct(r.winRate)}
                      </td>
                      <td className="hidden px-5 py-4 text-right tabular-nums sm:table-cell">
                        {r.deckCount ?? "—"}
                      </td>
                    </tr>
                  ))}
                  {rows.length === 0 && !error && (
                    <tr>
                      <td colSpan={5} className="px-5 py-10 text-center" style={{ color: "var(--ink-muted)" }}>
                        No meta snapshots yet — run the sync pipeline to populate Supabase.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
}
