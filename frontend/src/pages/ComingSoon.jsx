/** Placeholder for pages that arrive in later build phases. Keeps the full
 * navigation present from day one so the information architecture is real. */
export default function ComingSoon({ title, phase, description }) {
  return (
    <div className="flex flex-col gap-6 pt-4">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <div className="neu p-8 flex flex-col gap-2">
        <span className="text-sm font-medium" style={{ color: "var(--accent)" }}>
          Coming in {phase}
        </span>
        <p style={{ color: "var(--ink-2)" }}>{description}</p>
      </div>
    </div>
  );
}
