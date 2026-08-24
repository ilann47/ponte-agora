import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const pageFiles = [
  'app/page.tsx',
  'app/como-funciona/page.tsx',
  'app/privacidade/page.tsx',
  'app/admin/page.tsx',
];

test('navegação interna não carrega o prefetch RSC que falhou no Lighthouse', async () => {
  for (const file of pageFiles) {
    const source = await readFile(file, 'utf8');
    assert.doesNotMatch(source, /next\/link|<Link\b/, file);
  }
});

test('indicador de fila anima por transformação composta', async () => {
  const component = await readFile('app/components/traffic-panel.tsx', 'utf8');
  const css = await readFile('app/globals.css', 'utf8');

  assert.match(component, /transform:\s*`scaleX\(/);
  assert.match(css, /transition:\s*transform/);
  assert.doesNotMatch(css, /transition:\s*width/);
});
