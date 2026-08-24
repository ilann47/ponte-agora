import unittest

from congestion_core import Detection
from vehicle_counter import VehiclePassageCounter


def vehicle(x: int, contact_y: int) -> Detection:
    return Detection(
        class_id=2,
        label="carro",
        confidence=0.9,
        box=(x - 20, contact_y - 40, x + 20, contact_y),
    )


class VehiclePassageCounterTests(unittest.TestCase):
    def setUp(self):
        self.counter = VehiclePassageCounter(
            frame_width=1000,
            frame_height=1000,
            line_y_ratio=0.50,
            hysteresis_ratio=0.01,
            max_match_distance_ratio=0.15,
            max_missing_updates=2,
        )

    def test_counts_a_vehicle_once_when_it_crosses_toward_the_bridge(self):
        self.assertEqual(self.counter.update((vehicle(500, 650),)), 0)
        self.assertEqual(self.counter.update((vehicle(500, 505),)), 0)
        self.assertEqual(self.counter.update((vehicle(500, 450),)), 1)
        self.assertEqual(self.counter.total, 1)

        self.assertEqual(self.counter.update((vehicle(500, 400),)), 0)
        self.assertEqual(self.counter.total, 1)

    def test_ignores_the_opposite_direction(self):
        self.counter.update((vehicle(500, 450),))
        self.counter.update((vehicle(500, 650),))

        self.assertEqual(self.counter.total, 0)

    def test_tracks_multiple_vehicles_without_merging_their_crossings(self):
        self.counter.update((vehicle(350, 650), vehicle(650, 680)))
        self.counter.update((vehicle(350, 540), vehicle(650, 545)))
        crossings = self.counter.update((vehicle(350, 450), vehicle(650, 460)))

        self.assertEqual(crossings, 2)
        self.assertEqual(self.counter.total, 2)

    def test_does_not_join_a_new_vehicle_to_an_expired_track(self):
        self.counter.update((vehicle(500, 650),))
        self.counter.update(())
        self.counter.update(())
        self.counter.update(())

        self.assertEqual(self.counter.update((vehicle(500, 450),)), 0)
        self.assertEqual(self.counter.total, 0)

    def test_validates_configuration(self):
        with self.assertRaises(ValueError):
            VehiclePassageCounter(frame_width=0, frame_height=100)
        with self.assertRaises(ValueError):
            VehiclePassageCounter(
                frame_width=100,
                frame_height=100,
                line_y_ratio=1.2,
            )


if __name__ == "__main__":
    unittest.main()
