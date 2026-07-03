import NeuCard from './NeuCard'
import PageHeader from './PageHeader'

export default function ComingSoon({ title, subtitle, phase, details }) {
  return (
    <div>
      <PageHeader title={title} subtitle={subtitle} />
      <NeuCard inset className="max-w-xl">
        <p className="font-medium">Coming in {phase}</p>
        <p className="mt-2 text-sm text-ink-secondary">{details}</p>
      </NeuCard>
    </div>
  )
}
