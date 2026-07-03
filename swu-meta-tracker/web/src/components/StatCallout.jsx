import { useEffect, useRef, useState } from "react";

/** Big stat number that counts up on reveal — small, fast, per the motion spec. */
export default function StatCallout({ label, value, format }) {
  const [display, setDisplay] = useState(0);
  const raf = useRef();

  useEffect(() => {
    if (value == null) return undefined;
    const duration = 500;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min((now - start) / duration, 1);
      setDisplay(value * (1 - Math.pow(1 - t, 3))); // ease-out cubic
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [value]);

  return (
    <div className="neu-card px-5 py-4">
      <div className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--ink-muted)" }}>
        {label}
      </div>
      <div className="mt-1 text-3xl font-bold tabular-nums">
        {value == null ? "—" : format(display)}
      </div>
    </div>
  );
}
