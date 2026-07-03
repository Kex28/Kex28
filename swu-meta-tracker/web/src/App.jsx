import { Route, Routes } from 'react-router-dom'
import HamburgerMenu from './components/HamburgerMenu'
import ThemeToggle from './components/ThemeToggle'
import { AuthProvider } from './context/AuthContext'
import About from './pages/About'
import Archetypes from './pages/Archetypes'
import Cards from './pages/Cards'
import CounterMeta from './pages/CounterMeta'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import MetaTrends from './pages/MetaTrends'
import MyDecks from './pages/MyDecks'
import Tournaments from './pages/Tournaments'
import Watchlist from './pages/Watchlist'

export default function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen">
        <header className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <HamburgerMenu />
          <span className="font-semibold tracking-wide">SWU Meta Tracker</span>
          <ThemeToggle />
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/trends" element={<MetaTrends />} />
            <Route path="/counter-meta" element={<CounterMeta />} />
            <Route path="/tournaments" element={<Tournaments />} />
            <Route path="/archetypes" element={<Archetypes />} />
            <Route path="/cards" element={<Cards />} />
            <Route path="/watchlist" element={<Watchlist />} />
            <Route path="/my-decks" element={<MyDecks />} />
            <Route path="/about" element={<About />} />
            <Route path="/login" element={<Login />} />
          </Routes>
        </main>
      </div>
    </AuthProvider>
  )
}
