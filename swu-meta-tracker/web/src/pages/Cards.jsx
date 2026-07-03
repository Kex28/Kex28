import { useEffect, useState } from 'react'
import NeuCard from '../components/NeuCard'
import PageHeader from '../components/PageHeader'
import SetupNotice from '../components/SetupNotice'
import { supabase } from '../lib/supabase'

export default function Cards() {
  const [query, setQuery] = useState('')
  const [rows, setRows] = useState(null)

  useEffect(() => {
    if (!supabase) return
    const needle = query.trim()
    // Server-side name search keeps the payload small even with a full card DB.
    let request = supabase.from('cards').select('id,name,set_code,card_number,card_type,aspects,cost,rarity').order('name').limit(60)
    if (needle) request = request.ilike('name', `%${needle}%`)
    const timer = setTimeout(() => {
      request.then(({ data }) => setRows(data ?? []))
    }, 200)
    return () => clearTimeout(timer)
  }, [query])

  if (!supabase) {
    return (
      <div>
        <PageHeader title="Cards" subtitle="Card database and play-rate trends." />
        <SetupNotice />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Cards"
        subtitle="Browse the card database. Play-rate trends inside archetypes arrive in Phase 3."
      />

      <label className="mb-6 block max-w-md">
        <span className="sr-only">Search cards</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search cards by name…"
          className="w-full rounded-xl bg-surface px-4 py-3 text-ink shadow-neu-inset outline-none placeholder:text-ink-muted focus:ring-2 focus:ring-accent"
        />
      </label>

      {rows && rows.length === 0 && (
        <p className="text-ink-secondary">
          No cards found. If the database is empty, run the sync pipeline first.
        </p>
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {rows?.map((card) => (
          <NeuCard key={card.id}>
            <p className="font-semibold">{card.name}</p>
            <p className="mt-1 text-sm text-ink-secondary">
              {[card.card_type, card.cost != null ? `Cost ${card.cost}` : null, card.rarity]
                .filter(Boolean)
                .join(' · ') || '—'}
            </p>
            <p className="mt-2 text-xs text-ink-muted">
              {[card.set_code, card.card_number].filter(Boolean).join(' #')}
              {card.aspects?.length ? ` · ${card.aspects.join(' · ')}` : ''}
            </p>
          </NeuCard>
        ))}
      </div>
    </div>
  )
}
