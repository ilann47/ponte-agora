import { HlsPlayer } from './components/hls-player';
import { TrafficPanel } from './components/traffic-panel';
import { VisitTracker } from './components/visit-tracker';
import { WeatherPanel } from './components/weather-panel';

const STREAM_URL =
  'https://video02.logicahost.com.br/portaldacidade/fozsentidopontedaamizade01.stream/chunklist_w121647601.m3u8';

export default function Home() {
  return (
    <main className="site-shell">
      <header className="topbar">
        <a className="brand" href="#inicio" aria-label="Ponte Agora — início">
          <span className="brand-mark">PA</span>
          <span>
            <strong>Ponte Agora</strong>
            <small>Foz do Iguaçu · BR-277</small>
          </span>
        </a>

        <nav className="topbar-actions" aria-label="Navegação principal">
          <span className="live-pill"><i /> Câmera ao vivo</span>
          <a className="admin-link" href="/admin">Histórico de acessos</a>
        </nav>
      </header>

      <section className="hero" id="inicio">
        <div className="hero-copy">
          <p className="eyebrow">Trânsito em tempo real</p>
          <h1>Como está a fila para a Ponte da Amizade?</h1>
          <p className="hero-description">
            Acompanhe a pista no sentido Paraguai, o volume de veículos e a
            previsão do tempo em uma única tela.
          </p>
        </div>
        <div className="updated-at">
          <span>Atualização automática</span>
          <strong>a cada 2 segundos</strong>
        </div>
      </section>

      <section className="monitor-grid" aria-label="Monitoramento da rodovia">
        <article className="video-card">
          <HlsPlayer source={STREAM_URL} />
          <div className="video-shade" aria-hidden="true" />
          <div className="camera-meta">
            <span className="camera-live"><i /> AO VIVO</span>
            <span>Portal da Cidade</span>
          </div>
          <div className="video-caption">
            <span>BR-277</span>
            <strong>Sentido Ponte da Amizade</strong>
          </div>
        </article>

        <TrafficPanel />
      </section>

      <WeatherPanel />

      <footer>
        <span>Ponte Agora</span>
        <p>Informação para planejamento. Dirija com atenção e respeite a sinalização. · <a href="/privacidade">Privacidade</a></p>
      </footer>
      <VisitTracker />
    </main>
  );
}
