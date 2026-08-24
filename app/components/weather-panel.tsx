'use client';

import { useEffect, useState } from 'react';
import type { WeatherReport } from '@/lib/weather';

export function WeatherPanel() {
  const [report, setReport] = useState<WeatherReport | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const response = await fetch('/api/weather');
        if (!response.ok) throw new Error('clima indisponível');
        const next = await response.json() as WeatherReport;
        if (active) {
          setReport(next);
          setError(false);
        }
      } catch {
        if (active) setError(true);
      }
    };

    void refresh();
    const timer = window.setInterval(refresh, 600_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  return (
    <section className="weather-section" aria-labelledby="weather-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Clima em Foz do Iguaçu</p>
          <h2 id="weather-title">Agora e próximos dias</h2>
        </div>
        <span>{error ? 'Últimos dados disponíveis' : 'Dados meteorológicos por Open-Meteo'}</span>
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
