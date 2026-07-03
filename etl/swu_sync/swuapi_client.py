"""HTTP client for api.swuapi.com.

Two tiers of endpoints, per the swuapi docs:

  Open (no key):        /cards, /sets, /archetypes, /meta
  Gated (Bearer token): /tournaments, /tournaments/:id/standings,
                        /tournaments/:id/decklists, /matches, /players

NOTE: the exact response shapes have not been verified against the live API
(the spec flags rate limits / freshness as unconfirmed too). Everything that
touches a response goes through the small normalisers below, so when the real
payloads differ, the fix lives in one place. Raw payloads are also landed
untouched into `raw` jsonb columns — "land raw data first, compute nothing
during the pull".
"""

from __future__ import annotations

import logging
import time
from typing import Any

import requests

logger = logging.getLogger(__name__)

# Be a polite consumer of a community-run API: modest retries, clear UA.
USER_AGENT = "swu-meta-tracker-sync/0.1 (personal meta tracker)"
RETRY_STATUSES = {429, 500, 502, 503, 504}
MAX_RETRIES = 3
BACKOFF_SECONDS = 2.0


class GatedEndpointError(RuntimeError):
    """Raised when a key-gated endpoint is called without SWUAPI_KEY set."""


class SwuApiClient:
    def __init__(self, base_url: str, api_key: str | None = None, session: requests.Session | None = None):
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.session = session or requests.Session()
        self.session.headers["User-Agent"] = USER_AGENT

    # -- plumbing -----------------------------------------------------------

    def _get(self, path: str, *, gated: bool = False, params: dict[str, Any] | None = None) -> Any:
        if gated and not self.api_key:
            raise GatedEndpointError(
                f"{path} requires a swuapi.com API key. Set SWUAPI_KEY once the key "
                "is secured (see spec: confirm before building Phase 2+)."
            )
        headers = {}
        if gated:
            headers["Authorization"] = f"Bearer {self.api_key}"

        url = f"{self.base_url}{path}"
        last_error: Exception | None = None
        for attempt in range(1, MAX_RETRIES + 1):
            try:
                resp = self.session.get(url, headers=headers, params=params, timeout=30)
                if resp.status_code in RETRY_STATUSES:
                    raise requests.HTTPError(f"{resp.status_code} from {url}", response=resp)
                resp.raise_for_status()
                return resp.json()
            except (requests.ConnectionError, requests.Timeout, requests.HTTPError) as exc:
                status = getattr(getattr(exc, "response", None), "status_code", None)
                if status is not None and status not in RETRY_STATUSES:
                    raise  # 4xx other than 429: retrying won't help
                last_error = exc
                if attempt < MAX_RETRIES:
                    wait = BACKOFF_SECONDS * (2 ** (attempt - 1))
                    logger.warning("GET %s failed (attempt %d/%d): %s — retrying in %.0fs",
                                   url, attempt, MAX_RETRIES, exc, wait)
                    time.sleep(wait)
        raise RuntimeError(f"GET {url} failed after {MAX_RETRIES} attempts") from last_error

    @staticmethod
    def _items(payload: Any) -> list[dict]:
        """Accept either a bare JSON array or a {"data": [...]} envelope."""
        if isinstance(payload, list):
            return payload
        if isinstance(payload, dict):
            for key in ("data", "results", "items"):
                if isinstance(payload.get(key), list):
                    return payload[key]
        raise ValueError(f"Unexpected payload shape: {type(payload).__name__}")

    # -- open endpoints (Phase 1) -------------------------------------------

    def get_archetypes(self) -> list[dict]:
        return self._items(self._get("/archetypes"))

    def get_meta(self) -> list[dict]:
        """Current meta list: one entry per archetype with share / win rate."""
        return self._items(self._get("/meta"))

    def get_cards(self) -> list[dict]:
        return self._items(self._get("/cards"))

    def get_sets(self) -> list[dict]:
        return self._items(self._get("/sets"))

    # -- gated endpoints (Phase 2+) ------------------------------------------

    def get_tournaments(self, since: str | None = None) -> list[dict]:
        params = {"since": since} if since else None
        return self._items(self._get("/tournaments", gated=True, params=params))

    def get_standings(self, tournament_id: str) -> list[dict]:
        return self._items(self._get(f"/tournaments/{tournament_id}/standings", gated=True))

    def get_decklists(self, tournament_id: str) -> list[dict]:
        return self._items(self._get(f"/tournaments/{tournament_id}/decklists", gated=True))

    def get_matches(self, tournament_id: str) -> list[dict]:
        return self._items(self._get("/matches", gated=True, params={"tournament_id": tournament_id}))
