#!/usr/bin/env python3
"""Deterministically regenerate the tournament fixture payloads
(tournaments.json, decklists.json, matches.json, cards.json).

The fixtures simulate 6 weekends of events with archetype popularity
drifting over time (leia-red and vader-blue rising, sabine-ecl and
quinlan-green falling) so the risers/fallers logic has something real to
detect. Match results are drawn from per-archetype strengths, so win rates
are plausible too.

Each decklist also carries a card list built from its archetype's pool:
core cards at a steady ~92% inclusion plus flex cards whose inclusion
rates drift over the six weeks — that drift is what the Phase 3
card-play-rate trends surface. cards.json is regenerated to catalog every
card the pools reference. Run from backend/:
python fixtures/generate_fixtures.py
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

# Real SWU card names, assigned to per-archetype pools below.
CARD_NAMES = [
    "Daring Raid", "Restock", "Waylay", "Bravado", "Surprise Strike",
    "Rivals' Fall", "Overwhelming Barrage", "Devotion", "Resupply",
    "Smuggling Compartment", "Asteroid Sanctuary", "Cartel Turncoat",
    "Pirated Starfighter", "Guerilla Attack Pod", "Volunteer Soldier",
    "Battlefield Marine", "Wing Leader", "Fleet Lieutenant",
    "Consular Security Force", "Vigilant Honor Guards", "Echo Base Defender",
    "Bright Hope", "Medal Ceremony", "Rebel Assault", "U-Wing Reinforcement",
    "Alliance X-Wing", "Red Three", "Rogue Squadron Skirmisher", "Snowspeeder",
    "Cargo Juggernaut", "System Patrol Craft", "Superlaser Technician",
    "Death Star Stormtrooper", "First Legion Snowtrooper", "AT-ST",
    "Occupier Siege Tank", "Imperial Interceptor", "TIE Advanced",
    "Ruthless Raider", "Emperor's Royal Guard", "Fifth Brother",
    "Seventh Sister", "Grand Inquisitor", "Force Choke",
    "Power of the Dark Side", "Vader's Lightsaber", "Cad Bane", "Bossk",
    "Greedo", "Jabba the Hutt", "Bib Fortuna", "Jawa Scavenger",
    "Mining Guild TIE Fighter", "Outer Rim Headhunter", "Pyke Sentinel",
    "Swoop Racer", "Syndicate Lackeys", "Chewbacca", "Millennium Falcon",
    "Luke's Lightsaber", "Admiral Ackbar", "Home One", "Redemption",
    "Bail Organa", "Mon Mothma", "C-3PO", "R2-D2", "K-2SO", "Ezra Bridger",
    "Kanan Jarrus", "Hera Syndulla", "Chopper", "Zeb Orrelios", "The Ghost",
    "Phantom II", "Moisture Farmer", "21B Surgical Droid", "Aayla Secura",
    "Battle Droid Legion", "General Grievous", "Count Dooku", "Darth Maul",
]

# Flex-slot inclusion drift (start rate -> end rate over the six weeks);
# core cards hold steady. A card jumping 15% -> 80% is exactly the "why is
# this deck rising" signal the spec wants surfaced.
FLEX_DRIFT = [(0.15, 0.80), (0.25, 0.60), (0.75, 0.25), (0.60, 0.35), (0.50, 0.50)]
CORE_RATE = 0.92
SHARED_RATE = 0.65


def build_card_pools() -> tuple[list[dict], dict[str, list[tuple[str, float, float]]]]:
    """Returns (cards catalog, archetype_id -> [(card_id, start_rate, end_rate)])."""
    names = iter(CARD_NAMES)
    catalog, pools = [], {}
    next_id = 1

    def new_card() -> str:
        nonlocal next_id
        cid = f"C{next_id:03d}"
        next_id += 1
        catalog.append({
            "id": cid,
            "name": next(names),
            "set": rng.choice(["SOR", "SHD", "TWI", "JTL"]),
            "type": rng.choice(["Unit", "Unit", "Unit", "Event", "Upgrade"]),
            "aspects": [],
            "cost": rng.randint(1, 7),
            "image": None,
        })
        return cid

    shared = [(new_card(), SHARED_RATE, SHARED_RATE) for _ in range(2)]
    for archetype_id, _, _, _ in DRIFT:
        pool = list(shared)
        pool += [(new_card(), CORE_RATE, CORE_RATE) for _ in range(4)]
        pool += [(new_card(), start, end) for start, end in FLEX_DRIFT]
        pools[archetype_id] = pool
    return catalog, pools


def deck_cards(pool: list[tuple[str, float, float]], progress: float) -> list[dict]:
    out = []
    for card_id, start, end in pool:
        if rng.random() < start + (end - start) * progress:
            out.append({"card_id": card_id, "count": 3 if rng.random() < 0.8 else 2})
    return out


def weights(progress: float) -> list[float]:
    raw = [start + (end - start) * progress for _, start, end in
           [(a, s, e) for a, s, e, _ in DRIFT]]
    total = sum(raw)
    return [w / total for w in raw]


def main() -> None:
    tournaments, decklists, matches = [], [], []
    strength = {a: s for a, _, _, s in DRIFT}
    ids = [a for a, _, _, _ in DRIFT]
    catalog, pools = build_card_pools()

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
                    "cards": deck_cards(pools[archetype], progress),
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
    (OUT_DIR / "decklists.json").write_text(json.dumps({"decklists": decklists}) + "\n")
    (OUT_DIR / "matches.json").write_text(json.dumps({"matches": matches}) + "\n")
    (OUT_DIR / "cards.json").write_text(json.dumps({"cards": catalog}, indent=2) + "\n")
    print(f"wrote {len(tournaments)} tournaments, {len(decklists)} decklists, "
          f"{len(matches)} match rows, {len(catalog)} cards")


if __name__ == "__main__":
    main()
