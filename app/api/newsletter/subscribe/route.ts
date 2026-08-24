import { NextResponse } from 'next/server';
import { dailyVisitorHash } from '@/lib/analytics';
import { brevoConfigFromEnvironment, sendBrevoEmail } from '@/lib/email';
import {
  buildSubscriptionEmail,
  createNewsletterToken,
  fozSchedule,
  validateNewsletterInput,
} from '@/lib/newsletter';
import { resolveSiteOrigin } from '@/lib/seo';
import {
  allowNewsletterEmailRetry,
  consumeNewsletterRateLimit,
  getNewsletterSubscriptionByEmail,
  saveNewsletterRequest,
} from '@/db/newsletter-repository';

const EMAIL_COOLDOWN_MS = 10 * 60 * 1000;

export async function POST(request: Request) {
  const tokenSecret = process.env.NEWSLETTER_TOKEN_SECRET ?? '';
  const emailConfig = brevoConfigFromEnvironment();
  if (
    tokenSecret.length < 32 ||
    !emailConfig.apiKey ||
    !emailConfig.senderEmail
  ) {
    return NextResponse.json(
      { error: 'Newsletter temporariamente indisponível' },
      { status: 503 },
    );
  }

  try {
    const input = validateNewsletterInput(await request.json());
    const now = Date.now();
    const local = fozSchedule(new Date(now));
    const visitorHash = await dailyVisitorHash(
      request.headers.get('cf-connecting-ip') ?? 'local',
      request.headers.get('user-agent') ?? 'navegador',
      local.date,
      tokenSecret,
    );
    const withinLimit = await consumeNewsletterRateLimit({
      visitorHash,
      limitDate: local.date,
      now,
    });
    if (!withinLimit) {
      return NextResponse.json(
        { error: 'Muitas tentativas. Tente novamente amanhã.' },
        { status: 429 },
      );
    }

    const existing = await getNewsletterSubscriptionByEmail(input.email);
    if (
      existing?.confirmationSentAt &&
      now - existing.confirmationSentAt < EMAIL_COOLDOWN_MS
    ) {
      return acceptedResponse();
    }

    const subscription = await saveNewsletterRequest({ ...input, now });
    const accessToken = await createNewsletterToken(
      subscription.id,
      subscription.tokenVersion,
      tokenSecret,
    );
    const origin = resolveSiteOrigin(process.env.SITE_URL || new URL(request.url).origin);
    const message = buildSubscriptionEmail({
      siteUrl: origin,
      accessToken,
      preferredHour: subscription.preferredHour,
      alreadyActive: subscription.status === 'active',
    });

    try {
      await sendBrevoEmail(
        {
          to: subscription.email,
          subject: message.subject,
          html: message.html,
          text: message.text,
          unsubscribeUrl: subscription.status === 'active'
            ? message.unsubscribeUrl
            : undefined,
        },
        emailConfig,
      );
    } catch {
      await allowNewsletterEmailRetry(subscription.id, now);
      return NextResponse.json(
        { error: 'Não foi possível enviar a confirmação. Tente novamente.' },
        { status: 502 },
      );
    }

    return acceptedResponse();
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Dados inválidos' },
      { status: 400 },
    );
  }
}

function acceptedResponse() {
  return NextResponse.json(
    { ok: true, message: 'Confira seu e-mail para confirmar ou gerenciar a assinatura.' },
    { status: 202 },
  );
}
