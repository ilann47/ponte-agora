"""Contagem de veículos que cruzam uma linha virtual no sentido da Ponte."""

from __future__ import annotations

from dataclasses import dataclass
from math import hypot
from typing import Iterable

from congestion_core import Box, Detection


@dataclass(slots=True)
class _Track:
    track_id: int
    box: Box
    contact_x: float
    contact_y: float
    stable_side: int
    last_seen_update: int
    counted: bool = False


class VehiclePassageCounter:
    """Associa caixas entre inferências e conta cruzamentos para cima."""

    def __init__(
        self,
        *,
        frame_width: int,
        frame_height: int,
        line_y_ratio: float = 0.58,
        hysteresis_ratio: float = 0.012,
        max_match_distance_ratio: float = 0.08,
        max_missing_updates: int = 8,
    ) -> None:
        if frame_width <= 0 or frame_height <= 0:
            raise ValueError("as dimensões do frame devem ser positivas")
        if not 0.0 < line_y_ratio < 1.0:
            raise ValueError("line_y_ratio deve estar no intervalo (0, 1)")
        if not 0.0 <= hysteresis_ratio < 0.25:
            raise ValueError("hysteresis_ratio deve estar no intervalo [0, 0.25)")
        if not 0.0 < max_match_distance_ratio <= 1.0:
            raise ValueError(
                "max_match_distance_ratio deve estar no intervalo (0, 1]"
            )
        if max_missing_updates < 0:
            raise ValueError("max_missing_updates não pode ser negativo")

        self.frame_width = frame_width
        self.frame_height = frame_height
        self.line_y = frame_height * line_y_ratio
        self.hysteresis = frame_height * hysteresis_ratio
        self.max_match_distance = (
            max(frame_width, frame_height) * max_match_distance_ratio
        )
        self.max_missing_updates = max_missing_updates
        self.total = 0
        self._update_index = 0
        self._next_track_id = 1
        self._tracks: dict[int, _Track] = {}

    def update(self, detections: Iterable[Detection]) -> int:
        """Processa uma inferência e retorna quantos veículos cruzaram nela."""

        self._update_index += 1
        current = tuple(detection for detection in detections if detection.has_valid_box)
        self._expire_missing_tracks()

        assignments = self._match_detections(current)
        matched_detection_indexes = set(assignments.values())
        crossings = 0

        for track_id, detection_index in assignments.items():
            detection = current[detection_index]
            track = self._tracks[track_id]
            contact_x, contact_y = detection.road_contact
            side = self._stable_side(contact_y)

            if (
                not track.counted
                and track.stable_side == 1
                and side == -1
            ):
                track.counted = True
                crossings += 1

            if side != 0:
                track.stable_side = side
            track.box = detection.box
            track.contact_x = contact_x
            track.contact_y = contact_y
            track.last_seen_update = self._update_index

        for detection_index, detection in enumerate(current):
            if detection_index in matched_detection_indexes:
                continue
            self._create_track(detection)

        self.total += crossings
        return crossings

    def _match_detections(
        self,
        detections: tuple[Detection, ...],
    ) -> dict[int, int]:
        candidates: list[tuple[float, int, int]] = []
        for track_id, track in self._tracks.items():
            for detection_index, detection in enumerate(detections):
                contact_x, contact_y = detection.road_contact
                distance = hypot(
                    contact_x - track.contact_x,
                    contact_y - track.contact_y,
                )
                if distance <= self.max_match_distance:
                    candidates.append((distance, track_id, detection_index))

        assignments: dict[int, int] = {}
        used_detections: set[int] = set()
        for _distance, track_id, detection_index in sorted(candidates):
            if track_id in assignments or detection_index in used_detections:
                continue
            assignments[track_id] = detection_index
            used_detections.add(detection_index)
        return assignments

    def _create_track(self, detection: Detection) -> None:
        contact_x, contact_y = detection.road_contact
        track_id = self._next_track_id
        self._next_track_id += 1
        self._tracks[track_id] = _Track(
            track_id=track_id,
            box=detection.box,
            contact_x=contact_x,
            contact_y=contact_y,
            stable_side=self._stable_side(contact_y),
            last_seen_update=self._update_index,
        )

    def _expire_missing_tracks(self) -> None:
        expired = [
            track_id
            for track_id, track in self._tracks.items()
            if self._update_index - track.last_seen_update
            > self.max_missing_updates
        ]
        for track_id in expired:
            del self._tracks[track_id]

    def _stable_side(self, contact_y: float) -> int:
        if contact_y > self.line_y + self.hysteresis:
            return 1
        if contact_y < self.line_y - self.hysteresis:
            return -1
        return 0
