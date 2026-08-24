export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
  unsubscribeUrl?: string;
};

export type BrevoConfig = {
  apiKey: string;
  senderEmail: string;
  senderName: string;
};

type EmailFetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export async function sendBrevoEmail(
  message: EmailMessage,
  config: BrevoConfig,
  fetcher: EmailFetcher = fetch,
): Promise<{ messageId: string }> {
  if (!config.apiKey.trim() || !config.senderEmail.trim() || !config.senderName.trim()) {
    throw new Error('Serviço de e-mail não configurado');
  }

  const headers: Record<string, string> = {};
  if (message.unsubscribeUrl) {
    headers['List-Unsubscribe'] = `<${message.unsubscribeUrl}>`;
    headers['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click';
  }

  const response = await fetcher('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'api-key': config.apiKey,
    },
    body: JSON.stringify({
      sender: { email: config.senderEmail, name: config.senderName },
      to: [{ email: message.to }],
      subject: message.subject,
      htmlContent: message.html,
      textContent: message.text,
      ...(Object.keys(headers).length > 0 ? { headers } : {}),
      tags: ['ponte-agora'],
    }),
  });

  if (!response.ok) {
    throw new Error(`Brevo respondeu ${response.status}`);
  }

  const body = await response.json().catch(() => ({})) as { messageId?: unknown };
  return { messageId: typeof body.messageId === 'string' ? body.messageId : '' };
}

export function brevoConfigFromEnvironment(): BrevoConfig {
  return {
    apiKey: process.env.BREVO_API_KEY ?? '',
    senderEmail: process.env.NEWSLETTER_FROM_EMAIL ?? '',
    senderName: process.env.NEWSLETTER_FROM_NAME ?? 'Ponte Agora',
  };
}
