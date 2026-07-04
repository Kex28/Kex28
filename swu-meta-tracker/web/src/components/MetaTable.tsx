import type { MetaRow } from "../lib/types";

/* Phase 1 table: archetype, meta share (with a magnitude bar), win rate.
   High-contrast text on the neumorphic surface; the bar is the single
   sequential accent hue (validated >= 3:1 on both surfaces) and every bar
   carries its printed value, so color never works alone. */

const shareFmt = new Intl.NumberFormat("en", { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1 });
const rateFmt = new Intl.NumberFormat("en", { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1 });

export default function MetaTable({ rows }: { rows: MetaRow[] }) {
  const maxShare = Math.max(...rows.map((r) => r.metaShare), 0.0001);

  return (
    <div className="neu-card overflow-x-auto p-2 sm:p-4">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="text-left text-xs font-semibold tracking-wider text-[var(--ink-muted)] uppercase">
            <th className="px-4 py-3">Archetype</th>
            <th className="px-4 py-3">Leader / Base</th>
            <th className="px-4 py-3">Aspect</th>
            <th className="px-4 py-3 w-[26%]">Meta share</th>
            <th className="px-4 py-3 text-right">Win rate</th>
            <th className="px-4 py-3 text-right">Decks</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.archetype.id} className="border-t border-[var(--hairline)]">
              <td className="px-4 py-3 font-medium">{row.archetype.name}</td>
              <td className="px-4 py-3 text-[var(--ink-2)]">
                {row.archetype.leader}
                <span className="text-[var(--ink-muted)]"> · {row.archetype.base}</span>
              </td>
              <td className="px-4 py-3 text-[var(--ink-2)]">{row.archetype.aspect ?? "—"}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="neu-inset h-3 flex-1 overflow-hidden rounded-full" aria-hidden>
                    <div
                      className="h-full rounded-full bg-[var(--accent)]"
                      style={{ width: `${(row.metaShare / maxShare) * 100}%` }}
                    />
                  </div>
                  <span className="w-14 text-right tabular-nums">{shareFmt.format(row.metaShare)}</span>
                </div>
              </td>
              <td className="px-4 py-3 text-right tabular-nums">
                {row.winRate == null ? "—" : rateFmt.format(row.winRate)}
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-[var(--ink-2)]">
                {row.deckCount ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
