"""Client for api.swuapi.com's open (no-key) endpoints.

IMPORTANT: the real response shapes of api.swuapi.com are UNVERIFIED — the
endpoint paths and field names below are a best guess written against the
project spec. All knowledge of the upstream API is confined to this module:
`normalize_*` functions map raw payloads to the internal shapes the rest of
the pipeline uses. When you run this against the live API for the first time,
fix the paths/field mappings HERE and nothing else should need to change.

Set SWUAPI_BASE_URL to override the base URL (defaults to
https://api.swuapi.com).
"""

from __future__ import annotations

import json
import os
import time
from pathlib import Path
from typing import Any

import requests

DEFAULT_BASE_URL = "https://api.swuapi.com"
FIXTURES_DIR = Path(__file__).resolve().parent.parent / "fixtures"

# Internal normalized shapes (what the rest of the pipeline consumes):
#
# archetype: {id, name, leader, base, aspects: [str]}
# meta_entry: {archetype_id, meta_share, win_rate, deck_count}
#             meta_share / win_rate are fractions in [0, 1]
# card:      {id, name, set_code, card_type, aspects: [str], cost, image_url}
# set:       {code, name, released_at}


class SwuApiClient:
    """Fetches the open endpoints, or reads local fixture files instead.

    Fixture mode (use_fixtures=True) exists because the upstream API can't be
    reached from every environment (e.g. sandboxed CI); it reads
    backend/fixtures/*.json, which mirror the raw payloads the live endpoints
    are expected to return.
    """

    def __init__(self, base_url: str | None = None, use_fixtures: bool = False,
                 timeout: float = 30.0, max_retries: int = 3):
        self.base_url = (base_url or os.environ.get("SWUAPI_BASE_URL") or DEFAULT_BASE_URL).rstrip("/")
        self.use_fixtures = use_fixtures
        self.timeout = timeout
        self.max_retries = max_retries
        self._session = requests.Session()
        self._session.headers["User-Agent"] = "swu-meta-tracker/0.1"

    def _get(self, path: str, fixture_name: str) -> Any:
        if self.use_fixtures:
            fixture_path = FIXTURES_DIR / f"{fixture_name}.json"
            return json.loads(fixture_path.read_text())
        url = f"{self.base_url}/{path.lstrip('/')}"
        last_error: Exception | None = None
        for attempt in range(self.max_retries):
            try:
                resp = self._session.get(url, timeout=self.timeout)
                resp.raise_for_status()
                return resp.json()
            except (requests.ConnectionError, requests.Timeout, requests.HTTPError) as err:
                status = getattr(getattr(err, "response", None), "status_code", None)
                if status is not None and status < 500 and status != 429:
                    raise  # 4xx (other than 429) won't fix itself; fail fast
                last_error = err
                time.sleep(2 ** attempt)
        raise RuntimeError(f"GET {url} failed after {self.max_retries} attempts") from last_error

    # -- raw fetches ---------------------------------------------------------

    def fetch_archetypes(self) -> Any:
        return self._get("/archetypes", "archetypes")

    def fetch_current_meta(self) -> Any:
        return self._get("/meta/current", "current_meta")

    def fetch_cards(self) -> Any:
        return self._get("/cards", "cards")

    def fetch_sets(self) -> Any:
        return self._get("/sets", "sets")


# -- normalizers (fix these first when reconciling with the live API) --------

def _as_list(payload: Any, *keys: str) -> list[dict]:
    """Accept either a bare JSON array or an object wrapping one under a key."""
    if isinstance(payload, list):
        return payload
    if isinstance(payload, dict):
        for key in keys:
            if isinstance(payload.get(key), list):
                return payload[key]
    raise ValueError(f"Unrecognized payload shape: expected list or dict with one of {keys}")


def _slug(text: str) -> str:
    return "".join(ch if ch.isalnum() else "-" for ch in text.lower()).strip("-")


def _fraction(value: Any) -> float | None:
    """Coerce a share/rate that may arrive as 0-1 fraction or 0-100 percent."""
    if value is None:
        return None
    value = float(value)
    return value / 100.0 if value > 1.0 else value


def normalize_archetypes(payload: Any) -> list[dict]:
    out = []
    for raw in _as_list(payload, "archetypes", "data", "results"):
        name = raw.get("name") or raw.get("archetype") or ""
        out.append({
            "id": str(raw.get("id") or _slug(name)),
            "name": name,
            "leader": raw.get("leader") or raw.get("leader_name"),
            "base": raw.get("base") or raw.get("base_name"),
            "aspects": raw.get("aspects") or [],
        })
    return out


def normalize_current_meta(payload: Any) -> list[dict]:
    out = []
    for raw in _as_list(payload, "meta", "entries", "data", "results"):
        archetype_ref = raw.get("archetype_id") or raw.get("archetype") or raw.get("name") or ""
        out.append({
            "archetype_id": str(archetype_ref) if not isinstance(archetype_ref, str) else (
                archetype_ref if archetype_ref.isdigit() else _slug(archetype_ref)
            ),
            "meta_share": _fraction(raw.get("meta_share") or raw.get("share") or raw.get("percentage")),
            "win_rate": _fraction(raw.get("win_rate") or raw.get("winrate")),
            "deck_count": raw.get("deck_count") or raw.get("decks") or raw.get("count"),
        })
    return out


def normalize_cards(payload: Any) -> list[dict]:
    out = []
    for raw in _as_list(payload, "cards", "data", "results"):
        out.append({
            "id": str(raw.get("id") or f"{raw.get('set', '')}-{raw.get('number', '')}"),
            "name": raw.get("name") or "",
            "set_code": raw.get("set") or raw.get("set_code"),
            "card_type": raw.get("type") or raw.get("card_type"),
            "aspects": raw.get("aspects") or [],
            "cost": raw.get("cost"),
            "image_url": raw.get("image") or raw.get("image_url") or raw.get("front_art"),
        })
    return out


def normalize_sets(payload: Any) -> list[dict]:
    out = []
    for raw in _as_list(payload, "sets", "data", "results"):
        out.append({
            "code": raw.get("code") or raw.get("abbreviation") or "",
            "name": raw.get("name") or "",
            "released_at": raw.get("released_at") or raw.get("release_date"),
        })
    return out
