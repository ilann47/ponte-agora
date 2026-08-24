import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';

const routes = [
  '../app/api/newsletter/subscribe/route.ts',
  '../app/api/newsletter/confirm/route.ts',
  '../app/api/newsletter/manage/route.ts',
  '../app/api/newsletter/unsubscribe/route.ts',
  '../app/api/newsletter/send/route.ts',
];

test('expõe inscrição, confirmação, gestão, cancelamento e envio protegido', async () => {
  for (const route of routes) await access(new URL(route, import.meta.url));

  const sendRoute = await readFile(new URL(routes.at(-1)!, import.meta.url), 'utf8');
  assert.match(sendRoute, /NEWSLETTER_CRON_SECRET/);
  assert.match(sendRoute, /claimNewsletterSend/);
  assert.match(sendRoute, /fetchWeatherReport/);
  assert.match(sendRoute, /getTrafficSamples/);
});

test('a gestão permite consultar, alterar horário e cancelar', async () => {
  const source = await readFile(new URL('../app/api/newsletter/manage/route.ts', import.meta.url), 'utf8');
  assert.match(source, /export async function GET/);
  assert.match(source, /export async function PATCH/);
  assert.match(source, /export async function DELETE/);
});
