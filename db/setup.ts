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
    database.prepare(`
      CREATE TABLE IF NOT EXISTS traffic_samples (
        bucket_start INTEGER PRIMARY KEY NOT NULL,
        sample_date TEXT NOT NULL,
        sample_hour INTEGER NOT NULL,
        score INTEGER NOT NULL,
        raw_score INTEGER NOT NULL,
        level TEXT NOT NULL,
        vehicle_count INTEGER NOT NULL,
        occupancy REAL NOT NULL,
        observed_at TEXT NOT NULL,
        received_at INTEGER NOT NULL
      )
    `),
    database.prepare(`
      CREATE INDEX IF NOT EXISTS idx_traffic_samples_date
      ON traffic_samples (sample_date)
    `),
    database.prepare(`
      CREATE INDEX IF NOT EXISTS idx_traffic_samples_date_hour
      ON traffic_samples (sample_date, sample_hour)
    `),
    database.prepare(`
      CREATE TABLE IF NOT EXISTS vehicle_counter_sessions (
        session_id TEXT PRIMARY KEY NOT NULL,
        last_total INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `),
    database.prepare(`
      CREATE TABLE IF NOT EXISTS vehicle_counts (
        count_date TEXT NOT NULL,
        count_hour INTEGER NOT NULL,
        vehicle_count INTEGER NOT NULL DEFAULT 0,
        updated_at INTEGER NOT NULL,
        PRIMARY KEY (count_date, count_hour)
      )
    `),
    database.prepare(`
      CREATE INDEX IF NOT EXISTS idx_vehicle_counts_date
      ON vehicle_counts (count_date)
    `),
    database.prepare(`
      CREATE TABLE IF NOT EXISTS newsletter_subscriptions (
        id TEXT PRIMARY KEY NOT NULL,
        email TEXT NOT NULL,
        preferred_hour INTEGER NOT NULL,
        timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
        status TEXT NOT NULL DEFAULT 'pending',
        token_version INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        confirmation_sent_at INTEGER,
        confirmed_at INTEGER,
        unsubscribed_at INTEGER,
        last_sent_date TEXT,
        last_sent_at INTEGER
      )
    `),
    database.prepare(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_newsletter_subscriptions_email
      ON newsletter_subscriptions (email)
    `),
    database.prepare(`
      CREATE INDEX IF NOT EXISTS idx_newsletter_subscriptions_due
      ON newsletter_subscriptions (status, preferred_hour, last_sent_date)
    `),
    database.prepare(`
      CREATE TABLE IF NOT EXISTS newsletter_send_log (
        id TEXT PRIMARY KEY NOT NULL,
        subscription_id TEXT NOT NULL,
        local_date TEXT NOT NULL,
        status TEXT NOT NULL,
        attempted_at INTEGER NOT NULL,
        sent_at INTEGER,
        provider_message_id TEXT,
        error_code TEXT
      )
    `),
    database.prepare(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_newsletter_send_once
      ON newsletter_send_log (subscription_id, local_date)
    `),
    database.prepare(`
      CREATE INDEX IF NOT EXISTS idx_newsletter_send_status
      ON newsletter_send_log (status, attempted_at)
    `),
    database.prepare(`
      CREATE TABLE IF NOT EXISTS newsletter_rate_limits (
        id TEXT PRIMARY KEY NOT NULL,
        visitor_hash TEXT NOT NULL,
        limit_date TEXT NOT NULL,
        request_count INTEGER NOT NULL DEFAULT 1,
        updated_at INTEGER NOT NULL
      )
    `),
    database.prepare(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_newsletter_rate_visitor_date
      ON newsletter_rate_limits (visitor_hash, limit_date)
    `),
    database.prepare(`
      CREATE INDEX IF NOT EXISTS idx_newsletter_rate_date
      ON newsletter_rate_limits (limit_date)
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
