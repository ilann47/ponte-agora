import { getTrafficState, getVehicleHistorySummary } from '@/db/repository';
import {
  buildSiteStructuredData,
  resolveSiteOrigin,
} from '@/lib/seo';
import { isTrafficFresh } from '@/lib/traffic';
import { GOOGLE_MAPS_CROSSING_ROUTE_URL } from '@/lib/maps-route';
import { fozVehicleBucket, summarizeVehicleHistory } from '@/lib/vehicle-history';
import { LiveMonitor } from './components/live-monitor';
import { NewsletterForm } from './components/newsletter-form';
import { VisitTracker } from './components/visit-tracker';
import { VehicleHistoryChart } from './components/vehicle-history-chart';
import { WeatherPanel } from './components/weather-panel';

const STREAM_URL =
  'https://video02.logicahost.com.br/portaldacidade/fozsentidopontedaamizade01.stream/chunklist_w121647601.m3u8';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const [reading, vehicleHistory] = await Promise.all([
    getTrafficState().catch(() => null),
    getVehicleHistorySummary(30).catch(() => emptyVehicleHistory()),
  ]);
  const initialTraffic = {
    reading,
    online: isTrafficFresh(reading?.receivedAt),
  };
  const structuredData = buildSiteStructuredData(
    resolveSiteOrigin(process.env.SITE_URL),
  );
  const newsletterEnabled = Boolean(
    process.env.BREVO_API_KEY
    && process.env.NEWSLETTER_FROM_EMAIL
    && process.env.NEWSLETTER_TOKEN_SECRET
    && process.env.NEWSLETTER_CRON_SECRET,
  );

  return (
    <main className="site-shell">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, '\\u003c'),
        }}
      />
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
          <a className="nav-link" href="/como-funciona">Como funciona</a>
          {newsletterEnabled && <a className="nav-link" href="#newsletter">Resumo por e-mail</a>}
          <a className="admin-link" href="/admin">Histórico de acessos</a>
        </nav>
      </header>

      <section className="hero" id="inicio">
        <div className="hero-copy">
          <p className="eyebrow">Trânsito em tempo real</p>
          <h1>Fila da Ponte da Amizade agora</h1>
          <p className="hero-description">
            Veja a câmera ao vivo da BR-277 no sentido Paraguai, o volume de
            veículos analisado por IA e a previsão do tempo em Foz do Iguaçu.
          </p>
        </div>
        <div className="updated-at">
          <span>Atualização automática</span>
          <strong>a cada 2 segundos</strong>
        </div>
      </section>

      <LiveMonitor source={STREAM_URL} initialState={initialTraffic} />

      <section className="crossing-route-section" aria-labelledby="crossing-route-title">
        <div className="crossing-route-copy">
          <p className="eyebrow">Tempo de travessia</p>
          <h2 id="crossing-route-title">Veja a estimativa atual no Google Maps</h2>
          <p>
            A rota já abre pronta da aduana brasileira até a aduana paraguaia,
            considerando o trânsito informado pelo Google no momento da consulta.
          </p>
        </div>
        <div className="crossing-route-action">
          <div className="crossing-route-points" aria-label="Trecho consultado">
            <span><i /> Aduana brasileira</span>
            <b aria-hidden="true">→</b>
            <span><i /> Aduana paraguaia</span>
          </div>
          <a
            className="maps-button"
            href={GOOGLE_MAPS_CROSSING_ROUTE_URL}
            target="_blank"
            rel="noreferrer"
          >
            Ver tempo agora no Google Maps <span aria-hidden="true">↗</span>
          </a>
          <small>Gratuito, sem cadastro no Ponte Agora e sem instalar nada.</small>
        </div>
      </section>

      <VehicleHistoryChart initialSummary={vehicleHistory} />

      <WeatherPanel />

      {newsletterEnabled && <NewsletterForm />}

      <section className="information-section" aria-labelledby="ponte-agora-title">
        <div className="section-heading information-heading">
          <div>
            <p className="eyebrow">Planeje sua travessia</p>
            <h2 id="ponte-agora-title">Trânsito da Ponte da Amizade em uma única tela</h2>
          </div>
          <p>
            O monitor combina imagem ao vivo, leitura automatizada dos veículos
            e clima para ajudar quem segue de Foz do Iguaçu para Ciudad del Este.
          </p>
        </div>
        <div className="information-grid">
          <article>
            <span>01</span>
            <h3>Câmera ao vivo sentido Paraguai</h3>
            <p>Acompanhe a pista da BR-277 que leva à aduana e à Ponte Internacional da Amizade.</p>
          </article>
          <article>
            <span>02</span>
            <h3>Análise de trânsito por IA</h3>
            <p>Carros, motos, ônibus e caminhões são identificados dentro da área monitorada.</p>
          </article>
          <article>
            <span>03</span>
            <h3>Clima hoje e amanhã</h3>
            <p>Consulte temperatura, chuva e vento antes de sair para a fronteira.</p>
          </article>
        </div>
        <div className="method-callout">
          <div>
            <p className="eyebrow">Transparência</p>
            <h2>O indicador é uma estimativa visual, não um tempo oficial de espera.</h2>
          </div>
          <a className="primary-button" href="/como-funciona">
            Entenda como calculamos
          </a>
        </div>
      </section>

      <section className="faq-section" id="duvidas" aria-labelledby="faq-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Dúvidas frequentes</p>
            <h2 id="faq-title">Antes de atravessar para o Paraguai</h2>
          </div>
        </div>
        <div className="faq-list">
          <details>
            <summary>A câmera mostra qual sentido da Ponte da Amizade?</summary>
            <p>Ela mostra a BR-277 no sentido da Ponte da Amizade, saindo de Foz do Iguaçu em direção ao Paraguai.</p>
          </details>
          <details>
            <summary>O percentual representa o tempo de espera na aduana?</summary>
            <p>Não. O percentual representa o nível de ocupação visual da pista monitorada. Fiscalização e imigração podem acrescentar espera que a câmera não enxerga.</p>
          </details>
          <details>
            <summary>Com que frequência o trânsito é atualizado?</summary>
            <p>O vídeo é contínuo e a página recebe uma nova leitura da inteligência artificial a cada poucos segundos enquanto o detector está conectado.</p>
          </details>
          <details>
            <summary>As informações são gratuitas?</summary>
            <p>Sim. O Ponte Agora pode ser consultado gratuitamente pelo navegador, sem cadastro.</p>
          </details>
          <details>
            <summary>Como vejo o tempo estimado para atravessar a ponte?</summary>
            <p>Use o botão “Ver tempo agora no Google Maps”. A rota abre da aduana brasileira até a aduana paraguaia e o próprio Google informa a duração atual conforme o trânsito disponível.</p>
          </details>
          {newsletterEnabled && (
            <details>
              <summary>Posso receber o trânsito e a previsão por e-mail?</summary>
              <p>Sim. Escolha um horário no resumo diário, confirme seu e-mail e altere ou cancele quando quiser pelo link de gestão.</p>
            </details>
          )}
        </div>
      </section>

      <footer>
        <div className="footer-identity">
          <span>Ponte Agora</span>
          <p>
            Desenvolvido por hobby por{' '}
            <a
              href="https://ilan-wendling-portfolio.ilanwendling.chatgpt.site"
              target="_blank"
              rel="noreferrer"
            >
              Ilan Wendling Thoele
            </a>
          </p>
        </div>
        <nav className="footer-links" aria-label="Links do projeto e do desenvolvedor">
          <a href="/como-funciona">Como funciona</a>
          <a href="/privacidade">Privacidade</a>
          <a
            href="https://ilan-wendling-portfolio.ilanwendling.chatgpt.site"
            target="_blank"
            rel="noreferrer"
          >
            Portfólio <span aria-hidden="true">↗</span>
          </a>
          <a href="https://github.com/ilann47" target="_blank" rel="noreferrer">
            GitHub <span aria-hidden="true">↗</span>
          </a>
          <a
            href="https://www.linkedin.com/in/ilan-wendling-thoele"
            target="_blank"
            rel="noreferrer"
          >
            LinkedIn <span aria-hidden="true">↗</span>
          </a>
        </nav>
        <p className="footer-note">
          Informação para planejamento. Dirija com atenção e respeite a sinalização.
        </p>
      </footer>
      <VisitTracker />
    </main>
  );
}

function emptyVehicleHistory() {
  return summarizeVehicleHistory({
    daily: [],
    todayHourly: [],
    periodDays: 30,
    endDate: fozVehicleBucket(new Date()).date,
  });
}
