import { NEWSLETTER_SUBSCRIBER_LIMIT } from '@/lib/newsletter';
import { getD1 } from './index';
import { ensureDatabase } from './setup';

export type NewsletterStatus = 'pending' | 'active' | 'unsubscribed';

export type NewsletterSubscription = {
  id: string;
  email: string;
  preferredHour: number;
  timezone: string;
  status: NewsletterStatus;
  tokenVersion: number;
  createdAt: number;
  updatedAt: number;
  confirmationSentAt: number | null;
  confirmedAt: number | null;
  unsubscribedAt: number | null;
  lastSentDate: string | null;
  lastSentAt: number | null;
};

const SUBSCRIPTION_SELECT = `
  SELECT id, email, preferred_hour AS preferredHour, timezone, status,
    token_version AS tokenVersion, created_at AS createdAt,
    updated_at AS updatedAt, confirmation_sent_at AS confirmationSentAt,
    confirmed_at AS confirmedAt, unsubscribed_at AS unsubscribedAt,
    last_sent_date AS lastSentDate, last_sent_at AS lastSentAt
  FROM newsletter_subscriptions
`;

export async function consumeNewsletterRateLimit(input: {
  visitorHash: string;
  limitDate: string;
  now: number;
  maximum?: number;
}): Promise<boolean> {
  await ensureDatabase();
  const id = `${input.limitDate}:${input.visitorHash}`;
  const result = await getD1().prepare(`
    INSERT INTO newsletter_rate_limits (
      id, visitor_hash, limit_date, request_count, updated_at
    ) VALUES (?, ?, ?, 1, ?)
    ON CONFLICT(visitor_hash, limit_date) DO UPDATE SET
      request_count = request_count + 1,
      updated_at = excluded.updated_at
    RETURNING request_count AS requestCount
  `).bind(id, input.visitorHash, input.limitDate, input.now)
    .first<{ requestCount: number }>();
  return Number(result?.requestCount ?? 1) <= (input.maximum ?? 5);
}

export async function getNewsletterSubscriptionByEmail(
  email: string,
): Promise<NewsletterSubscription | null> {
  await ensureDatabase();
  return getD1().prepare(`${SUBSCRIPTION_SELECT} WHERE email = ?`)
    .bind(email)
    .first<NewsletterSubscription>();
}

export async function getNewsletterSubscriptionByTokenParts(
  id: string,
  tokenVersion: number,
): Promise<NewsletterSubscription | null> {
  await ensureDatabase();
  return getD1().prepare(`${SUBSCRIPTION_SELECT} WHERE id = ? AND token_version = ?`)
    .bind(id, tokenVersion)
    .first<NewsletterSubscription>();
}

export async function saveNewsletterRequest(input: {
  email: string;
  preferredHour: number;
  now: number;
}): Promise<NewsletterSubscription> {
  await ensureDatabase();
  const existing = await getNewsletterSubscriptionByEmail(input.email);
  const database = getD1();

  if (!existing) {
    const id = crypto.randomUUID();
    await database.prepare(`
      INSERT INTO newsletter_subscriptions (
        id, email, preferred_hour, timezone, status, token_version,
        created_at, updated_at, confirmation_sent_at
      ) VALUES (?, ?, ?, 'America/Sao_Paulo', 'pending', 1, ?, ?, ?)
    `).bind(id, input.email, input.preferredHour, input.now, input.now, input.now).run();
    return (await getNewsletterSubscriptionByEmail(input.email))!;
  }

  if (existing.status === 'active') {
    await database.prepare(`
      UPDATE newsletter_subscriptions
      SET confirmation_sent_at = ?, updated_at = ?
      WHERE id = ?
    `).bind(input.now, input.now, existing.id).run();
  } else if (existing.status === 'pending') {
    await database.prepare(`
      UPDATE newsletter_subscriptions
      SET preferred_hour = ?, confirmation_sent_at = ?, updated_at = ?
      WHERE id = ?
    `).bind(input.preferredHour, input.now, input.now, existing.id).run();
  } else {
    await database.prepare(`
      UPDATE newsletter_subscriptions
      SET preferred_hour = ?, status = 'pending', token_version = token_version + 1,
        confirmation_sent_at = ?, updated_at = ?, confirmed_at = NULL,
        unsubscribed_at = NULL, last_sent_date = NULL, last_sent_at = NULL
      WHERE id = ?
    `).bind(input.preferredHour, input.now, input.now, existing.id).run();
  }

  return (await getNewsletterSubscriptionByEmail(input.email))!;
}

export async function allowNewsletterEmailRetry(
  id: string,
  attemptedAt: number,
): Promise<void> {
  await ensureDatabase();
  await getD1().prepare(`
    UPDATE newsletter_subscriptions
    SET confirmation_sent_at = NULL
    WHERE id = ? AND confirmation_sent_at = ?
  `).bind(id, attemptedAt).run();
}

