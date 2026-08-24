import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { getTableName } from 'drizzle-orm';
import {
  newsletterRateLimits,
  newsletterSendLog,
  newsletterSubscriptions,
  trafficSamples,
} from '../db/schema.ts';

test('declara as tabelas de assinaturas, envios, limites e histórico', () => {
  assert.equal(getTableName(newsletterSubscriptions), 'newsletter_subscriptions');
  assert.equal(getTableName(newsletterSendLog), 'newsletter_send_log');
  assert.equal(getTableName(newsletterRateLimits), 'newsletter_rate_limits');
  assert.equal(getTableName(trafficSamples), 'traffic_samples');
});

test('o bootstrap do D1 cria todas as tabelas da newsletter', async () => {
  const source = await readFile(new URL('../db/setup.ts', import.meta.url), 'utf8');

  for (const table of [
    'newsletter_subscriptions',
    'newsletter_send_log',
    'newsletter_rate_limits',
    'traffic_samples',
  ]) {
    assert.match(source, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`));
  }
});

test('o repositório grava amostras agregadas junto da leitura atual', async () => {
  const source = await readFile(new URL('../db/repository.ts', import.meta.url), 'utf8');

  assert.match(source, /INSERT INTO traffic_samples/);
  assert.match(source, /ON CONFLICT\(bucket_start\) DO UPDATE/);
});
