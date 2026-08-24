import type { MetadataRoute } from 'next';
import { resolveSiteOrigin } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  const siteOrigin = resolveSiteOrigin(process.env.SITE_URL);

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/api/'],
    },
    sitemap: `${siteOrigin}/sitemap.xml`,
    host: siteOrigin,
  };
}
