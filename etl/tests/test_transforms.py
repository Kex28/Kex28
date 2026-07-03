from swu_sync import transforms


def test_archetype_row_maps_fields():
    row = transforms.archetype_row(
        {"id": "boba", "name": "Boba Yellow", "leader": "Boba Fett", "base": "Jabba's Palace", "aspect": "Cunning"}
    )
    assert row == {
        "id": "boba",
        "name": "Boba Yellow",
        "leader": "Boba Fett",
        "base": "Jabba's Palace",
        "aspect": "Cunning",
    }


def test_archetype_row_tolerates_alias_keys():
    row = transforms.archetype_row({"archetype_id": 7, "archetype": "Sabine", "leader_name": "Sabine Wren"})
    assert row["id"] == "7"
    assert row["name"] == "Sabine"
    assert row["leader"] == "Sabine Wren"
    assert row["base"] is None


def test_meta_snapshot_row_keeps_raw_and_normalises_percentages():
    item = {"archetype_id": "boba", "meta_share": 16.2, "win_rate": 0.548, "deck_count": 214}
    row = transforms.meta_snapshot_row(item, "2026-07-03T06:00:00+00:00")
    assert row["snapshot_at"] == "2026-07-03T06:00:00+00:00"
    assert abs(row["meta_share"] - 0.162) < 1e-9   # 16.2% -> 0.162
    assert row["win_rate"] == 0.548                # already a fraction
    assert row["raw"] == item


def test_card_row_wraps_single_aspect_in_list():
    row = transforms.card_row({"id": "sor-123", "name": "Vanquish", "aspects": "Vigilance"})
    assert row["aspects"] == ["Vigilance"]
