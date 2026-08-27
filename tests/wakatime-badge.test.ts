import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('rodape mostra o tempo total publico e atualizado do WakaTime', async () => {
  const source = await readFile('app/page.tsx', 'utf8');

  assert.match(source, /Tempo programando/);
  assert.match(source, /https:\/\/wakatime\.com\/@ilann47/);
  assert.match(
    source,
    /https:\/\/wakatime\.com\/badge\/user\/018b0b91-2d41-4402-9942-e1c3c2f7d91a\.svg/,
  );
  assert.match(source, /alt="Tempo total de programação de Ilan no WakaTime"/);
});
