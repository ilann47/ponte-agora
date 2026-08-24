"""Consulta e atualização assíncrona do clima de Foz do Iguaçu."""

from __future__ import annotations

import json
import time
from concurrent.futures import Executor, Future, ThreadPoolExecutor
from dataclasses import dataclass
from datetime import date
from typing import Callable, Mapping, Sequence
from urllib.error import URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen


OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"
FOZ_LATITUDE = -25.5163
FOZ_LONGITUDE = -54.5854
WEATHER_TIMEZONE = "America/Sao_Paulo"

CURRENT_FIELDS = (
    "temperature_2m",
    "apparent_temperature",
    "precipitation",
    "weather_code",
    "wind_speed_10m",
)
DAILY_FIELDS = (
    "weather_code",
    "temperature_2m_max",
    "temperature_2m_min",
    "precipitation_probability_max",
)


class WeatherDataError(RuntimeError):
    """Indica resposta meteorológica ausente, inválida ou incompleta."""


@dataclass(frozen=True, slots=True)
class CurrentWeather:
    observed_at: str
    temperature_c: float
    apparent_temperature_c: float
    precipitation_mm: float
    weather_code: int
    wind_speed_kmh: float


@dataclass(frozen=True, slots=True)
class DailyForecast:
    date: date
    temperature_min_c: float
    temperature_max_c: float
    precipitation_probability_percent: int | None
    weather_code: int


@dataclass(frozen=True, slots=True)
class WeatherReport:
    current: CurrentWeather
    today: DailyForecast
    tomorrow: DailyForecast


def weather_code_label(code: int) -> str:
    labels = {
        0: "Ceu limpo",
        1: "Predom. limpo",
        2: "Parc. nublado",
        3: "Nublado",
        45: "Neblina",
        48: "Neblina",
        51: "Garoa leve",
        53: "Garoa",
        55: "Garoa forte",
        56: "Garoa congelante",
        57: "Garoa congelante",
        61: "Chuva leve",
        63: "Chuva moderada",
        65: "Chuva forte",
        66: "Chuva congelante",
        67: "Chuva congelante",
        71: "Neve leve",
        73: "Neve",
        75: "Neve forte",
        77: "Graos de neve",
        80: "Pancadas leves",
        81: "Pancadas",
        82: "Pancadas fortes",
        85: "Pancadas de neve",
        86: "Pancadas de neve",
        95: "Tempestade",
        96: "Tempestade c/ granizo",
        99: "Tempestade c/ granizo",
    }
    return labels.get(int(code), "Condicao desconhecida")


def build_weather_url(
    latitude: float = FOZ_LATITUDE,
    longitude: float = FOZ_LONGITUDE,
) -> str:
    query = urlencode(
        {
            "latitude": f"{latitude:.4f}",
            "longitude": f"{longitude:.4f}",
            "current": ",".join(CURRENT_FIELDS),
            "daily": ",".join(DAILY_FIELDS),
            "timezone": WEATHER_TIMEZONE,
            "forecast_days": "2",
        }
    )
    return f"{OPEN_METEO_URL}?{query}"


def fetch_weather(timeout_seconds: float = 8.0) -> WeatherReport:
    request = Request(
        build_weather_url(),
        headers={"User-Agent": "PonteMonitor/1.0"},
    )

    try:
        with urlopen(request, timeout=timeout_seconds) as response:
            payload = json.load(response)
    except (OSError, TimeoutError, URLError, json.JSONDecodeError) as error:
        raise WeatherDataError(f"falha ao consultar Open-Meteo: {error}") from error

    return parse_weather_response(payload)


