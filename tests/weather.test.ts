import assert from 'node:assert/strict';
import test from 'node:test';

import { buildWeatherUrl, parseWeatherResponse, weatherCodeLabel } from '../lib/weather.ts';

test('monta a consulta de Foz do Iguaçu com dois dias', () => {
  const url = new URL(buildWeatherUrl());

  assert.equal(url.hostname, 'api.open-meteo.com');
  assert.equal(url.searchParams.get('forecast_days'), '2');
  assert.equal(url.searchParams.get('timezone'), 'America/Sao_Paulo');
  assert.equal(url.searchParams.has('apikey'), false);
});

test('converte clima atual, hoje e amanhã', () => {
  const report = parseWeatherResponse({
    current: {
      time: '2026-08-23T21:30',
      temperature_2m: 15.9,
      apparent_temperature: 14.6,
      precipitation: 0,
      weather_code: 2,
      wind_speed_10m: 8.9,
    },
    daily: {
      time: ['2026-08-23', '2026-08-24'],
      weather_code: [3, 61],
      temperature_2m_min: [10.4, 10.7],
      temperature_2m_max: [23.2, 23.1],
      precipitation_probability_max: [0, 54],
    },
  });

  assert.equal(report.current.description, 'Parcialmente nublado');
  assert.equal(report.today.temperatureMaxC, 23.2);
  assert.equal(report.tomorrow.rainProbability, 54);
  assert.equal(weatherCodeLabel(61), 'Chuva leve');
});

test('rejeita resposta incompleta', () => {
  assert.throws(() => parseWeatherResponse({ current: {}, daily: {} }), /clima inválido/i);
});
