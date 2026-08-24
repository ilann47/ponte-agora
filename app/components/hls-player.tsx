'use client';

import Hls from 'hls.js';
import { useEffect, useRef, useState } from 'react';

export function HlsPlayer({ source }: { source: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = source;
      void video.play().catch(() => undefined);
      return;
    }

    if (!Hls.isSupported()) {
      const unsupportedTimer = window.setTimeout(() => setError(true), 0);
      return () => window.clearTimeout(unsupportedTimer);
    }

    const hls = new Hls({
      lowLatencyMode: true,
      liveSyncDurationCount: 2,
      liveMaxLatencyDurationCount: 5,
    });
    hls.loadSource(source);
    hls.attachMedia(video);
    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      setError(false);
      void video.play().catch(() => undefined);
    });
    hls.on(Hls.Events.ERROR, (_event, data) => {
      if (!data.fatal) return;
      if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
        hls.startLoad();
      } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
        hls.recoverMediaError();
      } else {
        setError(true);
      }
    });

    return () => hls.destroy();
  }, [source]);

  return (
    <>
      <video
        ref={videoRef}
        className="live-video"
        controls
        muted
        autoPlay
        playsInline
        aria-label="Câmera ao vivo da BR-277 no sentido Ponte da Amizade"
      />
      {error ? (
        <p className="video-error" role="status">
          Não foi possível carregar a câmera. Tentaremos novamente em instantes.
        </p>
      ) : null}
    </>
  );
}
