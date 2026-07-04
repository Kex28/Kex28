import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";

const NAV_ITEMS = [
  { to: "/", label: "Home" },
  { to: "/trends", label: "Meta Trends" },
  { to: "/counter-meta", label: "Counter Meta" },
  { to: "/tournaments", label: "Tournaments" },
  { to: "/archetypes", label: "Archetypes" },
  { to: "/cards", label: "Cards" },
  { to: "/watchlist", label: "Watchlist" },
  { to: "/my-decks", label: "My Decks" },
  { to: "/about", label: "About" },
  { to: "/login", label: "Login / Profile" },
];

function useTheme() {
  const [dark, setDark] = useState(
    () => document.documentElement.dataset.theme === "dark",
  );
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    localStorage.setItem("swu-theme", dark ? "dark" : "light");
  }, [dark]);
  return { dark, toggle: () => setDark((d) => !d) };
}

export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { dark, toggle } = useTheme();
  const location = useLocation();

  // Close the drawer on navigation
  useEffect(() => setMenuOpen(false), [location.pathname]);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 bg-[var(--page)]/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-4 sm:px-6">
          <motion.button
            whileTap={{ scale: 0.94 }}
            className="neu-btn"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
              {menuOpen ? (
                <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              ) : (
                <path d="M3 5.5h14M3 10h14M3 14.5h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              )}
            </svg>
          </motion.button>

          <NavLink to="/" className="text-lg font-semibold tracking-tight">
            SWU Meta Tracker
          </NavLink>

          <motion.button
            whileTap={{ scale: 0.94 }}
            className="neu-btn ml-auto"
            aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
            onClick={toggle}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
              {dark ? (
                <>
                  <circle cx="10" cy="10" r="4" stroke="currentColor" strokeWidth="2" />
                  <path
                    d="M10 1.5v2M10 16.5v2M18.5 10h-2M3.5 10h-2M16 4l-1.4 1.4M5.4 14.6L4 16M16 16l-1.4-1.4M5.4 5.4L4 4"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </>
              ) : (
                <path
                  d="M17 11.5A7 7 0 0 1 8.5 3 7 7 0 1 0 17 11.5Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
              )}
            </svg>
          </motion.button>
        </div>
      </header>

      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-black/30"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMenuOpen(false)}
            />
            <motion.nav
              className="neu-card fixed top-0 left-0 z-50 h-full w-72 max-w-[85vw] overflow-y-auto rounded-l-none p-6"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "tween", duration: 0.22, ease: "easeOut" }}
              aria-label="Main navigation"
            >
              <p className="mb-4 text-xs font-semibold tracking-widest text-[var(--ink-muted)] uppercase">
                Navigate
              </p>
              <ul className="space-y-1">
                {NAV_ITEMS.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      className={({ isActive }) =>
                        `block rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                          isActive
                            ? "neu-inset text-[var(--accent-ink)]"
                            : "text-[var(--ink-2)] hover:text-[var(--ink)]"
                        }`
                      }
                    >
                      {item.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </motion.nav>
          </>
        )}
      </AnimatePresence>

      <main className="mx-auto max-w-5xl px-4 pt-4 pb-16 sm:px-6">
        <Outlet />
      </main>
    </div>
  );
}
