import CountUp from './CountUp'
import NeuCard from './NeuCard'

/* Big stat callout: label above, hero figure below, optional delta line.
   Text wears ink tokens; only the delta carries a semantic color. */
export default function StatTile({ label, value, format, delta }) {
  return (
    <NeuCard className="flex flex-col gap-1">
      <span className="text-sm text-ink-secondary">{label}</span>
      <span className="text-3xl font-semibold">
        <CountUp value={value} format={format} />
      </span>
      {delta != null && (
        <span className={`text-sm font-medium ${delta >= 0 ? 'text-delta-up' : 'text-delta-down'}`}>
          {delta >= 0 ? '▲' : '▼'} {Math.abs(delta).toFixed(1)} pts vs prior window
        </span>
      )}
    </NeuCard>
  )
}
