import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import About from "./pages/About";
import Dashboard from "./pages/Dashboard";
import Stub from "./pages/Stub";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route
          path="trends"
          element={
            <Stub
              title="Meta Trends"
              phase="Phase 2"
              description="Rising and falling archetypes: this two weeks vs. the prior two, with line charts of meta share over time and likely reasons behind each move."
            />
          }
        />
        <Route
          path="counter-meta"
          element={
            <Stub
              title="Counter Meta"
              phase="Phase 3"
              description="Decks that aren't top-tier overall but post strong records specifically against the current top archetypes."
            />
          }
        />
        <Route
          path="tournaments"
          element={
            <Stub
              title="Tournaments"
              phase="Phase 3"
              description="Browse events by weekend, then drill into round-by-round results, standings, and matchup breakdowns."
            />
          }
        />
        <Route
          path="archetypes"
          element={
            <Stub
              title="Archetypes"
              phase="Phase 3"
              description="Search every archetype and see its stats, decklists, and card choices over time."
            />
          }
        />
        <Route
          path="cards"
          element={
            <Stub
              title="Cards"
              phase="Phase 3"
              description="Card-level play-rate trends — which cards are showing up more or less inside each archetype."
            />
          }
        />
        <Route
          path="watchlist"
          element={
            <Stub
              title="Watchlist"
              phase="Phase 4"
              description="Save archetypes and decks you care about and get a focused view of just their movement."
            />
          }
        />
        <Route
          path="my-decks"
          element={
            <Stub
              title="My Decks"
              phase="Phase 4"
              description="Your saved decks, imported from SWUDB and rendered natively here — no linking out."
            />
          }
        />
        <Route path="about" element={<About />} />
        <Route
          path="login"
          element={
            <Stub
              title="Login / Profile"
              phase="Phase 4"
              description="Team accounts via Supabase Auth — each teammate gets their own login, profile, and saved decks."
            />
          }
        />
        <Route
          path="*"
          element={
            <Stub
              title="Not found"
              phase="no phase"
              description="This page doesn't exist. Use the menu to get back on track."
            />
          }
        />
      </Route>
    </Routes>
  );
}
