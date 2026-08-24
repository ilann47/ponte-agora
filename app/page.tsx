import { LiveMonitor } from './components/live-monitor';
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

      <LiveMonitor source={STREAM_URL} />

      <WeatherPanel />

      <footer>
        <span>Ponte Agora</span>
        <p>Informação para planejamento. Dirija com atenção e respeite a sinalização. · <a href="/privacidade">Privacidade</a></p>
      </footer>
      <VisitTracker />
    </main>
  );
}
