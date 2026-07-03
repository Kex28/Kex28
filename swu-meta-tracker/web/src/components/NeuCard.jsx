export default function NeuCard({ children, className = '', inset = false }) {
  return (
    <div
      className={`rounded-neu bg-surface p-5 ${inset ? 'shadow-neu-inset' : 'shadow-neu'} ${className}`}
    >
      {children}
    </div>
  )
}
