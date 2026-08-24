import type { TrafficReading } from '@/lib/traffic';
import type { TrafficResponse } from './live-monitor';

export function TrafficPanel({ state }: { state: TrafficResponse }) {
  const reading = state.reading;
  const score = reading?.score ?? 0;
  const level = state.online && reading ? reading.level : 'Aguardando';
  const statusClass = state.online ? `traffic-${reading?.level.toLowerCase()}` : 'traffic-offline';

  return (
    <aside className={`traffic-panel ${statusClass}`}>
      <div className="traffic-heading">
        <div>
          <p className="eyebrow">Situação atual</p>
          <h2>{level}</h2>
        </div>
        <div className="score-ring" aria-label={`Fila em ${score} por cento`}>
          <strong>{reading ? score : '—'}</strong><span>%</span>
        </div>
      </div>

      <div className="traffic-bar" aria-hidden="true">
        <span style={{ width: `${score}%` }} />
      </div>
      <p className="traffic-summary">
        {state.online
          ? trafficSummary(reading?.level)
          : 'O vídeo continua ao vivo. Aguardando a próxima leitura do detector local.'}
      </p>

      <dl className="metric-grid">
        <div><dt>Veículos</dt><dd>{reading?.vehicleCount ?? '—'}</dd></div>
        <div><dt>Ocupação</dt><dd>{reading ? `${(reading.occupancy * 100).toFixed(1)}%` : '—'}</dd></div>
        <div><dt>Vídeo</dt><dd>{reading ? `${reading.videoFps.toFixed(1)} FPS` : '—'}</dd></div>
        <div><dt>Leitura IA</dt><dd>{reading ? `${reading.inferenceFps.toFixed(1)} FPS` : '—'}</dd></div>
      </dl>

      <p className="panel-note">
        <i /> {state.online ? `Atualizado ${formatObserved(reading?.observedAt)}` : 'Detector temporariamente offline'}
      </p>
    </aside>
  );
}

function trafficSummary(level: TrafficReading['level'] | undefined): string {
  if (level === 'Livre') return 'Fluxo normal, sem retenção relevante na área monitorada.';
  if (level === 'Moderado') return 'Movimento acima do normal, ainda com circulação contínua.';
  if (level === 'Intenso') return 'Fluxo intenso e possibilidade de lentidão no sentido da ponte.';
  return 'Congestionamento detectado. Planeje tempo adicional para a travessia.';
}

function formatObserved(value: string | undefined): string {
  if (!value) return 'agora';
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date(value));
}
