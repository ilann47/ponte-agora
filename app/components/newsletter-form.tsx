'use client';

import { FormEvent, useState } from 'react';

type SubmitState =
  | { kind: 'idle'; message: '' }
  | { kind: 'loading'; message: string }
  | { kind: 'success'; message: string }
  | { kind: 'error'; message: string };

export function NewsletterForm() {
  const [email, setEmail] = useState('');
  const [preferredHour, setPreferredHour] = useState('7');
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState<SubmitState>({ kind: 'idle', message: '' });

  async function subscribe(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState({ kind: 'loading', message: 'Enviando confirmação…' });
    try {
      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, preferredHour, consent }),
      });
      const body = await response.json().catch(() => ({})) as {
        message?: string;
        error?: string;
      };
      if (!response.ok) throw new Error(body.error || 'Não foi possível fazer a inscrição.');
      setState({
        kind: 'success',
        message: body.message || 'Confira seu e-mail para confirmar a inscrição.',
      });
      setEmail('');
      setConsent(false);
    } catch (error) {
      setState({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Não foi possível fazer a inscrição.',
      });
    }
  }

  return (
    <section className="newsletter-section" id="newsletter" aria-labelledby="newsletter-title">
      <div className="newsletter-copy">
        <p className="eyebrow">Resumo diário no seu e-mail</p>
        <h2 id="newsletter-title">Saiba como está a ponte antes de sair.</h2>
        <p>
          Escolha uma hora e receba, todos os dias, a previsão do tempo,
          o histórico do trânsito e a situação exata no momento do envio.
        </p>
        <ul className="newsletter-benefits">
          <li><span>01</span> Clima em Foz para hoje e amanhã</li>
          <li><span>02</span> Evolução da fila no sentido Paraguai</li>
          <li><span>03</span> Link para mudar o horário quando quiser</li>
        </ul>
      </div>

      <form className="newsletter-card" onSubmit={subscribe}>
        <div className="newsletter-card-heading">
          <span className="newsletter-icon" aria-hidden="true">↗</span>
          <div>
            <small>Newsletter gratuita</small>
            <strong>Seu boletim da Ponte</strong>
          </div>
        </div>

        <label htmlFor="newsletter-email">Seu e-mail</label>
        <input
          id="newsletter-email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="voce@exemplo.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          maxLength={254}
        />

        <label htmlFor="newsletter-hour">Quero receber às</label>
        <div className="newsletter-time-field">
          <select
            id="newsletter-hour"
            name="preferredHour"
            value={preferredHour}
            onChange={(event) => setPreferredHour(event.target.value)}
          >
            {Array.from({ length: 24 }, (_, hour) => (
              <option key={hour} value={hour}>
                {String(hour).padStart(2, '0')}:00
              </option>
            ))}
          </select>
          <span>horário de Foz do Iguaçu</span>
        </div>

        <label className="newsletter-consent" htmlFor="newsletter-consent">
          <input
            id="newsletter-consent"
            type="checkbox"
            checked={consent}
            onChange={(event) => setConsent(event.target.checked)}
            required
          />
          <span>
            Concordo em receber o resumo diário. Posso alterar o horário ou
            cancelar com um clique.
          </span>
        </label>

        <button className="newsletter-submit" type="submit" disabled={state.kind === 'loading'}>
          {state.kind === 'loading' ? 'Enviando…' : 'Quero receber o resumo'}
        </button>
        <p className="newsletter-fine-print">
          Enviaremos uma confirmação primeiro. Sem publicidade e sem compartilhar seu e-mail.
        </p>
        {state.message ? (
          <p className={`newsletter-feedback ${state.kind}`} role="status" aria-live="polite">
            {state.message}
          </p>
        ) : null}
      </form>
    </section>
  );
}
