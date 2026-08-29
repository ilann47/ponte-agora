'use client';

import Hls from 'hls.js';
import { useEffect, useRef, useState } from 'react';
import {
  formatDetectionLabel,
  projectNormalizedBox,
  projectNormalizedPoint,
} from '@/lib/detection-overlay';
import { DEFAULT_ROI, type TrafficReading } from '@/lib/traffic';

export function HlsPlayer({
  source,
  reading,
  detectorOnline,
  showDetails,
}: {
  source: string;
  reading: TrafficReading | null;
  detectorOnline: boolean;
  showDetails: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const draw = () => drawOverlay(canvas, reading, detectorOnline, showDetails);
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    draw();
    return () => observer.disconnect();
  }, [reading, detectorOnline, showDetails]);

  return (
    <>
      <video
        ref={videoRef}
        className="live-video"
        controls
        muted
        autoPlay
        playsInline
        aria-label="Câmera ao vivo da BR-277 na Aduana da Ponte da Amizade"
      />
      <canvas
        ref={canvasRef}
        className="detection-overlay"
        aria-label="ROI e veículos identificados pela inteligência artificial"
      />
      {error ? (
        <p className="video-error" role="status">
          Não foi possível carregar a câmera. Tentaremos novamente em instantes.
        </p>
      ) : null}
    </>
  );
}

function drawOverlay(
  canvas: HTMLCanvasElement,
  reading: TrafficReading | null,
  detectorOnline: boolean,
  showDetails: boolean,
) {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (width <= 0 || height <= 0) return;

  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * pixelRatio);
  canvas.height = Math.round(height * pixelRatio);
  const context = canvas.getContext('2d');
  if (!context) return;
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  context.clearRect(0, 0, width, height);

  const roi = reading?.roi ?? DEFAULT_ROI;
  if (roi.length >= 3) {
    const [firstX, firstY] = projectNormalizedPoint(roi[0], width, height);
    context.beginPath();
    context.moveTo(firstX, firstY);
    for (const point of roi.slice(1)) {
      const [x, y] = projectNormalizedPoint(point, width, height);
      context.lineTo(x, y);
    }
    context.closePath();
    context.fillStyle = 'rgba(210, 72, 255, 0.035)';
    context.fill();
    context.strokeStyle = detectorOnline ? '#e05dff' : 'rgba(224, 93, 255, 0.55)';
    context.lineWidth = 1.5;
    context.stroke();
    if (showDetails) {
      drawLabel(context, 'ROI · PONTE', firstX, firstY + 8, '#e56dff', false);
    }
  }

  if (!detectorOnline || !reading) return;
  for (const detection of reading.detections) {
    const [x1, y1, x2, y2] = projectNormalizedBox(detection.box, width, height);
    const boxWidth = x2 - x1;
    const boxHeight = y2 - y1;
    context.strokeStyle = 'rgba(98, 239, 138, 0.9)';
    context.lineWidth = Math.max(1.25, width / 760);
    context.strokeRect(x1, y1, boxWidth, boxHeight);
    drawLabel(
      context,
      formatDetectionLabel(detection.label, detection.confidence, showDetails),
      x1 + 2,
      y1 + 2,
      '#62ef8a',
      !showDetails,
    );
  }
}

function drawLabel(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  color: string,
  compact: boolean,
) {
  const fontSize = compact
    ? Math.max(8, Math.min(10, context.canvas.clientWidth / 100))
    : Math.max(10, Math.min(13, context.canvas.clientWidth / 85));
  context.font = `800 ${fontSize}px Arial, sans-serif`;
  const paddingX = compact ? 4 : 5;
  const labelWidth = context.measureText(text).width + paddingX * 2;
  const labelHeight = fontSize + (compact ? 5 : 7);
  const labelY = compact
    ? Math.min(Math.max(0, y), context.canvas.clientHeight - labelHeight)
    : Math.max(0, y - labelHeight);
  const labelX = Math.min(Math.max(0, x), context.canvas.clientWidth - labelWidth);
  context.fillStyle = compact ? 'rgba(5, 18, 14, 0.66)' : 'rgba(5, 18, 14, 0.82)';
  context.fillRect(labelX, labelY, labelWidth, labelHeight);
  context.fillStyle = color;
  context.fillText(text, labelX + paddingX, labelY + fontSize + 1);
}
