"""Monitor visual de congestionamento da BR-277 no sentido Ponte da Amizade."""

from __future__ import annotations

import os
import time
from collections.abc import Callable, Mapping
from concurrent.futures import Executor, Future, ThreadPoolExecutor
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from uuid import uuid4

import cv2
from ultralytics import YOLO

from congestion_core import (
    CongestionAnalysis,
    CongestionMetrics,
    Detection,
    ExponentialSmoother,
    analyze_congestion,
    congestion_level,
    scale_polygon,
)
from weather_service import (
    AsyncWeatherService,
    WeatherReport,
    weather_code_label,
)
from telemetry_publisher import AsyncTelemetryPublisher
from vehicle_counter import VehiclePassageCounter


# ============================================================
# CONFIGURAÇÕES
# ============================================================

STREAM_URL = (
    "https://video02.logicahost.com.br/"
    "portaldacidade/fozsentidopontedaamizade01.stream/"
    "chunklist_w121647601.m3u8"
)

BASE_DIR = Path(__file__).resolve().parent
MODEL_NAME = str(BASE_DIR / "yolo11n.pt")

# O modelo recebe somente o recorte da pista. 320 px mantém a cadência de
# 25 FPS no pipeline completo do Ryzen 7 5825U sem alterar o vídeo original.
INFERENCE_SIZE = 320
TARGET_INFERENCE_FPS = 25.0
CONFIDENCE = 0.20
NMS_IOU = 0.40
ROI_CROP_PADDING = 0.05

# O score é atualizado neste intervalo; as caixas continuam acompanhando o vídeo.
SCORE_UPDATE_INTERVAL = 2.0
SCORE_SMOOTHING_ALPHA = 0.35

# Pontos normalizados da pista direita, no sentido Ponte.
# Ordem: superior esquerdo, superior direito, inferior direito, inferior esquerdo.
ROI_NORMALIZED = (
    (0.455, 0.350),
    (0.665, 0.350),
    (0.610, 0.995),
    (0.440, 0.995),
)

# Linha virtual transversal à pista. Veículos são contados ao cruzá-la para cima.
COUNTING_LINE_Y_RATIO = 0.58

# Valores iniciais de calibração da câmera.
MAX_VEHICLES = 24
MAX_OCCUPANCY = 0.18
COUNT_WEIGHT = 0.65
OCCUPANCY_WEIGHT = 0.35

VEHICLE_CLASSES = {
    2: "carro",
    3: "moto",
    5: "onibus",
    7: "caminhao",
}

WINDOW_NAME = "BR-277 - Sentido Ponte da Amizade"
WINDOW_WIDTH = 1100
WINDOW_HEIGHT = 650
TARGET_DISPLAY_FPS = 25.0

MAX_FAILED_FRAMES = 5
RECONNECT_DELAY = 2.0


# ============================================================
# STREAM E INFERÊNCIA
# ============================================================

def remaining_frame_delay(
    cycle_started_at: float,
    target_fps: float,
    now: float | None = None,
) -> float:
    """Retorna a espera necessária para não reproduzir o stream acelerado."""
    if target_fps <= 0:
        raise ValueError("target_fps deve ser maior que zero")

    current_time = time.perf_counter() if now is None else now
    elapsed = max(0.0, current_time - cycle_started_at)
    return max(0.0, (1.0 / target_fps) - elapsed)


def headless_mode(environ: Mapping[str, str] | None = None) -> bool:
    """Informa se o detector deve operar sem renderização local."""

    values = os.environ if environ is None else environ
    value = values.get("PONTE_DETECTOR_HEADLESS", "").strip().lower()
    return value in {"1", "true", "yes", "on"}


def connect_stream(stream_url: str = STREAM_URL) -> cv2.VideoCapture:
    print("Conectando ao stream...")
    capture = cv2.VideoCapture(stream_url)
    capture.set(cv2.CAP_PROP_BUFFERSIZE, 1)
    return capture


def reconnect_stream(
    capture: cv2.VideoCapture,
    stream_url: str = STREAM_URL,
) -> cv2.VideoCapture:
    capture.release()
    print("Reconectando ao stream...")
    time.sleep(RECONNECT_DELAY)
    return connect_stream(stream_url)


