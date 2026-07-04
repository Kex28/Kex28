#!/usr/bin/env python3
"""Phase 1 sync: pull cards/sets/archetypes/current meta (open endpoints,
no API key) and land them in Supabase.

Usage:
  python sync.py                       # live API -> Supabase
  python sync.py --fixtures            # local fixture payloads -> Supabase
  python sync.py --fixtures --json-out ../frontend/public/sample-data.json
                                       # local payloads -> JSON file (no
                                       # Supabase needed; the frontend falls
                                       # back to this file in dev)

Per the spec, the pull lands raw-ish rows only — no derived stats are
computed here. Every row carries last_updated_at (set by a DB default /
trigger in schema.sql; for --json-out we stamp it client-side).
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

from swu_sync import analysis, trends
from swu_sync.swuapi_client import (
    SwuApiClient,
    normalize_archetypes,
    normalize_cards,
    normalize_current_meta,
    normalize_decklists,
    normalize_matches,
    normalize_sets,
    normalize_tournaments,
)

# How far back each run re-pulls tournament data. 28 days covers both trend
# windows, and upserts make the re-pull idempotent.
LOOKBACK_DAYS = 28


def pull(client: SwuApiClient) -> dict[str, list[dict]]:
    archetypes = normalize_archetypes(client.fetch_archetypes())
    meta_entries = normalize_current_meta(client.fetch_current_meta())
    cards = normalize_cards(client.fetch_cards())
    sets = normalize_sets(client.fetch_sets())

    known = {a["id"] for a in archetypes}
    orphans = [m["archetype_id"] for m in meta_entries if m["archetype_id"] not in known]
    if orphans:
        print(f"warning: {len(orphans)} meta entries reference unknown archetypes: {orphans[:5]}",
              file=sys.stderr)

    data = {"archetypes": archetypes, "meta_entries": meta_entries, "cards": cards, "sets": sets,
            "tournaments": [], "decklists": [], "matches": []}

    # Phase 2: keyed endpoints. Skip gracefully (Phase 1 data still syncs)
    # when no key is configured.
    if not client.has_key:
        print("warning: SWUAPI_API_KEY not set — skipping tournaments/decklists/matches",
              file=sys.stderr)
        return data

    since = (datetime.now(timezone.utc).date() - timedelta(days=LOOKBACK_DAYS)).isoformat()
    tournaments = normalize_tournaments(
        client.fetch_tournaments(since=None if client.use_fixtures else since))
    data["tournaments"] = tournaments
    for tournament in tournaments:
        tid = tournament["id"]
        data["decklists"] += normalize_decklists(client.fetch_tournament_decklists(tid), tid)
        data["matches"] += normalize_matches(client.fetch_matches(tid), tid)
    return data


def load_supabase(data: dict[str, list[dict]]) -> None:
    from swu_sync.supabase_loader import SupabaseLoader

    loader = SupabaseLoader()
    snapshot_date = datetime.now(timezone.utc).date().isoformat()
    loader.upsert("sets", data["sets"], on_conflict="code")
    loader.upsert("cards", data["cards"], on_conflict="id")
    loader.upsert("archetypes", data["archetypes"], on_conflict="id")
    loader.upsert(
        "meta_snapshot_entries",
        [{**entry, "snapshot_date": snapshot_date} for entry in data["meta_entries"]],
        on_conflict="snapshot_date,archetype_id",
    )
    loader.upsert("tournaments", data["tournaments"], on_conflict="id")
    loader.upsert(
        "decklists",
        [{k: v for k, v in deck.items() if k != "cards"} for deck in data["decklists"]],
        on_conflict="id",
    )
    loader.upsert(
        "decklist_cards",
        [{"decklist_id": deck["id"], **card}
         for deck in data["decklists"] for card in deck["cards"]],
        on_conflict="decklist_id,card_id",
    )
    loader.upsert("matches", data["matches"], on_conflict="id")


def write_json(data: dict[str, list[dict]], out_path: Path) -> None:
    now = datetime.now(timezone.utc).isoformat()
    trend_rows = trends.archetype_trends(data["tournaments"], data["decklists"], data["matches"])
    top_ids = [r["archetype_id"] for r in
               sorted(trend_rows, key=lambda r: -(r["recent_share"] or 0))[:3]]
    payload = {
        "last_updated_at": now,
        "archetypes": data["archetypes"],
        "meta_entries": data["meta_entries"],
        "cards": [{"id": c["id"], "name": c["name"]} for c in data["cards"]],
        # Pre-computed here only for the no-database fallback; production
        # reads the equivalent SQL views instead.
        "weekly_shares": trends.weekly_shares(data["tournaments"], data["decklists"]),
        "trends": trend_rows,
        "top_archetypes": top_ids,
        "counter_meta": analysis.counter_meta(
            data["tournaments"], data["decklists"], data["matches"], top_ids),
        "card_trends": analysis.card_trends(data["tournaments"], data["decklists"]),
        "card_trends_overall": analysis.card_trends_overall(
            data["tournaments"], data["decklists"]),
        "tournaments": analysis.tournament_summaries(
            data["tournaments"], data["decklists"], data["matches"]),
    }
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(payload, indent=2) + "\n")
    print(f"wrote {out_path}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--fixtures", action="store_true",
                        help="read backend/fixtures/*.json instead of hitting the live API")
    parser.add_argument("--json-out", type=Path, default=None,
                        help="write a JSON snapshot to this path instead of loading Supabase")
    args = parser.parse_args()

    client = SwuApiClient(use_fixtures=args.fixtures)
    data = pull(client)
    counts = {name: len(rows) for name, rows in data.items()}
    print(f"pulled: {counts}")

    if args.json_out:
        write_json(data, args.json_out)
    else:
        load_supabase(data)
        print("loaded into Supabase")


if __name__ == "__main__":
    main()
