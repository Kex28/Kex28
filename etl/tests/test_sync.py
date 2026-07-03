import json

import pytest

from swu_sync.supabase_writer import DryRunWriter
from swu_sync.swuapi_client import GatedEndpointError, SwuApiClient
from swu_sync.sync import main, phase1_sync


def test_phase1_sync_from_fixtures_lands_all_tables():
    writer = DryRunWriter()
    counts = phase1_sync(None, writer, with_cards=True, fixtures=True)

    assert counts["archetypes"] == 10
    assert counts["meta_snapshots"] == 10
    assert counts["cards"] == 3

    snapshot = writer.written["meta_snapshots"][0]
    assert set(snapshot) >= {"snapshot_at", "archetype_id", "meta_share", "win_rate", "raw"}
    # every archetype referenced by the snapshot exists in the archetypes batch
    archetype_ids = {a["id"] for a in writer.written["archetypes"]}
    assert {m["archetype_id"] for m in writer.written["meta_snapshots"]} <= archetype_ids


def test_gated_endpoint_requires_key():
    client = SwuApiClient("https://api.example.com", api_key=None)
    with pytest.raises(GatedEndpointError):
        client.get_tournaments()


def test_items_accepts_array_and_envelope():
    assert SwuApiClient._items([{"a": 1}]) == [{"a": 1}]
    assert SwuApiClient._items({"data": [{"a": 1}]}) == [{"a": 1}]
    with pytest.raises(ValueError):
        SwuApiClient._items("nope")


def test_cli_fixtures_json_roundtrips(capsys):
    assert main(["--fixtures", "--json"]) == 0
    rows = json.loads(capsys.readouterr().out)
    assert len(rows) == 10
    assert all("archetype_id" in row for row in rows)
