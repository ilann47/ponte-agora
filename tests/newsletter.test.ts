import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildNewsletterEmail,
  buildTrafficBucket,
  createNewsletterToken,
  fozSchedule,
  shouldSendNewsletter,
  summarizeTrafficSamples,
  validateNewsletterInput,
  verifyNewsletterToken,
} from '../lib/newsletter.ts';

test('normaliza o e-mail, exige consentimento e aceita somente horas inteiras de Foz', () => {
  assert.deepEqual(
    validateNewsletterInput({
      email: '  Ilan.Wendling@Example.COM ',
      preferredHour: '7',
      consent: true,
    }),
    { email: 'ilan.wendling@example.com', preferredHour: 7 },
  );

  assert.throws(
    () => validateNewsletterInput({ email: 'email-invalido', preferredHour: 7, consent: true }),
    /e-mail válido/i,
  );
  assert.throws(
    () => validateNewsletterInput({ email: 'ilan@example.com', preferredHour: 24, consent: true }),
    /horário/i,
  );
  assert.throws(
    () => validateNewsletterInput({ email: 'ilan@example.com', preferredHour: 7, consent: false }),
    /consentimento/i,
  );
});

test('calcula a data e a hora usando o fuso de Foz do Iguaçu', () => {
  assert.deepEqual(
    fozSchedule(new Date('2026-08-24T13:15:00.000Z')),
    { date: '2026-08-24', hour: 10 },
  );
});

test('agrupa a telemetria em intervalos de cinco minutos', () => {
  const bucket = buildTrafficBucket(new Date('2026-08-24T13:12:59.000Z'));

  assert.equal(bucket.bucketStart, Date.parse('2026-08-24T13:10:00.000Z'));
  assert.equal(bucket.sampleDate, '2026-08-24');
  assert.equal(bucket.sampleHour, 10);
});

test('resume o histórico do dia por hora e destaca o pico', () => {
  const summary = summarizeTrafficSamples([
    { score: 10, sampleHour: 7 },
    { score: 30, sampleHour: 7 },
    { score: 60, sampleHour: 8 },
  ]);

  assert.equal(summary.sampleCount, 3);
  assert.equal(summary.averageScore, 33);
  assert.equal(summary.peakScore, 60);
  assert.equal(summary.peakHour, 8);
  assert.deepEqual(summary.periods, [
    { hour: 7, averageScore: 20, peakScore: 30, level: 'Livre' },
    { hour: 8, averageScore: 60, peakScore: 60, level: 'Intenso' },
  ]);
});

test('dispara somente uma vez no dia e na hora escolhida', () => {
  const now = new Date('2026-08-24T13:15:00.000Z');
  const subscription = {
    status: 'active',
    preferredHour: 10,
    lastSentDate: null,
  } as const;

  assert.equal(shouldSendNewsletter(subscription, now), true);
  assert.equal(shouldSendNewsletter({ ...subscription, preferredHour: 11 }, now), false);
  assert.equal(shouldSendNewsletter({ ...subscription, lastSentDate: '2026-08-24' }, now), false);
  assert.equal(shouldSendNewsletter({ ...subscription, status: 'pending' }, now), false);
});

test('assina e verifica o token sem expor o segredo', async () => {
  const token = await createNewsletterToken(
    '9f213e4e-7220-4865-8957-03ad065c8bea',
    3,
    'segredo-de-teste-com-mais-de-32-caracteres',
  );

  assert.equal(token.includes('segredo-de-teste'), false);
  assert.deepEqual(
    await verifyNewsletterToken(token, 'segredo-de-teste-com-mais-de-32-caracteres'),
    { subscriptionId: '9f213e4e-7220-4865-8957-03ad065c8bea', tokenVersion: 3 },
  );
  assert.equal(
    await verifyNewsletterToken(`${token}alterado`, 'segredo-de-teste-com-mais-de-32-caracteres'),
    null,
  );
});

test('monta o e-mail diário com clima, trânsito, histórico e links de gestão', () => {
  const message = buildNewsletterEmail({
    siteUrl: 'https://ponte.example',
    accessToken: 'token-seguro',
    preferredHour: 10,
    weather: {
      current: {
        observedAt: '2026-08-24T10:00',
        temperatureC: 19.5,
        apparentTemperatureC: 19,
        precipitationMm: 0,
        weatherCode: 2,
        description: 'Parcialmente nublado',
        windSpeedKmh: 7,
      },
      today: {
        date: '2026-08-24',
        temperatureMinC: 12,
        temperatureMaxC: 24,
        rainProbability: 20,
        weatherCode: 2,
        description: 'Parcialmente nublado',
      },
      tomorrow: {
        date: '2026-08-25',
        temperatureMinC: 14,
        temperatureMaxC: 26,
        rainProbability: 35,
        weatherCode: 61,
        description: 'Chuva leve',
      },
    },
    traffic: {
      score: 42,
      level: 'Moderado',
      vehicleCount: 12,
      observedAt: '2026-08-24T10:00:00-03:00',
    },
    history: {
      sampleCount: 3,
      averageScore: 33,
      peakScore: 60,
      peakHour: 8,
      periods: [
        { hour: 7, averageScore: 20, peakScore: 30, level: 'Livre' },
        { hour: 8, averageScore: 60, peakScore: 60, level: 'Intenso' },
      ],
    },
  });

  assert.match(message.subject, /Ponte Agora.*Moderado/i);
  assert.match(message.html, /Previsão para amanhã/i);
  assert.match(message.html, /Pico.*08:00/i);
  assert.match(message.html, /token-seguro/);
  assert.match(message.text, /Alterar horário ou cancelar/i);
  assert.equal(message.unsubscribeUrl, 'https://ponte.example/api/newsletter/unsubscribe?token=token-seguro');
});
