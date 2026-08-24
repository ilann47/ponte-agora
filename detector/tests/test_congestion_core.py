import unittest

from congestion_core import (
    Detection,
    ExponentialSmoother,
    analyze_congestion,
    congestion_level,
    scale_polygon,
)


FULL_FRAME_ROI = (
    (0.0, 0.0),
    (1.0, 0.0),
    (1.0, 1.0),
    (0.0, 1.0),
)


class CongestionLevelTests(unittest.TestCase):
    def test_classifies_every_score_boundary(self):
        cases = {
            0: "LIVRE",
            24: "LIVRE",
            25: "MODERADO",
            49: "MODERADO",
            50: "ALTO",
            74: "ALTO",
            75: "MUITO ALTO",
            100: "MUITO ALTO",
        }

        for score, expected in cases.items():
            with self.subTest(score=score):
                self.assertEqual(congestion_level(score), expected)


class RoiTests(unittest.TestCase):
    def test_scales_normalized_polygon_to_frame(self):
        polygon = scale_polygon(FULL_FRAME_ROI, width=200, height=100)

        self.assertEqual(
            polygon.tolist(),
            [[0, 0], [199, 0], [199, 99], [0, 99]],
        )

    def test_counts_only_detection_whose_road_contact_is_inside_roi(self):
        right_half_roi = scale_polygon(
            ((0.5, 0.0), (1.0, 0.0), (1.0, 1.0), (0.5, 1.0)),
            width=100,
            height=100,
        )
        detections = [
            Detection(2, "car", 0.90, (60, 20, 90, 80)),
            Detection(2, "car", 0.95, (10, 20, 40, 80)),
        ]

        analysis = analyze_congestion(
            frame_shape=(100, 100, 3),
            detections=detections,
            roi_polygon=right_half_roi,
            max_vehicles=10,
            max_occupancy=0.50,
        )

        self.assertEqual(analysis.metrics.vehicle_count, 1)
        self.assertEqual(analysis.detections, (detections[0],))


class OccupancyAndScoreTests(unittest.TestCase):
    def test_overlapping_boxes_contribute_only_their_union_area(self):
        roi = scale_polygon(FULL_FRAME_ROI, width=100, height=100)
        detections = [
            Detection(2, "car", 0.90, (10, 10, 30, 30)),
            Detection(2, "car", 0.85, (20, 20, 40, 40)),
        ]

        analysis = analyze_congestion(
            frame_shape=(100, 100, 3),
            detections=detections,
            roi_polygon=roi,
            max_vehicles=10,
            max_occupancy=0.10,
            count_weight=0.50,
            occupancy_weight=0.50,
        )

        self.assertEqual(analysis.metrics.vehicle_count, 2)
        self.assertAlmostEqual(analysis.metrics.occupancy, 0.07, places=4)
        self.assertEqual(analysis.metrics.score, 45)

    def test_clips_boxes_to_frame_limits(self):
        roi = scale_polygon(FULL_FRAME_ROI, width=100, height=100)
        detection = Detection(7, "truck", 0.90, (-20, -10, 20, 20))

        analysis = analyze_congestion(
            frame_shape=(100, 100, 3),
            detections=[detection],
            roi_polygon=roi,
            max_vehicles=10,
            max_occupancy=0.10,
        )

        self.assertAlmostEqual(analysis.metrics.occupancy, 0.04, places=4)

    def test_rejects_invalid_score_configuration(self):
        roi = scale_polygon(FULL_FRAME_ROI, width=100, height=100)

        with self.assertRaises(ValueError):
            analyze_congestion(
                frame_shape=(100, 100, 3),
                detections=[],
                roi_polygon=roi,
                max_vehicles=0,
                max_occupancy=0.10,
            )


class ExponentialSmootherTests(unittest.TestCase):
    def test_starts_at_first_value_and_then_smooths(self):
        smoother = ExponentialSmoother(alpha=0.5)

        self.assertEqual(smoother.update(20), 20)
        self.assertEqual(smoother.update(60), 40)

    def test_rejects_alpha_outside_valid_range(self):
        for alpha in (0.0, -0.1, 1.1):
            with self.subTest(alpha=alpha):
                with self.assertRaises(ValueError):
                    ExponentialSmoother(alpha=alpha)


if __name__ == "__main__":
    unittest.main()
