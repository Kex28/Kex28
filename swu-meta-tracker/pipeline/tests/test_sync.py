import json

from swu_pipeline.config import Settings
from swu_pipeline.sync import run


def offline_settings(tmp_path, monkeypatch) -> Settings:
    monkeypatch.setenv("SWU_FIXTURES", "1")
    monkeypatch.delenv("SUPABASE_URL", raising=False)
    monkeypatch.delenv("SUPABASE_SERVICE_ROLE_KEY", raising=False)
    monkeypatch.setenv("SWU_OUT_DIR", str(tmp_path / "out"))
    return Settings()


def test_full_sync_offline(tmp_path, monkeypatch):
    settings = offline_settings(tmp_path, monkeypatch)

    summary = run(settings)

    assert summary["status"] == "ok"
    assert summary["counts"] == {
        "sets": 4,
        "cards": 12,
        "archetypes": 10,
        "meta_snapshots": 10,
    }

    out = tmp_path / "out"
    meta = json.loads((out / "meta_snapshots.json").read_text())
    assert len(meta) == 10
    top = max(meta, key=lambda row: row["meta_share"])
    assert top["archetype_id"] == "sabine-ecl"
    # every landed row carries the freshness stamp the UI displays
    for table in ("sets", "cards", "archetypes", "meta_snapshots"):
        rows = json.loads((out / f"{table}.json").read_text())
        assert all(row["last_updated_at"] for row in rows)

    runs = json.loads((out / "sync_runs.json").read_text())
    assert len(runs) == 1  # running -> ok upserted onto the same row
    assert runs[0]["status"] == "ok"


def test_meta_snapshots_upsert_key_prevents_duplicates(tmp_path, monkeypatch):
    settings = offline_settings(tmp_path, monkeypatch)

    run(settings)
    run(settings)  # same captured_at in fixtures -> same snapshot batch

    meta = json.loads((tmp_path / "out" / "meta_snapshots.json").read_text())
    assert len(meta) == 10  # keyed on (archetype_id, captured_at), not duplicated


def test_archetype_rows_match_schema_columns(tmp_path, monkeypatch):
    settings = offline_settings(tmp_path, monkeypatch)
    run(settings)

    rows = json.loads((tmp_path / "out" / "archetypes.json").read_text())
    assert set(rows[0]) == {"id", "name", "leader", "base", "aspect", "last_updated_at"}