def crop_frame_to_roi(
    frame: object,
    roi_polygon: object,
    padding_ratio: float = ROI_CROP_PADDING,
) -> tuple[object, tuple[int, int]]:
    """Recorta o retângulo da ROI e retorna sua origem no frame completo."""

    if not 0.0 <= padding_ratio <= 0.50:
        raise ValueError("padding_ratio deve estar no intervalo [0, 0.50]")

    frame_height, frame_width = frame.shape[:2]
    x, y, width, height = cv2.boundingRect(roi_polygon)
    if width <= 0 or height <= 0:
        raise ValueError("a ROI não possui área válida para recorte")

    padding_x = round(width * padding_ratio)
    padding_y = round(height * padding_ratio)
    x1 = max(0, x - padding_x)
    y1 = max(0, y - padding_y)
    x2 = min(frame_width, x + width + padding_x)
    y2 = min(frame_height, y + height + padding_y)

    if x2 <= x1 or y2 <= y1:
        raise ValueError("o recorte da ROI ficou vazio")

    return frame[y1:y2, x1:x2], (x1, y1)


def extract_detections(
    result: object,
    offset: tuple[int, int] = (0, 0),
) -> list[Detection]:
    """Converte o retorno do Ultralytics para objetos simples e testáveis."""

    detections: list[Detection] = []
    boxes = getattr(result, "boxes", ())
    offset_x, offset_y = offset

    for box in boxes:
        class_id = int(box.cls[0])
        if class_id not in VEHICLE_CLASSES:
            continue

        crop_coordinates = tuple(
            int(round(float(value)))
            for value in box.xyxy[0]
        )
        x1, y1, x2, y2 = crop_coordinates
        coordinates = (
            x1 + offset_x,
            y1 + offset_y,
            x2 + offset_x,
            y2 + offset_y,
        )
        detections.append(
            Detection(
                class_id=class_id,
                label=VEHICLE_CLASSES[class_id],
                confidence=float(box.conf[0]),
                box=coordinates,
            )
        )

    return detections


def run_inference(
    model: YOLO,
    frame: object,
    roi_polygon: object,
) -> list[Detection]:
    inference_frame, offset = crop_frame_to_roi(frame, roi_polygon)
    result = model.predict(
        inference_frame,
        conf=CONFIDENCE,
        iou=NMS_IOU,
        imgsz=INFERENCE_SIZE,
        classes=list(VEHICLE_CLASSES),
        verbose=False,
    )[0]
    return extract_detections(result, offset)


@dataclass(frozen=True, slots=True)
class InferenceSnapshot:
    analysis: CongestionAnalysis
    duration_seconds: float


def process_frame(
    model: YOLO,
    frame: object,
    roi_polygon: object,
) -> InferenceSnapshot:
    """Executa inferência e cálculo fora do loop de exibição."""

    started_at = time.perf_counter()
    detections = run_inference(model, frame, roi_polygon)
    analysis = analyze_congestion(
        frame_shape=frame.shape,
        detections=detections,
        roi_polygon=roi_polygon,
        max_vehicles=MAX_VEHICLES,
        max_occupancy=MAX_OCCUPANCY,
        count_weight=COUNT_WEIGHT,
        occupancy_weight=OCCUPANCY_WEIGHT,
    )
    return InferenceSnapshot(
        analysis=analysis,
        duration_seconds=time.perf_counter() - started_at,
    )


def process_frame_at_target_fps(
    model: YOLO,
    frame: object,
    roi_polygon: object,
    target_fps: float = TARGET_INFERENCE_FPS,
    clock: Callable[[], float] = time.perf_counter,
    sleeper: Callable[[float], None] = time.sleep,
) -> InferenceSnapshot:
    """Limita a cadência da IA sem bloquear ou acelerar o vídeo."""

    cycle_started_at = clock()
    snapshot = process_frame(model, frame, roi_polygon)
    remaining_delay = remaining_frame_delay(
        cycle_started_at,
        target_fps,
        now=clock(),
    )
    if remaining_delay > 0:
        sleeper(remaining_delay)

    cycle_duration = max(
        snapshot.duration_seconds,
        clock() - cycle_started_at,
    )
    return InferenceSnapshot(
        analysis=snapshot.analysis,
        duration_seconds=cycle_duration,
    )


