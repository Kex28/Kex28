import { Link } from 'react-router-dom'
import ComingSoon from '../components/ComingSoon'
import NeuCard from '../components/NeuCard'
import PageHeader from '../components/PageHeader'
import { useAuth } from '../context/AuthContext'

export default function MyDecks() {
  const { session } = useAuth()

  if (!session) {
    return (
      <div>
        <PageHeader title="My Decks" subtitle="Your personal decks, saved from SWUDB." />
        <NeuCard inset className="max-w-xl">
          <p className="font-medium">Log in to see your decks</p>
          <p className="mt-2 text-sm text-ink-secondary">
            Each teammate gets their own login and their own saved decks.{' '}
            <Link to="/login" className="font-medium text-accent">
              Log in or create an account
            </Link>
            .
          </p>
        </NeuCard>
      </div>
    )
  }

  return (
    <ComingSoon
      title="My Decks"
      subtitle="Your personal decks, saved from SWUDB."
      phase="Phase 4"
      details="Import a deck by SWUDB deck ID; the card list is cached in our own database and rendered natively here — no links out. The saved_decks table and per-user security policies are already in place."
    />
  )
}
