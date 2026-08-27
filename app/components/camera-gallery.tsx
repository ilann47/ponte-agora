'use client';

import { useState } from 'react';
import { EMBEDDED_CAMERAS, PRIMARY_CAMERA } from '@/lib/cameras';

export function CameraGallery() {
  const [activeId, setActiveId] = useState(EMBEDDED_CAMERAS[0].id);
  const activeCamera = EMBEDDED_CAMERAS.find((camera) => camera.id === activeId)
    ?? EMBEDDED_CAMERAS[0];

  return (
    <section className="camera-gallery-section" id="cameras" aria-labelledby="camera-gallery-title">
      <div className="section-heading camera-gallery-heading">
        <div>
          <p className="eyebrow">Fronteira em vários ângulos</p>
          <h2 id="camera-gallery-title">Todas as câmeras em uma única tela</h2>
        </div>
        <div className="camera-count"><i /> 9 pontos ao vivo</div>
      </div>

      <div className="camera-gallery-layout">
        <article className="camera-viewer">
          <div className="camera-embed-shell">
            <iframe
              key={activeCamera.id}
              src={activeCamera.embedUrl}
              title={`Câmera ao vivo: ${activeCamera.name}`}
              loading="lazy"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
            <span className="camera-viewer-live"><i /> AO VIVO</span>
          </div>
          <div className="camera-viewer-caption">
            <div>
              <span>{activeCamera.location}</span>
              <h3>{activeCamera.name}</h3>
            </div>
            <a href={activeCamera.sourceUrl} target="_blank" rel="noreferrer">
              Fonte: {activeCamera.provider} <span aria-hidden="true">↗</span>
            </a>
          </div>
        </article>

        <aside className="camera-selector" aria-label="Escolher câmera">
          <div className="camera-selector-heading">
            <strong>Escolha a visão</strong>
            <span>Uma transmissão por vez</span>
          </div>

          <a className="camera-option camera-option-primary" href="#camera">
            <span className="camera-option-index">01</span>
            <span className="camera-option-copy">
              <strong>{PRIMARY_CAMERA.name}</strong>
              <small>{PRIMARY_CAMERA.location}</small>
            </span>
            <span className="camera-option-badge">Principal + IA</span>
          </a>

          {EMBEDDED_CAMERAS.map((camera, index) => (
            <button
              className="camera-option"
              type="button"
              key={camera.id}
              aria-pressed={camera.id === activeCamera.id}
              onClick={() => setActiveId(camera.id)}
            >
              <span className="camera-option-index">{String(index + 2).padStart(2, '0')}</span>
              <span className="camera-option-copy">
                <strong>{camera.name}</strong>
                <small>{camera.location}</small>
              </span>
              <span className="camera-option-arrow" aria-hidden="true">→</span>
            </button>
          ))}
        </aside>
      </div>

      <div className="camera-gallery-note">
        <p>
          <strong>A análise por IA continua exclusiva da câmera principal.</strong>{' '}
          As outras visões são transmissões externas e podem ficar indisponíveis na origem.
        </p>
        <p>
          Imagens fornecidas por Portal da Cidade, Atacado Connect e Mega Eletrônicos.
          O Fila Ponte apenas organiza os players e não armazena as gravações.
        </p>
      </div>
    </section>
  );
}
