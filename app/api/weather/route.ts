import { NextResponse } from 'next/server';
import { buildWeatherUrl, parseWeatherResponse } from '@/lib/weather';

export async function GET() {
  try {
    const response = await fetch(buildWeatherUrl(), {
      headers: { 'User-Agent': 'PonteAgora/1.0' },
    });
    if (!response.ok) throw new Error(`Open-Meteo respondeu ${response.status}`);

    const report = parseWeatherResponse(await response.json());
    return NextResponse.json(report, {
      headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600' },
    });
  } catch {
    return NextResponse.json(
      { error: 'Clima temporariamente indisponível' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
