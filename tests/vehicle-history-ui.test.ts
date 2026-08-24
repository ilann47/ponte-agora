import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('mostra gráfico público de passagens fora da imagem da câmera', async () => {
  const [page, component] = await Promise.all([
    readFile(new URL('../app/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/components/vehicle-history-chart.tsx', import.meta.url), 'utf8'),
  ]);

  assert.match(page, /<VehicleHistoryChart/);
  assert.match(component, /Fluxo estimado sentido Ponte/);
  assert.match(component, /aria-pressed/);
  assert.match(component, />7 dias</);
  assert.match(component, />30 dias</);
  assert.match(component, /Estimativa por IA/);
  assert.doesNotMatch(component, /video-card|detection-overlay/);
});

