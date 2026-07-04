"""Client for api.swuapi.com.

Written against the published docs at swuapi.com/docs (2026-07):
- Public: /cards, /sets, /archetypes (format param REQUIRED), /metas.
- Key-gated (Bearer token): /tournaments (?since= incremental sync),
  /tournaments/:id/decklists, /tournaments/:id/matches.
- List endpoints are cursor-paginated (pagination.next_cursor / ?after=),
  so the fetchers below page until exhausted.
- "Metas" are META ERAS (competitive periods like "A Lawless Time"), not
  archetype share tables — meta share is computed downstream from
  decklists.

Response FIELD NAMES come from the docs' reference sections where
documented (Card Object is fully specified; tournament/decklist/match row
shapes are not), so normalize_* functions stay tolerant of a few spellings.
All knowledge of the upstream API is confined to this module: if a live
pull reveals a mismatched field, fix the mapping HERE and nothing else
should need to change.

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
MAX_PAGES = 200  # safety valve so a pagination bug can't loop forever

# Internal normalized shapes (what the rest of the pipeline consumes):
#
# archetype:  {id, name, leader, base, aspects: [str]}
# card:       {id, name, set_code, card_type, aspects: [str], cost, image_url}
# set:        {code, name, released_at}
# meta_era:   {id, name, format, starts_on, ends_on}
# tournament: {id, name, date, tier, player_count}
# decklist:   {id, tournament_id, archetype_id, player, placement,
#              cards: [{card_id, count}]}
# match:      {id, tournament_id, round, decklist_id, opponent_decklist_id,
#              result: win|loss|draw|None}


class SwuApiClient:
    """Fetches the API, or reads local fixture files instead.

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
                    f"GET {path} requires an API key — set SWUAPI_API_KEY")
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

    def _get_all_pages(self, path: str, fixture_name: str, list_keys: tuple[str, ...],
                       params: dict | None = None, keyed: bool = False,
                       limit: int = 200) -> list[dict]:
        """Follow the docs' cursor contract: request `limit` rows, follow
        pagination.next_cursor via ?after= until a short page arrives."""
        page_params = dict(params or {})
        page_params.setdefault("limit", limit)
        rows: list[dict] = []
        for _ in range(MAX_PAGES):
            payload = self._get(path, fixture_name, params=page_params, keyed=keyed)
            page = _as_list(payload, *list_keys)
            rows.extend(page)
            if self.use_fixtures or len(page) < page_params["limit"]:
                break
            cursor = None
            if isinstance(payload, dict):
                cursor = ((payload.get("pagination") or {}).get("next_cursor")
                          or payload.get("next_cursor"))
            if not cursor:
                break
            page_params["after"] = cursor
        return rows

    # -- public endpoints ----------------------------------------------------

    def fetch_archetypes(self) -> list[dict]:
        # ?format= is REQUIRED per the docs; we track Premier only.
        return self._get_all_pages("/archetypes", "archetypes",
                                   ("archetypes", "data", "results"),
                                   params={"format": "Premier"})

    def fetch_cards(self) -> list[dict]:
        return self._get_all_pages("/cards", "cards", ("cards", "data", "results"),
                                   limit=500)

    def fetch_sets(self) -> Any:
        return self._get("/sets", "sets")

    def fetch_meta_eras(self) -> Any:
        return self._get("/metas", "metas")

    # -- keyed endpoints (Bearer token) --------------------------------------
    # In fixture mode the per-tournament endpoints read the single combined
    # fixture file and filter locally, so fixtures stay easy to regenerate.

    def fetch_tournaments(self, since: str | None = None) -> list[dict]:
        params = {"since": since} if since else {}
        return self._get_all_pages("/tournaments", "tournaments",
                                   ("tournaments", "data", "results"),
                                   params=params, keyed=True)

    def fetch_tournament_decklists(self, tournament_id: str) -> Any:
        payload = self._get(f"/tournaments/{tournament_id}/decklists", "decklists", keyed=True)
        if self.use_fixtures:
            rows = _as_list(payload, "decklists", "data", "results")
            return {"decklists": [r for r in rows if r.get("tournament_id") == tournament_id]}
        return payload

    def fetch_matches(self, tournament_id: str) -> Any:
        payload = self._get(f"/tournaments/{tournament_id}/matches", "matches", keyed=True)
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


def _name_of(ref: Any) -> str | None:
    """Leader/base fields may arrive as a plain string or a nested object."""
    if isinstance(ref, dict):
        return ref.get("name") or ref.get("nickname") or ref.get("canonical_name")
    return ref


def _date_only(value: Any) -> str | None:
    """Trim an ISO timestamp to its date part."""
    if not value:
        return None
    return str(value)[:10]


