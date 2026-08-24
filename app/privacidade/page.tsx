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
        <h1>Informação útil com o mínimo de dados.</h1>
        <h2>Estatísticas de acesso</h2>
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
        <h2>Newsletter diária</h2>
        <p>
          Quando você se inscreve, guardamos seu e-mail, o horário escolhido no
          fuso de Foz do Iguaçu, o estado da confirmação e a data do último envio.
          Usamos esses dados somente para entregar o resumo de clima e trânsito.
        </p>
        <p>
          A newsletter só começa depois da confirmação enviada ao seu endereço.
          Pedidos não confirmados são apagados após 7 dias. Ao cancelar pelo link
          presente em cada mensagem, a assinatura e o e-mail são removidos.
        </p>
        <p>
          Para evitar abuso, mantemos por até 2 dias um identificador irreversível
          da conexão e registros técnicos sem o endereço de e-mail. O histórico
          agregado do trânsito é conservado por 31 dias e não identifica pessoas.
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
