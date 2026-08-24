import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';

test('a página principal oferece inscrição com e-mail, horário e consentimento', async () => {
  const home = await readFile(new URL('../app/page.tsx', import.meta.url), 'utf8');
  const component = await readFile(
    new URL('../app/components/newsletter-form.tsx', import.meta.url),
    'utf8',
  );

  assert.match(home, /NewsletterForm/);
  assert.match(home, /newsletterEnabled/);
  assert.match(home, /process\.env\.BREVO_API_KEY/);
  assert.match(component, /type="email"/);
  assert.match(component, /preferredHour/);
  assert.match(component, /Array\.from\(\{ length: 24 \}/);
  assert.match(component, /type="checkbox"/);
  assert.match(component, /horário de Foz do Iguaçu/i);
  assert.match(component, /api\/newsletter\/subscribe/);
});

test('há uma página privada para alterar horário e cancelar', async () => {
  await access(new URL('../app/newsletter/gerenciar/page.tsx', import.meta.url));
  const component = await readFile(
    new URL('../app/components/newsletter-manager.tsx', import.meta.url),
    'utf8',
  );

  assert.match(component, /method: 'PATCH'/);
  assert.match(component, /method: 'DELETE'/);
  assert.match(component, /Alterar o horário/i);
  assert.match(component, /Cancelar newsletter/i);
});
