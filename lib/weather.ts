const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast';

export type CurrentWeather = {
  observedAt: string;
  temperatureC: number;
  apparentTemperatureC: number;
  precipitationMm: number;
  weatherCode: number;
  description: string;
  windSpeedKmh: number;
};

export type DailyForecast = {
  date: string;
  temperatureMinC: number;
  temperatureMaxC: number;
  rainProbability: number | null;
  weatherCode: number;
  description: string;
};

export type WeatherReport = {
  current: CurrentWeather;
  today: DailyForecast;
  tomorrow: DailyForecast;
};

export function buildWeatherUrl(): string {
  const query = new URLSearchParams({
    latitude: '-25.5163',
    longitude: '-54.5854',
    current: [
      'temperature_2m',
      'apparent_temperature',
      'precipitation',
      'weather_code',
      'wind_speed_10m',
    ].join(','),
    daily: [
      'weather_code',
      'temperature_2m_max',
      'temperature_2m_min',
      'precipitation_probability_max',
    ].join(','),
    timezone: 'America/Sao_Paulo',
    forecast_days: '2',
  });
  return `${OPEN_METEO_URL}?${query.toString()}`;
}

export function weatherCodeLabel(code: number): string {
  const labels: Record<number, string> = {
    0: 'Céu limpo',
    1: 'Predominantemente limpo',
    2: 'Parcialmente nublado',
    3: 'Nublado',
    45: 'Neblina',
    48: 'Neblina',
    51: 'Garoa leve',
    53: 'Garoa',
    55: 'Garoa forte',
    56: 'Garoa congelante',
    57: 'Garoa congelante',
    61: 'Chuva leve',
    63: 'Chuva moderada',
    65: 'Chuva forte',
    66: 'Chuva congelante',
    67: 'Chuva congelante',
    71: 'Neve leve',
    73: 'Neve',
    75: 'Neve forte',
    77: 'Grãos de neve',
    80: 'Pancadas leves',
    81: 'Pancadas de chuva',
    82: 'Pancadas fortes',
    85: 'Pancadas de neve',
    86: 'Pancadas de neve',
    95: 'Tempestade',
    96: 'Tempestade com granizo',
    99: 'Tempestade com granizo',
  };
  return labels[code] ?? 'Condição desconhecida';
}

export function parseWeatherResponse(value: unknown): WeatherReport {
  try {
    const root = record(value);
    const current = record(root.current);
    const daily = record(root.daily);

    const currentCode = finiteNumber(current.weather_code);
    const report: WeatherReport = {
      current: {
        observedAt: nonEmptyString(current.time),
        temperatureC: finiteNumber(current.temperature_2m),
        apparentTemperatureC: finiteNumber(current.apparent_temperature),
        precipitationMm: finiteNumber(current.precipitation),
        weatherCode: currentCode,
        description: weatherCodeLabel(currentCode),
        windSpeedKmh: finiteNumber(current.wind_speed_10m),
      },
      today: dailyForecast(daily, 0),
      tomorrow: dailyForecast(daily, 1),
    };

    return report;
  } catch {
    throw new Error('Clima inválido: resposta incompleta da Open-Meteo');
  }
}

function dailyForecast(daily: Record<string, unknown>, index: number): DailyForecast {
  const dates = array(daily.time);
  const codes = array(daily.weather_code);
  const minimums = array(daily.temperature_2m_min);
  const maximums = array(daily.temperature_2m_max);
  const rain = array(daily.precipitation_probability_max);
  const code = finiteNumber(codes[index]);
  const probability = rain[index];

  return {
    date: nonEmptyString(dates[index]),
    temperatureMinC: finiteNumber(minimums[index]),
    temperatureMaxC: finiteNumber(maximums[index]),
    rainProbability: probability === null ? null : finiteNumber(probability),
    weatherCode: code,
    description: weatherCodeLabel(code),
  };
}

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('registro ausente');
  }
  return value as Record<string, unknown>;
}

function array(value: unknown): unknown[] {
  if (!Array.isArray(value) || value.length < 2) throw new Error('lista ausente');
  return value;
}

function finiteNumber(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error('número inválido');
  }
  return value;
}

function nonEmptyString(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error('texto ausente');
  return value;
}
