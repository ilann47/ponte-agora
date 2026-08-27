import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEFAULT_SITE_ORIGIN,
  SITE_DESCRIPTION,
  SITE_TITLE,
  buildSiteStructuredData,
  resolveSiteOrigin,
} from '../lib/seo.ts';

test('usa a URL publica como origem canonica segura', () => {
  assert.equal(DEFAULT_SITE_ORIGIN, 'https://filaponte.com.br');
  assert.equal(resolveSiteOrigin(), DEFAULT_SITE_ORIGIN);
  assert.equal(
    resolveSiteOrigin('https://ponte-agora.ilanwendling.chatgpt.site'),
    DEFAULT_SITE_ORIGIN,
  );
  assert.equal(
    resolveSiteOrigin('https://filaponte.com.br/caminho'),
    DEFAULT_SITE_ORIGIN,
  );
  assert.equal(resolveSiteOrigin('https://exemplo.com/caminho'), DEFAULT_SITE_ORIGIN);
  assert.equal(resolveSiteOrigin('http://localhost:3000/caminho'), 'http://localhost:3000');
  assert.equal(resolveSiteOrigin('javascript:alert(1)'), DEFAULT_SITE_ORIGIN);
  assert.equal(resolveSiteOrigin('valor-invalido'), DEFAULT_SITE_ORIGIN);
});

test('metadados priorizam a busca pela fila da Ponte da Amizade', () => {
  assert.match(SITE_TITLE, /Fila da Ponte da Amizade Agora/i);
  assert.match(SITE_DESCRIPTION, /câmeras? ao vivo/i);
  assert.match(SITE_DESCRIPTION, /BR-277/i);
  assert.match(SITE_DESCRIPTION, /IA/i);
});

test('dados estruturados descrevem o site e a aplicacao gratuita', () => {
  const schemas = buildSiteStructuredData(DEFAULT_SITE_ORIGIN);

  assert.equal(schemas.length, 2);
  assert.equal(schemas[0]['@type'], 'WebSite');
  assert.equal(schemas[0].url, `${DEFAULT_SITE_ORIGIN}/`);
  assert.equal(schemas[1]['@type'], 'WebApplication');
  assert.equal(schemas[1].isAccessibleForFree, true);
});
