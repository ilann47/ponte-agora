import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('o cancelamento remove a assinatura e o e-mail armazenado', async () => {
  const repository = await readFile(
    new URL('../db/newsletter-repository.ts', import.meta.url),
    'utf8',
  );

  assert.match(repository, /DELETE FROM newsletter_subscriptions/);
  assert.match(repository, /id = \? AND token_version = \?/);
});

test('a política explica dados, confirmação, retenção e cancelamento', async () => {
  const privacy = await readFile(new URL('../app/privacidade/page.tsx', import.meta.url), 'utf8');

  assert.match(privacy, /e-mail/i);
  assert.match(privacy, /horário/i);
  assert.match(privacy, /confirma/i);
  assert.match(privacy, /7 dias/i);
  assert.match(privacy, /31 dias/i);
  assert.match(privacy, /cancel/i);
  assert.match(privacy, /players externos/i);
  assert.match(privacy, /Portal da Cidade/i);
});
