import { animate, motion, useMotionValue, useTransform } from 'framer-motion'
import { useEffect } from 'react'

// Counts a stat up from 0 on reveal (spec's "numbers counting up" motion).
// `value` is the target number; `format` turns the in-flight number into
// display text. Renders a plain dash when the value is missing.
export default function CountUp({ value, format }) {
  const progress = useMotionValue(0)
  const text = useTransform(progress, (v) => format(v))

  useEffect(() => {
    if (value == null) return
    const controls = animate(progress, value, { duration: 0.6, ease: 'easeOut' })
    return () => controls.stop()
  }, [value, progress])

  if (value == null) return <span>—</span>
  return <motion.span>{text}</motion.span>
}
