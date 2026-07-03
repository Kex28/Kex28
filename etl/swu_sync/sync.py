"""Sync entrypoint — Phase 1 pull.

Pulls the open (keyless) swuapi endpoints and lands them in Supabase:

    archetypes  ->  archetypes table          (upsert on id)
    meta        ->  meta_snapshots table      (new snapshot row per pull)
    cards       ->  cards table               (upsert on id, --with-cards only)

Usage:
    swu-sync                     # real pull into Supabase (needs env vars)
    swu-sync --with-cards        # also refresh the card catalogue
    swu-sync --dry-run           # pull from swuapi, print what would be written
    swu-sync --fixtures          # no network at all: use bundled sample data
    swu-sync --fixtures --json   # emit rows as JSON (feeds the frontend demo)

The Phase 2 pull sequence (tournaments -> standings/decklists -> matches) is
sketched in phase2_sync() and stays dormant until SWUAPI_KEY is secured.
"""

from __future__ import annotations

import argparse
import json
import logging
import sys
from datetime import datetime, timezone
from importlib import resources

from .config import Settings
from .supabase_writer import DryRunWriter, SupabaseWriter
from .swuapi_client import SwuApiClient
from . import transforms

logger = logging.getLogger("swu_sync")


def load_fixture(name: str) -> list[dict]:
    with resources.files("swu_sync.fixtures").joinpath(name).open() as fh:
        return json.load(fh)


def phase1_sync(client: SwuApiClient | None, writer, *, with_cards: bool = False,
                fixtures: bool = False) -> dict[str, int]:
    """Run the Phase 1 pull. Returns row counts per table."""
    snapshot_at = datetime.now(timezone.utc).isoformat()

    if fixtures:
        archetypes_raw = load_fixture("archetypes.json")
        meta_raw = load_fixture("meta.json")
        cards_raw = load_fixture("cards.json") if with_cards else []
    else:
        assert client is not None
        archetypes_raw = client.get_archetypes()
        meta_raw = client.get_meta()
        cards_raw = client.get_cards() if with_cards else []

    counts = {}
    counts["archetypes"] = writer.upsert(
        "archetypes", [transforms.archetype_row(a) for a in archetypes_raw],
        on_conflict="id")
    counts["meta_snapshots"] = writer.upsert(
        "meta_snapshots", [transforms.meta_snapshot_row(m, snapshot_at) for m in meta_raw],
        on_conflict="snapshot_at,archetype_id")
    if with_cards:
        counts["cards"] = writer.upsert(
            "cards", [transforms.card_row(c) for c in cards_raw],
            on_conflict="id")
    return counts


def phase2_sync(client: SwuApiClient, writer, since: str) -> None:
    """Phase 2 pull sequence (requires SWUAPI_KEY). Land raw first, compute nothing.

    1. /tournaments?since=<date>          -> tournaments
    2. per tournament: standings+decklists -> decklists
    3. /matches?tournament_id=:id          -> matches
    """
    tournaments = client.get_tournaments(since=since)
    writer.upsert("tournaments", [
        {
            "id": str(t.get("id")),
            "name": t.get("name", "Unknown"),
            "date": t.get("date"),
            "tier": t.get("tier"),
            "player_count": t.get("player_count"),
            "raw": t,
        } for t in tournaments
    ], on_conflict="id")

    for t in tournaments:
        tid = str(t.get("id"))
        decklists = client.get_decklists(tid)
        writer.upsert("decklists", [
            {
                "id": str(d.get("id")),
                "tournament_id": tid,
                "archetype_id": d.get("archetype_id"),
                "player": d.get("player"),
                "placement": d.get("placement"),
                "cards_json": d.get("cards"),
                "raw": d,
            } for d in decklists
        ], on_conflict="id")

        matches = client.get_matches(tid)
        writer.upsert("matches", [
            {
                "id": str(m.get("id")),
                "tournament_id": tid,
                "decklist_id": m.get("decklist_id"),
                "opponent_decklist_id": m.get("opponent_decklist_id"),
                "round": m.get("round"),
                "result": m.get("result"),
                "raw": m,
            } for m in matches
        ], on_conflict="id")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="SWU Meta Tracker sync job")
    parser.add_argument("--with-cards", action="store_true",
                        help="also refresh the full card catalogue (slower; weekly is plenty)")
    parser.add_argument("--dry-run", action="store_true",
                        help="pull from swuapi but only print what would be written")
    parser.add_argument("--fixtures", action="store_true",
                        help="skip the network entirely and use bundled sample data")
    parser.add_argument("--json", action="store_true",
                        help="with --dry-run/--fixtures: print collected rows as JSON")
    args = parser.parse_args(argv)

    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
    settings = Settings.from_env()

    client = None
    if not args.fixtures:
        client = SwuApiClient(settings.swuapi_base_url, settings.swuapi_key)

    if args.dry_run or args.fixtures and not (settings.supabase_url and settings.supabase_service_role_key):
        writer = DryRunWriter()
    elif settings.supabase_url and settings.supabase_service_role_key:
        writer = SupabaseWriter(settings.supabase_url, settings.supabase_service_role_key)
    else:
        parser.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required "
                     "(or pass --dry-run / --fixtures)")

    counts = phase1_sync(client, writer, with_cards=args.with_cards, fixtures=args.fixtures)
    logger.info("sync complete: %s", counts)

    if args.json and isinstance(writer, DryRunWriter):
        print(transforms.dumps(writer.written.get("meta_snapshots", [])))
    return 0


if __name__ == "__main__":
    sys.exit(main())
