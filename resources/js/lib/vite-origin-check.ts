// Development-only check: ensure the running Vite origin is included in
// the SANCTUM stateful domains list. If not, show a diagnostic overlay.
if (import.meta.env.DEV && typeof window !== 'undefined') {
  try {
    const origin = window.location.origin;
    const host = new URL(origin).host; // includes port when present
    const hostname = window.location.hostname; // without port
    const raw = import.meta.env.VITE_SANCTUM_STATEFUL_DOMAINS || '';
    const list = raw.split(',').map((s) => s.trim()).filter(Boolean);

    const included = list.includes(host) || list.includes(hostname) || list.includes(origin);
    if (!included) {
      // show diagnostic overlay with advice
      import('./auth-ui')
        .then(({ showAuthDiagnostic }) => {
          try {
            showAuthDiagnostic({
              origin,
              cookies: typeof document !== 'undefined' ? document.cookie : '',
              advice: 'Your Vite origin is not listed in SANCTUM_STATEFUL_DOMAINS. Add it to your .env and restart Laravel.',
            });
          } catch (e) {
            // ignore
          }
        })
        .catch(() => {
          // ignore
        });

      // Also log a clear console warning
      // eslint-disable-next-line no-console
      console.warn(
        '[dev] Vite origin not included in SANCTUM_STATEFUL_DOMAINS:',
        origin,
        '— configured:',
        raw,
      );
    }
  } catch (e) {
    // ignore any runtime issues
  }
}

export {};
