export const DEFAULT_SITE_ORIGIN =
  'https://ponte-agora.ilanwendling.chatgpt.site';
export const SITE_NAME = 'Ponte Agora';
export const SITE_TITLE =
  'Fila da Ponte da Amizade Agora | Câmera e Trânsito ao Vivo';
export const SITE_DESCRIPTION =
  'Veja a fila da Ponte da Amizade agora, com câmera ao vivo da BR-277 sentido Paraguai, análise de trânsito por IA e previsão do tempo em Foz do Iguaçu.';

export function resolveSiteOrigin(configured?: string): string {
  if (!configured) return DEFAULT_SITE_ORIGIN;

  try {
    const parsed = new URL(configured);
    const localHttp = parsed.protocol === 'http:' &&
      ['localhost', '127.0.0.1'].includes(parsed.hostname);
    if (parsed.protocol !== 'https:' && !localHttp) return DEFAULT_SITE_ORIGIN;
    return parsed.origin;
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
        'Câmera ao vivo da BR-277 sentido Ponte da Amizade',
        'Análise de congestionamento por inteligência artificial',
        'Clima atual e previsão para hoje e amanhã',
      ],
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'BRL',
      },
    },
  ];
}
