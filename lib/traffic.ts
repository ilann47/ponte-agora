export type TrafficReading = {
  score: number;
  rawScore: number;
  level: 'Livre' | 'Moderado' | 'Intenso' | 'Congestionado';
  vehicleCount: number;
  occupancy: number;
  videoFps: number;
  inferenceFps: number;
  observedAt: string;
};

export function congestionLabel(score: number): TrafficReading['level'] {
  if (score < 25) return 'Livre';
  if (score < 50) return 'Moderado';
  if (score < 75) return 'Intenso';
  return 'Congestionado';
}

export function parseTrafficPayload(value: unknown): TrafficReading {
  if (!isRecord(value)) throw new Error('Telemetria inválida: corpo ausente');

  const score = boundedInteger(value.score, 0, 100);
  const rawScore = boundedInteger(value.rawScore, 0, 100);
  const vehicleCount = boundedInteger(value.vehicleCount, 0, 500);
  const occupancy = boundedNumber(value.occupancy, 0, 1);
  const videoFps = boundedNumber(value.videoFps, 0, 120);
  const inferenceFps = boundedNumber(value.inferenceFps, 0, 120);
  const observedAt = typeof value.observedAt === 'string' ? value.observedAt : '';

  if (
    score === null ||
    rawScore === null ||
    vehicleCount === null ||
    occupancy === null ||
    videoFps === null ||
    inferenceFps === null ||
    !observedAt ||
    Number.isNaN(Date.parse(observedAt))
  ) {
    throw new Error('Telemetria inválida: valores fora dos limites');
  }

  return {
    score,
    rawScore,
    level: congestionLabel(score),
    vehicleCount,
    occupancy,
    videoFps,
    inferenceFps,
    observedAt,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function boundedInteger(value: unknown, min: number, max: number): number | null {
  return typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= min &&
    value <= max
    ? value
    : null;
}

function boundedNumber(value: unknown, min: number, max: number): number | null {
  return typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= min &&
    value <= max
    ? value
    : null;
}
