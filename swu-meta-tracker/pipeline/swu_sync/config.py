"""Environment-driven configuration.

Endpoint paths are configurable because api.swuapi.com's exact routes are
unverified (see SPEC.md) — if a path differs from the documented guess,
fix it with an env var instead of a code change.
"""

import os
from dataclasses import dataclass, field


def _env(name: str, default: str | None = None) -> str | None:
    value = os.environ.get(name, default)
    return value.strip() if isinstance(value, str) else value


@dataclass
class Config:
    swuapi_base_url: str = field(
        default_factory=lambda: _env("SWUAPI_BASE_URL", "https://api.swuapi.com") or ""
    )
    swuapi_api_key: str | None = field(default_factory=lambda: _env("SWUAPI_API_KEY"))

    # Open (no-key) endpoints used by the Phase 1 job.
    cards_path: str = field(default_factory=lambda: _env("SWUAPI_CARDS_PATH", "/cards") or "")
    archetypes_path: str = field(
        default_factory=lambda: _env("SWUAPI_ARCHETYPES_PATH", "/archetypes") or ""
    )
    meta_path: str = field(default_factory=lambda: _env("SWUAPI_META_PATH", "/meta") or "")

    supabase_url: str = field(default_factory=lambda: _env("SUPABASE_URL") or "")
    supabase_service_role_key: str = field(
        default_factory=lambda: _env("SUPABASE_SERVICE_ROLE_KEY") or ""
    )

    def validate(self) -> None:
        missing = [
            name
            for name, value in {
                "SUPABASE_URL": self.supabase_url,
                "SUPABASE_SERVICE_ROLE_KEY": self.supabase_service_role_key,
            }.items()
            if not value
        ]
        if missing:
            raise SystemExit(f"Missing required environment variables: {', '.join(missing)}")
