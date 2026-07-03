"""Writes pulled rows into Supabase via its auto-generated REST API (PostgREST).

Uses plain HTTP + the service-role key rather than a heavy SDK: the sync job
only ever needs "upsert this list of dicts into that table".

Every row gets `last_updated_at` stamped at write time — the spec requires all
pulled data to show when it was last refreshed.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone

import requests

logger = logging.getLogger(__name__)


class SupabaseWriter:
    def __init__(self, supabase_url: str, service_role_key: str, session: requests.Session | None = None):
        self.rest_url = f"{supabase_url.rstrip('/')}/rest/v1"
        self.session = session or requests.Session()
        self.session.headers.update({
            "apikey": service_role_key,
            "Authorization": f"Bearer {service_role_key}",
            "Content-Type": "application/json",
            # merge-duplicates = upsert on the table's primary key / unique constraint
            "Prefer": "resolution=merge-duplicates,return=minimal",
        })

    def upsert(self, table: str, rows: list[dict], *, on_conflict: str | None = None,
               stamp: bool = True) -> int:
        """Upsert rows into `table`. Returns the number of rows sent."""
        if not rows:
            logger.info("%s: nothing to upsert", table)
            return 0

        if stamp:
            now = datetime.now(timezone.utc).isoformat()
            rows = [{**row, "last_updated_at": now} for row in rows]

        params = {"on_conflict": on_conflict} if on_conflict else None
        resp = self.session.post(f"{self.rest_url}/{table}", json=rows, params=params, timeout=60)
        if resp.status_code >= 400:
            raise RuntimeError(f"Supabase upsert into {table} failed "
                               f"({resp.status_code}): {resp.text[:500]}")
        logger.info("%s: upserted %d rows", table, len(rows))
        return len(rows)


class DryRunWriter:
    """Stands in for SupabaseWriter when running without credentials
    (local dev, CI checks). Records what would have been written."""

    def __init__(self) -> None:
        self.written: dict[str, list[dict]] = {}

    def upsert(self, table: str, rows: list[dict], *, on_conflict: str | None = None,
               stamp: bool = True) -> int:
        self.written.setdefault(table, []).extend(rows)
        logger.info("[dry-run] %s: would upsert %d rows", table, len(rows))
        return len(rows)
