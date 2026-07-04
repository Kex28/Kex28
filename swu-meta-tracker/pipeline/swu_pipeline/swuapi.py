"""Client for api.swuapi.com.

Endpoint paths follow the swuapi.com docs as described in the project
spec. They are unverified against the live service (see README), so each
path lives in one place here — if the real API differs, this module is
the only thing that changes.

With SWU_FIXTURES=1 the client serves bundled fixture JSON instead of
touching the network, which keeps tests and local development offline.
"""

from __future__ import annotations

import json
from typing import Any

import httpx

from .config import FIXTURES_DIR, Settings

# Open endpoints (no key) -> fixture file name
OPEN_ENDPOINTS = {
    "sets": "/sets",
    "cards": "/cards",
    "archetypes": "/archetypes",
    "meta": "/meta/current",
}


class SwuApiError(RuntimeError):
    pass


class SwuApiClient:
    def __init__(self, settings: Settings, http: httpx.Client | None = None):
        self.settings = settings
        headers = {"Accept": "application/json"}
        if settings.swuapi_key:
            headers["Authorization"] = f"Bearer {settings.swuapi_key}"
        self._http = http or httpx.Client(
            base_url=settings.swuapi_base_url, headers=headers, timeout=30
        )

    def _get(self, resource: str) -> Any:
        if self.settings.use_fixtures:
            path = FIXTURES_DIR / f"{resource}.json"
            return json.loads(path.read_text())
        response = self._http.get(OPEN_ENDPOINTS[resource])
        if response.status_code != 200:
            raise SwuApiError(
                f"GET {OPEN_ENDPOINTS[resource]} returned {response.status_code}: "
                f"{response.text[:200]}"
            )
        return response.json()

    def get_sets(self) -> list[dict]:
        return self._get("sets")

    def get_cards(self) -> list[dict]:
        return self._get("cards")

    def get_archetypes(self) -> list[dict]:
        return self._get("archetypes")

    def get_current_meta(self) -> dict:
        """Current-meta list: {"captured_at": ..., "window": ..., "entries": [...]}."""
        return self._get("meta")

    def close(self) -> None:
        self._http.close()
