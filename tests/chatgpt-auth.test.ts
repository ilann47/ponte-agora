import assert from 'node:assert/strict';
import test from 'node:test';
import { chatGPTUserFromHeaders } from '../lib/chatgpt-user.ts';

test('lê o usuário autenticado diretamente dos cabeçalhos da requisição', () => {
  const headers = new Headers({
    'oai-authenticated-user-id': 'owner-123',
    'oai-authenticated-user-email': 'owner@example.com',
    'oai-authenticated-user-full-name': 'Ilan%20Wendling',
    'oai-authenticated-user-full-name-encoding': 'percent-encoded-utf-8',
  });

  assert.deepEqual(chatGPTUserFromHeaders(headers), {
    userId: 'owner-123',
    email: 'owner@example.com',
    displayName: 'Ilan Wendling',
    fullName: 'Ilan Wendling',
  });
});

test('não autentica uma requisição sem os dois identificadores obrigatórios', () => {
  assert.equal(chatGPTUserFromHeaders(new Headers()), null);
});
