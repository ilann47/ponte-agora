'use client';

import { useMemo, useState } from 'react';
import type { VehicleCountPoint, VehicleHistorySummary } from '@/lib/vehicle-history';

const numberFormat = new Intl.NumberFormat('pt-BR');

export function VehicleHistoryChart({
  initialSummary,
}: {
  initialSummary: VehicleHistorySummary;
}) {
  const [periodDays, setPeriodDays] = useState<7 | 30>(7);
  const timeline = initialSummary.timeline.slice(-periodDays);
  const metrics = useMemo(() => summarizeVisible(timeline), [timeline]);
  const maximum = Math.max(1, ...timeline.map((point) => point.count));
  const hasData = metrics.total > 0;

  return (
    <section className="vehicle-history-section" id="fluxo-diario" aria-labelledby="vehicle-history-title">
      <div className="section-heading vehicle-history-heading">
        <div>
          <p className="eyebrow">Fluxo estimado sentido Ponte</p>
          <h2 id="vehicle-history-title">Veículos que passaram por dia</h2>
        </div>
        <div className="vehicle-period-tabs" aria-label="Período do histórico">
          <button type="button" aria-pressed={periodDays === 7} onClick={() => setPeriodDays(7)}>7 dias</button>
          <button type="button" aria-pressed={periodDays === 30} onClick={() => setPeriodDays(30)}>30 dias</button>
        </div>
      </div>

      <div className="vehicle-history-layout">
        <div className="vehicle-history-stats">
          <HistoryMetric label="Hoje" value={number(metrics.today)} />
          <HistoryMetric label={`Total · ${periodDays} dias`} value={number(metrics.total)} />
          <HistoryMetric label="Média diária" value={number(metrics.averagePerDay)} />
          <HistoryMetric label="Pico de hoje" value={formatPeakHour(initialSummary.peakHour)} />
        </div>

        <article className="vehicle-chart-card">
          <div className="vehicle-chart-meta">
            <div>
              <span>Histórico diário</span>
              <strong>{hasData ? `${number(metrics.total)} passagens` : 'Coleta iniciada'}</strong>
            </div>
            <small>Estimativa por IA · cada veículo é contado uma vez ao cruzar a linha virtual</small>
          </div>
          <div
            className={`vehicle-chart-bars period-${periodDays}`}
            role="img"
            aria-label={`Gráfico de veículos por dia nos últimos ${periodDays} dias`}
          >
            {timeline.map((point) => (
              <div className="vehicle-chart-column" key={point.date} title={`${formatFullDate(point.date)}: ${number(point.count)} veículos`}>
                <span>{number(point.count)}</span>
                <i style={{ height: `${point.count === 0 ? 2 : Math.max(8, (point.count / maximum) * 100)}%` }} />
                <small>{formatShortDate(point.date)}</small>
              </div>
            ))}
          </div>
          {!hasData && (
            <p className="vehicle-history-empty">
              Os primeiros totais aparecerão conforme os veículos forem cruzando a área monitorada.
            </p>
          )}
        </article>
      </div>

      <p className="vehicle-history-note">
        A contagem é uma estimativa automática do sentido Ponte da Amizade e pode variar em caso de oclusão, chuva ou perda temporária da câmera.
      </p>
    </section>
  );
}

function HistoryMetric({ label, value }: { label: string; value: string }) {
  return <article><span>{label}</span><strong>{value}</strong></article>;
}

function summarizeVisible(timeline: VehicleCountPoint[]) {
  const total = timeline.reduce((sum, point) => sum + point.count, 0);
  return {
    today: timeline.at(-1)?.count ?? 0,
    total,
    averagePerDay: Math.round(total / Math.max(1, timeline.length)),
  };
}

function number(value: number): string {
  return numberFormat.format(value);
}

function formatPeakHour(value: VehicleHistorySummary['peakHour']): string {
  if (!value || value.count === 0) return '—';
  return `${String(value.hour).padStart(2, '0')}h–${String((value.hour + 1) % 24).padStart(2, '0')}h`;
}

function formatShortDate(value: string): string {
  const [, month, day] = value.split('-');
  return `${day}/${month}`;
}

function formatFullDate(value: string): string {
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}