export async function confirmNewsletterSubscription(
  id: string,
  tokenVersion: number,
  now: number,
): Promise<'confirmed' | 'already-active' | 'full' | 'invalid'> {
  await ensureDatabase();
  const subscription = await getNewsletterSubscriptionByTokenParts(id, tokenVersion);
  if (!subscription || subscription.status === 'unsubscribed') return 'invalid';
  if (subscription.status === 'active') return 'already-active';

  const active = await getD1().prepare(`
    SELECT COUNT(*) AS count FROM newsletter_subscriptions WHERE status = 'active'
  `).first<{ count: number }>();
  if (Number(active?.count ?? 0) >= NEWSLETTER_SUBSCRIBER_LIMIT) return 'full';

  await getD1().prepare(`
    UPDATE newsletter_subscriptions
    SET status = 'active', confirmed_at = ?, updated_at = ?, unsubscribed_at = NULL
    WHERE id = ? AND token_version = ? AND status = 'pending'
  `).bind(now, now, id, tokenVersion).run();
  return 'confirmed';
}

export async function updateNewsletterHour(input: {
  id: string;
  tokenVersion: number;
  preferredHour: number;
  now: number;
}): Promise<boolean> {
  await ensureDatabase();
  const result = await getD1().prepare(`
    UPDATE newsletter_subscriptions
    SET preferred_hour = ?, updated_at = ?
    WHERE id = ? AND token_version = ? AND status = 'active'
  `).bind(input.preferredHour, input.now, input.id, input.tokenVersion).run();
  return Number(result.meta.changes ?? 0) > 0;
}

export async function unsubscribeNewsletter(input: {
  id: string;
  tokenVersion: number;
  now: number;
}): Promise<boolean> {
  await ensureDatabase();
  const result = await getD1().prepare(`
    DELETE FROM newsletter_subscriptions
    WHERE id = ? AND token_version = ?
  `).bind(input.id, input.tokenVersion).run();
  return Number(result.meta.changes ?? 0) > 0;
}

export async function listDueNewsletterSubscriptions(
  preferredHour: number,
  localDate: string,
  limit = NEWSLETTER_SUBSCRIBER_LIMIT,
): Promise<NewsletterSubscription[]> {
  await ensureDatabase();
  const result = await getD1().prepare(`
    ${SUBSCRIPTION_SELECT}
    WHERE status = 'active' AND preferred_hour = ?
      AND (last_sent_date IS NULL OR last_sent_date != ?)
    ORDER BY created_at ASC
    LIMIT ?
  `).bind(preferredHour, localDate, limit).all<NewsletterSubscription>();
  return result.results;
}

export async function claimNewsletterSend(input: {
  subscriptionId: string;
  localDate: string;
  now: number;
}): Promise<boolean> {
  await ensureDatabase();
  const result = await getD1().prepare(`
    INSERT INTO newsletter_send_log (
      id, subscription_id, local_date, status, attempted_at
    ) VALUES (?, ?, ?, 'sending', ?)
    ON CONFLICT(subscription_id, local_date) DO UPDATE SET
      status = 'sending', attempted_at = excluded.attempted_at,
      error_code = NULL
    WHERE newsletter_send_log.status = 'failed'
      OR (newsletter_send_log.status = 'sending'
        AND newsletter_send_log.attempted_at < excluded.attempted_at - 1800000)
  `).bind(crypto.randomUUID(), input.subscriptionId, input.localDate, input.now).run();
  return Number(result.meta.changes ?? 0) > 0;
}

export async function markNewsletterSent(input: {
  subscriptionId: string;
  localDate: string;
  sentAt: number;
  providerMessageId: string;
}): Promise<void> {
  await ensureDatabase();
  const database = getD1();
  await database.batch([
    database.prepare(`
      UPDATE newsletter_send_log
      SET status = 'sent', sent_at = ?, provider_message_id = ?, error_code = NULL
      WHERE subscription_id = ? AND local_date = ?
    `).bind(
      input.sentAt,
      input.providerMessageId.slice(0, 300),
      input.subscriptionId,
      input.localDate,
    ),
    database.prepare(`
      UPDATE newsletter_subscriptions
      SET last_sent_date = ?, last_sent_at = ?, updated_at = ?
      WHERE id = ? AND status = 'active'
    `).bind(input.localDate, input.sentAt, input.sentAt, input.subscriptionId),
  ]);
}

export async function markNewsletterFailed(input: {
  subscriptionId: string;
  localDate: string;
  errorCode: string;
}): Promise<void> {
  await ensureDatabase();
  await getD1().prepare(`
    UPDATE newsletter_send_log
    SET status = 'failed', error_code = ?
    WHERE subscription_id = ? AND local_date = ?
  `).bind(
    input.errorCode.replace(/[^a-z0-9_-]/gi, '').slice(0, 50) || 'unknown',
    input.subscriptionId,
    input.localDate,
  ).run();
}

export async function pruneNewsletterOperationalData(beforeDate: string): Promise<void> {
  await ensureDatabase();
  await getD1().batch([
    getD1().prepare('DELETE FROM newsletter_rate_limits WHERE limit_date < ?').bind(beforeDate),
    getD1().prepare('DELETE FROM newsletter_send_log WHERE local_date < ?').bind(beforeDate),
    getD1().prepare(`
      DELETE FROM newsletter_subscriptions
      WHERE status = 'pending' AND updated_at < ?
    `).bind(Date.now() - 7 * 24 * 60 * 60 * 1000),
  ]);
}
