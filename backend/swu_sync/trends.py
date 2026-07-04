"""Trailing-window trend math for the --json-out fallback path.

In production these numbers come from the SQL views in
supabase/phase2.sql (`meta_share_weekly`, `archetype_trends`) computed at
read time; this module is the same math in Python so local dev needs no
database. One deliberate difference: SQL anchors windows on current_date,
here we anchor on the newest tournament date so fixture output is stable
no matter when it's generated.

Window definition (matches the spec): recent = trailing 14 days,
prior = the 14 days before that. Shares are each archetype's fraction of
all decklists in the window; win rate averages win=1 / draw=0.5 / loss=0
over the archetype's match rows (matches are stored once per perspective).
"""

from __future__ import annotations

from datetime import date, timedelta


def _week_start(d: date) -> date:
    return d - timedelta(days=d.weekday())


def current_meta_entries(tournaments: list[dict], decklists: list[dict],
                         matches: list[dict], window_days: int = 14) -> list[dict]:
    """The Dashboard's "current meta" rows — share / win rate / deck count
    per archetype over the trailing window. Computed from decklists because
    the upstream API has no archetype-share endpoint (its /metas are era
    definitions). Mirrors the current_meta SQL view in supabase/phase2.sql."""
    t_date = {t["id"]: date.fromisoformat(t["date"]) for t in tournaments if t.get("date")}
    if not t_date:
        return []
    as_of = max(t_date.values())

    recent_decks: dict[str, str] = {}  # deck id -> archetype
    counts: dict[str, int] = {}
    for deck in decklists:
        when = t_date.get(deck["tournament_id"])
        if not when or (as_of - when).days >= window_days:
            continue
        recent_decks[deck["id"]] = deck["archetype_id"]
        counts[deck["archetype_id"]] = counts.get(deck["archetype_id"], 0) + 1
    total = sum(counts.values())

    score = {"win": 1.0, "draw": 0.5, "loss": 0.0}
    wr_sum: dict[str, float] = {}
    wr_n: dict[str, int] = {}
    for match in matches:
        archetype_id = recent_decks.get(match["decklist_id"])
        result = match.get("result")
        if not archetype_id or result not in score:
            continue
        wr_sum[archetype_id] = wr_sum.get(archetype_id, 0.0) + score[result]
        wr_n[archetype_id] = wr_n.get(archetype_id, 0) + 1

    return sorted(
        (
            {
                "archetype_id": archetype_id,
                "meta_share": n / total if total else None,
                "win_rate": wr_sum[archetype_id] / wr_n[archetype_id]
                            if wr_n.get(archetype_id) else None,
                "deck_count": n,
            }
            for archetype_id, n in counts.items()
        ),
        key=lambda r: -(r["meta_share"] or 0),
    )


def weekly_shares(tournaments: list[dict], decklists: list[dict]) -> list[dict]:
    t_date = {t["id"]: date.fromisoformat(t["date"]) for t in tournaments if t.get("date")}
    counts: dict[tuple[date, str], int] = {}
    week_totals: dict[date, int] = {}
    for deck in decklists:
        when = t_date.get(deck["tournament_id"])
        if not when:
            continue
        week = _week_start(when)
        counts[(week, deck["archetype_id"])] = counts.get((week, deck["archetype_id"]), 0) + 1
        week_totals[week] = week_totals.get(week, 0) + 1
    return sorted(
        (
            {
                "week": week.isoformat(),
                "archetype_id": archetype_id,
                "deck_count": n,
                "meta_share": n / week_totals[week],
            }
            for (week, archetype_id), n in counts.items()
        ),
        key=lambda r: (r["week"], -r["meta_share"]),
    )


def archetype_trends(tournaments: list[dict], decklists: list[dict],
                     matches: list[dict]) -> list[dict]:
    t_date = {t["id"]: date.fromisoformat(t["date"]) for t in tournaments if t.get("date")}
    if not t_date:
        return []
    as_of = max(t_date.values())

    def window(when: date) -> str | None:
        days_ago = (as_of - when).days
        if 0 <= days_ago < 14:
            return "recent"
        if 14 <= days_ago < 28:
            return "prior"
        return None

    deck_counts: dict[str, dict[str, int]] = {}
    totals = {"recent": 0, "prior": 0}
    deck_window: dict[str, str] = {}
    deck_archetype: dict[str, str] = {}
    for deck in decklists:
        when = t_date.get(deck["tournament_id"])
        w = window(when) if when else None
        deck_archetype[deck["id"]] = deck["archetype_id"]
        if not w:
            continue
        deck_window[deck["id"]] = w
        deck_counts.setdefault(deck["archetype_id"], {"recent": 0, "prior": 0})[w] += 1
        totals[w] += 1

    score = {"win": 1.0, "draw": 0.5, "loss": 0.0}
    wr_sum: dict[str, dict[str, float]] = {}
    wr_n: dict[str, dict[str, int]] = {}
    for match in matches:
        w = deck_window.get(match["decklist_id"])
        result = match.get("result")
        if not w or result not in score:
            continue
        archetype_id = deck_archetype[match["decklist_id"]]
        wr_sum.setdefault(archetype_id, {"recent": 0.0, "prior": 0.0})[w] += score[result]
        wr_n.setdefault(archetype_id, {"recent": 0, "prior": 0})[w] += 1

    out = []
    for archetype_id, counts in deck_counts.items():
        recent_share = counts["recent"] / totals["recent"] if totals["recent"] else None
        prior_share = counts["prior"] / totals["prior"] if totals["prior"] else None
        n = wr_n.get(archetype_id, {"recent": 0, "prior": 0})
        s = wr_sum.get(archetype_id, {"recent": 0.0, "prior": 0.0})
        recent_wr = s["recent"] / n["recent"] if n["recent"] else None
        prior_wr = s["prior"] / n["prior"] if n["prior"] else None
        out.append({
            "archetype_id": archetype_id,
            "recent_decks": counts["recent"],
            "prior_decks": counts["prior"],
            "recent_share": recent_share,
            "prior_share": prior_share,
            "share_delta": (recent_share - prior_share)
                           if recent_share is not None and prior_share is not None else None,
            "recent_win_rate": recent_wr,
            "prior_win_rate": prior_wr,
            "win_rate_delta": (recent_wr - prior_wr)
                              if recent_wr is not None and prior_wr is not None else None,
        })
    out.sort(key=lambda r: -(r["share_delta"] if r["share_delta"] is not None else -1))
    return out
