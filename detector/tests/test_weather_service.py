import unittest
from datetime import date
from urllib.parse import parse_qs, urlparse

from weather_service import (
    AsyncWeatherService,
    WeatherDataError,
    build_weather_url,
    parse_weather_response,
    weather_code_label,
)


SAMPLE_RESPONSE = {
    "current": {
        "time": "2026-08-23T20:00",
        "temperature_2m": 16.5,
        "apparent_temperature": 15.1,
        "precipitation": 0.0,
        "weather_code": 2,
        "wind_speed_10m": 8.8,
    },
    "daily": {
        "time": ["2026-08-23", "2026-08-24"],
        "weather_code": [2, 61],
        "temperature_2m_max": [22.4, 24.8],
        "temperature_2m_min": [12.3, 14.2],
        "precipitation_probability_max": [20, 70],
    },
}


class ManualFuture:
    def __init__(self):
        self._done = False
        self._result = None
        self._error = None

    def done(self):
        return self._done

    def result(self):
        if self._error is not None:
            raise self._error
        if not self._done:
            raise RuntimeError("resultado ainda não disponível")
        return self._result

    def complete(self, result):
        self._result = result
        self._done = True

    def fail(self, error):
        self._error = error
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


class FakeClock:
    def __init__(self):
        self.value = 0.0

    def __call__(self):
        return self.value

    def advance(self, seconds):
        self.value += seconds


class WeatherCodeTests(unittest.TestCase):
    def test_translates_wmo_codes_to_short_portuguese_labels(self):
        cases = {
            0: "Ceu limpo",
            2: "Parc. nublado",
            45: "Neblina",
            61: "Chuva leve",
            65: "Chuva forte",
            80: "Pancadas leves",
            95: "Tempestade",
            99: "Tempestade c/ granizo",
            999: "Condicao desconhecida",
        }

        for code, expected in cases.items():
            with self.subTest(code=code):
                self.assertEqual(weather_code_label(code), expected)


class WeatherResponseTests(unittest.TestCase):
    def test_parses_current_today_and_tomorrow(self):
        report = parse_weather_response(SAMPLE_RESPONSE)

        self.assertEqual(report.current.observed_at, "2026-08-23T20:00")
        self.assertEqual(report.current.temperature_c, 16.5)
        self.assertEqual(report.current.apparent_temperature_c, 15.1)
        self.assertEqual(report.current.precipitation_mm, 0.0)
        self.assertEqual(report.current.weather_code, 2)
        self.assertEqual(report.current.wind_speed_kmh, 8.8)

        self.assertEqual(report.today.date, date(2026, 8, 23))
        self.assertEqual(report.today.temperature_min_c, 12.3)
        self.assertEqual(report.today.temperature_max_c, 22.4)
        self.assertEqual(report.today.precipitation_probability_percent, 20)

        self.assertEqual(report.tomorrow.date, date(2026, 8, 24))
        self.assertEqual(report.tomorrow.weather_code, 61)
        self.assertEqual(report.tomorrow.precipitation_probability_percent, 70)

    def test_rejects_response_without_two_forecast_days(self):
        invalid_response = {
            **SAMPLE_RESPONSE,
            "daily": {
                key: values[:1]
                for key, values in SAMPLE_RESPONSE["daily"].items()
            },
        }

        with self.assertRaises(WeatherDataError):
            parse_weather_response(invalid_response)

    def test_builds_keyless_open_meteo_url_with_required_fields(self):
        url = build_weather_url()
        parsed = urlparse(url)
        query = parse_qs(parsed.query)

        self.assertEqual(parsed.netloc, "api.open-meteo.com")
        self.assertEqual(query["forecast_days"], ["2"])
        self.assertEqual(query["timezone"], ["America/Sao_Paulo"])
        self.assertIn("temperature_2m", query["current"][0])
        self.assertIn("apparent_temperature", query["current"][0])
        self.assertIn("precipitation_probability_max", query["daily"][0])
        self.assertNotIn("apikey", query)


class AsyncWeatherServiceTests(unittest.TestCase):
    def test_refreshes_once_and_waits_ten_minutes_after_success(self):
        report = parse_weather_response(SAMPLE_RESPONSE)
        executor = ManualExecutor()
        clock = FakeClock()
        service = AsyncWeatherService(
            fetcher=lambda: report,
            refresh_seconds=600.0,
            retry_seconds=60.0,
            executor=executor,
            clock=clock,
        )

        self.assertTrue(service.refresh_if_due())
        self.assertFalse(service.refresh_if_due())
        executor.futures[0].complete(report)
        self.assertIs(service.latest(), report)
        self.assertFalse(service.refresh_if_due())

        clock.advance(599.0)
        self.assertFalse(service.refresh_if_due())
        clock.advance(1.0)
        self.assertTrue(service.refresh_if_due())

        service.close()
        self.assertEqual(executor.shutdown_args, (True, True))

    def test_keeps_last_report_and_retries_one_minute_after_failure(self):
        report = parse_weather_response(SAMPLE_RESPONSE)
        executor = ManualExecutor()
        clock = FakeClock()
        service = AsyncWeatherService(
            fetcher=lambda: report,
            refresh_seconds=600.0,
            retry_seconds=60.0,
            executor=executor,
            clock=clock,
        )

        service.refresh_if_due()
        executor.futures[0].complete(report)
        self.assertIs(service.latest(), report)

        clock.advance(600.0)
        self.assertTrue(service.refresh_if_due())
        executor.futures[1].fail(RuntimeError("API indisponivel"))
        self.assertIs(service.latest(), report)
        self.assertIn("API indisponivel", service.last_error)

        clock.advance(59.0)
        self.assertFalse(service.refresh_if_due())
        clock.advance(1.0)
        self.assertTrue(service.refresh_if_due())

        service.close()


if __name__ == "__main__":
    unittest.main()
