import { NextResponse } from 'next/server';
import { fozDate, recordVisit } from '@/db/repository';
import {
  classifyDevice,
  dailyVisitorHash,
  normalizeReferrer,
  sanitizePath,
} from '@/lib/analytics';

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const userAgent = request.headers.get('user-agent') ?? '';
    const ipAddress = request.headers.get('cf-connecting-ip') ?? 'local';
    const occurredAt = Date.now();
    const visitDate = fozDate(new Date(occurredAt));
    const salt = process.env.ANALYTICS_SALT ?? 'ponte-agora-local-development';
    const visitorHash = await dailyVisitorHash(
      ipAddress,
      userAgent,
      'permanente',
      salt,
    );
    const visitorDayHash = await dailyVisitorHash(
      ipAddress,
      userAgent,
      visitDate,
      salt,
    );

    await recordVisit({
      occurredAt,
      visitDate,
      path: sanitizePath(text(body.path, '/')),
      referrerHost: normalizeReferrer(
        text(body.referrer, ''),
        new URL(request.url).origin,
      ),
      utmSource: optionalText(body.utmSource),
      utmMedium: optionalText(body.utmMedium),
      country: (request.headers.get('cf-ipcountry') ?? 'Local').slice(0, 8),
      device: classifyDevice(userAgent),
      visitorHash,
      visitorDayHash,
    });

    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: 'Visita não registrada' }, { status: 400 });
  }
}

function text(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value.slice(0, 300) : fallback;
}

function optionalText(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  return value.trim().slice(0, 100);
}
