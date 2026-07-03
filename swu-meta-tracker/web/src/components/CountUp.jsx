import { animate, useReducedMotion } from 'framer-motion'
import { useEffect, useRef } from 'react'

/* Number counts up on reveal — subtle and fast (0.6s), skipped entirely
   when the user prefers reduced motion. */
export default function CountUp({ value, format = (n) => String(n) }) {
  const ref = useRef(null)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    const node = ref.current
    if (!node || value == null) return
    if (reduceMotion) {
      node.textContent = format(value)
      return
    }
    const controls = animate(0, value, {
      duration: 0.6,
      ease: 'easeOut',
      onUpdate: (latest) => {
        node.textContent = format(latest)
      },
    })
    return () => controls.stop()
  }, [value, reduceMotion]) // eslint-disable-line react-hooks/exhaustive-deps

  return <span ref={ref}>{value == null ? '—' : format(value)}</span>
}
