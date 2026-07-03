"""Minimal Supabase PostgREST writer — plain HTTP, no SDK dependency.

Uses the service-role key, which bypasses RLS; this module must only ever
run server-side (GitHub Actions / local shell), never in the browser.
"""

import logging

import requests

log = logging.getLogger(__name__)

TIMEOUT_SECONDS = 60
BATCH_SIZE = 500


class SupabaseRest:
    def __init__(self, url: str, service_role_key: str, session=None):
        self.base_url = url.rstrip("/") + "/rest/v1"
        self.session = session or requests.Session()
        self.session.headers.update(
            {
                "apikey": service_role_key,
                "Authorization": f"Bearer {service_role_key}",
                "Content-Type": "application/json",
            }
        )

    def upsert(self, table: str, rows: list[dict], on_conflict: str | None = None) -> int:
        """Insert-or-update rows in batches. Returns the row count written."""
        if not rows:
            return 0
        params = {"on_conflict": on_conflict} if on_conflict else {}
        written = 0
        for start in range(0, len(rows), BATCH_SIZE):
            batch = rows[start : start + BATCH_SIZE]
            response = self.session.post(
                f"{self.base_url}/{table}",
                params=params,
                json=batch,
                headers={"Prefer": "resolution=merge-duplicates,return=minimal"},
                timeout=TIMEOUT_SECONDS,
            )
            if not response.ok:
                raise RuntimeError(
                    f"Upsert into {table} failed ({response.status_code}): {response.text[:500]}"
                )
            written += len(batch)
        log.info("Upserted %d rows into %s", written, table)
        return written

    def insert_returning(self, table: str, row: dict) -> dict:
        response = self.session.post(
            f"{self.base_url}/{table}",
            json=row,
            headers={"Prefer": "return=representation"},
            timeout=TIMEOUT_SECONDS,
        )
        if not response.ok:
            raise RuntimeError(
                f"Insert into {table} failed ({response.status_code}): {response.text[:500]}"
            )
        return response.json()[0]

    def update(self, table: str, match: dict, values: dict) -> None:
        params = {key: f"eq.{value}" for key, value in match.items()}
        response = self.session.patch(
            f"{self.base_url}/{table}",
            params=params,
            json=values,
            headers={"Prefer": "return=minimal"},
            timeout=TIMEOUT_SECONDS,
        )
        if not response.ok:
            raise RuntimeError(
                f"Update of {table} failed ({response.status_code}): {response.text[:500]}"
            )

    def select(self, table: str, params: dict | None = None) -> list[dict]:
        response = self.session.get(
            f"{self.base_url}/{table}", params=params or {}, timeout=TIMEOUT_SECONDS
        )
        if not response.ok:
            raise RuntimeError(
                f"Select from {table} failed ({response.status_code}): {response.text[:500]}"
            )
        return response.json()
