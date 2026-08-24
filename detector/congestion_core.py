"""Regras testáveis para a análise de congestionamento por vídeo."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, Sequence

import cv2
import numpy as np


NormalizedPoint = tuple[float, float]
Box = tuple[int, int, int, int]


@dataclass(frozen=True, slots=True)
class Detection:
    """Veículo detectado sem dependência dos objetos internos do YOLO."""

    class_id: int
    label: str
    confidence: float
    box: Box

    @property
    def road_contact(self) -> tuple[float, float]:
        """Retorna o centro inferior da caixa, que representa o contato com a pista."""

        x1, _y1, x2, y2 = self.box
        return ((x1 + x2) / 2.0, float(y2))

    @property
    def has_valid_box(self) -> bool:
        x1, y1, x2, y2 = self.box
        return x2 > x1 and y2 > y1


@dataclass(frozen=True, slots=True)
class CongestionMetrics:
    score: int
    vehicle_count: int
    occupancy: float


@dataclass(frozen=True, slots=True)
class CongestionAnalysis:
    metrics: CongestionMetrics
    detections: tuple[Detection, ...]


class ExponentialSmoother:
    """Suaviza mudanças bruscas sem o atraso crescente de uma média longa."""

    def __init__(self, alpha: float) -> None:
        if not 0.0 < alpha <= 1.0:
            raise ValueError("alpha deve estar no intervalo (0, 1]")

        self.alpha = alpha
        self._value: float | None = None

    @property
    def value(self) -> float | None:
        return self._value

    def update(self, value: float) -> int:
        if not 0.0 <= value <= 100.0:
            raise ValueError("o score deve estar entre 0 e 100")

        if self._value is None:
            self._value = float(value)
        else:
            self._value = (
                self.alpha * float(value)
                + (1.0 - self.alpha) * self._value
            )

        return round(self._value)

    def reset(self) -> None:
        self._value = None


def congestion_level(score: float) -> str:
    if score < 25:
        return "LIVRE"
    if score < 50:
        return "MODERADO"
    if score < 75:
        return "ALTO"
    return "MUITO ALTO"


def scale_polygon(
    normalized_points: Sequence[NormalizedPoint],
    width: int,
    height: int,
) -> np.ndarray:
    """Converte pontos normalizados em coordenadas válidas do frame."""

    if width <= 0 or height <= 0:
        raise ValueError("width e height devem ser positivos")
    if len(normalized_points) < 3:
        raise ValueError("a ROI precisa de pelo menos três pontos")

    points: list[tuple[int, int]] = []
    for normalized_x, normalized_y in normalized_points:
        if not 0.0 <= normalized_x <= 1.0:
            raise ValueError("coordenada x da ROI fora do intervalo [0, 1]")
        if not 0.0 <= normalized_y <= 1.0:
            raise ValueError("coordenada y da ROI fora do intervalo [0, 1]")

        x = int(round(normalized_x * (width - 1)))
        y = int(round(normalized_y * (height - 1)))
        points.append((x, y))

    return np.asarray(points, dtype=np.int32)


def analyze_congestion(
    frame_shape: Sequence[int],
    detections: Iterable[Detection],
    roi_polygon: np.ndarray,
    max_vehicles: int,
    max_occupancy: float,
    count_weight: float = 0.60,
    occupancy_weight: float = 0.40,
) -> CongestionAnalysis:
    """Filtra veículos pela pista e calcula contagem, ocupação e score."""

    height, width = _validated_frame_size(frame_shape)
    polygon = _validated_polygon(roi_polygon)
    _validate_score_config(
        max_vehicles,
        max_occupancy,
        count_weight,
        occupancy_weight,
    )

    roi_mask = np.zeros((height, width), dtype=np.uint8)
    cv2.fillPoly(roi_mask, [polygon], 1)
    roi_area = int(np.count_nonzero(roi_mask))
    if roi_area == 0:
        raise ValueError("a ROI não possui área útil no frame")

    selected = tuple(
        detection
        for detection in detections
        if detection.has_valid_box
        and cv2.pointPolygonTest(
            polygon.astype(np.float32),
            detection.road_contact,
            False,
        )
        >= 0
    )

    vehicle_mask = np.zeros((height, width), dtype=np.uint8)
    for detection in selected:
        clipped_box = _clip_box(detection.box, width, height)
        if clipped_box is None:
            continue

        x1, y1, x2, y2 = clipped_box
        vehicle_mask[y1:y2, x1:x2] = 1

    occupied_pixels = int(np.count_nonzero(vehicle_mask & roi_mask))
    occupancy = occupied_pixels / roi_area

    count_score = min(len(selected) / max_vehicles, 1.0)
    occupancy_score = min(occupancy / max_occupancy, 1.0)
    weight_total = count_weight + occupancy_weight
    score = round(
        100
        * (
            count_score * count_weight
            + occupancy_score * occupancy_weight
        )
        / weight_total
    )

    metrics = CongestionMetrics(
        score=max(0, min(score, 100)),
        vehicle_count=len(selected),
        occupancy=occupancy,
    )
    return CongestionAnalysis(metrics=metrics, detections=selected)


def _validated_frame_size(frame_shape: Sequence[int]) -> tuple[int, int]:
    if len(frame_shape) < 2:
        raise ValueError("frame_shape deve conter altura e largura")

    height = int(frame_shape[0])
    width = int(frame_shape[1])
    if height <= 0 or width <= 0:
        raise ValueError("o frame deve possuir dimensões positivas")
    return height, width


def _validated_polygon(roi_polygon: np.ndarray) -> np.ndarray:
    polygon = np.asarray(roi_polygon, dtype=np.int32)
    if polygon.ndim != 2 or polygon.shape[0] < 3 or polygon.shape[1] != 2:
        raise ValueError("roi_polygon deve possuir formato (N, 2), com N >= 3")
    return polygon


def _validate_score_config(
    max_vehicles: int,
    max_occupancy: float,
    count_weight: float,
    occupancy_weight: float,
) -> None:
    if max_vehicles <= 0:
        raise ValueError("max_vehicles deve ser positivo")
    if max_occupancy <= 0:
        raise ValueError("max_occupancy deve ser positivo")
    if count_weight < 0 or occupancy_weight < 0:
        raise ValueError("os pesos não podem ser negativos")
    if count_weight + occupancy_weight <= 0:
        raise ValueError("ao menos um peso deve ser positivo")


def _clip_box(box: Box, width: int, height: int) -> Box | None:
    x1, y1, x2, y2 = box
    clipped_x1 = max(0, min(int(x1), width))
    clipped_y1 = max(0, min(int(y1), height))
    clipped_x2 = max(0, min(int(x2), width))
    clipped_y2 = max(0, min(int(y2), height))

    if clipped_x2 <= clipped_x1 or clipped_y2 <= clipped_y1:
        return None
    return clipped_x1, clipped_y1, clipped_x2, clipped_y2
