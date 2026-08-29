import importlib
import sys
import unittest
from datetime import date
from unittest.mock import patch

import numpy as np

from weather_service import (
    CurrentWeather,
    DailyForecast,
    WeatherReport,
)


class FakeBox:
    def __init__(self, class_id, confidence, coordinates):
        self.cls = np.asarray([class_id], dtype=np.float32)
        self.conf = np.asarray([confidence], dtype=np.float32)
        self.xyxy = np.asarray([coordinates], dtype=np.float32)


class FakeResult:
    def __init__(self, boxes):
        self.boxes = boxes


class ManualFuture:
    def __init__(self):
        self._done = False
        self._result = None

    def done(self):
        return self._done

    def result(self):
        if not self._done:
            raise RuntimeError("resultado ainda não disponível")
        return self._result

    def complete(self, result):
        self._result = result
        self._done = True


class ManualExecutor:
    def __init__(self):
        self.submissions = []
        self.futures = []
        self.shutdown_args = None

    def submit(self, function, *args):
        future = ManualFuture()
        self.submissions.append((function, args))
        self.futures.append(future)
        return future

    def shutdown(self, wait=True, cancel_futures=False):
        self.shutdown_args = (wait, cancel_futures)


class RuntimeStructureTests(unittest.TestCase):
    def test_limits_torch_to_the_benchmarked_thread_count(self):
        module = importlib.import_module("teste")
        configured_threads = []

        class FakeTorch:
            @staticmethod
            def set_num_threads(value):
                configured_threads.append(value)

        module.configure_inference_runtime(FakeTorch())

        self.assertEqual(module.INFERENCE_THREADS, 4)
        self.assertEqual(configured_threads, [4])

    def test_import_has_no_model_or_stream_side_effects(self):
        sys.modules.pop("teste", None)

        with (
            patch("ultralytics.YOLO") as yolo,
            patch("cv2.VideoCapture") as video_capture,
        ):
            module = importlib.import_module("teste")

        yolo.assert_not_called()
        video_capture.assert_not_called()
        self.assertTrue(callable(module.main))

    def test_enables_headless_server_mode_from_environment(self):
        module = importlib.import_module("teste")

        self.assertTrue(
            module.headless_mode({"PONTE_DETECTOR_HEADLESS": "1"}),
        )
        self.assertTrue(
            module.headless_mode({"PONTE_DETECTOR_HEADLESS": "true"}),
        )
        self.assertFalse(
            module.headless_mode({"PONTE_DETECTOR_HEADLESS": "0"}),
        )
        self.assertFalse(module.headless_mode({}))

    def test_uses_benchmarked_resolution_after_cropping_to_the_road(self):
        module = importlib.import_module("teste")

        self.assertEqual(
            module.STREAM_URL,
            "https://video04.logicahost.com.br/portovelhomamore/"
            "fozaduanapontedaamizade.stream/playlist.m3u8",
        )
        self.assertEqual(
            module.ROI_NORMALIZED,
            (
                (0.55, 0.18),
                (0.59, 0.20),
                (0.56, 0.30),
                (0.49, 0.44),
                (0.42, 0.58),
                (0.34, 0.73),
                (0.26, 0.87),
                (0.19, 0.995),
                (0.00, 0.995),
                (0.00, 0.75),
                (0.22, 0.58),
                (0.39, 0.44),
            ),
        )
        self.assertEqual(module.INFERENCE_SIZE, 416)
        self.assertEqual(module.TARGET_INFERENCE_FPS, 25.0)
        self.assertEqual(module.CONFIDENCE, 0.10)
        self.assertEqual(module.NMS_IOU, 0.40)
        self.assertEqual(module.MAX_VEHICLES, 24)
        self.assertEqual(module.MAX_OCCUPANCY, 0.18)

    def test_crops_frame_to_roi_bounding_rectangle(self):
        module = importlib.import_module("teste")
        frame = np.zeros((100, 200, 3), dtype=np.uint8)
        roi = np.asarray(
            [[50, 20], [150, 20], [150, 80], [50, 80]],
            dtype=np.int32,
        )

        crop, offset = module.crop_frame_to_roi(
            frame,
            roi,
            padding_ratio=0.0,
        )

        self.assertEqual(offset, (50, 20))
        self.assertEqual(crop.shape, (61, 101, 3))

    def test_maps_crop_detections_back_to_original_frame(self):
        module = importlib.import_module("teste")
        result = FakeResult(
            [FakeBox(2, 0.85, (10.4, 20.1, 30.6, 40.8))],
        )

        detections = module.extract_detections(result, offset=(50, 100))

        self.assertEqual(len(detections), 1)
        self.assertEqual(detections[0].box, (60, 120, 81, 141))

    def test_ignores_non_vehicle_classes_when_mapping(self):
        module = importlib.import_module("teste")
        result = FakeResult(
            [
                FakeBox(0, 0.95, (1, 2, 3, 4)),
                FakeBox(3, 0.75, (5, 6, 7, 8)),
            ],
        )

        detections = module.extract_detections(result, offset=(10, 20))

        self.assertEqual(len(detections), 1)
        self.assertEqual(detections[0].class_id, 3)
        self.assertEqual(detections[0].box, (15, 26, 17, 28))

    def test_formats_current_today_and_tomorrow_for_dashboard(self):
        module = importlib.import_module("teste")
        report = WeatherReport(
            current=CurrentWeather(
                observed_at="2026-08-23T20:00",
                temperature_c=16.5,
                apparent_temperature_c=15.1,
                precipitation_mm=0.0,
                weather_code=2,
                wind_speed_kmh=8.8,
            ),
            today=DailyForecast(
                date=date(2026, 8, 23),
                temperature_min_c=12.3,
                temperature_max_c=22.4,
                precipitation_probability_percent=20,
                weather_code=2,
            ),
            tomorrow=DailyForecast(
                date=date(2026, 8, 24),
                temperature_min_c=14.2,
                temperature_max_c=24.8,
                precipitation_probability_percent=70,
                weather_code=61,
            ),
        )

        lines = module.weather_panel_lines(report, last_error=None)

        self.assertEqual(
            lines,
            (
                "Agora: Parc. nublado | 16.5 C | Sensacao 15.1 C",
                "Chuva agora: 0.0 mm | Vento: 8.8 km/h",
                "Hoje: Parc. nublado | 12.3/22.4 C | Chuva 20%",
                "Amanha: Chuva leve | 14.2/24.8 C | Chuva 70%",
            ),
        )

    def test_formats_weather_loading_and_failure_states(self):
        module = importlib.import_module("teste")

        self.assertEqual(
            module.weather_panel_lines(None, last_error=None)[0],
            "Clima: carregando...",
        )
        self.assertEqual(
            module.weather_panel_lines(None, last_error="offline")[0],
            "Clima: indisponivel; nova tentativa em breve",
        )

    def test_dashboard_grows_with_resolution_without_reaching_the_roi(self):
        module = importlib.import_module("teste")

        x1, y1, x2, y2, scale = module.dashboard_panel_bounds(
            (1440, 2560, 3),
            roi_top_y=504,
        )

        self.assertEqual((x1, y1), (12, 12))
        self.assertLess(y2, 504)
        self.assertLessEqual(x2, 2560 - 12)
        self.assertGreater(x2, 900)
        self.assertAlmostEqual(scale, 1.44)

        _, _, _, smaller_y2, _ = module.dashboard_panel_bounds(
            (1008, 1920, 3),
            roi_top_y=353,
        )
        self.assertLess(smaller_y2, 353)

    def test_limits_fast_frames_to_the_original_25_fps_pace(self):
        module = importlib.import_module("teste")

        self.assertAlmostEqual(
            module.remaining_frame_delay(
                cycle_started_at=10.0,
                target_fps=25.0,
                now=10.01,
            ),
            0.03,
        )
        self.assertEqual(
            module.remaining_frame_delay(
                cycle_started_at=10.0,
                target_fps=25.0,
                now=10.05,
            ),
            0.0,
        )


