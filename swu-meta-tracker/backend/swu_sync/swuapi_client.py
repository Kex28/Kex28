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
                 api_key: str | None = None, timeout: float = 30.0, max_retries: int = 3):
        self.base_url = (base_url or os.environ.get("SWUAPI_BASE_URL") or DEFAULT_BASE_URL).rstrip("/")
        self.use_fixtures = use_fixtures
        self.api_key = api_key or os.environ.get("SWUAPI_API_KEY")
        self.timeout = timeout
        self.max_retries = max_retries
        self._session = requests.Session()
        self._session.headers["User-Agent"] = "swu-meta-tracker/0.1"

    @property
    def has_key(self) -> bool:
        """Keyed endpoints (tournaments/decklists/matches) are usable —
        either a real Bearer token is set or fixture mode fakes them."""
        return self.use_fixtures or bool(self.api_key)

    def _get(self, path: str, fixture_name: str, params: dict | None = None,
             keyed: bool = False) -> Any:
        if self.use_fixtures:
            fixture_path = FIXTURES_DIR / f"{fixture_name}.json"
            return json.loads(fixture_path.read_text())
        if keyed:
            if not self.api_key:
                raise RuntimeError(
                    f"GET {path} requires an API key — set SWUAPI_API_KEY "
                    "(free key via swuapi.com's site/Discord)")
            self._session.headers["Authorization"] = f"Bearer {self.api_key}"
        url = f"{self.base_url}/{path.lstrip('/')}"
        last_error: Exception | None = None
        for attempt in range(self.max_retries):
            try:
                resp = self._session.get(url, params=params, timeout=self.timeout)
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

    # -- keyed endpoints (Bearer token; free key from swuapi.com) ------------
    # In fixture mode the per-tournament endpoints read the single combined
    # fixture file and filter locally, so fixtures stay easy to regenerate.

    def fetch_tournaments(self, since: str | None = None) -> Any:
        return self._get("/tournaments", "tournaments",
                         params={"since": since} if since else None, keyed=True)

    def fetch_tournament_decklists(self, tournament_id: str) -> Any:
        payload = self._get(f"/tournaments/{tournament_id}/decklists", "decklists", keyed=True)
        if self.use_fixtures:
            rows = _as_list(payload, "decklists", "data", "results")
            return {"decklists": [r for r in rows if r.get("tournament_id") == tournament_id]}
        return payload

    def fetch_matches(self, tournament_id: str) -> Any:
        payload = self._get("/matches", "matches",
                            params={"tournament_id": tournament_id}, keyed=True)
        if self.use_fixtures:
            rows = _as_list(payload, "matches", "data", "results")
            return {"matches": [r for r in rows if r.get("tournament_id") == tournament_id]}
        return payload


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


def normalize_tournaments(payload: Any) -> list[dict]:
    out = []
    for raw in _as_list(payload, "tournaments", "data", "results"):
        out.append({
            "id": str(raw.get("id") or ""),
            "name": raw.get("name") or "",
            "date": raw.get("date") or raw.get("start_date"),
            "tier": raw.get("tier") or raw.get("level"),
            "player_count": raw.get("player_count") or raw.get("players"),
        })
    return out


def normalize_decklists(payload: Any, tournament_id: str) -> list[dict]:
    out = []
    for raw in _as_list(payload, "decklists", "data", "results"):
        archetype_ref = raw.get("archetype_id") or raw.get("archetype") or ""
        out.append({
            "id": str(raw.get("id") or ""),
            "tournament_id": str(raw.get("tournament_id") or tournament_id),
            "archetype_id": archetype_ref if archetype_ref.isdigit() or "-" in archetype_ref
                            else _slug(archetype_ref),
            "player": raw.get("player") or raw.get("player_name"),
            "placement": raw.get("placement") or raw.get("rank"),
            # The deck's card list, kept as [{card_id, count}]; stored in the
            # decklist_cards table, and what card-play-rate trends read.
            "cards": [
                {"card_id": str(c.get("card_id") or c.get("id") or ""),
                 "count": c.get("count") or c.get("quantity") or 1}
                for c in (raw.get("cards") or raw.get("deck") or [])
            ],
        })
    return out


def normalize_matches(payload: Any, tournament_id: str) -> list[dict]:
    out = []
    for raw in _as_list(payload, "matches", "data", "results"):
        result = (raw.get("result") or "").lower()
        out.append({
            "id": str(raw.get("id") or ""),
            "tournament_id": str(raw.get("tournament_id") or tournament_id),
            "round": raw.get("round"),
            "decklist_id": str(raw.get("decklist_id") or ""),
            "opponent_decklist_id": str(raw.get("opponent_decklist_id") or ""),
            "result": result if result in ("win", "loss", "draw") else None,
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
