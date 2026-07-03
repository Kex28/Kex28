import CountUp from "./CountUp";

/** Big stat callout: hero figure in primary ink, label in muted ink.
 * Text wears text tokens; no series color on numbers. */
export default function StatTile({ label, value, format, detail }) {
  return (
    <div className="neu p-6 flex flex-col gap-1">
      <span className="text-sm font-medium" style={{ color: "var(--ink-3)" }}>{label}</span>
      <span className="text-4xl font-semibold tracking-tight" style={{ color: "var(--ink)" }}>
        <CountUp value={value} format={format} />
      </span>
      {detail && <span className="text-sm" style={{ color: "var(--ink-2)" }}>{detail}</span>}
    </div>
  );
}
