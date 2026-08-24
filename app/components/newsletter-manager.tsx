'use client';

import { useEffect, useState } from 'react';

type Subscription = {
  email: string;
  preferredHour: number;
  status: string;
};

export function NewsletterManager({
  token,
  initialState,
}: {
  token: string;
  initialState: string;
}) {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [preferredHour, setPreferredHour] = useState('7');
  const [status, setStatus] = useState(initialMessage(initialState, token));
  const [busy, setBusy] = useState(Boolean(token));
  const [cancelled, setCancelled] = useState(initialState === 'unsubscribed');

  useEffect(() => {
    if (!token || cancelled) return;
    let active = true;
    void fetch('/api/newsletter/manage', {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    }).then(async (response) => {
      if (!response.ok) throw new Error('Este link é inválido ou já expirou.');
      return response.json() as Promise<Subscription>;
    }).then((next) => {
      if (!active) return;
      setSubscription(next);
      setPreferredHour(String(next.preferredHour));
      setStatus(initialState === 'confirmed'
        ? 'Inscrição confirmada. Você já pode ajustar o horário.'
        : 'Assinatura localizada.');
    }).catch((error) => {
      if (active) setStatus(error instanceof Error ? error.message : 'Não foi possível abrir a assinatura.');
    }).finally(() => {
      if (active) setBusy(false);
    });
    return () => { active = false; };
  }, [token, initialState, cancelled]);

  async function updateHour() {
    setBusy(true);
    setStatus('Salvando o novo horário…');
    try {
      const response = await fetch('/api/newsletter/manage', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ preferredHour }),
      });
      const body = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(body.error || 'Não foi possível salvar.');
      setSubscription((current) => current
        ? { ...current, preferredHour: Number(preferredHour) }
        : current);
      setStatus(`Horário alterado para ${formatHour(Number(preferredHour))}.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Não foi possível salvar.');
    } finally {
      setBusy(false);
    }
  }

  async function cancelNewsletter() {
    if (!window.confirm('Deseja parar de receber o resumo diário?')) return;
    setBusy(true);
    setStatus('Cancelando a newsletter…');
    try {
      const response = await fetch('/api/newsletter/manage', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Não foi possível cancelar.');
      setCancelled(true);
      setSubscription(null);
      setStatus('Newsletter cancelada. Você não receberá novos resumos.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Não foi possível cancelar.');
    } finally {
      setBusy(false);
    }
  }

  if (cancelled) {
    return (
      <div className="newsletter-manage-content">
        <span className="manage-status-icon">✓</span>
        <h1>Newsletter cancelada</h1>
        <p>{status}</p>
        <a className="primary-button" href="/#newsletter">Inscrever novamente</a>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="newsletter-manage-content">
        <span className="manage-status-icon">!</span>
        <h1>{initialState === 'full' ? 'Lista temporariamente cheia' : 'Link necessário'}</h1>
        <p>{status}</p>
        <a className="primary-button" href="/#newsletter">Voltar à newsletter</a>
      </div>
    );
  }

  return (
    <div className="newsletter-manage-content">
      <p className="eyebrow">Preferências do resumo diário</p>
      <h1>Alterar o horário</h1>
      <p className="manager-status" role="status" aria-live="polite">{status}</p>

      {subscription ? (
        <div className="manager-form">
          <div className="manager-email">
            <span>Assinatura</span>
            <strong>{subscription.email}</strong>
          </div>
          <label htmlFor="manager-hour">Receber diariamente às</label>
          <select
            id="manager-hour"
            value={preferredHour}
            onChange={(event) => setPreferredHour(event.target.value)}
            disabled={busy}
          >
            {Array.from({ length: 24 }, (_, hour) => (
              <option key={hour} value={hour}>{formatHour(hour)}</option>
            ))}
          </select>
          <span className="manager-timezone">Horário de Foz do Iguaçu</span>
          <button className="newsletter-submit" type="button" onClick={updateHour} disabled={busy}>
            Salvar novo horário
          </button>
          <button className="manager-cancel" type="button" onClick={cancelNewsletter} disabled={busy}>
            Cancelar newsletter
          </button>
        </div>
      ) : busy ? <div className="manager-loading">Carregando assinatura…</div> : null}
    </div>
  );
}

function initialMessage(state: string, token: string): string {
  if (state === 'unsubscribed') return 'Você não receberá novos resumos.';
  if (state === 'full') return 'O limite gratuito de assinantes foi alcançado. Tente novamente mais tarde.';
  if (state === 'invalid') return 'Este link é inválido ou já expirou.';
  if (!token) return 'Abra o link recebido no seu e-mail para acessar sua assinatura.';
  return 'Carregando sua assinatura…';
}

function formatHour(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`;
}
