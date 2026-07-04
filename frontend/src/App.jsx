import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import ArchetypeDetail from './pages/ArchetypeDetail.jsx'
import Archetypes from './pages/Archetypes.jsx'
import CounterMeta from './pages/CounterMeta.jsx'
import Dashboard from './pages/Dashboard.jsx'
import TournamentDetail from './pages/TournamentDetail.jsx'
import Tournaments from './pages/Tournaments.jsx'
import Trends from './pages/Trends.jsx'
import { ThemeProvider } from './theme.jsx'

export default function App() {
  return (
    <ThemeProvider>
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
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )
}
