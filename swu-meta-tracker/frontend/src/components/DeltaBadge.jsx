import { deltaPp } from '../lib/format.js'

export default function DeltaBadge({ value }) {
  if (value == null) return <span>—</span>
  const rising = value >= 0
  return (
    <span
      className={
        rising
          ? 'font-semibold text-green-800 dark:text-green-400'
          : 'font-semibold text-red-700 dark:text-red-400'
      }
    >
      {rising ? '▲' : '▼'} {deltaPp(value)}
    </span>
  )
}
