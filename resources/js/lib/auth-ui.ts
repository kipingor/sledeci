// Minimal DOM-based auth error UI used when re-authentication fails.
export function showAuthErrorUI(options?: { message?: string }) {
  if (typeof document === 'undefined') return;

  // avoid creating multiple overlays
  if (document.getElementById('auth-error-overlay')) return;

  const overlay = document.createElement('div');
  overlay.id = 'auth-error-overlay';
  overlay.style.position = 'fixed';
  overlay.style.inset = '0';
  overlay.style.zIndex = '99999';
  overlay.style.display = 'flex';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';
  overlay.style.background = 'rgba(0,0,0,0.45)';

  const box = document.createElement('div');
  box.style.background = '#fff';
  box.style.padding = '20px';
  box.style.borderRadius = '8px';
  box.style.width = '360px';
  box.style.maxWidth = '90%';
  box.style.boxShadow = '0 10px 30px rgba(0,0,0,0.2)';
  box.style.textAlign = 'center';

  const title = document.createElement('div');
  title.textContent = 'Authentication Required';
  title.style.fontSize = '18px';
  title.style.marginBottom = '8px';
  title.style.fontWeight = '600';

  const message = document.createElement('div');
  message.textContent = options?.message || 'We were unable to re-establish your session.';
  message.style.fontSize = '14px';
  message.style.marginBottom = '16px';

  const actions = document.createElement('div');
  actions.style.display = 'flex';
  actions.style.justifyContent = 'center';
  actions.style.gap = '8px';

  const retryBtn = document.createElement('button');
  retryBtn.textContent = 'Retry';
  retryBtn.style.padding = '8px 12px';
  retryBtn.style.border = 'none';
  retryBtn.style.background = '#111827';
  retryBtn.style.color = '#fff';
  retryBtn.style.borderRadius = '6px';
  retryBtn.style.cursor = 'pointer';

  const loginBtn = document.createElement('button');
  loginBtn.textContent = 'Login';
  loginBtn.style.padding = '8px 12px';
  loginBtn.style.border = '1px solid #d1d5db';
  loginBtn.style.background = '#fff';
  loginBtn.style.color = '#111827';
  loginBtn.style.borderRadius = '6px';
  loginBtn.style.cursor = 'pointer';

  actions.appendChild(retryBtn);
  actions.appendChild(loginBtn);

  box.appendChild(title);
  box.appendChild(message);
  box.appendChild(actions);
  overlay.appendChild(box);
  document.body.appendChild(overlay);

  // Return a promise that resolves when user clicks Retry, rejects on Login
  return new Promise<void>((resolve, reject) => {
    retryBtn.addEventListener('click', () => {
      removeAuthErrorUI();
      resolve();
    });
    loginBtn.addEventListener('click', () => {
      removeAuthErrorUI();
      try {
        window.location.href = '/login';
      } catch (e) {
        // ignore
      }
      reject(new Error('user-initiated-login'));
    });
  });
}

export function removeAuthErrorUI() {
  const el = document.getElementById('auth-error-overlay');
  if (el && el.parentNode) el.parentNode.removeChild(el);
}

export default showAuthErrorUI;

// Dev-only diagnostic overlay to show cookie and origin info helpful when
// CSRF/session cookies are not being set or sent.
export function showAuthDiagnostic(details: { cookies?: string; origin?: string; advice?: string }) {
  if (typeof document === 'undefined') return;
  // avoid creating multiple overlays
  if (document.getElementById('auth-diagnostic-overlay')) return;

  const overlay = document.createElement('div');
  overlay.id = 'auth-diagnostic-overlay';
  overlay.style.position = 'fixed';
  overlay.style.inset = '8px';
  overlay.style.zIndex = '99999';
  overlay.style.display = 'flex';
  overlay.style.alignItems = 'flex-start';
  overlay.style.justifyContent = 'center';
  overlay.style.pointerEvents = 'auto';

  const box = document.createElement('div');
  box.style.background = '#fff';
  box.style.padding = '12px';
  box.style.borderRadius = '8px';
  box.style.width = '420px';
  box.style.maxWidth = 'calc(100% - 16px)';
  box.style.boxShadow = '0 6px 18px rgba(0,0,0,0.12)';
  box.style.fontSize = '13px';
  box.style.color = '#111827';

  const title = document.createElement('div');
  title.textContent = 'Dev: Auth diagnostic';
  title.style.fontWeight = '700';
  title.style.marginBottom = '8px';

  const origin = document.createElement('div');
  origin.textContent = `Origin: ${details.origin ?? window.location.origin}`;
  origin.style.marginBottom = '6px';

  const cookieBlock = document.createElement('pre');
  cookieBlock.style.whiteSpace = 'pre-wrap';
  cookieBlock.style.maxHeight = '160px';
  cookieBlock.style.overflow = 'auto';
  cookieBlock.style.background = '#f9fafb';
  cookieBlock.style.padding = '8px';
  cookieBlock.style.borderRadius = '6px';
  cookieBlock.style.marginBottom = '8px';
  cookieBlock.textContent = `document.cookie:\n${details.cookies ?? (typeof document !== 'undefined' ? document.cookie : '')}`;

  const advice = document.createElement('div');
  advice.textContent = details.advice ?? 'Note: HttpOnly session cookies (like the Laravel session cookie) will not appear in document.cookie. Seeing XSRF-TOKEN is expected. If API calls still return 401, ensure you are logged in or that your frontend origin is included in SANCTUM_STATEFUL_DOMAINS.';
  advice.style.marginBottom = '8px';

  const actions = document.createElement('div');
  actions.style.display = 'flex';
  actions.style.justifyContent = 'flex-end';
  actions.style.gap = '8px';

  const closeBtn = document.createElement('button');
  closeBtn.textContent = 'Close';
  closeBtn.style.padding = '6px 10px';
  closeBtn.style.border = '1px solid #e5e7eb';
  closeBtn.style.background = '#fff';
  closeBtn.style.borderRadius = '6px';
  closeBtn.style.cursor = 'pointer';

  actions.appendChild(closeBtn);

  box.appendChild(title);
  box.appendChild(origin);
  box.appendChild(cookieBlock);
  box.appendChild(advice);
  box.appendChild(actions);

  overlay.appendChild(box);
  document.body.appendChild(overlay);

  closeBtn.addEventListener('click', () => {
    const el = document.getElementById('auth-diagnostic-overlay');
    if (el && el.parentNode) el.parentNode.removeChild(el);
  });
}
