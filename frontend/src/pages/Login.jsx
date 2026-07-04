import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth.jsx'

const inputClass =
  'w-full rounded-xl border border-slate-300/60 bg-white/60 px-4 py-2.5 text-sm outline-none focus:border-blue-500 dark:border-slate-600/60 dark:bg-slate-800/60'

export default function Login() {
  const { user, isDemo, signIn, signUp, demoSignIn, signOut } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState(null)

  if (user) {
    return (
      <div className="neu-card mx-auto max-w-md p-6">
        <h2 className="text-lg font-bold">Profile</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Signed in as <span className="font-semibold">{user.email}</span>
          {user.demo && (
            <span className="ml-2 rounded-full bg-amber-200/70 px-2 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-500/20 dark:text-amber-300">
              demo account
            </span>
          )}
        </p>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          Your watchlist and saved decks are private to this account.
          {user.demo && ' Demo data lives in this browser only.'}
        </p>
        <button
          onClick={() => signOut()}
          className="neu-button mt-5 px-5 py-2.5 text-sm font-semibold"
        >
          Sign out
        </button>
      </div>
    )
  }

  if (isDemo) {
    return (
      <div className="neu-card mx-auto max-w-md p-6">
        <h2 className="text-lg font-bold">Log in</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Real accounts (email + password for you and your teammates) switch on once Supabase is
          configured — see the README. Until then you can use a local demo account: watchlist and
          decks work normally but are stored in this browser only.
        </p>
        <button
          onClick={() => {
            demoSignIn()
            navigate('/watchlist')
          }}
          className="neu-button mt-5 px-5 py-2.5 text-sm font-semibold"
        >
          Continue with demo account
        </button>
      </div>
    )
  }

  const submit = async (e) => {
    e.preventDefault()
    setStatus(null)
    try {
      if (mode === 'signin') {
        await signIn(email, password)
        navigate('/watchlist')
      } else {
        await signUp(email, password)
        setStatus({
          ok: true,
          message: 'Account created. Check your email if confirmation is required, then sign in.',
        })
        setMode('signin')
      }
    } catch (err) {
      setStatus({ ok: false, message: err.message })
    }
  }

  return (
    <div className="neu-card mx-auto max-w-md p-6">
      <h2 className="text-lg font-bold">{mode === 'signin' ? 'Log in' : 'Create account'}</h2>
      <form onSubmit={submit} className="mt-4 space-y-3">
        <input
          type="email"
          required
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
        />
        <input
          type="password"
          required
          minLength={6}
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClass}
        />
        {status && (
          <p
            className={`text-sm ${status.ok ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
          >
            {status.message}
          </p>
        )}
        <button type="submit" className="neu-button w-full px-5 py-2.5 text-sm font-semibold">
          {mode === 'signin' ? 'Sign in' : 'Sign up'}
        </button>
      </form>
      <button
        onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
        className="mt-4 text-sm text-slate-500 hover:underline dark:text-slate-400"
      >
        {mode === 'signin' ? 'New here? Create an account' : 'Have an account? Sign in'}
      </button>
    </div>
  )
}
