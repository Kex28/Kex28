import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Dashboard from './pages/Dashboard.jsx'
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
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )
}
