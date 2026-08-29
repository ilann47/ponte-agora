'use client';

import { useEffect, useState } from 'react';
import type { TrafficReading } from '@/lib/traffic';
import { HlsPlayer } from './hls-player';
import { TrafficPanel } from './traffic-panel';

export type TrafficResponse = {
  reading: (TrafficReading & { receivedAt: number }) | null;
  online: boolean;
};

export function LiveMonitor({
  source,
  initialState = { reading: null, online: false },
}: {
  source: string;
  initialState?: TrafficResponse;
}) {
  const [state, setState] = useState<TrafficResponse>(initialState);

  useEffect(() => {
    let active = true;
    let refreshing = false;
    const refresh = async () => {
      if (!active || refreshing || document.hidden) return;
      refreshing = true;
      try {
        const response = await fetch('/api/traffic', { cache: 'no-store' });
        if (!response.ok) return;
        const next = await response.json() as TrafficResponse;
        if (active) setState(next);
      } catch {
        if (active) setState((current) => ({ ...current, online: false }));
      } finally {
        refreshing = false;
      }
    };

    void refresh();
    const timer = window.setInterval(refresh, 2_000);
    const resume = () => {
      if (!document.hidden) void refresh();
    };
    document.addEventListener('visibilitychange', resume);
    return () => {
      active = false;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', resume);
    };
  }, []);

  return (
    <section className="monitor-grid" id="camera" aria-label="Câmera e trânsito da Aduana da Ponte da Amizade agora">
      <article className="video-card">
        <HlsPlayer source={source} reading={state.reading} detectorOnline={state.online} />
        <div className="video-shade" aria-hidden="true" />
        <div className="camera-meta">
          <span className="camera-live"><i /> AO VIVO</span>
          <span className={state.online ? 'ai-status ai-online' : 'ai-status'}>
            <i /> {state.online ? `IA · ${state.reading?.detections.length ?? 0} itens` : 'IA offline'}
          </span>
        </div>
        <div className="video-caption">
          <span>BR-277 · Aduana brasileira</span>
          <strong>Sentido Ponte da Amizade</strong>
        </div>
      </article>

      <TrafficPanel state={state} />
    </section>
  );
}
