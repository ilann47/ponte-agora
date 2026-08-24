import assert from 'node:assert/strict';
import test from 'node:test';

import {
  congestionLabel,
  isTrafficFresh,
  parseTrafficPayload,
} from '../lib/traffic.ts';

test('converte os limites de fila nos mesmos níveis do detector', () => {
  assert.equal(congestionLabel(24), 'Livre');
  assert.equal(congestionLabel(25), 'Moderado');
  assert.equal(congestionLabel(50), 'Intenso');
  assert.equal(congestionLabel(75), 'Congestionado');
});

test('considera online somente uma leitura recente', () => {
  const now = 1_800_000;
  assert.equal(isTrafficFresh(now - 19_999, now), true);
  assert.equal(isTrafficFresh(now - 20_000, now), false);
  assert.equal(isTrafficFresh(undefined, now), false);
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
    counterSessionId: 'session-20260824',
    vehiclePassages: 42,
    roi: [[0.455, 0.35], [0.665, 0.35], [0.61, 0.995], [0.44, 0.995]],
    detections: [
      { label: 'carro', confidence: 0.87, box: [0.48, 0.42, 0.53, 0.55] },
    ],
  });

  assert.equal(reading.level, 'Livre');
  assert.equal(reading.vehicleCount, 6);
  assert.equal(reading.counterSessionId, 'session-20260824');
  assert.equal(reading.vehiclePassages, 42);
  assert.equal(reading.detections[0].label, 'carro');
  assert.equal(reading.detections[0].confidence, 0.87);
  assert.equal(reading.roi.length, 4);
});

test('usa a ROI padrão quando uma leitura antiga não possui overlay', () => {
  const reading = parseTrafficPayload({
    score: 20,
    rawScore: 18,
    vehicleCount: 6,
    occupancy: 0.019,
    videoFps: 24.72,
    inferenceFps: 6.1,
    observedAt: '2026-08-23T21:30:00-03:00',
  });

  assert.equal(reading.roi.length, 4);
  assert.deepEqual(reading.detections, []);
  assert.equal(reading.counterSessionId, null);
  assert.equal(reading.vehiclePassages, null);
});

test('rejeita contador incompleto ou identificador de sessão inválido', () => {
  const base = {
    score: 20,
    rawScore: 18,
    vehicleCount: 6,
    occupancy: 0.019,
    videoFps: 24.72,
    inferenceFps: 6.1,
    observedAt: '2026-08-23T21:30:00-03:00',
  };

  assert.throws(
    () => parseTrafficPayload({ ...base, vehiclePassages: 2 }),
    /contador de passagens inválido/i,
  );
  assert.throws(
    () => parseTrafficPayload({
      ...base,
      counterSessionId: 'x',
      vehiclePassages: 2,
    }),
    /contador de passagens inválido/i,
  );
});

test('rejeita caixas e probabilidades inválidas', () => {
  assert.throws(
    () => parseTrafficPayload({
      score: 20,
      rawScore: 18,
      vehicleCount: 1,
      occupancy: 0.02,
      videoFps: 25,
      inferenceFps: 8,
      observedAt: '2026-08-23T21:30:00-03:00',
      detections: [{ label: 'carro', confidence: 1.4, box: [0.2, 0.2, 0.3, 0.3] }],
    }),
    /detecções inválidas/i,
  );
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
