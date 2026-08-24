/* eslint-disable @next/next/no-html-link-for-pages -- Vinext Link registra erro de prefetch RSC em produção. */
import type { Metadata } from 'next';
import { NewsletterManager } from '@/app/components/newsletter-manager';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Gerenciar newsletter | Ponte Agora',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

export default async function NewsletterManagePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; state?: string }>;
}) {
  const params = await searchParams;
  return (
    <main className="newsletter-manage-page">
      <header className="newsletter-manage-topbar">
        <a className="brand" href="/">
          <span className="brand-mark">PA</span>
          <span><strong>Ponte Agora</strong><small>Preferências da newsletter</small></span>
        </a>
        <a className="admin-link" href="/">Ver trânsito agora</a>
      </header>
      <section className="newsletter-manage-card">
        <NewsletterManager
          token={(params.token ?? '').slice(0, 800)}
          initialState={(params.state ?? '').slice(0, 30)}
        />
      </section>
    </main>
  );
}
