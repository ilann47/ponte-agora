export const DEFAULT_SITE_ORIGIN =
  'https://filaponte.com.br';
export const SITE_NAME = 'Ponte Agora';
export const SITE_TITLE =
  'Fila da Ponte da Amizade Agora | 9 Câmeras ao Vivo';
export const SITE_DESCRIPTION =
  'Veja nove câmeras ao vivo da fronteira, incluindo a BR-277 sentido Paraguai com análise por IA, clima e trânsito da Ponte da Amizade em Foz do Iguaçu.';

export function resolveSiteOrigin(configured?: string): string {
  if (!configured) return DEFAULT_SITE_ORIGIN;

  try {
    const parsed = new URL(configured);
    const localHttp = parsed.protocol === 'http:' &&
      ['localhost', '127.0.0.1'].includes(parsed.hostname);
    if (localHttp) return parsed.origin;
    if (
      parsed.protocol === 'https:' &&
      parsed.hostname === 'filaponte.com.br'
    ) return DEFAULT_SITE_ORIGIN;
    return DEFAULT_SITE_ORIGIN;
  } catch {
    return DEFAULT_SITE_ORIGIN;
  }
}

export function buildSiteStructuredData(
  siteOrigin: string,
): Array<Record<string, unknown>> {
  const url = `${siteOrigin}/`;

  return [
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      '@id': `${url}#website`,
      name: SITE_NAME,
      alternateName: 'Fila da Ponte da Amizade Agora',
      url,
      description: SITE_DESCRIPTION,
      inLanguage: 'pt-BR',
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      '@id': `${url}#aplicacao`,
      name: SITE_NAME,
      url,
      description: SITE_DESCRIPTION,
      applicationCategory: 'TravelApplication',
      operatingSystem: 'Qualquer sistema com navegador moderno',
      browserRequirements: 'JavaScript e reprodução de vídeo HLS',
      isAccessibleForFree: true,
      inLanguage: 'pt-BR',
      areaServed: ['Foz do Iguaçu', 'Ciudad del Este'],
      featureList: [
        'Nove câmeras ao vivo da fronteira entre Brasil, Paraguai e Argentina',
        'Câmera principal da BR-277 sentido Ponte da Amizade',
        'Análise de congestionamento por inteligência artificial',
        'Clima atual e previsão para hoje e amanhã',
        'Resumo diário de clima e trânsito por e-mail',
      ],
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'BRL',
      },
    },
  ];
}
