import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { getTableName } from 'drizzle-orm';
import { vehicleCounterSessions, vehicleCounts } from '../db/schema.ts';

test('declara sessões idempotentes e totais horários de veículos', () => {
  assert.equal(getTableName(vehicleCounterSessions), 'vehicle_counter_sessions');
  assert.equal(getTableName(vehicleCounts), 'vehicle_counts');
});

test('inicialização e repositório persistem apenas o incremento da sessão', async () => {
  const [setup, repository] = await Promise.all([
    readFile(new URL('../db/setup.ts', import.meta.url), 'utf8'),
    readFile(new URL('../db/repository.ts', import.meta.url), 'utf8'),
  ]);

  assert.match(setup, /CREATE TABLE IF NOT EXISTS vehicle_counter_sessions/);
  assert.match(setup, /CREATE TABLE IF NOT EXISTS vehicle_counts/);
  assert.match(repository, /INSERT INTO vehicle_counts/);
  assert.match(repository, /vehicle_count = vehicle_count \+ excluded\.vehicle_count/);
  assert.match(repository, /getVehicleHistorySummary/);
});
