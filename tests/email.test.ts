import assert from 'node:assert/strict';
import test from 'node:test';

import { sendBrevoEmail } from '../lib/email.ts';

test('envia e-mail pela API da Brevo com remetente e descadastro', async () => {
  let requestUrl = '';
  let requestInit: RequestInit | undefined;
  const result = await sendBrevoEmail(
    {
      to: 'assinante@example.com',
      subject: 'Ponte Agora',
      html: '<p>Resumo diário</p>',
      text: 'Resumo diário',
      unsubscribeUrl: 'https://ponte.example/cancelar',
    },
    {
      apiKey: 'chave-de-teste',
      senderEmail: 'noticias@ponte.example',
      senderName: 'Ponte Agora',
    },
    async (input, init) => {
      requestUrl = String(input);
      requestInit = init;
      return Response.json({ messageId: '<id@brevo>' }, { status: 201 });
    },
  );

  assert.equal(requestUrl, 'https://api.brevo.com/v3/smtp/email');
  assert.equal(new Headers(requestInit?.headers).get('api-key'), 'chave-de-teste');
  const body = JSON.parse(String(requestInit?.body));
  assert.deepEqual(body.sender, { email: 'noticias@ponte.example', name: 'Ponte Agora' });
  assert.deepEqual(body.to, [{ email: 'assinante@example.com' }]);
  assert.equal(body.headers['List-Unsubscribe'], '<https://ponte.example/cancelar>');
  assert.equal(result.messageId, '<id@brevo>');
});

test('não tenta enviar quando o provedor não está configurado', async () => {
  await assert.rejects(
    () => sendBrevoEmail(
      { to: 'a@example.com', subject: 'Teste', html: '<p>Teste</p>', text: 'Teste' },
      { apiKey: '', senderEmail: '', senderName: 'Ponte Agora' },
    ),
    /não configurado/i,
  );
});

test('converte falha da Brevo sem revelar credenciais', async () => {
  await assert.rejects(
    () => sendBrevoEmail(
      { to: 'a@example.com', subject: 'Teste', html: '<p>Teste</p>', text: 'Teste' },
      { apiKey: 'segredo', senderEmail: 'noticias@ponte.example', senderName: 'Ponte Agora' },
      async () => Response.json({ message: 'sender not valid' }, { status: 400 }),
    ),
    /Brevo respondeu 400/i,
  );
});
