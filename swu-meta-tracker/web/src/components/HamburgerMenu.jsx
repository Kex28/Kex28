import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import NeuButton from './NeuButton'

const LINKS = [
  { to: '/', label: 'Home' },
  { to: '/trends', label: 'Meta Trends' },
  { to: '/counter-meta', label: 'Counter Meta' },
  { to: '/tournaments', label: 'Tournaments' },
  { to: '/archetypes', label: 'Archetypes' },
  { to: '/cards', label: 'Cards' },
  { to: '/watchlist', label: 'Watchlist' },
  { to: '/my-decks', label: 'My Decks' },
  { to: '/about', label: 'About' },
]

export default function HamburgerMenu() {
  const [open, setOpen] = useState(false)
  const { session } = useAuth()
  const location = useLocation()

  // Close the panel on navigation and on Escape.
  useEffect(() => setOpen(false), [location.pathname])
  useEffect(() => {
    const onKey = (event) => event.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <>
      <NeuButton
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span aria-hidden className="text-lg leading-none">
          {open ? '✕' : '☰'}
        </span>
      </NeuButton>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-black/30"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <motion.nav
              className="fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] overflow-y-auto bg-surface p-6 shadow-neu"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.2 }}
              aria-label="Main navigation"
            >
              <p className="mb-6 text-lg font-semibold">SWU Meta Tracker</p>
              <ul className="space-y-1">
                {LINKS.map(({ to, label }) => (
                  <li key={to}>
                    <NavLink
                      to={to}
                      end={to === '/'}
                      className={({ isActive }) =>
                        `block min-h-11 rounded-xl px-4 py-2.5 font-medium transition-shadow ${
                          isActive ? 'text-accent shadow-neu-inset' : 'text-ink hover:shadow-neu-sm'
                        }`
                      }
                    >
                      {label}
                    </NavLink>
                  </li>
                ))}
                <li className="mt-4 border-t border-hairline pt-4">
                  <NavLink
                    to="/login"
                    className={({ isActive }) =>
                      `block min-h-11 rounded-xl px-4 py-2.5 font-medium transition-shadow ${
                        isActive ? 'text-accent shadow-neu-inset' : 'text-ink hover:shadow-neu-sm'
                      }`
                    }
                  >
                    {session ? 'Profile' : 'Log in'}
                  </NavLink>
                </li>
              </ul>
            </motion.nav>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
