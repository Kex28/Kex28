"""Thin client for api.swuapi.com with retries and tolerant response parsing."""

import logging
import time

import requests

log = logging.getLogger(__name__)

RETRIES = 3
BACKOFF_SECONDS = 2.0
TIMEOUT_SECONDS = 30


def unwrap_list(payload) -> list:
    """The API's envelope shape is unverified — accept a bare list or a dict
    wrapping one under a common key ("data", "results", "items")."""
    if isinstance(payload, list):
        return payload
    if isinstance(payload, dict):
        for key in ("data", "results", "items"):
            value = payload.get(key)
            if isinstance(value, list):
                return value
    raise ValueError(f"Unexpected response shape: {type(payload).__name__}")


class SwuApiClient:
    def __init__(self, base_url: str, api_key: str | None = None, session=None):
        self.base_url = base_url.rstrip("/")
        self.session = session or requests.Session()
        self.session.headers["Accept"] = "application/json"
        if api_key:
            self.session.headers["Authorization"] = f"Bearer {api_key}"

    def get(self, path: str, params: dict | None = None):
        url = self.base_url + "/" + path.lstrip("/")
        last_error: Exception | None = None
        for attempt in range(1, RETRIES + 1):
            try:
                response = self.session.get(url, params=params, timeout=TIMEOUT_SECONDS)
                if response.status_code in (429, 500, 502, 503, 504):
                    raise requests.HTTPError(f"{response.status_code} from {url}")
                response.raise_for_status()
                return response.json()
            except (requests.ConnectionError, requests.Timeout, requests.HTTPError) as error:
                last_error = error
                if attempt < RETRIES:
                    delay = BACKOFF_SECONDS * (2 ** (attempt - 1))
                    log.warning("GET %s failed (%s); retrying in %.0fs", url, error, delay)
                    time.sleep(delay)
        raise RuntimeError(f"GET {url} failed after {RETRIES} attempts") from last_error

    def get_list(self, path: str, params: dict | None = None) -> list:
        return unwrap_list(self.get(path, params=params))
