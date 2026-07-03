export default function Placeholder({ title, phase, blurb }) {
  return (
    <div className="mx-auto max-w-xl">
      <div className="neu-card px-6 py-10 text-center">
        <div
          className="neu-inset mx-auto inline-block px-3 py-1.5 text-xs font-semibold uppercase tracking-wide"
          style={{ color: "var(--accent)" }}
        >
          Coming in Phase {phase}
        </div>
        <h1 className="mt-5 text-2xl font-bold tracking-tight">{title}</h1>
        <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--ink-muted)" }}>
          {blurb}
        </p>
      </div>
    </div>
  );
}
