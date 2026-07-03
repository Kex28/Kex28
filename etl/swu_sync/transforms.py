"""Normalise upstream swuapi payloads into our table rows.

Kept deliberately thin — the pull sequence lands raw data and computes nothing.
These functions only rename/shape fields; the full upstream object is preserved
in the `raw` column wherever the schema has one, so nothing is lost if the
upstream shape turns out to carry more than we mapped.

Field names are best-effort against the (unverified) swuapi shapes; `_pick`
tolerates a few plausible aliases per field so small upstream differences
don't break the pull.
"""

from __future__ import annotations

import json
from typing import Any


def _pick(obj: dict, *names: str, default: Any = None) -> Any:
    for name in names:
        if name in obj and obj[name] is not None:
            return obj[name]
    return default


def _as_fraction(value: Any) -> float | None:
    """Accept 0.231 or 23.1 (percent) and return a 0..1 fraction."""
    if value is None:
        return None
    value = float(value)
    return value / 100.0 if value > 1.0 else value


def archetype_row(item: dict) -> dict:
    return {
        "id": str(_pick(item, "id", "archetype_id", "slug")),
        "name": _pick(item, "name", "archetype", default="Unknown"),
        "leader": _pick(item, "leader", "leader_name"),
        "base": _pick(item, "base", "base_name"),
        "aspect": _pick(item, "aspect", "aspects"),
    }


def meta_snapshot_row(item: dict, snapshot_at: str) -> dict:
    return {
        "snapshot_at": snapshot_at,
        "archetype_id": str(_pick(item, "archetype_id", "id", "slug")),
        "meta_share": _as_fraction(_pick(item, "meta_share", "share", "meta_percentage")),
        "win_rate": _as_fraction(_pick(item, "win_rate", "winrate", "win_percentage")),
        "deck_count": _pick(item, "deck_count", "decks", "count"),
        "raw": item,
    }


def card_row(item: dict) -> dict:
    aspects = _pick(item, "aspects", "aspect", default=[])
    if isinstance(aspects, str):
        aspects = [aspects]
    return {
        "id": str(_pick(item, "id", "card_id", "Number", "number")),
        "name": _pick(item, "name", "Name", default="Unknown"),
        "set_code": _pick(item, "set", "set_code", "Set"),
        "card_number": str(_pick(item, "number", "Number", default="")) or None,
        "aspects": aspects,
        "card_type": _pick(item, "type", "card_type", "Type"),
        "cost": _pick(item, "cost", "Cost"),
        "raw": item,
    }


def dumps(rows: list[dict]) -> str:
    return json.dumps(rows, indent=2, default=str)
