import { useEffect, useRef, useState } from "react";

/* Neumorphic stat tile with a count-up reveal. Values stay in ink tokens
   (never the accent color); prefers-reduced-motion skips the animation. */

function useCountUp(target: number, durationMs = 700): number {
  const [value, setValue] = useState(0);
  const raf = useRef(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setValue(target);
      return;
    }
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / durationMs, 1);
      const eased = 1 - (1 - t) ** 3;
      setValue(target * eased);
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, durationMs]);
  return value;
}

interface Props {
  label: string;
  value: number;
  format: (n: number) => string;
  caption?: string;
}

export default function StatTile({ label, value, format, caption }: Props) {
  const animated = useCountUp(value);
  return (
    <div className="neu-card px-6 py-5">
      <p className="text-xs font-semibold tracking-widest text-[var(--ink-muted)] uppercase">
        {label}
      </p>
      <p className="mt-2 text-3xl font-semibold">{format(animated)}</p>
      {caption && <p className="mt-1 text-sm text-[var(--ink-2)]">{caption}</p>}
    </div>
  );
}
