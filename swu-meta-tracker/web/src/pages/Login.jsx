import { useState } from 'react'
import NeuButton from '../components/NeuButton'
import NeuCard from '../components/NeuCard'
import PageHeader from '../components/PageHeader'
import SetupNotice from '../components/SetupNotice'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

const inputClass =
  'w-full rounded-xl bg-surface px-4 py-3 text-ink shadow-neu-inset outline-none placeholder:text-ink-muted focus:ring-2 focus:ring-accent'

export default function Login() {
  const { session } = useAuth()
  const [mode, setMode] = useState('login') // 'login' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState(null)
  const [busy, setBusy] = useState(false)

  if (!supabase) {
    return (
      <div>
        <PageHeader title="Login" subtitle="Account access for you and your teammates." />
        <SetupNotice />
      </div>
    )
  }

  if (session) {
    return (
      <div>
        <PageHeader title="Profile" subtitle="You're logged in." />
        <NeuCard className="max-w-md">
          <p className="text-sm text-ink-secondary">Signed in as</p>
          <p className="mt-1 font-medium">{session.user.email}</p>
          <NeuButton className="mt-5" onClick={() => supabase.auth.signOut()}>
            Sign out
          </NeuButton>
        </NeuCard>
      </div>
    )
  }

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setMessage(null)
    const action =
      mode === 'signup'
        ? supabase.auth.signUp({ email, password })
        : supabase.auth.signInWithPassword({ email, password })
    const { error } = await action
    setBusy(false)
    if (error) setMessage({ kind: 'error', text: error.message })
    else if (mode === 'signup')
      setMessage({ kind: 'ok', text: 'Account created — check your email to confirm.' })
  }

  return (
    <div>
      <PageHeader
        title="Login"
        subtitle="Each teammate gets their own login, decks, and watchlist."
      />
      <NeuCard className="max-w-md">
        <form onSubmit={submit} className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm text-ink-secondary">Email</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-ink-secondary">Password</span>
            <input
              type="password"
              required
              minLength={8}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className={inputClass}
            />
          </label>

          {message && (
            <p
              className={`text-sm ${message.kind === 'error' ? 'text-delta-down' : 'text-delta-up'}`}
              role="alert"
            >
              {message.text}
            </p>
          )}

          <div className="flex items-center gap-3">
            <NeuButton type="submit" disabled={busy} className="text-accent">
              {busy ? 'Working…' : mode === 'signup' ? 'Create account' : 'Log in'}
            </NeuButton>
            <button
              type="button"
              className="min-h-11 text-sm text-ink-secondary underline-offset-2 hover:underline"
              onClick={() => setMode((value) => (value === 'login' ? 'signup' : 'login'))}
            >
              {mode === 'login' ? 'Need an account? Sign up' : 'Have an account? Log in'}
            </button>
          </div>
        </form>
      </NeuCard>
    </div>
  )
}
