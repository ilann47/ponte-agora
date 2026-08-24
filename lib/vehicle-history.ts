export type VehicleCountPoint = { date: string; count: number };
export type VehicleHourPoint = { hour: number; count: number };

export type VehicleHistorySummary = {
  periodDays: 7 | 30;
  today: number;
  total: number;
  averagePerDay: number;
  peakDay: VehicleCountPoint | null;
  peakHour: VehicleHourPoint | null;
  timeline: VehicleCountPoint[];
};

export function fozVehicleBucket(date: Date): { date: string; hour: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '';
  return {
    date: `${value('year')}-${value('month')}-${value('day')}`,
    hour: Number(value('hour')),
  };
}

export function passageDelta(previousTotal: number | null, currentTotal: number): number {
  if (!Number.isInteger(currentTotal) || currentTotal < 0) {
    throw new Error('total de passagens inválido');
  }
  if (previousTotal === null) return currentTotal;
  if (!Number.isInteger(previousTotal) || previousTotal < 0) {
    throw new Error('total anterior inválido');
  }
  return Math.max(0, currentTotal - previousTotal);
}

export function summarizeVehicleHistory(input: {
  daily: VehicleCountPoint[];
  todayHourly: VehicleHourPoint[];
  periodDays: number;
  endDate: string;
}): VehicleHistorySummary {
  if (input.periodDays !== 7 && input.periodDays !== 30) {
    throw new Error('período deve ser de 7 ou 30 dias');
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.endDate)) {
    throw new Error('data final inválida');
  }

  const counts = new Map(input.daily.map((point) => [point.date, point.count]));
  const timeline = Array.from({ length: input.periodDays }, (_unused, index) => {
    const offset = index - (input.periodDays - 1);
    const date = shiftIsoDate(input.endDate, offset);
    return { date, count: Math.max(0, Math.trunc(counts.get(date) ?? 0)) };
  });
  const total = timeline.reduce((sum, point) => sum + point.count, 0);
  const peakDay = greatest(timeline, (point) => point.count);
  const peakHour = greatest(
    input.todayHourly.map((point) => ({
      hour: Math.max(0, Math.min(23, Math.trunc(point.hour))),
      count: Math.max(0, Math.trunc(point.count)),
    })),
    (point) => point.count,
  );

  return {
    periodDays: input.periodDays,
    today: timeline.at(-1)?.count ?? 0,
    total,
    averagePerDay: Math.round(total / input.periodDays),
    peakDay,
    peakHour,
    timeline,
  };
}

export function shiftIsoDate(value: string, days: number): string {
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function greatest<T>(values: T[], score: (value: T) => number): T | null {
  let selected: T | null = null;
  let selectedScore = 0;
  for (const value of values) {
    const current = score(value);
    if (current > selectedScore) {
      selected = value;
      selectedScore = current;
    }
  }
  return selected;
}
