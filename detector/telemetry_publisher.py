"""Publicação assíncrona das métricas do detector no painel web."""

from __future__ import annotations

import json
import os
import time
from concurrent.futures import Executor, Future, ThreadPoolExecutor
from dataclasses import dataclass
from typing import Callable, Mapping, Sequence
from urllib.request import Request, urlopen

from congestion_core import Detection, NormalizedPoint


MAX_WEB_DETECTIONS = 64


@dataclass(frozen=True, slots=True)
class TelemetryConfig:
    api_url: str
    token: str
    publish_seconds: float = 1.0
    timeout_seconds: float = 5.0

    def __post_init__(self) -> None:
        if not self.api_url.startswith(("https://", "http://")):
            raise ValueError("api_url deve usar HTTP ou HTTPS")
        if not self.token:
            raise ValueError("token da telemetria não pode estar vazio")
        if self.publish_seconds <= 0 or self.timeout_seconds <= 0:
            raise ValueError("intervalos da telemetria devem ser positivos")


def build_traffic_payload(
    *,
    score: int,
    raw_score: int,
    vehicle_count: int,
    occupancy: float,
    video_fps: float,
    inference_fps: float,
    observed_at: str,
    counter_session_id: str,
    vehicle_passages: int,
    detections: Sequence[Detection] = (),
    roi_normalized: Sequence[NormalizedPoint] = (),
    frame_width: int = 1,
    frame_height: int = 1,
) -> dict[str, object]:
    overlay = serialize_detection_overlay(
        detections=detections,
        roi_normalized=roi_normalized,
        frame_width=frame_width,
        frame_height=frame_height,
    )
    return {
        "score": score,
        "rawScore": raw_score,
        "vehicleCount": vehicle_count,
        "occupancy": occupancy,
        "videoFps": video_fps,
        "inferenceFps": inference_fps,
        "observedAt": observed_at,
        "counterSessionId": counter_session_id,
        "vehiclePassages": vehicle_passages,
        **overlay,
    }


def serialize_detection_overlay(
    *,
    detections: Sequence[Detection],
    roi_normalized: Sequence[NormalizedPoint],
    frame_width: int,
    frame_height: int,
) -> dict[str, object]:
    """Converte ROI e caixas para coordenadas de 0 a 1 usadas pelo player web."""

    if frame_width <= 0 or frame_height <= 0:
        raise ValueError("dimensões do frame devem ser positivas")

    roi = [
        [_clamp_unit(float(x)), _clamp_unit(float(y))]
        for x, y in roi_normalized
    ]
    serialized_detections = []
    for detection in detections[:MAX_WEB_DETECTIONS]:
        if not detection.has_valid_box:
            continue
        x1, y1, x2, y2 = detection.box
        serialized_detections.append(
            {
                "label": detection.label,
                "confidence": round(_clamp_unit(detection.confidence), 4),
                "box": [
                    _clamp_unit(x1 / frame_width),
                    _clamp_unit(y1 / frame_height),
                    _clamp_unit(x2 / frame_width),
                    _clamp_unit(y2 / frame_height),
                ],
            }
        )

    return {"roi": roi, "detections": serialized_detections}


def _clamp_unit(value: float) -> float:
    return min(1.0, max(0.0, value))


def send_telemetry(
    config: TelemetryConfig,
    payload: Mapping[str, object],
) -> None:
    request = Request(
        config.api_url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {config.token}",
            "Content-Type": "application/json",
            "User-Agent": "PonteMonitor/1.0",
        },
        method="POST",
    )
    with urlopen(request, timeout=config.timeout_seconds) as response:
        if response.status < 200 or response.status >= 300:
            raise RuntimeError(f"painel web respondeu HTTP {response.status}")


TelemetrySender = Callable[[TelemetryConfig, Mapping[str, object]], None]


class AsyncTelemetryPublisher:
    """Publica sem bloquear o vídeo e nunca acumula leituras pendentes."""

    def __init__(
        self,
        config: TelemetryConfig | None,
        sender: TelemetrySender = send_telemetry,
        executor: Executor | None = None,
        clock: Callable[[], float] = time.monotonic,
    ) -> None:
        self.config = config
        self._sender = sender
        self._clock = clock
        self._executor = executor
        self._owns_executor = executor is None
        if config is not None and executor is None:
            self._executor = ThreadPoolExecutor(
                max_workers=1,
                thread_name_prefix="web-telemetry",
            )
        self._future: Future[None] | None = None
        self._next_publish_at = 0.0
        self._closed = False
        self.last_error: str | None = None

    @classmethod
    def from_environment(
        cls,
        environ: Mapping[str, str] | None = None,
    ) -> "AsyncTelemetryPublisher":
        values = os.environ if environ is None else environ
        api_url = values.get("PONTE_WEB_API_URL", "").strip()
        token = values.get("PONTE_WEB_TELEMETRY_TOKEN", "").strip()
        config = TelemetryConfig(api_url, token) if api_url and token else None
        return cls(config=config)

    def publish_if_due(
        self,
        *,
        score: int,
        raw_score: int,
        vehicle_count: int,
        occupancy: float,
        video_fps: float,
        inference_fps: float,
        observed_at: str,
        counter_session_id: str,
        vehicle_passages: int,
        detections: Sequence[Detection] = (),
        roi_normalized: Sequence[NormalizedPoint] = (),
        frame_width: int = 1,
        frame_height: int = 1,
    ) -> bool:
        if self._closed:
            raise RuntimeError("o publicador de telemetria já foi encerrado")
        if self.config is None or self._executor is None:
            return False

        self._collect_ready_result()
        if self._future is not None:
            return False

        now = self._clock()
        if now < self._next_publish_at:
            return False

        payload = build_traffic_payload(
            score=score,
            raw_score=raw_score,
            vehicle_count=vehicle_count,
            occupancy=occupancy,
            video_fps=video_fps,
            inference_fps=inference_fps,
            observed_at=observed_at,
            counter_session_id=counter_session_id,
            vehicle_passages=vehicle_passages,
            detections=detections,
            roi_normalized=roi_normalized,
            frame_width=frame_width,
            frame_height=frame_height,
        )
        self._future = self._executor.submit(
            self._sender,
            self.config,
            payload,
        )
        self._next_publish_at = now + self.config.publish_seconds
        return True

    def close(self) -> None:
        if self._closed:
            return
        self._closed = True
        if self._owns_executor and self._executor is not None:
            self._executor.shutdown(wait=True, cancel_futures=True)

    def _collect_ready_result(self) -> None:
        if self._future is None or not self._future.done():
            return
        try:
            self._future.result()
            self.last_error = None
        except Exception as error:  # noqa: BLE001 - erro externo é mantido para diagnóstico
            self.last_error = str(error)
        finally:
            self._future = None
