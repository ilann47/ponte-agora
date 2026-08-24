import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('expõe o histórico de veículos somente em 7 ou 30 dias e sem cache', async () => {
  const source = await readFile(
    new URL('../app/api/traffic/history/route.ts', import.meta.url),
    'utf8',
  );

  assert.match(source, /getVehicleHistorySummary/);
  assert.match(source, /days !== 7 && days !== 30/);
  assert.match(source, /Cache-Control.*no-store/);
});

