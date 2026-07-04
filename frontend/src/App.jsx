import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import { AuthProvider } from './lib/auth.jsx'
import About from './pages/About.jsx'
import ArchetypeDetail from './pages/ArchetypeDetail.jsx'
import Archetypes from './pages/Archetypes.jsx'
import CounterMeta from './pages/CounterMeta.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Login from './pages/Login.jsx'
import MyDecks from './pages/MyDecks.jsx'
import TournamentDetail from './pages/TournamentDetail.jsx'
import Tournaments from './pages/Tournaments.jsx'
import Trends from './pages/Trends.jsx'
import Watchlist from './pages/Watchlist.jsx'
import { ThemeProvider } from './theme.jsx'

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="trends" element={<Trends />} />
              <Route path="counter" element={<CounterMeta />} />
              <Route path="tournaments" element={<Tournaments />} />
              <Route path="tournaments/:id" element={<TournamentDetail />} />
              <Route path="archetypes" element={<Archetypes />} />
              <Route path="archetypes/:id" element={<ArchetypeDetail />} />
              <Route path="watchlist" element={<Watchlist />} />
              <Route path="decks" element={<MyDecks />} />
              <Route path="about" element={<About />} />
              <Route path="login" element={<Login />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}
