export type DeviceGroup = 'Celular' | 'Tablet' | 'Computador' | 'Desconhecido';

export function normalizeReferrer(referrer: string, siteOrigin: string): string {
  if (!referrer.trim()) return 'Direto';

  try {
    const source = new URL(referrer);
    const site = new URL(siteOrigin);
    if (source.hostname === site.hostname) return 'Navegação interna';

    return source.hostname.replace(/^www\./, '').slice(0, 120) || 'Direto';
  } catch {
    return 'Direto';
  }
}

export function classifyDevice(userAgent: string): DeviceGroup {
  if (!userAgent.trim()) return 'Desconhecido';
  if (/ipad|tablet|kindle|silk/i.test(userAgent)) return 'Tablet';
  if (/mobile|iphone|ipod|android/i.test(userAgent)) return 'Celular';
  return 'Computador';
}

export function sanitizePath(value: string): string {
  if (!value.startsWith('/') || value.startsWith('//')) return '/';

  try {
    const url = new URL(value, 'https://ponte.local');
    if (url.origin !== 'https://ponte.local') return '/';
    return url.pathname.slice(0, 180) || '/';
  } catch {
    return '/';
  }
}

export async function dailyVisitorHash(
  ipAddress: string,
  userAgent: string,
  calendarDate: string,
  salt: string,
): Promise<string> {
  const input = `${calendarDate}\n${salt}\n${ipAddress}\n${userAgent}`;
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(input),
  );

  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
}
