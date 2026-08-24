'use client';

import { useEffect, useState } from 'react';
import {
  fetchWeatherReport,
  WEATHER_REFRESH_MS,
  WEATHER_RETRY_MS,
  type WeatherReport,
} from '@/lib/weather';

export function WeatherPanel() {
  const [report, setReport] = useState<WeatherReport | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    let timer: number | undefined;
    const refresh = async () => {
      let nextRefresh = WEATHER_REFRESH_MS;
      try {
        const next = await fetchWeatherReport();
        if (active) {
          setReport(next);
          setError(false);
        }
      } catch {
        nextRefresh = WEATHER_RETRY_MS;
        if (active) setError(true);
      } finally {
        if (active) timer = window.setTimeout(refresh, nextRefresh);
      }
    };

    void refresh();
    return () => {
      active = false;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, []);

  const sourceStatus = error
    ? report
      ? 'Últimos dados disponíveis · tentando atualizar'
      : 'Clima indisponível · nova tentativa em 1 min'
    : 'Dados meteorológicos por Open-Meteo';

  return (
    <section className="weather-section" aria-labelledby="weather-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Clima em Foz do Iguaçu</p>
          <h2 id="weather-title">Agora e próximos dias</h2>
        </div>
        <span>{sourceStatus}</span>
      </div>

      <div className="weather-grid">
        <article className="weather-card weather-now">
          <div><span className="weather-label">Agora</span><strong>{temperature(report?.current.temperatureC)}</strong></div>
          <div className="weather-details">
            <b>{report?.current.description ?? 'Carregando clima...'}</b>
            <span>Sensação de {temperature(report?.current.apparentTemperatureC)}</span>
          </div>
          <dl>
            <div><dt>Chuva</dt><dd>{report ? `${report.current.precipitationMm.toFixed(1)} mm` : '—'}</dd></div>
            <div><dt>Vento</dt><dd>{report ? `${report.current.windSpeedKmh.toFixed(1)} km/h` : '—'}</dd></div>
          </dl>
        </article>
        <ForecastCard label="Hoje" forecast={report?.today} />
        <ForecastCard label="Amanhã" forecast={report?.tomorrow} />
      </div>
    </section>
  );
}

function ForecastCard({
  label,
  forecast,
}: {
  label: string;
  forecast: WeatherReport['today'] | undefined;
}) {
  return (
    <article className="weather-card">
      <span className="weather-label">{label}</span>
      <strong>{temperature(forecast?.temperatureMinC)} <i>—</i> {temperature(forecast?.temperatureMaxC)}</strong>
      <span>{forecast?.description ?? 'Carregando'} · chuva {forecast?.rainProbability ?? '—'}%</span>
    </article>
  );
}

function temperature(value: number | undefined): string {
  return value === undefined ? '—' : `${value.toFixed(1).replace('.', ',')}°`;
}
