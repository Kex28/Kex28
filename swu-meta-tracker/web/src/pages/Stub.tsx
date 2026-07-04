interface Props {
  title: string;
  phase: string;
  description: string;
}

/* Placeholder page for features scheduled in later build phases. Every
   nav destination exists from day one so the shell (routes, drawer,
   theming) doesn't churn as features land. */

export default function Stub({ title, phase, description }: Props) {
  return (
    <div className="pt-2">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <div className="neu-card mt-6 max-w-xl p-6">
        <p className="text-xs font-semibold tracking-widest text-[var(--accent-ink)] uppercase">
          Coming in {phase}
        </p>
        <p className="mt-3 text-sm leading-relaxed text-[var(--ink-2)]">{description}</p>
      </div>
    </div>
  );
}
