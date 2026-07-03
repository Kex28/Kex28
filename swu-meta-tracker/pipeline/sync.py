"""Phase 1 sync: pull archetypes, cards, and the current meta from the open
swuapi.com endpoints and land them raw in Supabase.

Per the spec's pull rules: land raw data first, compute nothing during the
pull itself. Trend math happens later, in SQL/views, over meta_snapshots.

Usage:
    python sync.py             # pull + write to Supabase
    python sync.py --dry-run   # pull + print row counts, write nothing

Env:
    SWUAPI_BASE                (optional) override https://api.swuapi.com
    SWUAPI_KEY                 (optional) bearer key; not needed for Phase 1
    SUPABASE_URL               required unless --dry-run
    SUPABASE_SERVICE_ROLE_KEY  required unless --dry-run
"""

from __future__ import annotations

import argparse
import sys
from datetime import date

import swuapi_client


def _norm_archetype(raw: dict) -> dict:
    """Map an upstream archetype object onto our columns.

    Field names are best guesses until the live payload is confirmed —
    adjust the .get() keys here if swuapi uses different names.
    """
    return {
        "id": str(raw.get("id") or raw.get("archetype_id") or raw.get("slug") or raw.get("name")),
        "name": raw.get("name") or str(raw.get("id")),
        "leader": raw.get("leader"),
        "base": raw.get("base"),
        "aspect": raw.get("aspect") or raw.get("aspects"),
    }


def _norm_card(raw: dict) -> dict:
    return {
        "id": str(raw.get("id") or f"{raw.get('set', '?')}/{raw.get('number', '?')}"),
        "name": raw.get("name", "unknown"),
        "set_code": raw.get("set") or raw.get("set_code"),
        "card_number": str(raw.get("number") or raw.get("card_number") or ""),
        "type": raw.get("type"),
        "aspects": raw.get("aspects"),
        "cost": raw.get("cost"),
        "rarity": raw.get("rarity"),
        "raw": raw,  # land the full payload; later phases can re-derive columns
    }


def _norm_meta_row(raw: dict, snapshot_date: str) -> dict:
    share = raw.get("meta_share") or raw.get("share") or raw.get("metaShare")
    win = raw.get("win_rate") or raw.get("winrate") or raw.get("winRate")
    # Accept either 0–1 fractions or 0–100 percentages from upstream.
    if share is not None and float(share) > 1:
        share = float(share) / 100
    if win is not None and float(win) > 1:
        win = float(win) / 100
    return {
        "archetype_id": str(raw.get("archetype_id") or raw.get("id") or raw.get("archetype") or raw.get("name")),
        "snapshot_date": snapshot_date,
        "meta_share": share,
        "win_rate": win,
        "deck_count": raw.get("deck_count") or raw.get("decks") or raw.get("count"),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true", help="pull but do not write to Supabase")
    args = parser.parse_args()

    print(f"Pulling from {swuapi_client.BASE_URL} ...")
    archetypes = [_norm_archetype(a) for a in swuapi_client.get_archetypes()]
    cards = [_norm_card(c) for c in swuapi_client.get_cards()]
    today = date.today().isoformat()
    meta = [_norm_meta_row(m, today) for m in swuapi_client.get_current_meta()]

    print(f"  archetypes: {len(archetypes)}  cards: {len(cards)}  meta rows: {len(meta)}")

    if args.dry_run:
        print("Dry run — nothing written.")
        return 0

    from supabase_store import SupabaseStore

    store = SupabaseStore()
    # Archetypes first: meta_snapshots has an FK onto them.
    n = store.upsert("archetypes", archetypes, on_conflict="id")
    print(f"  wrote {n} archetypes")
    n = store.upsert("cards", cards, on_conflict="id")
    print(f"  wrote {n} cards")
    n = store.upsert("meta_snapshots", meta, on_conflict="archetype_id,snapshot_date,source")
    print(f"  wrote {n} meta snapshot rows for {today}")
    print("Sync complete.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
