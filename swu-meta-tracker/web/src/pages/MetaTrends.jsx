import ComingSoon from '../components/ComingSoon'

export default function MetaTrends() {
  return (
    <ComingSoon
      title="Meta Trends"
      subtitle="Rising and falling decks over time."
      phase="Phase 2"
      details="Trailing-window comparisons (this 2 weeks vs. the prior 2) flag risers and fallers, with line charts of meta share over time. Requires the gated swuapi.com API key for tournament, match, and decklist data — meta snapshots are already accumulating from the Phase 1 sync, so history will be ready when this ships."
    />
  )
}
