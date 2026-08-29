export type NormalizedPoint = readonly [number, number];
export type NormalizedBox = readonly [number, number, number, number];

export type TrafficDetection = {
  label: 'carro' | 'moto' | 'onibus' | 'caminhao';
  confidence: number;
  box: NormalizedBox;
};

export const DEFAULT_ROI: readonly NormalizedPoint[] = [
  [0.44, 0.08],
  [0.55, 0.08],
  [0.52, 0.25],
  [0.48, 0.43],
  [0.41, 0.62],
  [0.33, 0.8],
  [0.22, 0.995],
  [0, 0.995],
  [0, 0.77],
  [0.15, 0.62],
  [0.26, 0.43],
  [0.36, 0.24],
];

export type TrafficReading = {
  score: number;
  rawScore: number;
  level: 'Livre' | 'Moderado' | 'Intenso' | 'Congestionado';
  vehicleCount: number;
  occupancy: number;
  videoFps: number;
  inferenceFps: number;
  observedAt: string;
  counterSessionId: string | null;
  vehiclePassages: number | null;
  roi: readonly NormalizedPoint[];
  detections: readonly TrafficDetection[];
};

export function isTrafficFresh(
  receivedAt: number | undefined,
  now = Date.now(),
  maximumAgeMs = 20_000,
): boolean {
  return typeof receivedAt === 'number' &&
    Number.isFinite(receivedAt) &&
    now - receivedAt >= 0 &&
    now - receivedAt < maximumAgeMs;
}

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
  const counterProvided = value.counterSessionId !== undefined || value.vehiclePassages !== undefined;
  let counterSessionId: string | null = null;
  let vehiclePassages: number | null = null;
  if (counterProvided) {
    const candidateSession = typeof value.counterSessionId === 'string'
      ? value.counterSessionId
      : '';
    const candidateTotal = boundedInteger(value.vehiclePassages, 0, 1_000_000_000);
    if (!/^[a-zA-Z0-9_-]{8,64}$/.test(candidateSession) || candidateTotal === null) {
      throw new Error('Telemetria inválida: contador de passagens inválido');
    }
    counterSessionId = candidateSession;
    vehiclePassages = candidateTotal;
  }
  const roi = value.roi === undefined ? DEFAULT_ROI : parseRoi(value.roi);
  const detections = value.detections === undefined ? [] : parseDetections(value.detections);

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
  if (!roi) throw new Error('Telemetria inválida: ROI inválida');
  if (!detections) throw new Error('Telemetria inválida: detecções inválidas');

  return {
    score,
    rawScore,
    level: congestionLabel(score),
    vehicleCount,
    occupancy,
    videoFps,
    inferenceFps,
    observedAt,
    counterSessionId,
    vehiclePassages,
    roi,
    detections,
  };
}

function parseRoi(value: unknown): NormalizedPoint[] | null {
  if (!Array.isArray(value) || value.length < 3 || value.length > 12) return null;
  const points = value.map((point) => parseTuple(point, 2));
  return points.every((point): point is [number, number] => point !== null)
    ? points
    : null;
}

function parseDetections(value: unknown): TrafficDetection[] | null {
  if (!Array.isArray(value) || value.length > 64) return null;
  const allowedLabels = new Set<TrafficDetection['label']>([
    'carro', 'moto', 'onibus', 'caminhao',
  ]);
  const detections: TrafficDetection[] = [];

  for (const item of value) {
    if (!isRecord(item) || !allowedLabels.has(item.label as TrafficDetection['label'])) return null;
    const confidence = boundedNumber(item.confidence, 0, 1);
    const box = parseTuple(item.box, 4);
    if (!confidence && confidence !== 0 || !box) return null;
    if (box[2] <= box[0] || box[3] <= box[1]) return null;
    detections.push({
      label: item.label as TrafficDetection['label'],
      confidence,
      box,
    });
  }
  return detections;
}

function parseTuple(value: unknown, length: 2): [number, number] | null;
function parseTuple(value: unknown, length: 4): [number, number, number, number] | null;
function parseTuple(value: unknown, length: 2 | 4): number[] | null {
  if (!Array.isArray(value) || value.length !== length) return null;
  const parsed = value.map((part) => boundedNumber(part, 0, 1));
  return parsed.every((part): part is number => part !== null) ? parsed : null;
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
