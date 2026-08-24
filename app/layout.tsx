import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import {
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TITLE,
  resolveSiteOrigin,
} from '@/lib/seo';
import './globals.css';

const siteOrigin = resolveSiteOrigin(process.env.SITE_URL);

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  alternates: { canonical: '/' },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  verification: process.env.GOOGLE_SITE_VERIFICATION
    ? { google: process.env.GOOGLE_SITE_VERIFICATION }
    : undefined,
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: '/',
    type: 'website',
    locale: 'pt_BR',
    siteName: SITE_NAME,
    images: [
      {
        url: '/og.png',
        width: 1729,
        height: 910,
        alt: 'Ponte Agora — trânsito e clima na Ponte da Amizade',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://video02.logicahost.com.br" />
        <link rel="dns-prefetch" href="https://video02.logicahost.com.br" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        {children}
      </body>
    </html>
  );
}
