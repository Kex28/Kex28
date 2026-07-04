import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useTheme } from '../theme.jsx'

// Per the spec: hamburger menu on every screen size, not a persistent nav
// bar. Future pages from the spec's nav list get added to NAV as they're
// built.
const NAV = [
  { to: '/', label: 'Dashboard' },
  { to: '/trends', label: 'Meta Trends' },
]

function ThemeToggle() {
  const { dark, toggle } = useTheme()
  return (
    <button
      onClick={toggle}
      aria-label="Toggle dark mode"
      className="neu-button h-11 w-11 text-lg"
    >
      {dark ? '☀️' : '🌙'}
    </button>
  )
}

export default function Layout() {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const title = NAV.find((n) => n.to === location.pathname)?.label

  return (
    <div className="min-h-screen bg-surface text-slate-800 dark:bg-surface-dark dark:text-slate-100">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
        <header className="mb-8">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                SWU Meta Tracker
              </h1>
              {title && (
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {title}
                </p>
              )}
            </div>
            <div className="flex gap-3">
              <ThemeToggle />
              <button
                onClick={() => setOpen(!open)}
                aria-label="Menu"
                aria-expanded={open}
                className="neu-button h-11 w-11 text-xl leading-none"
              >
                {open ? '✕' : '☰'}
              </button>
            </div>
          </div>
          {open && (
            <nav className="neu-card mt-4 flex flex-col p-2">
              {NAV.map(({ to, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                      isActive
                        ? 'text-blue-700 dark:text-blue-400'
                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                    }`
                  }
                >
                  {label}
                </NavLink>
              ))}
            </nav>
          )}
        </header>

        <Outlet />

        <footer className="mt-8 text-center text-xs text-slate-400 dark:text-slate-500">
          data via swuapi.com · refresh-based (no live sync)
        </footer>
      </div>
    </div>
  )
}
