import { congestionLabel, type TrafficReading } from './traffic';
import type { WeatherReport } from './weather';

export const NEWSLETTER_TIME_ZONE = 'America/Sao_Paulo';
export const NEWSLETTER_SUBSCRIBER_LIMIT = 250;

export type TrafficSample = {
  score: number;
  sampleHour: number;
};

export type TrafficPeriodSummary = {
  hour: number;
  averageScore: number;
  peakScore: number;
  level: TrafficReading['level'];
};

export type TrafficHistorySummary = {
  sampleCount: number;
  averageScore: number | null;
  peakScore: number | null;
  peakHour: number | null;
  periods: TrafficPeriodSummary[];
};

export type NewsletterSubscriptionState = {
  status: string;
  preferredHour: number;
  lastSentDate: string | null;
};

export type NewsletterMessage = {
  subject: string;
  html: string;
  text: string;
  unsubscribeUrl: string;
};

export function validateNewsletterInput(value: unknown): {
  email: string;
  preferredHour: number;
} {
  if (!isRecord(value)) throw new Error('Informe um e-mail válido');
  const email = normalizeEmail(value.email);
  const preferredHour = parseHour(value.preferredHour);
  if (value.consent !== true) {
    throw new Error('É necessário confirmar o consentimento');
  }
  return { email, preferredHour };
}

export function normalizeEmail(value: unknown): string {
  if (typeof value !== 'string') throw new Error('Informe um e-mail válido');
  const email = value.trim().toLowerCase();
  if (
    email.length < 3 ||
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)
  ) {
    throw new Error('Informe um e-mail válido');
  }
  return email;
}

export function parseHour(value: unknown): number {
  const parsed = typeof value === 'string' && /^\d{1,2}$/.test(value)
    ? Number(value)
    : value;
  if (typeof parsed !== 'number' || !Number.isInteger(parsed) || parsed < 0 || parsed > 23) {
    throw new Error('Escolha um horário entre 00:00 e 23:00');
  }
  return parsed;
}

export function fozSchedule(date: Date): { date: string; hour: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: NEWSLETTER_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((entry) => entry.type === type)?.value ?? '';
  return {
    date: `${part('year')}-${part('month')}-${part('day')}`,
    hour: Number(part('hour')),
  };
}

export function buildTrafficBucket(date: Date): {
  bucketStart: number;
  sampleDate: string;
  sampleHour: number;
} {
  const bucketStart = Math.floor(date.getTime() / 300_000) * 300_000;
  const local = fozSchedule(new Date(bucketStart));
  return { bucketStart, sampleDate: local.date, sampleHour: local.hour };
}

export function summarizeTrafficSamples(samples: TrafficSample[]): TrafficHistorySummary {
  if (samples.length === 0) {
    return {
      sampleCount: 0,
      averageScore: null,
      peakScore: null,
      peakHour: null,
      periods: [],
    };
  }

  const byHour = new Map<number, number[]>();
  let total = 0;
  let peakScore = -1;
  let peakHour = 0;
  for (const sample of samples) {
    const score = clampScore(sample.score);
    const hour = Math.max(0, Math.min(23, Math.trunc(sample.sampleHour)));
    const scores = byHour.get(hour) ?? [];
    scores.push(score);
    byHour.set(hour, scores);
    total += score;
    if (score > peakScore) {
      peakScore = score;
      peakHour = hour;
    }
  }

  const periods = Array.from(byHour.entries())
    .sort(([left], [right]) => left - right)
    .map(([hour, scores]) => {
      const averageScore = Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
      return {
        hour,
        averageScore,
        peakScore: Math.max(...scores),
        level: congestionLabel(averageScore),
      };
    });

  return {
    sampleCount: samples.length,
    averageScore: Math.round(total / samples.length),
    peakScore,
    peakHour,
    periods,
  };
}

export function shouldSendNewsletter(
  subscription: NewsletterSubscriptionState,
  now = new Date(),
): boolean {
  const local = fozSchedule(now);
  return subscription.status === 'active' &&
    subscription.preferredHour === local.hour &&
    subscription.lastSentDate !== local.date;
}

