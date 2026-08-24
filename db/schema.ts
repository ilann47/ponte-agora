import {
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

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

export const trafficSamples = sqliteTable(
  'traffic_samples',
  {
    bucketStart: integer('bucket_start').primaryKey(),
    sampleDate: text('sample_date').notNull(),
    sampleHour: integer('sample_hour').notNull(),
    score: integer('score').notNull(),
    rawScore: integer('raw_score').notNull(),
    level: text('level').notNull(),
    vehicleCount: integer('vehicle_count').notNull(),
    occupancy: real('occupancy').notNull(),
    observedAt: text('observed_at').notNull(),
    receivedAt: integer('received_at').notNull(),
  },
  (table) => [
    index('idx_traffic_samples_date').on(table.sampleDate),
    index('idx_traffic_samples_date_hour').on(table.sampleDate, table.sampleHour),
  ],
);

export const vehicleCounterSessions = sqliteTable('vehicle_counter_sessions', {
  sessionId: text('session_id').primaryKey(),
  lastTotal: integer('last_total').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const vehicleCounts = sqliteTable(
  'vehicle_counts',
  {
    countDate: text('count_date').notNull(),
    countHour: integer('count_hour').notNull(),
    vehicleCount: integer('vehicle_count').notNull().default(0),
    updatedAt: integer('updated_at').notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.countDate, table.countHour] }),
    index('idx_vehicle_counts_date').on(table.countDate),
  ],
);

export const newsletterSubscriptions = sqliteTable(
  'newsletter_subscriptions',
  {
    id: text('id').primaryKey(),
    email: text('email').notNull(),
    preferredHour: integer('preferred_hour').notNull(),
    timezone: text('timezone').notNull().default('America/Sao_Paulo'),
    status: text('status').notNull().default('pending'),
    tokenVersion: integer('token_version').notNull().default(1),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
    confirmationSentAt: integer('confirmation_sent_at'),
    confirmedAt: integer('confirmed_at'),
    unsubscribedAt: integer('unsubscribed_at'),
    lastSentDate: text('last_sent_date'),
    lastSentAt: integer('last_sent_at'),
  },
  (table) => [
    uniqueIndex('idx_newsletter_subscriptions_email').on(table.email),
    index('idx_newsletter_subscriptions_due').on(
      table.status,
      table.preferredHour,
      table.lastSentDate,
    ),
  ],
);

export const newsletterSendLog = sqliteTable(
  'newsletter_send_log',
  {
    id: text('id').primaryKey(),
    subscriptionId: text('subscription_id').notNull(),
    localDate: text('local_date').notNull(),
    status: text('status').notNull(),
    attemptedAt: integer('attempted_at').notNull(),
    sentAt: integer('sent_at'),
    providerMessageId: text('provider_message_id'),
    errorCode: text('error_code'),
  },
  (table) => [
    uniqueIndex('idx_newsletter_send_once').on(table.subscriptionId, table.localDate),
    index('idx_newsletter_send_status').on(table.status, table.attemptedAt),
  ],
);

export const newsletterRateLimits = sqliteTable(
  'newsletter_rate_limits',
  {
    id: text('id').primaryKey(),
    visitorHash: text('visitor_hash').notNull(),
    limitDate: text('limit_date').notNull(),
    requestCount: integer('request_count').notNull().default(1),
    updatedAt: integer('updated_at').notNull(),
  },
  (table) => [
    uniqueIndex('idx_newsletter_rate_visitor_date').on(table.visitorHash, table.limitDate),
    index('idx_newsletter_rate_date').on(table.limitDate),
  ],
);
