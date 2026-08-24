import { NextResponse } from 'next/server';
import { getAnalyticsSummary } from '@/db/repository';
import { isAuthorizedAdmin } from '@/lib/admin';
import { chatGPTUserFromHeaders } from '@/lib/chatgpt-user';

export async function GET(request: Request) {
  const user = chatGPTUserFromHeaders(request.headers);
  if (!user) return NextResponse.json({ error: 'Autenticação necessária' }, { status: 401 });

  const authorized = isAuthorizedAdmin(user, {
    userIds: process.env.ADMIN_USER_IDS ?? '',
    emails: process.env.ADMIN_EMAILS ?? '',
    development: process.env.NODE_ENV !== 'production',
  });
  if (!authorized) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });

  const days = Number(new URL(request.url).searchParams.get('days') ?? 30);
  return NextResponse.json(await getAnalyticsSummary(days), {
    headers: { 'Cache-Control': 'private, no-store' },
  });
}
