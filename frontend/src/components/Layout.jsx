import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import ThemeToggle from "./ThemeToggle";

export const NAV_ITEMS = [
  { to: "/", label: "Home", end: true },
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

export default function Layout() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 px-4 py-3 sm:px-8 flex items-center justify-between"
              style={{ background: "var(--bg)" }}>
        <button
          type="button"
          className="neu-btn px-4 text-xl"
          onClick={() => setOpen(true)}
          aria-label="Open navigation menu"
          aria-expanded={open}
        >
          ☰
        </button>
        <NavLink to="/" className="font-semibold tracking-tight text-lg" style={{ color: "var(--ink)" }}>
          SWU Meta Tracker
        </NavLink>
        <ThemeToggle />
      </header>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="scrim"
              className="fixed inset-0 z-40 bg-black/30"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => setOpen(false)}
            />
            <motion.nav
              key="drawer"
              className="fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] p-6 flex flex-col gap-2 overflow-y-auto"
              style={{ background: "var(--bg)" }}
              initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
              transition={{ type: "tween", duration: 0.2, ease: "easeOut" }}
              aria-label="Main navigation"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="font-semibold" style={{ color: "var(--ink)" }}>Menu</span>
                <button type="button" className="neu-btn px-3" onClick={() => setOpen(false)} aria-label="Close menu">
                  ✕
                </button>
              </div>
              {NAV_ITEMS.map(({ to, label, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  onClick={() => setOpen(false)}
                  className="neu-btn px-4 py-3 text-sm font-medium flex items-center"
                  style={({ isActive }) => ({
                    color: isActive ? "var(--accent)" : "var(--ink-2)",
                    boxShadow: isActive
                      ? "inset 4px 4px 8px var(--shadow-dark), inset -4px -4px 8px var(--shadow-light)"
                      : undefined,
                  })}
                >
                  {label}
                </NavLink>
              ))}
            </motion.nav>
          </>
        )}
      </AnimatePresence>

      <motion.main
        key={location.pathname}
        className="px-4 sm:px-8 pb-16 pt-4 mx-auto max-w-5xl"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        <Outlet />
      </motion.main>
    </div>
  );
}
