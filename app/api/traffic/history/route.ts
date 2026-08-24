import { NextResponse } from 'next/server';
import { getVehicleHistorySummary } from '@/db/repository';

export async function GET(request: Request) {
  const value = new URL(request.url).searchParams.get('days') ?? '30';
  const days = Number(value);
  if (days !== 7 && days !== 30) {
    return NextResponse.json(
      { error: 'Período disponível: 7 ou 30 dias' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const summary = await getVehicleHistorySummary(days);
  return NextResponse.json(
    { summary },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

