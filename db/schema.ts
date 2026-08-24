import { index, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const visitEvents = sqliteTable(
  'visit_events',
  {
    id: text('id').primaryKey(),
    occurredAt: integer('occurred_at').notNull(),
    visitDate: text('visit_date').notNull(),
    path: text('path').notNull(),
    referrerHost: text('referrer_host').notNull(),
    utmSource: text('utm_source'),
    utmMedium: text('utm_medium'),
    country: text('country').notNull(),
    device: text('device').notNull(),
    visitorHash: text('visitor_hash').notNull(),
    visitorDayHash: text('visitor_day_hash').notNull(),
  },
  (table) => [
    index('idx_visit_events_date').on(table.visitDate),
    index('idx_visit_events_referrer').on(table.referrerHost),
    index('idx_visit_events_country').on(table.country),
    index('idx_visit_events_visitor').on(table.visitorHash),
  ],
);

export const trafficState = sqliteTable('traffic_state', {
  id: integer('id').primaryKey(),
  score: integer('score').notNull(),
  rawScore: integer('raw_score').notNull(),
  level: text('level').notNull(),
  vehicleCount: integer('vehicle_count').notNull(),
  occupancy: real('occupancy').notNull(),
  videoFps: real('video_fps').notNull(),
  inferenceFps: real('inference_fps').notNull(),
  observedAt: text('observed_at').notNull(),
  receivedAt: integer('received_at').notNull(),
  roiJson: text('roi_json').notNull().default('[]'),
  detectionsJson: text('detections_json').notNull().default('[]'),
});
