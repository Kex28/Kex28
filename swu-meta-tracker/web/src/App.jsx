import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import About from "./pages/About";
import Placeholder from "./pages/Placeholder";

const UPCOMING = [
  { path: "/trends", title: "Meta Trends", phase: 2, blurb: "Rising and falling decks — trailing-window meta share comparison with line charts." },
  { path: "/counter-meta", title: "Counter Meta", phase: 3, blurb: "Tech decks with strong records specifically against the current top archetypes." },
  { path: "/tournaments", title: "Tournaments", phase: 3, blurb: "Browse events by weekend, drill into standings, rounds, and matchup graphs." },
  { path: "/archetypes", title: "Archetypes", phase: 3, blurb: "Browse and search every deck with its stats over time." },
  { path: "/cards", title: "Cards", phase: 3, blurb: "Card-level play-rate trends inside each archetype." },
  { path: "/watchlist", title: "Watchlist", phase: 4, blurb: "Decks and archetypes you're personally tracking." },
  { path: "/my-decks", title: "My Decks", phase: 4, blurb: "Your saved SWUDB decks, rendered natively in-app." },
];

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/about" element={<About />} />
        {UPCOMING.map((p) => (
          <Route key={p.path} path={p.path} element={<Placeholder {...p} />} />
        ))}
      </Route>
    </Routes>
  );
}
