import { useEffect, useMemo, useState } from 'react'
import NeuCard from '../components/NeuCard'
import PageHeader from '../components/PageHeader'
import SetupNotice from '../components/SetupNotice'
import { supabase } from '../lib/supabase'

export default function Archetypes() {
  const [rows, setRows] = useState(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (!supabase) return
    supabase
      .from('archetypes')
      .select('id,name,leader,base,aspects')
      .order('name')
      .then(({ data }) => setRows(data ?? []))
  }, [])

  const filtered = useMemo(() => {
    if (!rows) return null
    const needle = query.trim().toLowerCase()
    if (!needle) return rows
    return rows.filter((row) =>
      [row.name, row.leader, row.base, ...(row.aspects ?? [])]
        .filter(Boolean)
        .some((field) => field.toLowerCase().includes(needle)),
    )
  }, [rows, query])

  if (!supabase) {
    return (
      <div>
        <PageHeader title="Archetypes" subtitle="Browse and search every tracked deck." />
        <SetupNotice />
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="Archetypes" subtitle="Browse and search every tracked deck." />

      <label className="mb-6 block max-w-md">
        <span className="sr-only">Search archetypes</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name, leader, base, or aspect…"
          className="w-full rounded-xl bg-surface px-4 py-3 text-ink shadow-neu-inset outline-none placeholder:text-ink-muted focus:ring-2 focus:ring-accent"
        />
      </label>

      {filtered && filtered.length === 0 && (
        <p className="text-ink-secondary">
          {rows.length === 0
            ? 'No archetypes yet — run the sync pipeline to pull them in.'
            : 'No archetypes match that search.'}
        </p>
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {filtered?.map((row) => (
          <NeuCard key={row.id}>
            <p className="font-semibold">{row.name}</p>
            <p className="mt-1 text-sm text-ink-secondary">
              {[row.leader, row.base].filter(Boolean).join(' / ') || 'Leader/base unknown'}
            </p>
            {row.aspects?.length > 0 && (
              <p className="mt-2 text-xs text-ink-muted">{row.aspects.join(' · ')}</p>
            )}
          </NeuCard>
        ))}
      </div>
    </div>
  )
}