def normalize_archetypes(payload: Any) -> list[dict]:
    out = []
    for raw in _as_list(payload, "archetypes", "data", "results"):
        # Prefer the short nickname ("Han Red 30") for display when present.
        name = raw.get("nickname") or raw.get("name") or raw.get("archetype") or ""
        out.append({
            "id": str(raw.get("uuid") or raw.get("id") or _slug(name)),
            "name": name,
            "leader": _name_of(raw.get("leader")) or raw.get("leader_name"),
            "base": _name_of(raw.get("base")) or raw.get("base_name"),
            "aspects": raw.get("aspects") or [],
        })
    return out


def normalize_cards(payload: Any) -> list[dict]:
    out = []
    for raw in _as_list(payload, "cards", "data", "results"):
        # Foils/Hyperspace/Showcase share gameplay identity with Standard;
        # keep only Standard so the catalog has one row per playable card.
        variant = raw.get("variantType") or raw.get("variant_type")
        if variant and variant != "Standard":
            continue
        out.append({
            "id": str(raw.get("uuid") or raw.get("id")
                      or raw.get("collector_number") or ""),
            "name": raw.get("name") or "",
            "set_code": raw.get("setCode") or raw.get("set") or raw.get("set_code"),
            "card_type": raw.get("type") or raw.get("card_type"),
            "aspects": raw.get("aspects") or [],
            "cost": raw.get("cost"),
            "image_url": raw.get("frontImageUrl") or raw.get("thumbnailUrl")
                         or raw.get("image") or raw.get("image_url"),
        })
    return out


def normalize_sets(payload: Any) -> list[dict]:
    out = []
    for raw in _as_list(payload, "sets", "data", "results"):
        out.append({
            "code": raw.get("code") or raw.get("abbreviation") or "",
            "name": raw.get("name") or "",
            "released_at": _date_only(raw.get("released_at") or raw.get("release_date")),
        })
    return out


def normalize_meta_eras(payload: Any) -> list[dict]:
    out = []
    for raw in _as_list(payload, "metas", "eras", "data", "results"):
        out.append({
            "id": str(raw.get("id") or raw.get("code") or ""),
            "name": raw.get("name") or "",
            "format": raw.get("format"),
            "starts_on": _date_only(raw.get("start") or raw.get("start_date")
                                    or raw.get("starts_on")),
            "ends_on": _date_only(raw.get("end") or raw.get("end_date")
                                  or raw.get("ends_on")),
        })
    return out


def normalize_tournaments(payload: Any) -> list[dict]:
    out = []
    for raw in _as_list(payload, "tournaments", "data", "results"):
        out.append({
            "id": str(raw.get("uuid") or raw.get("id") or raw.get("melee_id") or ""),
            "name": raw.get("name") or "",
            "date": _date_only(raw.get("date") or raw.get("start_date")
                               or raw.get("starts_at")),
            # Tier codes per the docs: PQ, SQ, RQ, GC, LCQ, SS, COM, CAS.
            "tier": raw.get("tier") or raw.get("level"),
            "player_count": raw.get("player_count") or raw.get("players"),
        })
    return out


def normalize_decklists(payload: Any, tournament_id: str) -> list[dict]:
    out = []
    for raw in _as_list(payload, "decklists", "data", "results"):
        archetype_ref = str(raw.get("archetype_uuid") or raw.get("archetype_id")
                            or _name_of(raw.get("archetype")) or "")
        out.append({
            "id": str(raw.get("uuid") or raw.get("id") or ""),
            "tournament_id": str(raw.get("tournament_uuid") or raw.get("tournament_id")
                                 or tournament_id),
            "archetype_id": archetype_ref if archetype_ref.isdigit() or "-" in archetype_ref
                            else _slug(archetype_ref),
            "player": raw.get("player") or raw.get("player_name") or raw.get("display_name"),
            # final_placement is the canonical finish per the docs' standings
            # contract; rank is melee's raw published order.
            "placement": raw.get("final_placement") or raw.get("placement") or raw.get("rank"),
            # The deck's card list, kept as [{card_id, count}]; stored in the
            # decklist_cards table, and what card-play-rate trends read.
            "cards": [
                {"card_id": str(c.get("card_uuid") or c.get("card_id") or c.get("uuid")
                                or c.get("id") or ""),
                 "count": c.get("count") or c.get("quantity") or 1}
                for c in (raw.get("cards") or raw.get("deck") or raw.get("mainboard") or [])
            ],
        })
    return out


def normalize_matches(payload: Any, tournament_id: str) -> list[dict]:
    out = []
    for raw in _as_list(payload, "matches", "data", "results"):
        result = (raw.get("result") or raw.get("outcome") or "").lower()
        out.append({
            "id": str(raw.get("uuid") or raw.get("id") or ""),
            "tournament_id": str(raw.get("tournament_uuid") or raw.get("tournament_id")
                                 or tournament_id),
            "round": raw.get("round") or raw.get("round_number"),
            "decklist_id": str(raw.get("decklist_uuid") or raw.get("decklist_id") or ""),
            "opponent_decklist_id": str(raw.get("opponent_decklist_uuid")
                                        or raw.get("opponent_decklist_id") or ""),
            "result": result if result in ("win", "loss", "draw") else None,
        })
    return out
