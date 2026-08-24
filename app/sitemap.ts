import type { MetadataRoute } from 'next';
import { resolveSiteOrigin } from '@/lib/seo';

export default function sitemap(): MetadataRoute.Sitemap {
  const siteOrigin = resolveSiteOrigin(process.env.SITE_URL);
  const lastModified = new Date('2026-08-23T12:00:00-03:00');

  return [
    {
      url: `${siteOrigin}/`,
      lastModified,
      changeFrequency: 'hourly',
      priority: 1,
    },
    {
      url: `${siteOrigin}/como-funciona`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
  ];
}