class AsyncInferenceWorker:
    """Mantém no máximo uma inferência ativa e nunca acumula frames."""

    def __init__(
        self,
        model: YOLO,
        executor: Executor | None = None,
    ) -> None:
        self._model = model
        self._executor = (
            executor
            if executor is not None
            else ThreadPoolExecutor(
                max_workers=1,
                thread_name_prefix="yolo-inference",
            )
        )
        self._future: Future[InferenceSnapshot] | None = None
        self._latest: InferenceSnapshot | None = None
        self._closed = False

    def submit_if_idle(self, frame: object, roi_polygon: object) -> bool:
        if self._closed:
            raise RuntimeError("o worker de inferência já foi encerrado")

        self._collect_ready_result()
        if self._future is not None:
            return False

        self._future = self._executor.submit(
            process_frame_at_target_fps,
            self._model,
            frame.copy(),
            roi_polygon.copy(),
            TARGET_INFERENCE_FPS,
        )
        return True

    def latest(self) -> InferenceSnapshot | None:
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

        self._latest = self._future.result()
        self._future = None


# ============================================================
# DESENHO
# ============================================================

def score_color(score: int) -> tuple[int, int, int]:
    if score < 25:
        return (70, 210, 90)
    if score < 50:
        return (40, 210, 240)
    if score < 75:
        return (30, 140, 255)
    return (45, 45, 230)


def draw_roi(frame: object, roi_polygon: object) -> None:
    overlay = frame.copy()
    cv2.fillPoly(overlay, [roi_polygon], (90, 20, 90))
    cv2.addWeighted(overlay, 0.16, frame, 0.84, 0, frame)
    cv2.polylines(frame, [roi_polygon], True, (255, 0, 255), 2)

    label_x, label_y = roi_polygon[0]
    cv2.putText(
        frame,
        "ROI SENTIDO PONTE",
        (
            int(label_x),
            min(int(label_y) + 26, frame.shape[0] - 12),
        ),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.62,
        (255, 90, 255),
        2,
        cv2.LINE_AA,
    )


def draw_detections(
    frame: object,
    analysis: CongestionAnalysis,
    scale_x: float = 1.0,
    scale_y: float = 1.0,
) -> None:
    for detection in analysis.detections:
        x1, y1, x2, y2 = detection.box
        x1, x2 = round(x1 * scale_x), round(x2 * scale_x)
        y1, y2 = round(y1 * scale_y), round(y2 * scale_y)
        color = (80, 230, 100)
        label = f"{detection.label} {detection.confidence:.2f}"

        cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
        cv2.putText(
            frame,
            label,
            (x1, max(y1 - 8, 18)),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.52,
            color,
            2,
            cv2.LINE_AA,
        )

        contact_x, contact_y = detection.road_contact
        cv2.circle(
            frame,
            (round(contact_x * scale_x), round(contact_y * scale_y)),
            4,
            (0, 230, 255),
            -1,
            cv2.LINE_AA,
        )


def weather_panel_lines(
    report: WeatherReport | None,
    last_error: str | None,
) -> tuple[str, str, str, str]:
    if report is None:
        current_line = (
            "Clima: indisponivel; nova tentativa em breve"
            if last_error
            else "Clima: carregando..."
        )
        return (
            current_line,
            "Temperatura, chuva e vento: aguardando...",
            "Hoje: aguardando previsao...",
            "Amanha: aguardando previsao...",
        )

    current = report.current
    today = report.today
    tomorrow = report.tomorrow
    today_rain = _format_rain_probability(
        today.precipitation_probability_percent
    )
    tomorrow_rain = _format_rain_probability(
        tomorrow.precipitation_probability_percent
    )
    return (
        (
            f"Agora: {weather_code_label(current.weather_code)} | "
            f"{current.temperature_c:.1f} C | "
            f"Sensacao {current.apparent_temperature_c:.1f} C"
        ),
        (
            f"Chuva agora: {current.precipitation_mm:.1f} mm | "
            f"Vento: {current.wind_speed_kmh:.1f} km/h"
        ),
        (
            f"Hoje: {weather_code_label(today.weather_code)} | "
            f"{today.temperature_min_c:.1f}/"
            f"{today.temperature_max_c:.1f} C | "
            f"Chuva {today_rain}"
        ),
        (
            f"Amanha: {weather_code_label(tomorrow.weather_code)} | "
            f"{tomorrow.temperature_min_c:.1f}/"
            f"{tomorrow.temperature_max_c:.1f} C | "
            f"Chuva {tomorrow_rain}"
        ),
    )


