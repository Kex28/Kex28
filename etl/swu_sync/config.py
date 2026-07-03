"""Environment-driven configuration for the sync job.

All settings come from environment variables so the same code runs locally,
in CI (GitHub Actions cron), or anywhere else without edits.

Required for a real run:
    SUPABASE_URL                e.g. https://abcdefgh.supabase.co
    SUPABASE_SERVICE_ROLE_KEY   service-role key (server-side only, never in frontend)

Optional:
    SWUAPI_BASE_URL             defaults to https://api.swuapi.com
    SWUAPI_KEY                  Bearer token for gated endpoints (Phase 2+:
                                tournaments, matches, players, decklists)
"""

from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    swuapi_base_url: str
    swuapi_key: str | None
    supabase_url: str | None
    supabase_service_role_key: str | None

    @classmethod
    def from_env(cls) -> "Settings":
        return cls(
            swuapi_base_url=os.environ.get("SWUAPI_BASE_URL", "https://api.swuapi.com").rstrip("/"),
            swuapi_key=os.environ.get("SWUAPI_KEY") or None,
            supabase_url=(os.environ.get("SUPABASE_URL") or "").rstrip("/") or None,
            supabase_service_role_key=os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or None,
        )
