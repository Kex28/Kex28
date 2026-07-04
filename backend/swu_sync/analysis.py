"""Phase 3 analysis for the --json-out fallback path: counter-meta
detection, per-archetype card play-rate trends, and tournament summaries.

Same deal as trends.py: production computes these in the SQL views from
supabase/phase3.sql at read time; this module is the identical math in
Python so local dev needs no database. Windows anchor on the newest
tournament date (SQL uses current_date).
"""

from __future__ import annotations

from datetime import date

SCORE = {"win": 1.0, "draw": 0.5, "loss": 0.0}

# An archetype needs at least this many matches against the top decks
# before its counter-meta win rate means anything.
MIN_VS_TOP_MATCHES = 10


def _tournament_dates(tournaments: list[dict]) -> dict[str, date]:
    return {t["id"]: date.fromisoformat(t["date"]) for t in tournaments if t.get("date")}


def counter_meta(tournaments: list[dict], decklists: list[dict], matches: list[dict],
                 top_ids: list[str], window_days: int = 28) -> list[dict]:
    """Win rate vs. the current top archetypes (mirror matches excluded)
    alongside overall win rate, over the trailing window. A high vs-top
    number with an ordinary overall number is the counter-meta signal."""
    t_date = _tournament_dates(tournaments)
    if not t_date:
        return []
    as_of = max(t_date.values())
    deck_archetype = {d["id"]: d["archetype_id"] for d in decklists}
    top_set = set(top_ids)

    stats: dict[str, dict] = {}
    for match in matches:
        when = t_date.get(match["tournament_id"])
        result = match.get("result")
        if not when or (as_of - when).days >= window_days or result not in SCORE:
            continue
        archetype_id = deck_archetype.get(match["decklist_id"])
        opponent_id = deck_archetype.get(match["opponent_decklist_id"])
        if not archetype_id:
            continue
        s = stats.setdefault(archetype_id, {"overall": [0.0, 0], "vs": {}})
        s["overall"][0] += SCORE[result]
        s["overall"][1] += 1
        if opponent_id in top_set and opponent_id != archetype_id:
            v = s["vs"].setdefault(opponent_id, [0.0, 0])
            v[0] += SCORE[result]
            v[1] += 1

    out = []
    for archetype_id, s in stats.items():
        vs_sum = sum(v[0] for v in s["vs"].values())
        vs_n = sum(v[1] for v in s["vs"].values())
        out.append({
            "archetype_id": archetype_id,
            "overall_win_rate": s["overall"][0] / s["overall"][1] if s["overall"][1] else None,
            "overall_n": s["overall"][1],
            "vs_top_win_rate": vs_sum / vs_n if vs_n >= MIN_VS_TOP_MATCHES else None,
            "vs_top_n": vs_n,
            "matchups": {
                top_id: {"win_rate": v[0] / v[1], "n": v[1]}
                for top_id, v in s["vs"].items() if v[1] > 0
            },
        })
    out.sort(key=lambda r: -(r["vs_top_win_rate"] if r["vs_top_win_rate"] is not None else -1))
    return out


def card_trends(tournaments: list[dict], decklists: list[dict],
                window_days: int = 14) -> list[dict]:
    """Per archetype, each card's inclusion rate (share of the archetype's
    decks playing it) in the trailing window vs. the window before."""
    t_date = _tournament_dates(tournaments)
    if not t_date:
        return []
    as_of = max(t_date.values())

    deck_totals: dict[str, dict[str, int]] = {}
    card_decks: dict[tuple[str, str], dict[str, int]] = {}
    for deck in decklists:
        when = t_date.get(deck["tournament_id"])
        if not when:
            continue
        days_ago = (as_of - when).days
        if days_ago < window_days:
            w = "recent"
        elif days_ago < 2 * window_days:
            w = "prior"
        else:
            continue
        archetype_id = deck["archetype_id"]
        deck_totals.setdefault(archetype_id, {"recent": 0, "prior": 0})[w] += 1
        for card in deck.get("cards") or []:
            key = (archetype_id, card["card_id"])
            card_decks.setdefault(key, {"recent": 0, "prior": 0})[w] += 1

    out = []
    for (archetype_id, card_id), counts in card_decks.items():
        totals = deck_totals[archetype_id]
        recent_rate = counts["recent"] / totals["recent"] if totals["recent"] else None
        prior_rate = counts["prior"] / totals["prior"] if totals["prior"] else None
        out.append({
            "archetype_id": archetype_id,
            "card_id": card_id,
            "recent_rate": recent_rate,
            "prior_rate": prior_rate,
            "rate_delta": (recent_rate or 0) - (prior_rate or 0),
        })
    out.sort(key=lambda r: (r["archetype_id"], -abs(r["rate_delta"])))
    return out


def tournament_summaries(tournaments: list[dict], decklists: list[dict],
                         matches: list[dict], top_standings: int = 8) -> list[dict]:
    """Per tournament: archetype breakdown (decks, share, event win rate)
    and the top of the standings."""
    deck_archetype = {d["id"]: d["archetype_id"] for d in decklists}

    by_tournament: dict[str, list[dict]] = {}
    for deck in decklists:
        by_tournament.setdefault(deck["tournament_id"], []).append(deck)

    wr: dict[tuple[str, str], list[float]] = {}
    for match in matches:
        result = match.get("result")
        archetype_id = deck_archetype.get(match["decklist_id"])
        if result not in SCORE or not archetype_id:
            continue
        entry = wr.setdefault((match["tournament_id"], archetype_id), [0.0, 0])
        entry[0] += SCORE[result]
        entry[1] += 1

    out = []
    for t in sorted(tournaments, key=lambda t: t.get("date") or "", reverse=True):
        decks = by_tournament.get(t["id"], [])
        counts: dict[str, int] = {}
        for deck in decks:
            counts[deck["archetype_id"]] = counts.get(deck["archetype_id"], 0) + 1
        archetype_rows = [
            {
                "archetype_id": archetype_id,
                "decks": n,
                "share": n / len(decks),
                "win_rate": (wr[(t["id"], archetype_id)][0] / wr[(t["id"], archetype_id)][1])
                            if (t["id"], archetype_id) in wr else None,
            }
            for archetype_id, n in sorted(counts.items(), key=lambda kv: -kv[1])
        ]
        standings = [
            {"placement": d["placement"], "player": d["player"], "archetype_id": d["archetype_id"]}
            for d in sorted(decks, key=lambda d: d["placement"] or 10**6)[:top_standings]
        ]
        out.append({**{k: t[k] for k in ("id", "name", "date", "tier", "player_count")},
                    "deck_count": len(decks),
                    "archetypes": archetype_rows,
                    "standings": standings})
    return out
