import assert from 'node:assert/strict';
import test from 'node:test';

import {
  classifyDevice,
  dailyVisitorHash,
  normalizeReferrer,
  sanitizePath,
} from '../lib/analytics.ts';

test('normaliza origem direta, interna e externa sem guardar URL completa', () => {
  assert.equal(normalizeReferrer('', 'https://ponte.example'), 'Direto');
  assert.equal(
    normalizeReferrer('https://ponte.example/admin', 'https://ponte.example'),
    'Navegação interna',
  );
  assert.equal(
    normalizeReferrer('https://www.google.com/search?q=ponte', 'https://ponte.example'),
    'google.com',
  );
});

test('classifica o dispositivo por grupos úteis ao painel', () => {
  assert.equal(classifyDevice('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0)'), 'Celular');
  assert.equal(classifyDevice('Mozilla/5.0 (iPad; CPU OS 18_0)'), 'Tablet');
  assert.equal(classifyDevice('Mozilla/5.0 (Windows NT 10.0; Win64; x64)'), 'Computador');
});

test('limita caminhos registrados ao próprio site', () => {
  assert.equal(sanitizePath('/admin?periodo=30#fontes'), '/admin');
  assert.equal(sanitizePath('https://malicioso.example/teste'), '/');
});

test('o identificador diário é estável, anônimo e muda no dia seguinte', async () => {
  const first = await dailyVisitorHash('203.0.113.4', 'navegador', '2026-08-23', 'sal-local');
  const same = await dailyVisitorHash('203.0.113.4', 'navegador', '2026-08-23', 'sal-local');
  const tomorrow = await dailyVisitorHash('203.0.113.4', 'navegador', '2026-08-24', 'sal-local');

  assert.equal(first, same);
  assert.notEqual(first, tomorrow);
  assert.equal(first.includes('203.0.113.4'), false);
  assert.match(first, /^[a-f0-9]{64}$/);
});
