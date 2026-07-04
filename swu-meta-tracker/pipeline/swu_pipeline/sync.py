"""Phase 1 sync job: open swuapi.com endpoints -> Supabase.

Lands raw data only — no derived stats are computed during the pull
(trend math happens at read time / in SQL, per the project spec).

Run:  python -m swu_pipeline.sync
"""

from __future__ import annotations

import json
import sys
import uuid
from datetime import datetime, timezone

from .config import Settings
from .supabase_io import make_writer
from .swuapi import SwuApiClient

JOB_NAME = "phase1-open-endpoints"


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def map_set(raw: dict, stamp: str) -> dict:
    return {
        "id": raw.get("code") or raw["id"],
        "name": raw["name"],
        "released_on": raw.get("released_on"),
        "last_updated_at": stamp,
    }


def map_card(raw: dict, stamp: str) -> dict:
    return {
        "id": raw["id"],
        "set_id": raw.get("set"),
        "name": raw["name"],
        "subtitle": raw.get("subtitle"),
        "type": raw.get("type"),
        "aspects": raw.get("aspects", []),
        "cost": raw.get("cost"),
        "rarity": raw.get("rarity"),
        "raw": raw,
        "last_updated_at": stamp,
    }


def map_archetype(raw: dict, stamp: str) -> dict:
    return {
        "id": raw["id"],
        "name": raw["name"],
        "leader": raw["leader"],
        "base": raw["base"],
        "aspect": raw.get("aspect"),
        "last_updated_at": stamp,
    }


def map_meta_entry(raw: dict, captured_at: str, window: str | None, stamp: str) -> dict:
    return {
        "archetype_id": raw["archetype_id"],
        "captured_at": captured_at,
        "meta_share": raw["meta_share"],
        "win_rate": raw.get("win_rate"),
        "deck_count": raw.get("deck_count"),
        "match_count": raw.get("match_count"),
        "source_window": window,
        "last_updated_at": stamp,
    }


def run(settings: Settings | None = None) -> dict:
    settings = settings or Settings()
    client = SwuApiClient(settings)
    writer = make_writer(settings)

    run_id = str(uuid.uuid4())
    started_at = _now()
    writer.upsert(
        "sync_runs",
        [{"id": run_id, "job": JOB_NAME, "started_at": started_at, "status": "running"}],
    )

    counts: dict[str, int] = {}
    try:
        stamp = _now()

        sets = [map_set(s, stamp) for s in client.get_sets()]
        counts["sets"] = writer.upsert("sets", sets)

        cards = [map_card(c, stamp) for c in client.get_cards()]
        counts["cards"] = writer.upsert("cards", cards)

        archetypes = [map_archetype(a, stamp) for a in client.get_archetypes()]
        counts["archetypes"] = writer.upsert("archetypes", archetypes)

        meta = client.get_current_meta()
        captured_at = meta.get("captured_at") or stamp
        window = meta.get("window")
        entries = [
            map_meta_entry(e, captured_at, window, stamp) for e in meta.get("entries", [])
        ]
        counts["meta_snapshots"] = writer.upsert(
            "meta_snapshots", entries, on_conflict="archetype_id,captured_at"
        )

        writer.upsert(
            "sync_runs",
            [{
                "id": run_id,
                "job": JOB_NAME,
                "started_at": started_at,
                "finished_at": _now(),
                "status": "ok",
                "detail": counts,
            }],
        )
        return {"status": "ok", "counts": counts}
    except Exception as exc:
        writer.upsert(
            "sync_runs",
            [{
                "id": run_id,
                "job": JOB_NAME,
                "started_at": started_at,
                "finished_at": _now(),
                "status": "error",
                "detail": {"error": str(exc), "counts": counts},
            }],
        )
        raise
    finally:
        client.close()
        writer.close()


if __name__ == "__main__":
    summary = run()
    json.dump(summary, sys.stdout, indent=2)
    print()
