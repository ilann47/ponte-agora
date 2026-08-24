import assert from 'node:assert/strict';
import test from 'node:test';

import { congestionLabel, parseTrafficPayload } from '../lib/traffic.ts';

test('converte os limites de fila nos mesmos níveis do detector', () => {
  assert.equal(congestionLabel(24), 'Livre');
  assert.equal(congestionLabel(25), 'Moderado');
  assert.equal(congestionLabel(50), 'Intenso');
  assert.equal(congestionLabel(75), 'Congestionado');
});

test('aceita uma leitura válida do detector', () => {
  const reading = parseTrafficPayload({
    score: 20,
    rawScore: 18,
    vehicleCount: 6,
    occupancy: 0.019,
    videoFps: 24.72,
    inferenceFps: 6.1,
    observedAt: '2026-08-23T21:30:00-03:00',
  });

  assert.equal(reading.level, 'Livre');
  assert.equal(reading.vehicleCount, 6);
});

test('rejeita métricas fora dos limites', () => {
  assert.throws(
    () => parseTrafficPayload({
      score: 130,
      rawScore: 18,
      vehicleCount: -1,
      occupancy: 1.2,
      videoFps: 24,
      inferenceFps: 6,
      observedAt: 'inválido',
    }),
    /telemetria inválida/i,
  );
});
