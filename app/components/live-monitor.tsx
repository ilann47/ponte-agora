'use client';

import { useEffect, useState } from 'react';
import type { TrafficReading } from '@/lib/traffic';
import { HlsPlayer } from './hls-player';
import { TrafficPanel } from './traffic-panel';

export type TrafficResponse = {
  reading: (TrafficReading & { receivedAt: number }) | null;
  online: boolean;
};

export function LiveMonitor({ source }: { source: string }) {
  const [state, setState] = useState<TrafficResponse>({ reading: null, online: false });

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const response = await fetch('/api/traffic', { cache: 'no-store' });
        if (!response.ok) return;
        const next = await response.json() as TrafficResponse;
        if (active) setState(next);
      } catch {
        if (active) setState((current) => ({ ...current, online: false }));
      }
    };

    void refresh();
    const timer = window.setInterval(refresh, 1_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  return (
    <section className="monitor-grid" aria-label="Monitoramento da rodovia">
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
          <span>BR-277</span>
          <strong>Sentido Ponte da Amizade</strong>
        </div>
      </article>

      <TrafficPanel state={state} />
    </section>
  );
}
