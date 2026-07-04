"""Landing rows in Supabase via PostgREST upserts.

Uses the auto-generated REST API directly (no SDK needed for writes):
POST /rest/v1/<table> with Prefer: resolution=merge-duplicates performs
an upsert keyed on the table's primary key / unique constraint.

Without Supabase credentials the writer drops the same rows into local
JSON files instead, so the whole pipeline runs end to end offline.
"""

from __future__ import annotations

import json
from pathlib import Path

import httpx

from .config import Settings


class SupabaseWriteError(RuntimeError):
    pass


class Writer:
    """Common interface: upsert(table, rows)."""

    def upsert(self, table: str, rows: list[dict], on_conflict: str | None = None) -> int:
        raise NotImplementedError

    def close(self) -> None:
        pass


class SupabaseWriter(Writer):
    def __init__(self, settings: Settings, http: httpx.Client | None = None):
        assert settings.supabase_url and settings.supabase_service_role_key
        self._http = http or httpx.Client(
            base_url=f"{settings.supabase_url.rstrip('/')}/rest/v1",
            headers={
                "apikey": settings.supabase_service_role_key,
                "Authorization": f"Bearer {settings.supabase_service_role_key}",
                "Content-Type": "application/json",
                "Prefer": "resolution=merge-duplicates,return=minimal",
            },
            timeout=60,
        )

    def upsert(self, table: str, rows: list[dict], on_conflict: str | None = None) -> int:
        if not rows:
            return 0
        params = {"on_conflict": on_conflict} if on_conflict else None
        response = self._http.post(f"/{table}", params=params, json=rows)
        if response.status_code not in (200, 201, 204):
            raise SupabaseWriteError(
                f"upsert into {table} failed ({response.status_code}): {response.text[:300]}"
            )
        return len(rows)

    def close(self) -> None:
        self._http.close()


class LocalWriter(Writer):
    """Offline fallback: one JSON file per table under SWU_OUT_DIR."""

    def __init__(self, out_dir: Path):
        self.out_dir = out_dir
        self.out_dir.mkdir(parents=True, exist_ok=True)

    def upsert(self, table: str, rows: list[dict], on_conflict: str | None = None) -> int:
        if not rows:
            return 0
        path = self.out_dir / f"{table}.json"
        existing: dict[str, dict] = {}
        if path.exists():
            for row in json.loads(path.read_text()):
                existing[self._key(table, row, on_conflict)] = row
        for row in rows:
            existing[self._key(table, row, on_conflict)] = row
        path.write_text(json.dumps(list(existing.values()), indent=2, default=str))
        return len(rows)

    @staticmethod
    def _key(table: str, row: dict, on_conflict: str | None) -> str:
        cols = (on_conflict or "id").split(",")
        return "|".join(str(row.get(c.strip())) for c in cols)


def make_writer(settings: Settings) -> Writer:
    if settings.has_supabase:
        return SupabaseWriter(settings)
    return LocalWriter(settings.out_dir)