def parse_weather_response(payload: Mapping[str, object]) -> WeatherReport:
    try:
        current = _required_mapping(payload, "current")
        daily = _required_mapping(payload, "daily")

        current_weather = CurrentWeather(
            observed_at=str(current["time"]),
            temperature_c=float(current["temperature_2m"]),
            apparent_temperature_c=float(current["apparent_temperature"]),
            precipitation_mm=float(current["precipitation"]),
            weather_code=int(current["weather_code"]),
            wind_speed_kmh=float(current["wind_speed_10m"]),
        )
        today = _parse_daily_forecast(daily, 0)
        tomorrow = _parse_daily_forecast(daily, 1)
    except (KeyError, TypeError, ValueError, IndexError) as error:
        raise WeatherDataError(
            f"resposta meteorologica invalida: {error}"
        ) from error

    return WeatherReport(
        current=current_weather,
        today=today,
        tomorrow=tomorrow,
    )


class AsyncWeatherService:
    """Atualiza clima sem bloquear o vídeo e preserva o último dado válido."""

    def __init__(
        self,
        fetcher: Callable[[], WeatherReport] = fetch_weather,
        refresh_seconds: float = 600.0,
        retry_seconds: float = 60.0,
        executor: Executor | None = None,
        clock: Callable[[], float] = time.monotonic,
    ) -> None:
        if refresh_seconds <= 0 or retry_seconds <= 0:
            raise ValueError("os intervalos de atualização devem ser positivos")

        self._fetcher = fetcher
        self._refresh_seconds = refresh_seconds
        self._retry_seconds = retry_seconds
        self._clock = clock
        self._executor = (
            executor
            if executor is not None
            else ThreadPoolExecutor(
                max_workers=1,
                thread_name_prefix="weather-update",
            )
        )
        self._future: Future[WeatherReport] | None = None
        self._latest: WeatherReport | None = None
        self._last_error: str | None = None
        self._next_refresh_at = 0.0
        self._closed = False

    @property
    def last_error(self) -> str | None:
        self._collect_ready_result()
        return self._last_error

    def refresh_if_due(self) -> bool:
        if self._closed:
            raise RuntimeError("o serviço de clima já foi encerrado")

        self._collect_ready_result()
        if self._future is not None:
            return False
        if self._clock() < self._next_refresh_at:
            return False

        self._future = self._executor.submit(self._fetcher)
        return True

    def latest(self) -> WeatherReport | None:
        self._collect_ready_result()
        return self._latest

    def close(self) -> None:
        if self._closed:
            return

        self._closed = True
        self._executor.shutdown(wait=True, cancel_futures=True)

    def _collect_ready_result(self) -> None:
        if self._future is None or not self._future.done():
            return

        try:
            self._latest = self._future.result()
        except Exception as error:
            self._last_error = str(error)
            self._next_refresh_at = self._clock() + self._retry_seconds
        else:
            self._last_error = None
            self._next_refresh_at = self._clock() + self._refresh_seconds
        finally:
            self._future = None


def _required_mapping(
    source: Mapping[str, object],
    key: str,
) -> Mapping[str, object]:
    value = source[key]
    if not isinstance(value, Mapping):
        raise TypeError(f"{key} deve ser um objeto")
    return value


def _required_sequence(
    source: Mapping[str, object],
    key: str,
) -> Sequence[object]:
    value = source[key]
    if not isinstance(value, Sequence) or isinstance(value, (str, bytes)):
        raise TypeError(f"{key} deve ser uma lista")
    if len(value) < 2:
        raise ValueError(f"{key} precisa conter hoje e amanha")
    return value


def _parse_daily_forecast(
    daily: Mapping[str, object],
    index: int,
) -> DailyForecast:
    dates = _required_sequence(daily, "time")
    codes = _required_sequence(daily, "weather_code")
    maximums = _required_sequence(daily, "temperature_2m_max")
    minimums = _required_sequence(daily, "temperature_2m_min")
    probabilities = _required_sequence(
        daily,
        "precipitation_probability_max",
    )

    probability_value = probabilities[index]
    probability = (
        None
        if probability_value is None
        else int(round(float(probability_value)))
    )
    return DailyForecast(
        date=date.fromisoformat(str(dates[index])),
        temperature_min_c=float(minimums[index]),
        temperature_max_c=float(maximums[index]),
        precipitation_probability_percent=probability,
        weather_code=int(codes[index]),
    )
