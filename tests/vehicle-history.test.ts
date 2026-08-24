import assert from 'node:assert/strict';
import test from 'node:test';

import {
  fozVehicleBucket,
  passageDelta,
  summarizeVehicleHistory,
} from '../lib/vehicle-history.ts';

test('atribui passagens à data e hora de Foz do Iguaçu', () => {
  assert.deepEqual(
    fozVehicleBucket(new Date('2026-08-25T02:30:00Z')),
    { date: '2026-08-24', hour: 23 },
  );
});

test('calcula somente o incremento novo de uma sessão do detector', () => {
  assert.equal(passageDelta(null, 3), 3);
  assert.equal(passageDelta(3, 7), 4);
  assert.equal(passageDelta(7, 7), 0);
  assert.equal(passageDelta(7, 2), 0);
});

test('preenche dias sem passagem e resume hoje, pico e média', () => {
  const summary = summarizeVehicleHistory({
    daily: [
      { date: '2026-08-22', count: 10 },
      { date: '2026-08-24', count: 20 },
    ],
    todayHourly: [
      { hour: 8, count: 7 },
      { hour: 9, count: 13 },
    ],
    periodDays: 7,
    endDate: '2026-08-24',
  });

  assert.deepEqual(summary.timeline, [
    { date: '2026-08-18', count: 0 },
    { date: '2026-08-19', count: 0 },
    { date: '2026-08-20', count: 0 },
    { date: '2026-08-21', count: 0 },
    { date: '2026-08-22', count: 10 },
    { date: '2026-08-23', count: 0 },
    { date: '2026-08-24', count: 20 },
  ]);
  assert.equal(summary.today, 20);
  assert.equal(summary.total, 30);
  assert.equal(summary.averagePerDay, 4);
  assert.deepEqual(summary.peakDay, { date: '2026-08-24', count: 20 });
  assert.deepEqual(summary.peakHour, { hour: 9, count: 13 });
});

test('limita o período público a 7 ou 30 dias', () => {
  assert.throws(
    () => summarizeVehicleHistory({
      daily: [],
      todayHourly: [],
      periodDays: 15,
      endDate: '2026-08-24',
    }),
    /período/i,
  );
});
