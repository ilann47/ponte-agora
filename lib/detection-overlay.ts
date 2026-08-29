import type { NormalizedBox, NormalizedPoint } from './traffic.ts';

export function formatDetectionLabel(
  label: string,
  confidence: number,
  showClass: boolean,
): string {
  const percentage = `${Math.round(confidence * 100)}%`;
  return showClass ? `${label} · ${percentage}` : percentage;
}

export function projectNormalizedPoint(
  point: NormalizedPoint,
  width: number,
  height: number,
): [number, number] {
  return [point[0] * width, point[1] * height];
}

export function projectNormalizedBox(
  box: NormalizedBox,
  width: number,
  height: number,
): [number, number, number, number] {
  return [
    box[0] * width,
    box[1] * height,
    box[2] * width,
    box[3] * height,
  ];
}
