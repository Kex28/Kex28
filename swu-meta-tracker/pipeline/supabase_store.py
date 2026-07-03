"""Write pulled data into Supabase via its PostgREST endpoint.

Uses the service-role key (bypasses RLS) — this module must only ever run
server-side (GitHub Actions / local shell), never be bundled into the web app.
"""

from __future__ import annotations

import os
from datetime import datetime, timezone

import requests

CHUNK_SIZE = 500


class SupabaseStore:
    def __init__(self) -> None:
        url = os.environ.get("SUPABASE_URL")
        key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        if not url or not key:
            raise RuntimeError(
                "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set "
                "(see swu-meta-tracker/README.md)."
            )
        self.rest_url = url.rstrip("/") + "/rest/v1"
        self.headers = {
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            # Upsert on primary key / unique constraint instead of failing.
            "Prefer": "resolution=merge-duplicates",
        }

    def upsert(self, table: str, rows: list[dict], on_conflict: str | None = None) -> int:
        """Upsert rows, stamping last_updated_at, per the spec's freshness rule."""
        if not rows:
            return 0
        now = datetime.now(timezone.utc).isoformat()
        for row in rows:
            row["last_updated_at"] = now

        params = {"on_conflict": on_conflict} if on_conflict else None
        written = 0
        for start in range(0, len(rows), CHUNK_SIZE):
            chunk = rows[start : start + CHUNK_SIZE]
            resp = requests.post(
                f"{self.rest_url}/{table}",
                json=chunk,
                headers=self.headers,
                params=params,
                timeout=60,
            )
            if resp.status_code >= 400:
                raise RuntimeError(f"Supabase upsert into {table} failed: {resp.status_code} {resp.text[:500]}")
            written += len(chunk)
        return written
