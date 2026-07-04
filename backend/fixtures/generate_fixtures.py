#!/usr/bin/env python3
"""Deterministically regenerate the Phase 2 fixture payloads
(tournaments.json, decklists.json, matches.json).

The fixtures simulate 6 weekends of events with archetype popularity
drifting over time (leia-red and vader-blue rising, sabine-ecl and
quinlan-green falling) so the risers/fallers logic has something real to
detect. Match results are drawn from per-archetype strengths, so win rates
are plausible too. Run from backend/: python fixtures/generate_fixtures.py
"""

from __future__ import annotations

import json
import math
import random
from datetime import date, timedelta
from pathlib import Path

OUT_DIR = Path(__file__).resolve().parent
rng = random.Random(28)

# (archetype_id, share at week 0, share at final week, match strength)
DRIFT = [
    ("sabine-ecl", 0.22, 0.15, 0.545),
    ("boba-yellow", 0.15, 0.15, 0.53),
    ("han-blue", 0.12, 0.12, 0.515),
    ("iden-red", 0.11, 0.09, 0.49),
    ("kylo-green", 0.09, 0.08, 0.51),
    ("quinlan-green", 0.10, 0.05, 0.475),
    ("leia-red", 0.03, 0.10, 0.54),
    ("vader-blue", 0.04, 0.07, 0.50),
]
TIERS = ["Regional", "Planetary Qualifier", "Store Showdown"]
WEEKENDS = [date(2026, 5, 24) + timedelta(weeks=w) for w in range(6)]


def weights(progress: float) -> list[float]:
    raw = [start + (end - start) * progress for _, start, end in
           [(a, s, e) for a, s, e, _ in DRIFT]]
    total = sum(raw)
    return [w / total for w in raw]


def main() -> None:
    tournaments, decklists, matches = [], [], []
    strength = {a: s for a, _, _, s in DRIFT}
    ids = [a for a, _, _, _ in DRIFT]

    for week_index, sunday in enumerate(WEEKENDS):
        progress = week_index / (len(WEEKENDS) - 1)
        for day_offset in (0, -1):  # Sunday + Saturday events
            event_date = sunday + timedelta(days=day_offset)
            tid = f"t{len(tournaments) + 1:03d}"
            player_count = rng.choice([32, 48, 64, 96])
            tournaments.append({
                "id": tid,
                "name": f"{rng.choice(['Coruscant', 'Tatooine', 'Endor', 'Hoth', 'Naboo', 'Kessel'])} "
                        f"{rng.choice(TIERS)}",
                "date": event_date.isoformat(),
                "tier": rng.choice(TIERS),
                "player_count": player_count,
            })

            event_decks = []
            for seat in range(player_count):
                did = f"{tid}-d{seat + 1:03d}"
                archetype = rng.choices(ids, weights=weights(progress))[0]
                event_decks.append((did, archetype))
            placements = list(range(1, player_count + 1))
            rng.shuffle(placements)
            for (did, archetype), placement in zip(event_decks, placements):
                decklists.append({
                    "id": did,
                    "tournament_id": tid,
                    "archetype_id": archetype,
                    "player": f"Player {did[-3:]}",
                    "placement": placement,
                })

            rounds = max(4, math.ceil(math.log2(player_count)))
            for round_no in range(1, rounds + 1):
                order = event_decks[:]
                rng.shuffle(order)
                for i in range(0, len(order) - 1, 2):
                    (d1, a1), (d2, a2) = order[i], order[i + 1]
                    p_d1_wins = 0.5 + (strength[a1] - strength[a2])
                    d1_wins = rng.random() < p_d1_wins
                    r1, r2 = ("win", "loss") if d1_wins else ("loss", "win")
                    mid = f"{tid}-r{round_no}-{i // 2:03d}"
                    matches.append({"id": f"{mid}-a", "tournament_id": tid, "round": round_no,
                                    "decklist_id": d1, "opponent_decklist_id": d2, "result": r1})
                    matches.append({"id": f"{mid}-b", "tournament_id": tid, "round": round_no,
                                    "decklist_id": d2, "opponent_decklist_id": d1, "result": r2})

    (OUT_DIR / "tournaments.json").write_text(json.dumps({"tournaments": tournaments}, indent=2) + "\n")
    (OUT_DIR / "decklists.json").write_text(json.dumps({"decklists": decklists}, indent=2) + "\n")
    (OUT_DIR / "matches.json").write_text(json.dumps({"matches": matches}) + "\n")
    print(f"wrote {len(tournaments)} tournaments, {len(decklists)} decklists, {len(matches)} match rows")


if __name__ == "__main__":
    main()
