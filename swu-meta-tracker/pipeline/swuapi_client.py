"""Thin client for api.swuapi.com.

Only the open (no-key) endpoints are used in Phase 1: cards, archetypes,
and the current meta list. Endpoint paths live in one place below because
they are UNVERIFIED against live swuapi.com docs — confirm and adjust them
(and nothing else should need to change).
"""

from __future__ import annotations

import os
import time

import requests

BASE_URL = os.environ.get("SWUAPI_BASE", "https://api.swuapi.com")

# Confirm these paths against swuapi.com docs before first real run.
PATH_ARCHETYPES = "/archetypes"
PATH_CARDS = "/cards"
PATH_META = "/meta"

USER_AGENT = "swu-meta-tracker/0.1 (personal project)"
MAX_RETRIES = 3


class SwuApiError(RuntimeError):
    pass


def _get(path: str, params: dict | None = None) -> list | dict:
    """GET a swuapi endpoint with basic retry/backoff for flaky upstreams."""
    url = BASE_URL.rstrip("/") + path
    headers = {"User-Agent": USER_AGENT, "Accept": "application/json"}
    api_key = os.environ.get("SWUAPI_KEY")
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    last_err: Exception | None = None
    for attempt in range(MAX_RETRIES):
        try:
            resp = requests.get(url, params=params, headers=headers, timeout=30)
            if resp.status_code == 429:
                # Rate limits are unverified; honor Retry-After if present.
                wait = int(resp.headers.get("Retry-After", 2 ** (attempt + 1)))
                time.sleep(wait)
                continue
            resp.raise_for_status()
            return resp.json()
        except (requests.RequestException, ValueError) as err:
            last_err = err
            time.sleep(2**attempt)
    raise SwuApiError(f"GET {url} failed after {MAX_RETRIES} attempts: {last_err}")


def get_archetypes() -> list[dict]:
    data = _get(PATH_ARCHETYPES)
    return data if isinstance(data, list) else data.get("archetypes", data.get("data", []))


def get_cards() -> list[dict]:
    data = _get(PATH_CARDS)
    return data if isinstance(data, list) else data.get("cards", data.get("data", []))


def get_current_meta() -> list[dict]:
    data = _get(PATH_META)
    return data if isinstance(data, list) else data.get("meta", data.get("data", []))
