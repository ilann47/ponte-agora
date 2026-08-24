import { NextResponse } from 'next/server';
import { confirmNewsletterSubscription } from '@/db/newsletter-repository';
import { verifyNewsletterToken } from '@/lib/newsletter';
import { resolveSiteOrigin } from '@/lib/seo';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const origin = resolveSiteOrigin(process.env.SITE_URL || requestUrl.origin);
  const token = requestUrl.searchParams.get('token') ?? '';
  const secret = process.env.NEWSLETTER_TOKEN_SECRET ?? '';
  const verified = await verifyNewsletterToken(token, secret);
  if (!verified) return redirect(origin, token, 'invalid');

  const result = await confirmNewsletterSubscription(
    verified.subscriptionId,
    verified.tokenVersion,
    Date.now(),
  );
  const state = result === 'confirmed' || result === 'already-active'
    ? 'confirmed'
    : result;
  return redirect(origin, token, state);
}

function redirect(origin: string, token: string, state: string) {
  const target = new URL('/newsletter/gerenciar', origin);
  if (token) target.searchParams.set('token', token);
  target.searchParams.set('state', state);
  return NextResponse.redirect(target, 303);
}
