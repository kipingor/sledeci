/**
 * Dev-only auth diagnostic overlay. Shows when CSRF/session cookies are missing
 * after calling /sanctum/csrf-cookie. Provides guidance about SANCTUM_STATEFUL_DOMAINS.
 */
export function showAuthDiagnostic(info: { origin: string; cookies: string[] }) {
  if (typeof document === 'undefined') return;
  // avoid creating multiple overlays
  if (document.getElementById('auth-diagnostic-overlay')) return;

  const overlay = document.createElement('div');
  overlay.id = 'auth-diagnostic-overlay';
  overlay.style.position = 'fixed';
  overlay.style.inset = '12px';
  overlay.style.zIndex = '999999';
  overlay.style.display = 'flex';
  overlay.style.alignItems = 'flex-start';
  overlay.style.justifyContent = 'center';

  const box = document.createElement('div');
  box.style.background = '#fff9f0';
  box.style.padding = '12px';
  box.style.border = '1px solid #f59e0b';
  box.style.borderRadius = '8px';
  box.style.maxWidth = '680px';
  box.style.boxShadow = '0 6px 24px rgba(0,0,0,0.06)';
  box.style.fontSize = '13px';
  box.style.color = '#92400e';

  const title = document.createElement('div');
  title.textContent = 'Auth Diagnostic (dev only)';
  title.style.fontWeight = '600';
  title.style.marginBottom = '8px';

  const p = document.createElement('div');
  p.innerHTML = `
    <div style="margin-bottom:8px;">Called from origin: <code>${info.origin}</code></div>
    <div style="margin-bottom:8px;">Cookies present: <code>${info.cookies.join(', ') || 'none'}</code></div>
    <div style="margin-bottom:8px;">If cookies are missing, ensure your SPA origin (including port) is listed in <code>SANCTUM_STATEFUL_DOMAINS</code> in your <code>.env</code> and that the backend was restarted.</div>
    <div>Example: <code>SANCTUM_STATEFUL_DOMAINS=localhost,127.0.0.1,localhost:5173,127.0.0.1:5173</code></div>
  `;

  const close = document.createElement('button');
  close.textContent = 'Dismiss';
  close.style.marginTop = '10px';
  close.style.padding = '6px 10px';
  close.style.border = 'none';
  close.style.background = '#92400e';
  close.style.color = '#fff';
  close.style.borderRadius = '6px';
  close.style.cursor = 'pointer';

  close.addEventListener('click', () => {
    try { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); } catch(e){}
  });

  box.appendChild(title);
  box.appendChild(p);
  box.appendChild(close);
  overlay.appendChild(box);
  document.body.appendChild(overlay);
}

export default showAuthDiagnostic;
