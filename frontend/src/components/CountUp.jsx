import { useEffect, useRef, useState } from "react";

/** Number that counts up on reveal — subtle and fast (600ms), and skipped
 * entirely when the user prefers reduced motion. */
export default function CountUp({ value, format = (v) => Math.round(v).toString(), duration = 600 }) {
  const [display, setDisplay] = useState(0);
  const raf = useRef();

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplay(value);
      return;
    }
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - (1 - t) ** 3;
      setDisplay(value * eased);
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [value, duration]);

  return <span>{format(display)}</span>;
}