class AsyncInferenceTests(unittest.TestCase):
    def test_paces_fast_inference_to_25_fps(self):
        module = importlib.import_module("teste")
        snapshot = module.InferenceSnapshot(
            analysis=object(),
            duration_seconds=0.03,
        )
        clock_values = iter((10.0, 10.03, 10.04))
        sleep_calls = []

        with patch.object(module, "process_frame", return_value=snapshot):
            paced = module.process_frame_at_target_fps(
                model=object(),
                frame=object(),
                roi_polygon=object(),
                target_fps=25.0,
                clock=lambda: next(clock_values),
                sleeper=sleep_calls.append,
            )

        self.assertAlmostEqual(sleep_calls[0], 0.01)
        self.assertAlmostEqual(paced.duration_seconds, 0.04)
        self.assertIs(paced.analysis, snapshot.analysis)

    def test_keeps_only_one_inference_in_flight_without_queueing_frames(self):
        module = importlib.import_module("teste")
        executor = ManualExecutor()
        worker = module.AsyncInferenceWorker(model=object(), executor=executor)
        frame = np.zeros((100, 200, 3), dtype=np.uint8)
        roi = np.asarray(
            [[50, 20], [150, 20], [150, 80], [50, 80]],
            dtype=np.int32,
        )

        self.assertTrue(worker.submit_if_idle(frame, roi))
        self.assertFalse(worker.submit_if_idle(frame, roi))
        self.assertEqual(len(executor.submissions), 1)

        submitted_frame = executor.submissions[0][1][1]
        submitted_roi = executor.submissions[0][1][2]
        self.assertIsNot(submitted_frame, frame)
        self.assertIsNot(submitted_roi, roi)

        snapshot = module.InferenceSnapshot(
            analysis=object(),
            duration_seconds=0.10,
        )
        executor.futures[0].complete(snapshot)

        self.assertIs(worker.latest(), snapshot)
        self.assertTrue(worker.submit_if_idle(frame, roi))
        self.assertEqual(len(executor.submissions), 2)

        worker.close()
        self.assertEqual(executor.shutdown_args, (True, True))

    def test_process_frame_returns_analysis_and_inference_duration(self):
        module = importlib.import_module("teste")
        model = object()
        frame = np.zeros((100, 200, 3), dtype=np.uint8)
        roi = np.asarray(
            [[50, 20], [150, 20], [150, 80], [50, 80]],
            dtype=np.int32,
        )
        expected_analysis = object()

        with (
            patch.object(module, "run_inference", return_value=["detection"]),
            patch.object(
                module,
                "analyze_congestion",
                return_value=expected_analysis,
            ),
        ):
            snapshot = module.process_frame(model, frame, roi)

        self.assertIs(snapshot.analysis, expected_analysis)
        self.assertGreaterEqual(snapshot.duration_seconds, 0.0)


if __name__ == "__main__":
    unittest.main()
