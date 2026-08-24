'use client';

import { useEffect } from 'react';

export function VisitTracker() {
  useEffect(() => {
    const path = window.location.pathname;
    const sessionKey = `ponte-agora:visit:${path}`;
    try {
      if (window.sessionStorage.getItem(sessionKey)) return;
    } catch {
      // O registro continua mesmo quando o navegador bloqueia sessionStorage.
    }

    const search = new URLSearchParams(window.location.search);
    void fetch('/api/analytics/visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({
        path,
        referrer: document.referrer,
        utmSource: search.get('utm_source'),
        utmMedium: search.get('utm_medium'),
      }),
    }).then((response) => {
      if (!response.ok) return;
      try {
        window.sessionStorage.setItem(sessionKey, '1');
      } catch {
        // O histórico no servidor já foi registrado.
      }
    }).catch(() => undefined);
  }, []);

  return null;
}
