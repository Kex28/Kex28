import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth.jsx'
import {
  EXAMPLE_DECK_JSON,
  deleteDeck,
  fetchDecks,
  parseSwudbDeck,
  saveDeck,
} from '../lib/userData.js'

export default function MyDecks() {
  const { user, loading } = useAuth()
  const [decks, setDecks] = useState(null)
  const [error, setError] = useState(null)
  const [showImport, setShowImport] = useState(false)
  const [json, setJson] = useState('')
  const [importError, setImportError] = useState(null)
  const [openDeck, setOpenDeck] = useState(null)

  const reload = () => fetchDecks().then(setDecks).catch((err) => setError(err.message))

  useEffect(() => {
    if (!loading && user) reload()
  }, [user, loading])

  if (!loading && !user) {
    return (
      <div className="neu-card p-8 text-center text-sm text-slate-500 dark:text-slate-400">
        <Link to="/login" className="font-semibold text-blue-700 hover:underline dark:text-blue-400">
          Log in
        </Link>{' '}
        to save decks to your profile.
      </div>
    )
  }
  if (error) {
    return <div className="neu-card p-8 text-sm text-red-600 dark:text-red-400">{error}</div>
  }
  if (!decks) {
    return (
      <div className="neu-card p-8 text-center text-slate-500 dark:text-slate-400">
        Loading decks…
      </div>
    )
  }

  const runImport = async () => {
    setImportError(null)
    try {
      const deck = parseSwudbDeck(json)
      await saveDeck(deck, user.id)
      setJson('')
      setShowImport(false)
      reload()
    } catch (err) {
      setImportError(err.message)
    }
  }

  const remove = async (id) => {
    await deleteDeck(id)
    setDecks(decks.filter((d) => d.id !== id))
  }

  const cardCount = (deck) => deck.cards_json.reduce((sum, c) => sum + (c.count || 1), 0)

  return (
    <div className="space-y-6">
      <div className="-mt-4 flex items-center justify-between gap-3">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Decks imported from SWUDB, rendered right here — no link-outs
        </p>
        <button
          onClick={() => setShowImport(!showImport)}
          className="neu-button shrink-0 px-4 py-2 text-sm font-semibold"
        >
          {showImport ? 'Cancel' : '+ Import deck'}
        </button>
      </div>

      {showImport && (
        <div className="neu-card p-5">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Import from SWUDB
          </h3>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            On your deck's SWUDB page choose <em>Export → JSON</em>, then paste it below.
          </p>
          <textarea
            value={json}
            onChange={(e) => setJson(e.target.value)}
            rows={8}
            spellCheck={false}
            placeholder='{"metadata": {"name": "…"}, "leader": …, "deck": […]}'
            className="mt-3 w-full rounded-xl border border-slate-300/60 bg-white/60 p-3 font-mono text-xs outline-none focus:border-blue-500 dark:border-slate-600/60 dark:bg-slate-800/60"
          />
          {importError && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">{importError}</p>
          )}
          <div className="mt-3 flex gap-3">
            <button onClick={runImport} className="neu-button px-4 py-2 text-sm font-semibold">
              Save deck
            </button>
            <button
              onClick={() => setJson(EXAMPLE_DECK_JSON)}
              className="text-sm text-slate-500 hover:underline dark:text-slate-400"
            >
              Paste an example instead
            </button>
          </div>
        </div>
      )}

      {decks.length === 0 && !showImport ? (
        <div className="neu-card p-8 text-center text-sm text-slate-500 dark:text-slate-400">
          No decks saved yet — hit "+ Import deck" to bring one over from SWUDB.
        </div>
      ) : (
        <div className="space-y-4">
          {decks.map((deck) => (
            <div key={deck.id} className="neu-card p-5">
              <div className="flex items-start justify-between gap-3">
                <button
                  onClick={() => setOpenDeck(openDeck === deck.id ? null : deck.id)}
                  className="min-w-0 text-left"
                >
                  <div className="font-semibold">{deck.deck_name}</div>
                  <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    {[deck.leader, deck.base].filter(Boolean).join(' · ')}
                    {' · '}
                    {cardCount(deck)} cards · saved{' '}
                    {new Date(deck.saved_at).toLocaleDateString()}
                    <span className="ml-2 text-blue-700 dark:text-blue-400">
                      {openDeck === deck.id ? 'hide list ▲' : 'show list ▼'}
                    </span>
                  </div>
                </button>
                <button
                  onClick={() => remove(deck.id)}
                  aria-label={`Delete ${deck.deck_name}`}
                  title="Delete deck"
                  className="neu-button h-9 w-9 text-sm"
                >
                  ✕
                </button>
              </div>
              {openDeck === deck.id && (
                <ul className="mt-4 grid gap-x-6 gap-y-1.5 border-t border-slate-300/50 pt-4 text-sm sm:grid-cols-2 dark:border-slate-600/40">
                  {deck.cards_json.map((card, i) => (
                    <li key={`${card.id ?? card.name}-${i}`} className="flex justify-between gap-3">
                      <span className="truncate">{card.name}</span>
                      <span className="shrink-0 tabular-nums text-slate-500 dark:text-slate-400">
                        ×{card.count}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
