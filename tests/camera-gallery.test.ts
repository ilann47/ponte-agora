import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  BORDER_CAMERAS,
  EMBEDDED_CAMERAS,
  PRIMARY_CAMERA,
} from '../lib/cameras.ts';
import { SITE_DESCRIPTION, SITE_TITLE } from '../lib/seo.ts';

test('catalogo reune as nove cameras dos dois enderecos sem duplicar transmissoes', () => {
  assert.equal(BORDER_CAMERAS.length, 9);
  assert.equal(EMBEDDED_CAMERAS.length, 8);
  assert.equal(PRIMARY_CAMERA.id, 'br277-sentido-ponte');
  assert.equal(PRIMARY_CAMERA.kind, 'primary');

  const ids = new Set(BORDER_CAMERAS.map((camera) => camera.id));
  assert.equal(ids.size, BORDER_CAMERAS.length);

  const labels = BORDER_CAMERAS.map((camera) => camera.name);
  assert.ok(labels.includes('Ponte da Amizade — sentido Paraguai'));
  assert.ok(labels.includes('Ponte da Amizade — sentido Brasil'));
  assert.ok(labels.includes('Ponte Tancredo Neves — sentido Argentina'));
  assert.ok(labels.includes('Ponte da Integração — sentido Paraguai'));
  assert.ok(labels.includes('Mega Eletrônicos — cruzamento'));
});

test('cameras incorporadas usam HTTPS, informam origem e mantem link de contingencia', () => {
  for (const camera of EMBEDDED_CAMERAS) {
    assert.equal(new URL(camera.embedUrl).protocol, 'https:');
    assert.equal(new URL(camera.sourceUrl).protocol, 'https:');
    assert.ok(camera.provider.length > 0);
    assert.ok(camera.location.length > 0);
  }

  const portalCameras = EMBEDDED_CAMERAS.filter(
    (camera) => camera.provider === 'Portal da Cidade',
  );
  assert.equal(portalCameras.length, 5);
  assert.ok(portalCameras.every((camera) => (
    new URL(camera.sourceUrl).hostname === 'foz.portaldacidade.com'
  )));
});

test('galeria carrega somente a camera escolhida e explica o limite da IA', async () => {
  const [component, page] = await Promise.all([
    readFile('app/components/camera-gallery.tsx', 'utf8'),
    readFile('app/page.tsx', 'utf8'),
  ]);

  assert.match(component, /useState/);
  assert.match(component, /activeCamera\.embedUrl/);
  assert.match(component, /loading="lazy"/);
  assert.match(component, /title=\{`Câmera ao vivo: \$\{activeCamera\.name\}`\}/);
  assert.match(component, /A análise por IA continua exclusiva da câmera principal/);
  assert.match(component, /Imagens fornecidas por/);
  assert.doesNotMatch(component, /EMBEDDED_CAMERAS\.map\([\s\S]*?<iframe/);

  assert.match(page, /<CameraGallery \/>/);
  assert.match(page, /href="#cameras"/);
  assert.match(page, /nove câmeras ao vivo/);
});

test('metadados apresentam as varias cameras sem perder a busca principal', () => {
  assert.match(SITE_TITLE, /Fila da Ponte da Amizade Agora/i);
  assert.match(SITE_TITLE, /9 câmeras ao vivo/i);
  assert.match(SITE_DESCRIPTION, /nove câmeras/i);
  assert.match(SITE_DESCRIPTION, /BR-277/i);
  assert.match(SITE_DESCRIPTION, /análise por IA/i);
});
