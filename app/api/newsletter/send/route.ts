import { NextResponse } from 'next/server';
import {
  claimNewsletterSend,
  listDueNewsletterSubscriptions,
  markNewsletterFailed,
  markNewsletterSent,
  pruneNewsletterOperationalData,
} from '@/db/newsletter-repository';
import {
  getTrafficSamples,
  getTrafficState,
  pruneTrafficSamples,
} from '@/db/repository';
import { brevoConfigFromEnvironment, sendBrevoEmail } from '@/lib/email';
import {
  buildNewsletterEmail,
  createNewsletterToken,
  fozSchedule,
  isValidCronAuthorization,
  summarizeTrafficSamples,
} from '@/lib/newsletter';
import { resolveSiteOrigin } from '@/lib/seo';
import { isTrafficFresh } from '@/lib/traffic';
import { fetchWeatherReport } from '@/lib/weather';

export async function POST(request: Request) {
  const cronSecret = process.env.NEWSLETTER_CRON_SECRET ?? '';
  if (!cronSecret) {
    return NextResponse.json({ error: 'Agendador não configurado' }, { status: 503 });
  }
  if (!isValidCronAuthorization(request.headers.get('authorization'), cronSecret)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const tokenSecret = process.env.NEWSLETTER_TOKEN_SECRET ?? '';
  const emailConfig = brevoConfigFromEnvironment();
  if (tokenSecret.length < 32 || !emailConfig.apiKey || !emailConfig.senderEmail) {
    return NextResponse.json({ error: 'Newsletter não configurada' }, { status: 503 });
  }

  const now = Date.now();
  const local = fozSchedule(new Date(now));
  try {
    const [subscriptions, reading, samples, weather] = await Promise.all([
      listDueNewsletterSubscriptions(local.hour, local.date),
      getTrafficState(),
      getTrafficSamples(local.date),
      fetchWeatherReport(),
    ]);
    const history = summarizeTrafficSamples(samples);
    const traffic = isTrafficFresh(reading?.receivedAt, now) ? reading : null;
    const siteUrl = resolveSiteOrigin(process.env.SITE_URL || new URL(request.url).origin);
    let sent = 0;
    let failed = 0;
    let skipped = 0;

    for (let offset = 0; offset < subscriptions.length; offset += 5) {
      const batch = subscriptions.slice(offset, offset + 5);
      const results = await Promise.all(batch.map(async (subscription) => {
        const claimed = await claimNewsletterSend({
          subscriptionId: subscription.id,
          localDate: local.date,
          now,
        });
        if (!claimed) return 'skipped' as const;

        try {
          const token = await createNewsletterToken(
            subscription.id,
            subscription.tokenVersion,
            tokenSecret,
          );
          const message = buildNewsletterEmail({
            siteUrl,
            accessToken: token,
            preferredHour: subscription.preferredHour,
            weather,
            traffic,
            history,
          });
          const result = await sendBrevoEmail(
            {
              to: subscription.email,
              subject: message.subject,
              html: message.html,
              text: message.text,
              unsubscribeUrl: message.unsubscribeUrl,
            },
            emailConfig,
          );
          await markNewsletterSent({
            subscriptionId: subscription.id,
            localDate: local.date,
            sentAt: Date.now(),
            providerMessageId: result.messageId,
          });
          return 'sent' as const;
        } catch {
          await markNewsletterFailed({
            subscriptionId: subscription.id,
            localDate: local.date,
            errorCode: 'provider_error',
          });
          return 'failed' as const;
        }
      }));
      sent += results.filter((result) => result === 'sent').length;
      failed += results.filter((result) => result === 'failed').length;
      skipped += results.filter((result) => result === 'skipped').length;
    }

    await Promise.all([
      pruneTrafficSamples(now - 31 * 24 * 60 * 60 * 1000),
      pruneNewsletterOperationalData(fozSchedule(new Date(now - 2 * 24 * 60 * 60 * 1000)).date),
    ]);

    return NextResponse.json(
      { ok: true, date: local.date, hour: local.hour, sent, failed, skipped },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return NextResponse.json(
      { error: 'Não foi possível preparar os envios' },
      { status: 503 },
    );
  }
}
