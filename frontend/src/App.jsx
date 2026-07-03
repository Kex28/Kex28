import { BrowserRouter, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import ComingSoon from "./pages/ComingSoon";
import About from "./pages/About";
import Login from "./pages/Login";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="trends" element={
            <ComingSoon title="Meta Trends" phase="Phase 2"
              description="Rising and falling decks — trailing 14-day window vs. the prior window, with meta-share line charts over time. Needs the gated swuapi key for tournament data." />
          } />
          <Route path="counter-meta" element={
            <ComingSoon title="Counter Meta" phase="Phase 3"
              description="Decks that aren't top-tier overall but hold a strong record specifically against the current top 3–5 archetypes." />
          } />
          <Route path="tournaments" element={
            <ComingSoon title="Tournaments" phase="Phase 3"
              description="Browse events by weekend, drill into round-by-round results, standings, and matchup breakdowns." />
          } />
          <Route path="archetypes" element={
            <ComingSoon title="Archetypes" phase="Phase 2"
              description="Browse and search every deck with filters for leader, base, aspect, date range, and tournament tier." />
          } />
          <Route path="cards" element={
            <ComingSoon title="Cards" phase="Phase 3"
              description="Card-level play-rate trends — which cards are showing up more or less inside a given archetype over time." />
          } />
          <Route path="watchlist" element={
            <ComingSoon title="Watchlist" phase="Phase 4"
              description="Save specific decks and archetypes to your personal watchlist for updates." />
          } />
          <Route path="my-decks" element={
            <ComingSoon title="My Decks" phase="Phase 4"
              description="Your saved decks pulled from SWUDB, cached and rendered natively in-app — no linking out." />
          } />
          <Route path="about" element={<About />} />
          <Route path="login" element={<Login />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
