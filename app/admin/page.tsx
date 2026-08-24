/* eslint-disable @next/next/no-html-link-for-pages -- Vinext Link registra erro de prefetch RSC em produção. */
import type { Metadata } from 'next';
import { getAnalyticsSummary } from '@/db/repository';
import { isAuthorizedAdmin } from '@/lib/admin';
import { chatGPTSignOutPath, requireChatGPTUser } from '../chatgpt-auth';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Histórico de acessos | Ponte Agora',
  robots: { index: false, follow: false },
};

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const user = await requireChatGPTUser('/admin');
  const authorized = isAuthorizedAdmin(user, {
    userIds: process.env.ADMIN_USER_IDS ?? '',
    emails: process.env.ADMIN_EMAILS ?? '',
    development: process.env.NODE_ENV !== 'production',
  });

  if (!authorized) {
    return (
      <main className="access-page">
        <section className="access-card">
          <span className="brand-mark">PA</span>
          <p className="eyebrow">Área protegida</p>
          <h1>Acesso administrativo não autorizado</h1>
          <p>Você entrou como {user.email}, mas esta conta não está na lista de administradores.</p>
          <a className="primary-button" href="/">Voltar ao painel público</a>
        </section>
      </main>
    );
  }

  const params = await searchParams;
  const days = [7, 30, 90].includes(Number(params.days)) ? Number(params.days) : 30;
  const summary = await getAnalyticsSummary(days);
  const timelineMax = Math.max(1, ...summary.timeline.map((item) => item.visits));

  return (
    <main className="admin-shell">
      <header className="admin-topbar">
        <a className="brand" href="/">
          <span className="brand-mark">PA</span>
          <span><strong>Ponte Agora</strong><small>Histórico de acessos</small></span>
        </a>
        <div className="admin-account">
          <span>{user.displayName}</span>
          <a href={chatGPTSignOutPath('/')} className="admin-link">Sair</a>
        </div>
      </header>

      <section className="admin-heading">
        <div>
          <p className="eyebrow">Visão administrativa</p>
          <h1>Quem está acompanhando a ponte?</h1>
          <p>Visitas, origens e dispositivos, sem armazenamento de endereço IP bruto.</p>
        </div>
        <nav className="period-tabs" aria-label="Período do relatório">
          {[7, 30, 90].map((period) => (
            <a key={period} className={period === days ? 'active' : ''} href={`/admin?days=${period}`}>
              {period} dias
            </a>
          ))}
        </nav>
      </section>

      <section className="analytics-metrics" aria-label="Resumo de acessos">
        <MetricCard label={`Visitas reais em ${days} dias`} value={summary.totals.visits} />
        <MetricCard label="Visitantes únicos" value={summary.totals.visitors} />
        <MetricCard label="Visitas hoje" value={summary.today.visits} />
        <MetricCard label="Visitantes hoje" value={summary.today.visitors} />
      </section>

      <p className="analytics-explanation">
        Este relatório conta somente páginas abertas por visitantes. Atualizações automáticas
        de trânsito e clima não entram nestes totais.
      </p>

      <section className="analytics-grid">
        <article className="analytics-card timeline-card">
          <div className="card-heading"><div><span>Evolução</span><h2>Visitas por dia</h2></div><b>{summary.totals.visits} no período</b></div>
          {summary.timeline.length ? (
            <div className="timeline-bars">
              {summary.timeline.map((item) => (
                <div className="timeline-column" key={item.date} title={`${item.date}: ${item.visits} visitas`}>
                  <span className="timeline-value">{item.visits}</span>
                  <i style={{ height: `${Math.max(8, (item.visits / timelineMax) * 100)}%` }} />
                  <small>{shortDate(item.date)}</small>
                </div>
              ))}
            </div>
          ) : <EmptyState text="As primeiras visitas aparecerão aqui." />}
        </article>

        <BreakdownCard title="De onde vieram" subtitle="Origem da visita" items={summary.sources} />
        <BreakdownCard title="Países" subtitle="Localização aproximada" items={summary.countries} />
        <BreakdownCard title="Dispositivos" subtitle="Tipo de acesso" items={summary.devices} />
      </section>

      <section className="analytics-card recent-card">
        <div className="card-heading"><div><span>Atividade</span><h2>Acessos recentes</h2></div><b>Últimos 12</b></div>
        {summary.recent.length ? (
          <div className="recent-table" role="table" aria-label="Acessos recentes">
            <div className="recent-row recent-header" role="row"><span>Horário</span><span>Página</span><span>Origem</span><span>País</span><span>Dispositivo</span></div>
            {summary.recent.map((visit, index) => (
              <div className="recent-row" role="row" key={`${visit.occurredAt}-${index}`}>
                <span>{formatDateTime(visit.occurredAt)}</span><span>{visit.path}</span><span>{visit.source}</span><span>{visit.country}</span><span>{visit.device}</span>
              </div>
            ))}
          </div>
        ) : <EmptyState text="Nenhum acesso registrado ainda." />}
      </section>

      <p className="privacy-note">
        Privacidade: os identificadores são hashes protegidos e o endereço IP original não é salvo.
      </p>
    </main>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return <article><span>{label}</span><strong>{value.toLocaleString('pt-BR')}</strong></article>;
}

function BreakdownCard({
  title,
  subtitle,
  items,
}: {
  title: string;
  subtitle: string;
  items: Array<{ label: string; value: number }>;
}) {
  const max = Math.max(1, ...items.map((item) => item.value));
  return (
    <article className="analytics-card breakdown-card">
      <div className="card-heading"><div><span>{subtitle}</span><h2>{title}</h2></div></div>
      {items.length ? items.map((item) => (
        <div className="breakdown-row" key={item.label}>
          <div><span>{item.label}</span><strong>{item.value}</strong></div>
          <i><b style={{ width: `${(item.value / max) * 100}%` }} /></i>
        </div>
      )) : <EmptyState text="Sem dados neste período." />}
    </article>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className="empty-state">{text}</p>;
}

function shortDate(value: string): string {
  const [, month, day] = value.split('-');
  return `${day}/${month}`;
}

function formatDateTime(value: number): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date(value));
}