def _format_rain_probability(probability: int | None) -> str:
    return "--" if probability is None else f"{probability}%"


def dashboard_panel_bounds(
    frame_shape: tuple[int, ...],
    roi_top_y: int | None,
) -> tuple[int, int, int, int, float]:
    """Dimensiona o painel e o mantém inteiramente acima da ROI."""
    frame_height, frame_width = frame_shape[:2]
    panel_x1 = panel_y1 = 12
    natural_scale = max(0.65, frame_height / 1000.0)
    edge_margin = max(12, round(12 * natural_scale))
    roi_margin = max(16, round(16 * natural_scale))

    horizontal_limit = max(panel_x1 + 1, frame_width - edge_margin)
    vertical_limit = max(panel_y1 + 1, frame_height - edge_margin)
    if roi_top_y is not None:
        vertical_limit = min(vertical_limit, max(panel_y1 + 1, roi_top_y - roi_margin))

    width_scale = (horizontal_limit - panel_x1) / 1340.0
    height_scale = (vertical_limit - panel_y1) / 318.0
    scale = max(0.25, min(natural_scale, width_scale, height_scale))

    panel_x2 = min(horizontal_limit, panel_x1 + round(1340 * scale))
    panel_y2 = min(vertical_limit, panel_y1 + round(318 * scale))
    return panel_x1, panel_y1, panel_x2, panel_y2, scale


def draw_dashboard(
    frame: object,
    score: int,
    raw_score: int,
    metrics: CongestionMetrics,
    video_fps: float,
    inference_fps: float,
    weather_report: WeatherReport | None = None,
    weather_error: str | None = None,
    roi_top_y: int | None = None,
) -> None:
    panel_x1, panel_y1, panel_x2, panel_y2, scale = dashboard_panel_bounds(
        frame.shape,
        roi_top_y,
    )

    def panel_x(offset: int) -> int:
        return panel_x1 + round(offset * scale)

    def panel_y(offset: int) -> int:
        return panel_y1 + round(offset * scale)

    def font_size(size: float) -> float:
        return size * scale

    def line_width(width: float) -> int:
        return max(1, round(width * scale))

    panel_region = frame[panel_y1 : panel_y2 + 1, panel_x1 : panel_x2 + 1]
    overlay = panel_region.copy()
    overlay[:] = (10, 12, 16)
    cv2.addWeighted(overlay, 0.84, panel_region, 0.16, 0, panel_region)

    color = score_color(score)
    level = congestion_level(score)

    cv2.putText(
        frame,
        f"Fila Ponte: {score}%",
        (panel_x(18), panel_y(38)),
        cv2.FONT_HERSHEY_SIMPLEX,
        font_size(1.55),
        color,
        line_width(2.4),
        cv2.LINE_AA,
    )
    cv2.putText(
        frame,
        f"Situacao: {level}",
        (panel_x(18), panel_y(70)),
        cv2.FONT_HERSHEY_SIMPLEX,
        font_size(0.95),
        (245, 245, 245),
        line_width(1.8),
        cv2.LINE_AA,
    )

    weather_lines = weather_panel_lines(weather_report, weather_error)
    for weather_line, line_y in zip(weather_lines, (106, 137, 168, 199)):
        cv2.putText(
            frame,
            weather_line,
            (panel_x(18), panel_y(line_y)),
            cv2.FONT_HERSHEY_SIMPLEX,
            font_size(0.82),
            (205, 225, 245),
            line_width(1.4),
            cv2.LINE_AA,
        )

    cv2.putText(
        frame,
        f"Veiculos: {metrics.vehicle_count}",
        (panel_x(18), panel_y(230)),
        cv2.FONT_HERSHEY_SIMPLEX,
        font_size(0.82),
        (230, 230, 230),
        line_width(1.6),
        cv2.LINE_AA,
    )
    cv2.putText(
        frame,
        f"Ocupacao: {metrics.occupancy * 100:.1f}%",
        (panel_x(225), panel_y(230)),
        cv2.FONT_HERSHEY_SIMPLEX,
        font_size(0.82),
        (230, 230, 230),
        line_width(1.6),
        cv2.LINE_AA,
    )
    cv2.putText(
        frame,
        f"Raw: {raw_score}%",
        (panel_x(515), panel_y(230)),
        cv2.FONT_HERSHEY_SIMPLEX,
        font_size(0.72),
        (190, 195, 205),
        line_width(1.2),
        cv2.LINE_AA,
    )

    bar_x, bar_y = panel_x(18), panel_y(247)
    bar_width = max(1, panel_x2 - bar_x - round(18 * scale))
    bar_height = max(1, round(20 * scale))
    cv2.rectangle(
        frame,
        (bar_x, bar_y),
        (bar_x + bar_width, bar_y + bar_height),
        (80, 85, 92),
        -1,
    )
    filled_width = round(bar_width * score / 100)
    if filled_width > 0:
        cv2.rectangle(
            frame,
            (bar_x, bar_y),
            (bar_x + filled_width, bar_y + bar_height),
            color,
            -1,
        )
    cv2.rectangle(
        frame,
        (bar_x, bar_y),
        (bar_x + bar_width, bar_y + bar_height),
        (180, 185, 192),
        line_width(1.0),
    )
    cv2.putText(
        frame,
        "Q/ESC sair | R recalibrar",
        (panel_x(18), panel_y(304)),
        cv2.FONT_HERSHEY_SIMPLEX,
        font_size(0.62),
        (160, 165, 175),
        line_width(1.0),
        cv2.LINE_AA,
    )
    cv2.putText(
        frame,
        f"Video: {video_fps:.1f} FPS | IA: {inference_fps:.1f} FPS",
        (panel_x(360), panel_y(304)),
        cv2.FONT_HERSHEY_SIMPLEX,
        font_size(0.62),
        (175, 205, 230),
        line_width(1.0),
        cv2.LINE_AA,
    )
    cv2.putText(
        frame,
        "Clima: Open-Meteo",
        (panel_x(1100), panel_y(304)),
        cv2.FONT_HERSHEY_SIMPLEX,
        font_size(0.58),
        (145, 160, 175),
        line_width(1.0),
        cv2.LINE_AA,
    )


