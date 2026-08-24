import { NextResponse } from 'next/server';
import {
  getNewsletterSubscriptionByTokenParts,
  unsubscribeNewsletter,
  updateNewsletterHour,
} from '@/db/newsletter-repository';
import { maskEmail, parseHour, verifyNewsletterToken } from '@/lib/newsletter';

export async function GET(request: Request) {
  const access = await resolveAccess(request);
  if (!access) return unauthorized();
  return NextResponse.json(
    {
      email: maskEmail(access.subscription.email),
      preferredHour: access.subscription.preferredHour,
      status: access.subscription.status,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

export async function PATCH(request: Request) {
  const access = await resolveAccess(request);
  if (!access || access.subscription.status !== 'active') return unauthorized();
  try {
    const body = await request.json() as { preferredHour?: unknown };
    const preferredHour = parseHour(body.preferredHour);
    const updated = await updateNewsletterHour({
      ...access.token,
      preferredHour,
      now: Date.now(),
      id: access.token.subscriptionId,
    });
    if (!updated) return unauthorized();
    return NextResponse.json({ ok: true, preferredHour });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Horário inválido' },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request) {
  const access = await resolveAccess(request);
  if (!access) return unauthorized();
  await unsubscribeNewsletter({
    id: access.token.subscriptionId,
    tokenVersion: access.token.tokenVersion,
    now: Date.now(),
  });
  return NextResponse.json({ ok: true });
}

async function resolveAccess(request: Request) {
  const url = new URL(request.url);
  const headerToken = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const tokenValue = headerToken || url.searchParams.get('token') || '';
  const token = await verifyNewsletterToken(
    tokenValue,
    process.env.NEWSLETTER_TOKEN_SECRET ?? '',
  );
  if (!token) return null;
  const subscription = await getNewsletterSubscriptionByTokenParts(
    token.subscriptionId,
    token.tokenVersion,
  );
  return subscription ? { token, subscription } : null;
}

function unauthorized() {
  return NextResponse.json(
    { error: 'Link inválido ou expirado' },
    { status: 401, headers: { 'Cache-Control': 'no-store' } },
  );
}
