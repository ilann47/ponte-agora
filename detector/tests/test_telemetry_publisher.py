import unittest
from concurrent.futures import Future


class ManualExecutor:
    def __init__(self):
        self.future = None
        self.calls = []

    def submit(self, function, *args):
        self.calls.append((function, args))
        self.future = Future()
        return self.future

    def shutdown(self, wait=True, cancel_futures=False):
        return None


class TelemetryPublisherTests(unittest.TestCase):
    def test_builds_the_web_payload_from_detector_metrics(self):
        from congestion_core import Detection
        from telemetry_publisher import build_traffic_payload

        payload = build_traffic_payload(
            score=20,
            raw_score=18,
            vehicle_count=6,
            occupancy=0.019,
            video_fps=24.72,
            inference_fps=6.1,
            observed_at="2026-08-23T21:30:00-03:00",
            counter_session_id="session-20260824",
            vehicle_passages=42,
            detections=(
                Detection(2, "carro", 0.8732, (10, 5, 30, 25)),
            ),
            roi_normalized=((0.45, 0.35), (0.66, 0.35), (0.61, 0.99)),
            frame_width=100,
            frame_height=50,
        )

        self.assertEqual(payload["score"], 20)
        self.assertEqual(payload["rawScore"], 18)
        self.assertEqual(payload["vehicleCount"], 6)
        self.assertEqual(payload["counterSessionId"], "session-20260824")
        self.assertEqual(payload["vehiclePassages"], 42)
        self.assertEqual(payload["observedAt"], "2026-08-23T21:30:00-03:00")
        self.assertEqual(payload["roi"][0], [0.45, 0.35])
        self.assertEqual(payload["detections"], [
            {
                "label": "carro",
                "confidence": 0.8732,
                "box": [0.1, 0.1, 0.3, 0.5],
            }
        ])

    def test_clamps_overlay_coordinates_to_the_video_bounds(self):
        from congestion_core import Detection
        from telemetry_publisher import serialize_detection_overlay

        overlay = serialize_detection_overlay(
            detections=(Detection(7, "caminhao", 0.9, (-10, -5, 120, 60)),),
            roi_normalized=((-0.1, 0.2), (1.2, 0.2), (0.5, 1.1)),
            frame_width=100,
            frame_height=50,
        )

        self.assertEqual(overlay["roi"], [[0.0, 0.2], [1.0, 0.2], [0.5, 1.0]])
        self.assertEqual(overlay["detections"][0]["box"], [0.0, 0.0, 1.0, 1.0])

    def test_never_queues_updates_while_a_publish_is_running(self):
        from telemetry_publisher import AsyncTelemetryPublisher, TelemetryConfig

        executor = ManualExecutor()
        clock_values = iter((10.0, 10.1))
        publisher = AsyncTelemetryPublisher(
            config=TelemetryConfig("https://ponte.example/api/traffic", "token"),
            sender=lambda *_: None,
            executor=executor,
            clock=lambda: next(clock_values),
        )
        reading = {
            "score": 20,
            "raw_score": 18,
            "vehicle_count": 6,
            "occupancy": 0.019,
            "video_fps": 24.72,
            "inference_fps": 6.1,
            "observed_at": "2026-08-23T21:30:00-03:00",
            "counter_session_id": "session-20260824",
            "vehicle_passages": 42,
        }

        self.assertTrue(publisher.publish_if_due(**reading))
        self.assertFalse(publisher.publish_if_due(**reading))
        self.assertEqual(len(executor.calls), 1)

    def test_disabled_publisher_does_nothing(self):
        from telemetry_publisher import AsyncTelemetryPublisher

        publisher = AsyncTelemetryPublisher(config=None)

        self.assertFalse(
            publisher.publish_if_due(
                score=20,
                raw_score=18,
                vehicle_count=6,
                occupancy=0.019,
                video_fps=24.72,
                inference_fps=6.1,
                observed_at="2026-08-23T21:30:00-03:00",
                counter_session_id="session-20260824",
                vehicle_passages=42,
            )
        )


if __name__ == "__main__":
    unittest.main()
