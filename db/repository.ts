import type { DeviceGroup } from '@/lib/analytics';
import { parseTrafficPayload, type TrafficReading } from '@/lib/traffic';
import { getD1 } from './index';
import { ensureDatabase } from './setup';

export type VisitInput = {
  path: string;
  referrerHost: string;
  utmSource: string | null;
  utmMedium: string | null;
  country: string;
  device: DeviceGroup;
  visitorHash: string;
  visitorDayHash: string;
  visitDate: string;
  occurredAt: number;
};

export type AnalyticsSummary = {
  periodDays: number;
  totals: { visits: number; visitors: number };
  today: { visits: number; visitors: number };
  timeline: Array<{ date: string; visits: number; visitors: number }>;
  sources: Array<{ label: string; value: number }>;
  countries: Array<{ label: string; value: number }>;
  devices: Array<{ label: string; value: number }>;
  recent: Array<{ occurredAt: number; path: string; source: string; country: string; device: string }>;
};

export async function recordVisit(input: VisitInput): Promise<void> {
  await ensureDatabase();
  const database = getD1();
  await database.batch([
    database
      .prepare('DELETE FROM visit_events WHERE occurred_at < ?')
      .bind(input.occurredAt - 180 * 24 * 60 * 60 * 1000),
    database.prepare(`
      INSERT INTO visit_events (
        id, occurred_at, visit_date, path, referrer_host, utm_source,
        utm_medium, country, device, visitor_hash, visitor_day_hash
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .bind(
      crypto.randomUUID(), input.occurredAt, input.visitDate, input.path,
      input.referrerHost, input.utmSource, input.utmMedium, input.country,
      input.device, input.visitorHash, input.visitorDayHash,
    ),
  ]);
}

export async function saveTrafficState(reading: TrafficReading): Promise<void> {
  await ensureDatabase();
  await getD1()
    .prepare(`
      INSERT INTO traffic_state (
        id, score, raw_score, level, vehicle_count, occupancy,
        video_fps, inference_fps, observed_at, received_at,
        roi_json, detections_json
      ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        score = excluded.score,
        raw_score = excluded.raw_score,
        level = excluded.level,
        vehicle_count = excluded.vehicle_count,
        occupancy = excluded.occupancy,
        video_fps = excluded.video_fps,
        inference_fps = excluded.inference_fps,
        observed_at = excluded.observed_at,
        received_at = excluded.received_at,
        roi_json = excluded.roi_json,
        detections_json = excluded.detections_json
    `)
    .bind(
      reading.score, reading.rawScore, reading.level, reading.vehicleCount,
      reading.occupancy, reading.videoFps, reading.inferenceFps,
      reading.observedAt, Date.now(), JSON.stringify(reading.roi),
      JSON.stringify(reading.detections),
    )
    .run();
}

export async function getTrafficState(): Promise<(TrafficReading & { receivedAt: number }) | null> {
  await ensureDatabase();
  const stored = await getD1()
      .prepare(`
        SELECT score, raw_score AS rawScore, level,
          vehicle_count AS vehicleCount, occupancy,
          video_fps AS videoFps, inference_fps AS inferenceFps,
          observed_at AS observedAt, received_at AS receivedAt,
          roi_json AS roiJson, detections_json AS detectionsJson
        FROM traffic_state WHERE id = 1
      `)
      .first<Omit<TrafficReading, 'roi' | 'detections'> & {
        receivedAt: number;
        roiJson: string;
        detectionsJson: string;
      }>();
  if (!stored) return null;

  const { roiJson, detectionsJson, receivedAt, ...reading } = stored;
  return {
    ...parseTrafficPayload({
      ...reading,
      roi: parseJsonArray(roiJson),
      detections: parseJsonArray(detectionsJson) ?? [],
    }),
    receivedAt,
  };
}

function parseJsonArray(value: string): unknown[] | undefined {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : undefined;
  } catch {
    return undefined;
  }
}

export async function getAnalyticsSummary(periodDays = 30): Promise<AnalyticsSummary> {
  await ensureDatabase();
  const days = Math.max(1, Math.min(90, Math.trunc(periodDays)));
  const today = fozDate(new Date());
  const start = new Date();
  start.setUTCDate(start.getUTCDate() - (days - 1));
  const startDate = fozDate(start);
  const database = getD1();

  const [totals, todayTotals, timeline, sources, countries, devices, recent] =
    await Promise.all([
      database.prepare(`
        SELECT COUNT(*) AS visits, COUNT(DISTINCT visitor_hash) AS visitors
        FROM visit_events WHERE visit_date >= ?
      `).bind(startDate).first<{ visits: number; visitors: number }>(),
      database.prepare(`
        SELECT COUNT(*) AS visits, COUNT(DISTINCT visitor_day_hash) AS visitors
        FROM visit_events WHERE visit_date = ?
      `).bind(today).first<{ visits: number; visitors: number }>(),
      database.prepare(`
        SELECT visit_date AS date, COUNT(*) AS visits,
          COUNT(DISTINCT visitor_day_hash) AS visitors
        FROM visit_events WHERE visit_date >= ?
        GROUP BY visit_date ORDER BY visit_date ASC
      `).bind(startDate).all<{ date: string; visits: number; visitors: number }>(),
      aggregate(database, 'referrer_host', startDate),
      aggregate(database, 'country', startDate),
      aggregate(database, 'device', startDate),
      database.prepare(`
        SELECT occurred_at AS occurredAt, path, referrer_host AS source, country, device
        FROM visit_events ORDER BY occurred_at DESC LIMIT 12
      `).all<{ occurredAt: number; path: string; source: string; country: string; device: string }>(),
    ]);

  return {
    periodDays: days,
    totals: numericTotals(totals),
    today: numericTotals(todayTotals),
    timeline: timeline.results,
    sources: sources.results,
    countries: countries.results,
    devices: devices.results,
    recent: recent.results,
  };
}

function aggregate(
  database: D1Database,
  column: 'referrer_host' | 'country' | 'device',
  startDate: string,
) {
  return database.prepare(`
    SELECT ${column} AS label, COUNT(*) AS value
    FROM visit_events WHERE visit_date >= ?
    GROUP BY ${column} ORDER BY value DESC LIMIT 8
  `).bind(startDate).all<{ label: string; value: number }>();
}

function numericTotals(value: { visits: number; visitors: number } | null) {
  return {
    visits: Number(value?.visits ?? 0),
    visitors: Number(value?.visitors ?? 0),
  };
}

export function fozDate(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}
