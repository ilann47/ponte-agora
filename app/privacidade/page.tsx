/* eslint-disable @next/next/no-html-link-for-pages -- Vinext Link registra erro de prefetch RSC em produção. */
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacidade | Ponte Agora',
  robots: { index: false, follow: true },
};

export default function PrivacyPage() {
  return (
    <main className="access-page">
      <article className="privacy-card">
        <a className="brand" href="/">
          <span className="brand-mark">PA</span>
          <span><strong>Ponte Agora</strong><small>Voltar ao painel</small></span>
        </a>
        <p className="eyebrow">Privacidade</p>
        <h1>Estatísticas úteis, sem guardar seu IP.</h1>
        <p>
          Registramos o horário da visita, a página acessada, o domínio de origem,
          campanhas identificadas por UTM, país aproximado e tipo de dispositivo.
          Esses dados ajudam a entender o uso do painel.
        </p>
        <p>
          O endereço IP não é armazenado. Ele é transformado imediatamente em um
          identificador protegido, usado somente para evitar contagem duplicada.
          Os registros são removidos após 180 dias.
        </p>
        <p>
          Não usamos os dados para publicidade, não criamos perfis individuais e
          não vendemos informações de visitantes.
        </p>
        <a className="primary-button" href="/">Voltar para a câmera ao vivo</a>
      </article>
    </main>
  );
}
