"""Phase 1 sync job: cards, archetypes, and the current meta snapshot.

Land raw data first, compute nothing during the pull itself (see SPEC.md).
Field names on api.swuapi.com are unverified, so normalization accepts a
handful of likely aliases per field and skips rows it can't identify.
"""

import logging
from datetime import datetime, timezone

from .config import Config
from .db import SupabaseRest
from .swuapi import SwuApiClient

log = logging.getLogger(__name__)


def first(raw: dict, *keys, default=None):
    for key in keys:
        if key in raw and raw[key] is not None:
            return raw[key]
    return default


def as_fraction(value):
    """Accept 0..1 fractions or 0..100 percentages; store fractions."""
    if value is None:
        return None
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return number / 100 if number > 1.5 else number


def as_aspect_list(value) -> list[str]:
    if isinstance(value, list):
        return [str(item) for item in value]
    if isinstance(value, str) and value:
        return [part.strip() for part in value.replace("/", ",").split(",") if part.strip()]
    return []


def normalize_archetype(raw: dict, now: str) -> dict | None:
    name = first(raw, "name", "archetype", "title")
    if not name:
        return None
    return {
        "swuapi_id": str(first(raw, "id", "archetype_id", default=name)),
        "name": str(name),
        "leader": first(raw, "leader", "leader_name"),
        "base": first(raw, "base", "base_name"),
        "aspects": as_aspect_list(first(raw, "aspects", "aspect")),
        "last_updated_at": now,
    }


def normalize_card(raw: dict, now: str) -> dict | None:
    name = first(raw, "name", "card_name", "title")
    if not name:
        return None
    set_code = first(raw, "set", "set_code", "Set")
    number = first(raw, "number", "card_number", "Number")
    swudb_id = first(raw, "id", "card_id")
    if swudb_id is None and set_code and number is not None:
        swudb_id = f"{set_code}_{number}"
    if swudb_id is None:
        swudb_id = str(name)
    return {
        "swudb_id": str(swudb_id),
        "name": str(name),
        "set_code": set_code,
        "card_number": str(number) if number is not None else None,
        "card_type": first(raw, "type", "card_type", "Type"),
        "aspects": as_aspect_list(first(raw, "aspects", "aspect", "Aspects")),
        "cost": first(raw, "cost", "Cost"),
        "rarity": first(raw, "rarity", "Rarity"),
        "image_url": first(raw, "image", "image_url", "FrontArt"),
        "last_updated_at": now,
    }


def normalize_meta_row(raw: dict, captured_at: str, now: str) -> dict | None:
    """Returns a meta_snapshots row keyed by archetype *name*; the caller
    resolves the name to our archetype_id after archetypes are upserted."""
    name = first(raw, "archetype", "name", "archetype_name", "deck")
    if not name:
        return None
    return {
        "archetype_name": str(name),
        "captured_at": captured_at,
        "meta_share": as_fraction(first(raw, "meta_share", "metaShare", "share", "percentage")),
        "win_rate": as_fraction(first(raw, "win_rate", "winRate", "winrate")),
        "deck_count": first(raw, "deck_count", "count", "decks"),
        "last_updated_at": now,
    }


def run_phase1(config: Config | None = None) -> None:
    config = config or Config()
    config.validate()

    api = SwuApiClient(config.swuapi_base_url, config.swuapi_api_key)
    db = SupabaseRest(config.supabase_url, config.supabase_service_role_key)

    run = db.insert_returning("sync_runs", {"job": "phase1"})
    now = datetime.now(timezone.utc).isoformat()
    summary: list[str] = []

    try:
        # 1. Archetypes — upsert, then read back to build the name -> id map.
        archetypes = [
            row
            for raw in api.get_list(config.archetypes_path)
            if isinstance(raw, dict) and (row := normalize_archetype(raw, now))
        ]
        db.upsert("archetypes", archetypes, on_conflict="swuapi_id")
        summary.append(f"{len(archetypes)} archetypes")

        stored = db.select("archetypes", {"select": "id,name"})
        id_by_name = {row["name"].casefold(): row["id"] for row in stored}

        # 2. Current meta — one snapshot row per archetype, stamped with this
        #    run's capture time so history accumulates for the trend pages.
        snapshots = []
        for raw in api.get_list(config.meta_path):
            if not isinstance(raw, dict):
                continue
            row = normalize_meta_row(raw, captured_at=now, now=now)
            if not row:
                continue
            archetype_id = id_by_name.get(row.pop("archetype_name").casefold())
            if archetype_id is None:
                log.warning("Meta row for unknown archetype skipped: %s", raw)
                continue
            snapshots.append({"archetype_id": archetype_id, **row})
        db.upsert("meta_snapshots", snapshots, on_conflict="archetype_id,captured_at")
        summary.append(f"{len(snapshots)} meta snapshots")

        # 3. Cards.
        cards = [
            row
            for raw in api.get_list(config.cards_path)
            if isinstance(raw, dict) and (row := normalize_card(raw, now))
        ]
        db.upsert("cards", cards, on_conflict="swudb_id")
        summary.append(f"{len(cards)} cards")

        db.update(
            "sync_runs",
            {"id": run["id"]},
            {"status": "ok", "finished_at": now, "detail": ", ".join(summary)},
        )
        log.info("Phase 1 sync complete: %s", ", ".join(summary))
    except Exception as error:
        db.update(
            "sync_runs",
            {"id": run["id"]},
            {
                "status": "error",
                "finished_at": datetime.now(timezone.utc).isoformat(),
                "detail": str(error)[:500],
            },
        )
        raise
