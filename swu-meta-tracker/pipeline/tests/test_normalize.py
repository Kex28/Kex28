import unittest

from swu_sync.sync import as_fraction, normalize_archetype, normalize_card, normalize_meta_row
from swu_sync.swuapi import unwrap_list

NOW = "2026-07-03T00:00:00+00:00"


class TestUnwrapList(unittest.TestCase):
    def test_bare_list(self):
        self.assertEqual(unwrap_list([1, 2]), [1, 2])

    def test_enveloped(self):
        self.assertEqual(unwrap_list({"data": [1]}), [1])
        self.assertEqual(unwrap_list({"results": [2]}), [2])

    def test_unknown_shape_raises(self):
        with self.assertRaises(ValueError):
            unwrap_list({"nope": 1})


class TestAsFraction(unittest.TestCase):
    def test_fraction_passthrough(self):
        self.assertAlmostEqual(as_fraction(0.42), 0.42)

    def test_percentage_scaled(self):
        self.assertAlmostEqual(as_fraction(42), 0.42)
        self.assertAlmostEqual(as_fraction("55.5"), 0.555)

    def test_bad_values(self):
        self.assertIsNone(as_fraction(None))
        self.assertIsNone(as_fraction("n/a"))


class TestNormalizers(unittest.TestCase):
    def test_archetype(self):
        row = normalize_archetype(
            {"id": 7, "name": "Boba Blue", "leader": "Boba Fett", "aspects": "Vigilance/Cunning"},
            NOW,
        )
        self.assertEqual(row["swuapi_id"], "7")
        self.assertEqual(row["aspects"], ["Vigilance", "Cunning"])
        self.assertEqual(row["last_updated_at"], NOW)

    def test_archetype_without_name_skipped(self):
        self.assertIsNone(normalize_archetype({"id": 1}, NOW))

    def test_card_id_from_set_and_number(self):
        row = normalize_card({"name": "Vader", "set": "SOR", "number": 10}, NOW)
        self.assertEqual(row["swudb_id"], "SOR_10")
        self.assertEqual(row["card_number"], "10")

    def test_meta_row(self):
        row = normalize_meta_row({"archetype": "Sabine Red", "share": 12.5, "winRate": 0.51}, NOW, NOW)
        self.assertEqual(row["archetype_name"], "Sabine Red")
        self.assertAlmostEqual(row["meta_share"], 0.125)
        self.assertAlmostEqual(row["win_rate"], 0.51)

    def test_meta_row_without_archetype_skipped(self):
        self.assertIsNone(normalize_meta_row({"share": 1}, NOW, NOW))


if __name__ == "__main__":
    unittest.main()
