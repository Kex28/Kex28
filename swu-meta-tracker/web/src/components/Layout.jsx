import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";

const NAV = [
  { to: "/", label: "Dashboard" },
  { to: "/trends", label: "Meta Trends" },
  { to: "/counter-meta", label: "Counter Meta" },
  { to: "/tournaments", label: "Tournaments" },
  { to: "/archetypes", label: "Archetypes" },
  { to: "/cards", label: "Cards" },
  { to: "/watchlist", label: "Watchlist" },
  { to: "/my-decks", label: "My Decks" },
  { to: "/about", label: "About" },
];

function useTheme() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);
  return [dark, setDark];
}

export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [dark, setDark] = useTheme();
  const location = useLocation();

  // Hamburger pattern on every breakpoint, per the spec.
  useEffect(() => setMenuOpen(false), [location.pathname]);

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-5 sm:px-6">
        <NavLink to="/" className="text-lg font-bold tracking-tight">
          SWU <span style={{ color: "var(--accent)" }}>Meta</span> Tracker
        </NavLink>

        <div className="flex items-center gap-3">
          <button
            type="button"
            className="neu-btn flex items-center justify-center px-3"
            aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
            onClick={() => setDark((d) => !d)}
          >
            {dark ? "☀️" : "🌙"}
          </button>
          <button
            type="button"
            className="neu-btn flex flex-col items-center justify-center gap-1.5 px-3"
            aria-label="Menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
          >
            <span className="block h-0.5 w-5 rounded" style={{ background: "var(--ink)" }} />
            <span className="block h-0.5 w-5 rounded" style={{ background: "var(--ink)" }} />
            <span className="block h-0.5 w-5 rounded" style={{ background: "var(--ink)" }} />
          </button>
        </div>
      </header>

      <AnimatePresence>
        {menuOpen && (
          <motion.nav
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="mx-auto max-w-5xl px-4 pb-4 sm:px-6"
          >
            <div className="neu-card grid gap-1 p-3 sm:grid-cols-3">
              {NAV.map(({ to, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `rounded-xl px-4 py-3 text-sm font-medium transition-colors ${isActive ? "neu-inset" : "hover:opacity-70"}`
                  }
                  style={({ isActive }) => (isActive ? { color: "var(--accent)" } : undefined)}
                >
                  {label}
                </NavLink>
              ))}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>

      <main className="mx-auto max-w-5xl px-4 pb-16 sm:px-6">
        <Outlet />
      </main>
    </div>
  );
}
