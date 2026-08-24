import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Como funciona a análise da fila | Ponte Agora',
  description:
    'Entenda como a câmera da BR-277 e a inteligência artificial estimam o movimento no sentido da Ponte da Amizade.',
  alternates: { canonical: '/como-funciona' },
};

export default function HowItWorksPage() {
  return (
    <main className="content-shell">
      <header className="topbar content-topbar">
        <Link className="brand" href="/">
          <span className="brand-mark">PA</span>
          <span><strong>Ponte Agora</strong><small>Voltar para a câmera</small></span>
        </Link>
        <Link className="primary-button compact-button" href="/#camera">Ver trânsito agora</Link>
      </header>

      <article className="methodology-article">
        <header>
          <p className="eyebrow">Metodologia</p>
          <h1>Como a IA analisa o trânsito para a Ponte da Amizade</h1>
          <p className="article-lead">
            O Ponte Agora transforma a imagem ao vivo da BR-277 em um indicador
            simples de movimento, preservando o vídeo original e mostrando o que
            foi reconhecido pela inteligência artificial.
          </p>
        </header>

        <section>
          <span className="article-number">01</span>
          <div>
            <h2>A câmera acompanha o sentido Paraguai</h2>
            <p>
              O vídeo mostra o acesso brasileiro à Ponte Internacional da Amizade,
              na BR-277, saindo de Foz do Iguaçu em direção a Ciudad del Este. As
              imagens ao vivo são fornecidas pelo Portal da Cidade.
            </p>
          </div>
        </section>

        <section>
          <span className="article-number">02</span>
          <div>
            <h2>A análise considera somente a área da pista</h2>
            <p>
              Uma região de interesse, marcada sobre o vídeo, limita a leitura à
              faixa relevante. O detector procura carros, motos, ônibus e caminhões
              e mostra a probabilidade atribuída a cada identificação.
            </p>
          </div>
        </section>

        <section>
          <span className="article-number">03</span>
          <div>
            <h2>Veículos e ocupação formam o indicador</h2>
            <p>
              A quantidade detectada e a parcela da pista ocupada são combinadas e
              suavizadas para evitar mudanças bruscas. O resultado é classificado
              como Livre, Moderado, Intenso ou Congestionado.
            </p>
          </div>
        </section>

        <aside className="method-warning">
          <p className="eyebrow">Limites da leitura</p>
          <h2>O monitor não mede diretamente a fila da imigração ou da fiscalização.</h2>
          <p>
            Chuva forte, veículos encobertos, mudanças no enquadramento e retenções
            fora da câmera podem afetar a estimativa. Use a informação para
            planejamento e confirme as condições na imagem ao vivo.
          </p>
        </aside>

        <section>
          <span className="article-number">04</span>
          <div>
            <h2>Clima e trânsito são fontes independentes</h2>
            <p>
              A previsão usa dados do Open-Meteo para Foz do Iguaçu e é atualizada
              separadamente. O clima pode ajudar no planejamento, mas não altera a
              classificação visual da pista.
            </p>
          </div>
        </section>

        <footer className="article-footer">
          <Link className="primary-button" href="/#camera">Abrir câmera ao vivo</Link>
          <Link className="admin-link" href="/privacidade">Política de privacidade</Link>
        </footer>
      </article>
    </main>
  );
}
