import { NextResponse } from 'next/server';
import { unsubscribeNewsletter } from '@/db/newsletter-repository';
import { verifyNewsletterToken } from '@/lib/newsletter';
import { resolveSiteOrigin } from '@/lib/seo';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const success = await unsubscribe(url.searchParams.get('token') ?? '');
  const origin = resolveSiteOrigin(process.env.SITE_URL || url.origin);
  const target = new URL('/newsletter/gerenciar', origin);
  target.searchParams.set('state', success ? 'unsubscribed' : 'invalid');
  return NextResponse.redirect(target, 303);
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  let token = url.searchParams.get('token') ?? '';
  if (!token) {
    const form = await request.formData().catch(() => null);
    token = String(form?.get('token') ?? '');
  }
  return new NextResponse(null, { status: await unsubscribe(token) ? 204 : 401 });
}

async function unsubscribe(tokenValue: string): Promise<boolean> {
  const token = await verifyNewsletterToken(
    tokenValue,
    process.env.NEWSLETTER_TOKEN_SECRET ?? '',
  );
  if (!token) return false;
  return unsubscribeNewsletter({
    id: token.subscriptionId,
    tokenVersion: token.tokenVersion,
    now: Date.now(),
  });
}
