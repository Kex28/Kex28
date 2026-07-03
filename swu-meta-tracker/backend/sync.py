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
from datetime import datetime, timezone
from pathlib import Path

from swu_sync.swuapi_client import (
    SwuApiClient,
    normalize_archetypes,
    normalize_cards,
    normalize_current_meta,
    normalize_sets,
)


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

    return {"archetypes": archetypes, "meta_entries": meta_entries, "cards": cards, "sets": sets}


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


def write_json(data: dict[str, list[dict]], out_path: Path) -> None:
    now = datetime.now(timezone.utc).isoformat()
    payload = {
        "last_updated_at": now,
        "archetypes": data["archetypes"],
        "meta_entries": data["meta_entries"],
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
