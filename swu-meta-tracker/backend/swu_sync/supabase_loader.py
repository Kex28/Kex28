"""Writes normalized rows into Supabase via its PostgREST endpoint.

Uses plain HTTP upserts (Prefer: resolution=merge-duplicates) so the only
dependency is `requests`. Requires:

  SUPABASE_URL              e.g. https://abcdefgh.supabase.co
  SUPABASE_SERVICE_ROLE_KEY service-role key (server-side only — never ship
                            this to the frontend; the frontend uses the anon
                            key with read-only RLS policies)
"""

from __future__ import annotations

import os

import requests


class SupabaseLoader:
    def __init__(self, url: str | None = None, service_key: str | None = None):
        self.url = (url or os.environ["SUPABASE_URL"]).rstrip("/")
        key = service_key or os.environ["SUPABASE_SERVICE_ROLE_KEY"]
        self._session = requests.Session()
        self._session.headers.update({
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "Prefer": "resolution=merge-duplicates,return=minimal",
        })

    def upsert(self, table: str, rows: list[dict], on_conflict: str) -> None:
        if not rows:
            return
        resp = self._session.post(
            f"{self.url}/rest/v1/{table}",
            params={"on_conflict": on_conflict},
            json=rows,
            timeout=60,
        )
        if not resp.ok:
            raise RuntimeError(f"Upsert into {table} failed ({resp.status_code}): {resp.text[:500]}")