# ============================================================
# APLICAÇÃO
# ============================================================

def main() -> int:
    print("Carregando modelo YOLO...")
    model = YOLO(MODEL_NAME)
    print("Modelo carregado.")

    headless = headless_mode()
    capture = connect_stream()
    if headless:
        print("Modo servidor: renderizacao local desativada.")
    else:
        cv2.namedWindow(WINDOW_NAME, cv2.WINDOW_NORMAL)
        cv2.resizeWindow(WINDOW_NAME, WINDOW_WIDTH, WINDOW_HEIGHT)
    inference_worker = AsyncInferenceWorker(model)
    weather_service = AsyncWeatherService()
    weather_service.refresh_if_due()
    telemetry_publisher = AsyncTelemetryPublisher.from_environment()
    if telemetry_publisher.config is None:
        print("Painel web: envio de metricas desativado.")
    else:
        print("Painel web: envio de metricas ativado.")

    smoother = ExponentialSmoother(SCORE_SMOOTHING_ALPHA)
    metrics = CongestionMetrics(score=0, vehicle_count=0, occupancy=0.0)
    analysis = CongestionAnalysis(metrics=metrics, detections=())
    smoothed_score = 0
    raw_score = 0
    inference_fps = 0.0
    failed_frames = 0
    last_score_update = float("-inf")
    last_snapshot: InferenceSnapshot | None = None
    passage_counter: VehiclePassageCounter | None = None
    counter_session_id = uuid4().hex
    weather_report: WeatherReport | None = None
    weather_error: str | None = None

    video_fps = 0.0
    fps_frames = 0
    fps_started_at = time.monotonic()

    try:
        while True:
            if not capture.isOpened():
                capture = reconnect_stream(capture)
                continue

            frame_cycle_started = time.perf_counter()
            received, frame = capture.read()
            if not received or frame is None:
                failed_frames += 1
                print(f"Falha ao receber frame: {failed_frames}")

                if failed_frames >= MAX_FAILED_FRAMES:
                    capture = reconnect_stream(capture)
                    failed_frames = 0
                else:
                    time.sleep(0.25)
                continue

            failed_frames = 0
            now = time.monotonic()
            height, width = frame.shape[:2]
            roi_polygon = scale_polygon(ROI_NORMALIZED, width, height)
            if passage_counter is None:
                passage_counter = VehiclePassageCounter(
                    frame_width=width,
                    frame_height=height,
                    line_y_ratio=COUNTING_LINE_Y_RATIO,
                )

            weather_service.refresh_if_due()
            latest_weather = weather_service.latest()
            if latest_weather is not None:
                weather_report = latest_weather
            weather_error = weather_service.last_error

            inference_worker.submit_if_idle(frame, roi_polygon)
            snapshot = inference_worker.latest()
            if snapshot is not None and snapshot is not last_snapshot:
                analysis = snapshot.analysis
                metrics = analysis.metrics
                raw_score = metrics.score
                inference_fps = (
                    1.0 / snapshot.duration_seconds
                    if snapshot.duration_seconds > 0
                    else 0.0
                )
                last_snapshot = snapshot
                new_passages = passage_counter.update(analysis.detections)
                if new_passages:
                    print(
                        f"Passagens sentido Ponte: +{new_passages} | "
                        f"Sessao: {passage_counter.total}"
                    )

                if now - last_score_update >= SCORE_UPDATE_INTERVAL:
                    smoothed_score = smoother.update(raw_score)
                    print(
                        f"Fila: {smoothed_score:3d}% | "
                        f"Raw: {raw_score:3d}% | "
                        f"{congestion_level(smoothed_score):10s} | "
                        f"Veiculos: {metrics.vehicle_count:2d} | "
                        f"Ocupacao: {metrics.occupancy * 100:.2f}% | "
                        f"Video: {video_fps:.1f} FPS | "
                        f"IA: {inference_fps:.1f} FPS"
                    )
                    last_score_update = now

                telemetry_publisher.publish_if_due(
                    score=smoothed_score,
                    raw_score=raw_score,
                    vehicle_count=metrics.vehicle_count,
                    occupancy=metrics.occupancy,
                    video_fps=video_fps,
                    inference_fps=inference_fps,
                    observed_at=datetime.now().astimezone().isoformat(
                        timespec="milliseconds"
                    ),
                    counter_session_id=counter_session_id,
                    vehicle_passages=passage_counter.total,
                    detections=analysis.detections,
                    roi_normalized=ROI_NORMALIZED,
                    frame_width=width,
                    frame_height=height,
                )

            fps_frames += 1
            fps_elapsed = now - fps_started_at
            if fps_elapsed >= 1.0:
                video_fps = fps_frames / fps_elapsed
                fps_frames = 0
                fps_started_at = now

            if not headless:
                display_frame = cv2.resize(
                    frame,
                    (WINDOW_WIDTH, WINDOW_HEIGHT),
                    interpolation=cv2.INTER_LINEAR,
                )
                display_roi = scale_polygon(
                    ROI_NORMALIZED,
                    WINDOW_WIDTH,
                    WINDOW_HEIGHT,
                )
                draw_roi(display_frame, display_roi)
                draw_detections(
                    display_frame,
                    analysis,
                    scale_x=WINDOW_WIDTH / width,
                    scale_y=WINDOW_HEIGHT / height,
                )
                draw_dashboard(
                    display_frame,
                    smoothed_score,
                    raw_score,
                    metrics,
                    video_fps,
                    inference_fps,
                    weather_report=weather_report,
                    weather_error=weather_error,
                    roi_top_y=int(display_roi[:, 1].min()),
                )
                cv2.imshow(WINDOW_NAME, display_frame)

                key = cv2.waitKey(1) & 0xFF
                if key in (ord("q"), 27):
                    print("Encerrando...")
                    break
                if key == ord("r"):
                    smoother.reset()
                    smoothed_score = raw_score
                    last_score_update = float("-inf")
                    print("Media suavizada recalibrada.")

            frame_delay = remaining_frame_delay(
                frame_cycle_started,
                TARGET_DISPLAY_FPS,
            )
            if frame_delay > 0:
                time.sleep(frame_delay)

    except KeyboardInterrupt:
        print("\nEncerrado pelo usuario.")
    finally:
        weather_service.close()
        telemetry_publisher.close()
        inference_worker.close()
        capture.release()
        if not headless:
            cv2.destroyAllWindows()
        print("Finalizado.")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
