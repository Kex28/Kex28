import { createClient } from '@supabase/supabase-js'
import { createContext, useContext, useEffect, useState } from 'react'

// With Supabase configured this is real email/password auth (Supabase
// Auth). Without it — local dev on sample data — a "demo account" stored
// in localStorage stands in, so the watchlist and My Decks flows are
// fully usable either way. user shape: { id, email, demo? }

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase =
  SUPABASE_URL && SUPABASE_ANON_KEY ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null

const DEMO_USER_KEY = 'swu-demo-user'
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabase) {
      const stored = localStorage.getItem(DEMO_USER_KEY)
      setUser(stored ? JSON.parse(stored) : null)
      setLoading(false)
      return
    }
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const value = {
    user,
    loading,
    isDemo: !supabase,

    async signIn(email, password) {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw new Error(error.message)
    },

    async signUp(email, password) {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) throw new Error(error.message)
    },

    demoSignIn(email) {
      const demoUser = { id: 'demo', email: email || 'demo@local', demo: true }
      localStorage.setItem(DEMO_USER_KEY, JSON.stringify(demoUser))
      setUser(demoUser)
    },

    async signOut() {
      if (supabase) await supabase.auth.signOut()
      else localStorage.removeItem(DEMO_USER_KEY)
      setUser(null)
    },
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
