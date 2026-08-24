import { getD1 } from './index';

let setupPromise: Promise<void> | null = null;

export function ensureDatabase(): Promise<void> {
  if (setupPromise) return setupPromise;

  setupPromise = initializeDatabase().catch((error) => {
    setupPromise = null;
    throw error;
  });
  return setupPromise;
}

async function initializeDatabase(): Promise<void> {
  const database = getD1();
  await database.batch([
    database.prepare(`
      CREATE TABLE IF NOT EXISTS visit_events (
        id TEXT PRIMARY KEY NOT NULL,
        occurred_at INTEGER NOT NULL,
        visit_date TEXT NOT NULL,
        path TEXT NOT NULL,
        referrer_host TEXT NOT NULL,
        utm_source TEXT,
        utm_medium TEXT,
        country TEXT NOT NULL,
        device TEXT NOT NULL,
        visitor_hash TEXT NOT NULL,
        visitor_day_hash TEXT NOT NULL
      )
    `),
    database.prepare(`
      CREATE INDEX IF NOT EXISTS idx_visit_events_date
      ON visit_events (visit_date)
    `),
    database.prepare(`
      CREATE INDEX IF NOT EXISTS idx_visit_events_referrer
      ON visit_events (referrer_host)
    `),
    database.prepare(`
      CREATE INDEX IF NOT EXISTS idx_visit_events_country
      ON visit_events (country)
    `),
    database.prepare(`
      CREATE INDEX IF NOT EXISTS idx_visit_events_visitor
      ON visit_events (visitor_hash)
    `),
    database.prepare(`
      CREATE TABLE IF NOT EXISTS traffic_state (
        id INTEGER PRIMARY KEY NOT NULL,
        score INTEGER NOT NULL,
        raw_score INTEGER NOT NULL,
        level TEXT NOT NULL,
        vehicle_count INTEGER NOT NULL,
        occupancy REAL NOT NULL,
        video_fps REAL NOT NULL,
        inference_fps REAL NOT NULL,
        observed_at TEXT NOT NULL,
        received_at INTEGER NOT NULL,
        roi_json TEXT NOT NULL DEFAULT '[]',
        detections_json TEXT NOT NULL DEFAULT '[]'
      )
    `),
    database.prepare('PRAGMA optimize'),
  ]);
  await ensureTrafficOverlayColumns(database);
}

async function ensureTrafficOverlayColumns(database: D1Database): Promise<void> {
  const columns = await database
    .prepare('PRAGMA table_info(traffic_state)')
    .all<{ name: string }>();
  const existing = new Set(columns.results.map((column) => column.name));
  const additions = [];
  if (!existing.has('roi_json')) {
    additions.push(database.prepare(
      "ALTER TABLE traffic_state ADD COLUMN roi_json TEXT NOT NULL DEFAULT '[]'",
    ));
  }
  if (!existing.has('detections_json')) {
    additions.push(database.prepare(
      "ALTER TABLE traffic_state ADD COLUMN detections_json TEXT NOT NULL DEFAULT '[]'",
    ));
  }
  if (additions.length > 0) await database.batch(additions);
}