export async function createNewsletterToken(
  subscriptionId: string,
  tokenVersion: number,
  secret: string,
): Promise<string> {
  validateTokenParts(subscriptionId, tokenVersion, secret);
  const payload = toBase64Url(JSON.stringify({ s: subscriptionId, v: tokenVersion }));
  const signature = await sign(payload, secret);
  return `${payload}.${signature}`;
}

export async function verifyNewsletterToken(
  token: string,
  secret: string,
): Promise<{ subscriptionId: string; tokenVersion: number } | null> {
  try {
    if (secret.length < 32) return null;
    const [payload, providedSignature, extra] = token.split('.');
    if (!payload || !providedSignature || extra) return null;
    const expectedSignature = await sign(payload, secret);
    if (!constantTimeEqual(providedSignature, expectedSignature)) return null;
    const parsed = JSON.parse(fromBase64Url(payload)) as { s?: unknown; v?: unknown };
    validateTokenParts(parsed.s, parsed.v, secret);
    return { subscriptionId: parsed.s as string, tokenVersion: parsed.v as number };
  } catch {
    return null;
  }
}

export function buildNewsletterEmail(input: {
  siteUrl: string;
  accessToken: string;
  preferredHour: number;
  weather: WeatherReport;
  traffic: Pick<TrafficReading, 'score' | 'level' | 'vehicleCount' | 'observedAt'> | null;
  history: TrafficHistorySummary;
}): NewsletterMessage {
  const siteUrl = input.siteUrl.replace(/\/$/, '');
  const manageUrl = `${siteUrl}/newsletter/gerenciar?token=${encodeURIComponent(input.accessToken)}`;
  const unsubscribeUrl = `${siteUrl}/api/newsletter/unsubscribe?token=${encodeURIComponent(input.accessToken)}`;
  const traffic = input.traffic;
  const trafficLabel = traffic?.level ?? 'Sem leitura recente';
  const peak = input.history.peakHour === null
    ? 'Histórico ainda em formação'
    : `Pico de ${input.history.peakScore}% às ${formatHour(input.history.peakHour)}`;
  const rows = input.history.periods.length > 0
    ? input.history.periods.map((period) => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #dce7df">${formatHour(period.hour)}</td>
        <td style="padding:8px 0;border-bottom:1px solid #dce7df;text-align:center">${period.averageScore}%</td>
        <td style="padding:8px 0;border-bottom:1px solid #dce7df;text-align:right">${escapeHtml(period.level)}</td>
      </tr>`).join('')
    : '<tr><td colspan="3" style="padding:12px 0;color:#607068">O histórico começará a aparecer após novas leituras.</td></tr>';
  const subject = `Ponte Agora · ${trafficLabel} · ${formatHour(input.preferredHour)}`;

  const html = `<!doctype html>
  <html lang="pt-BR"><body style="margin:0;background:#eef4f0;color:#132019;font-family:Arial,sans-serif">
    <div style="max-width:640px;margin:0 auto;padding:24px 16px">
      <div style="background:#0c1712;color:#eef7f1;padding:28px;border-radius:18px 18px 0 0">
        <div style="font-size:13px;color:#79e39d;font-weight:700;text-transform:uppercase;letter-spacing:.08em">Resumo diário · sentido Paraguai</div>
        <h1 style="margin:12px 0 6px;font-size:34px">Trânsito ${escapeHtml(trafficLabel)}</h1>
        <p style="margin:0;color:#b8c7bf">${traffic ? `${traffic.score}% de fila estimada · ${traffic.vehicleCount} veículos na área monitorada` : 'Detector sem leitura recente no momento do envio'}</p>
      </div>
      <div style="background:#fff;padding:28px">
        <h2 style="font-size:20px;margin:0 0 12px">Clima em Foz do Iguaçu</h2>
        <p><strong>Agora:</strong> ${formatTemperature(input.weather.current.temperatureC)} · ${escapeHtml(input.weather.current.description)}</p>
        <p><strong>Hoje:</strong> ${formatTemperature(input.weather.today.temperatureMinC)} a ${formatTemperature(input.weather.today.temperatureMaxC)} · chuva ${formatRain(input.weather.today.rainProbability)}</p>
        <p><strong>Previsão para amanhã:</strong> ${formatTemperature(input.weather.tomorrow.temperatureMinC)} a ${formatTemperature(input.weather.tomorrow.temperatureMaxC)} · ${escapeHtml(input.weather.tomorrow.description)} · chuva ${formatRain(input.weather.tomorrow.rainProbability)}</p>
        <h2 style="font-size:20px;margin:28px 0 6px">Histórico do trânsito hoje</h2>
        <p style="color:#526159;margin-top:0">Média ${input.history.averageScore ?? '—'}% · ${peak}</p>
        <table style="width:100%;border-collapse:collapse"><thead><tr><th style="text-align:left">Hora</th><th>Média</th><th style="text-align:right">Situação</th></tr></thead><tbody>${rows}</tbody></table>
        <a href="${escapeHtml(siteUrl)}" style="display:inline-block;margin-top:26px;background:#173e28;color:#fff;padding:13px 18px;border-radius:10px;text-decoration:none;font-weight:700">Ver câmera ao vivo</a>
      </div>
      <div style="padding:20px 28px;background:#dae7df;color:#405048;font-size:13px;border-radius:0 0 18px 18px">
        Você escolheu receber este resumo às ${formatHour(input.preferredHour)}, no horário de Foz do Iguaçu.<br>
        <a href="${escapeHtml(manageUrl)}" style="color:#173e28;font-weight:700">Alterar horário ou cancelar</a> ·
        <a href="${escapeHtml(unsubscribeUrl)}" style="color:#173e28">Descadastrar agora</a>
      </div>
    </div>
  </body></html>`;

  const historyText = input.history.periods.length > 0
    ? input.history.periods.map((period) =>
      `${formatHour(period.hour)} — média ${period.averageScore}% (${period.level})`,
    ).join('\n')
    : 'Histórico ainda em formação.';
  const text = [
    'PONTE AGORA — RESUMO DIÁRIO',
    `Trânsito agora: ${trafficLabel}${traffic ? `, ${traffic.score}% e ${traffic.vehicleCount} veículos` : ''}.`,
    `Clima agora: ${formatTemperature(input.weather.current.temperatureC)}, ${input.weather.current.description}.`,
    `Hoje: ${formatTemperature(input.weather.today.temperatureMinC)} a ${formatTemperature(input.weather.today.temperatureMaxC)}, chuva ${formatRain(input.weather.today.rainProbability)}.`,
    `Amanhã: ${formatTemperature(input.weather.tomorrow.temperatureMinC)} a ${formatTemperature(input.weather.tomorrow.temperatureMaxC)}, ${input.weather.tomorrow.description}, chuva ${formatRain(input.weather.tomorrow.rainProbability)}.`,
    '',
    `Histórico do dia: média ${input.history.averageScore ?? '—'}%. ${peak}.`,
    historyText,
    '',
    `Câmera ao vivo: ${siteUrl}`,
    `Alterar horário ou cancelar: ${manageUrl}`,
    `Descadastrar agora: ${unsubscribeUrl}`,
  ].join('\n');

  return { subject, html, text, unsubscribeUrl };
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(Number.isFinite(value) ? value : 0)));
}

function validateTokenParts(id: unknown, version: unknown, secret: string): void {
  if (
    typeof id !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id) ||
    typeof version !== 'number' ||
    !Number.isInteger(version) ||
    version < 1 ||
    version > 1_000_000 ||
    secret.length < 32
  ) {
    throw new Error('Token da newsletter inválido');
  }
}

async function sign(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const digest = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return bytesToBase64Url(new Uint8Array(digest));
}

function toBase64Url(value: string): string {
  return bytesToBase64Url(new TextEncoder().encode(value));
}

function fromBase64Url(value: string): string {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  const binary = atob(padded);
  return new TextDecoder().decode(Uint8Array.from(binary, (character) => character.charCodeAt(0)));
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

function formatHour(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`;
}

function formatTemperature(value: number): string {
  return `${value.toFixed(1).replace('.', ',')}°C`;
}

function formatRain(value: number | null): string {
  return value === null ? 'sem estimativa' : `${Math.round(value)}%`;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  })[character] ?? character);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
