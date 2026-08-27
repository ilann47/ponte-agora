import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('rodape credita o autor e oferece portfolio, GitHub e LinkedIn', async () => {
  const source = await readFile('app/page.tsx', 'utf8');

  assert.match(source, /Desenvolvido por hobby por/);
  assert.match(source, /Ilan Wendling Thoele/);
  assert.match(source, /https:\/\/ilan-wendling-portfolio\.ilanwendling\.chatgpt\.site/);
  assert.match(source, /https:\/\/github\.com\/ilann47/);
  assert.match(source, /https:\/\/www\.linkedin\.com\/in\/ilan-wendling-thoele/);
  assert.match(source, /target="_blank"/);
  assert.match(source, /rel="noreferrer"/);
});
