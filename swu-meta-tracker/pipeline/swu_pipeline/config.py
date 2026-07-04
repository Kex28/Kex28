"""Environment-driven configuration.

Every setting comes from the environment so the same code runs locally,
in GitHub Actions, and offline in tests:

  SWUAPI_BASE_URL   default https://api.swuapi.com
  SWUAPI_KEY        optional; only needed for Phase 2+ gated endpoints
  SWU_FIXTURES      "1" -> read bundled fixture JSON instead of the network
  SUPABASE_URL      e.g. https://<project>.supabase.co
  SUPABASE_SERVICE_ROLE_KEY
                    service-role key; pipeline-only, never shipped to the web app
  SWU_OUT_DIR       when Supabase creds are absent, landed rows are written
                    as JSON here instead (default ./out)
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

FIXTURES_DIR = Path(__file__).parent / "fixtures"


@dataclass(frozen=True)
class Settings:
    swuapi_base_url: str = field(
        default_factory=lambda: os.environ.get("SWUAPI_BASE_URL", "https://api.swuapi.com")
    )
    swuapi_key: str | None = field(default_factory=lambda: os.environ.get("SWUAPI_KEY"))
    use_fixtures: bool = field(
        default_factory=lambda: os.environ.get("SWU_FIXTURES", "") == "1"
    )
    supabase_url: str | None = field(default_factory=lambda: os.environ.get("SUPABASE_URL"))
    supabase_service_role_key: str | None = field(
        default_factory=lambda: os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    )
    out_dir: Path = field(
        default_factory=lambda: Path(os.environ.get("SWU_OUT_DIR", "out"))
    )

    @property
    def has_supabase(self) -> bool:
        return bool(self.supabase_url and self.supabase_service_role_key)
