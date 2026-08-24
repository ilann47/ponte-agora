import { buildWeatherRedirect } from '@/lib/weather';

export function GET() {
  return buildWeatherRedirect();
}
