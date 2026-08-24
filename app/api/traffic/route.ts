import { NextResponse } from 'next/server';
import { getTrafficState, saveTrafficState } from '@/db/repository';
import { parseTrafficPayload } from '@/lib/traffic';

export async function GET() {
  const reading = await getTrafficState();
  const online = reading
    ? Date.now() - reading.receivedAt < 20_000
    : false;

  return NextResponse.json(
    { reading, online },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

export async function POST(request: Request) {
  const expectedToken = process.env.TELEMETRY_TOKEN;
  if (!expectedToken) {
    return NextResponse.json(
      { error: 'Publicação de telemetria ainda não configurada' },
      { status: 503 },
    );
  }

  const providedToken = request.headers
    .get('authorization')
    ?.replace(/^Bearer\s+/i, '');
  if (!providedToken || !safeEqual(providedToken, expectedToken)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const reading = parseTrafficPayload(await request.json());
    await saveTrafficState(reading);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Telemetria inválida' },
      { status: 400 },
    );
  }
}

function safeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}
