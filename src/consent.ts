/* ============================================================
   CONSENTIMIENTO DE COOKIES
   Guarda la decisión en una cookie propia (qc_consent) durante
   180 días. Mientras no haya "accepted", no se carga nada opcional.
   ============================================================ */

export type Consent = 'accepted' | 'rejected';

const COOKIE_NAME = 'qc_consent';
const MAX_AGE = 60 * 60 * 24 * 180; // 180 días

// Prefijos de cookies no esenciales que se borran al rechazar
const OPTIONAL_COOKIES = [/^_ga/, /^_gid$/, /^_gat/, /^_fbp$/, /^_hj/, /^_clck$/, /^_clsk$/];

let optionalLoaded = false;

export function getConsent(): Consent | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`));
  const value = match ? decodeURIComponent(match[1]) : null;
  return value === 'accepted' || value === 'rejected' ? value : null;
}

function saveConsent(value: Consent): void {
  const secure = location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${COOKIE_NAME}=${value}; Max-Age=${MAX_AGE}; Path=/; SameSite=Lax${secure}`;
}

function clearOptionalCookies(): void {
  const hostParts = location.hostname.split('.');
  const domains = ['', location.hostname];
  if (hostParts.length > 2) domains.push('.' + hostParts.slice(-2).join('.'));

  document.cookie.split('; ').forEach(entry => {
    const name = entry.split('=')[0];
    if (!OPTIONAL_COOKIES.some(rx => rx.test(name))) return;
    domains.forEach(domain => {
      const d = domain ? `; Domain=${domain}` : '';
      document.cookie = `${name}=; Max-Age=0; Path=/${d}`;
    });
  });
}

/* Aquí van los scripts que necesitan consentimiento (Google Analytics,
   Meta Pixel, Hotjar…). Solo se ejecuta tras pulsar "Accept". */
function loadOptionalScripts(): void {
  if (optionalLoaded) return;
  optionalLoaded = true;

  // Ejemplo con Google Analytics 4 — sustituye G-XXXXXXX por tu ID y descomenta:
  // const s = document.createElement('script');
  // s.async = true;
  // s.src = 'https://www.googletagmanager.com/gtag/js?id=G-XXXXXXX';
  // document.head.appendChild(s);
  // (window as any).dataLayer = (window as any).dataLayer || [];
  // function gtag(...args: unknown[]) { (window as any).dataLayer.push(args); }
  // gtag('js', new Date());
  // gtag('config', 'G-XXXXXXX', { anonymize_ip: true });

  document.dispatchEvent(new CustomEvent('consent:accepted'));
}

function applyConsent(value: Consent): void {
  if (value === 'accepted') {
    loadOptionalScripts();
    return;
  }

  clearOptionalCookies();
  document.dispatchEvent(new CustomEvent('consent:rejected'));

  // Un script ya cargado no se puede "descargar": recargamos para detenerlo.
  if (optionalLoaded) location.reload();
}

export function initConsent(): void {
  const banner = document.querySelector<HTMLElement>('.cookie');
  if (!banner) return;

  const show = () => {
    banner.hidden = false;
    requestAnimationFrame(() => requestAnimationFrame(() => banner.classList.add('is-visible')));
  };

  const hide = () => {
    banner.classList.remove('is-visible');
    // Espera a que termine la transición; si se reabre antes, no lo oculta
    window.setTimeout(() => {
      if (!banner.classList.contains('is-visible')) banner.hidden = true;
    }, 650);
  };

  banner.querySelectorAll<HTMLButtonElement>('[data-consent]').forEach(btn => {
    btn.addEventListener('click', () => {
      const value = btn.dataset.consent as Consent;
      saveConsent(value);
      applyConsent(value);
      hide();
    });
  });

  document.querySelectorAll<HTMLElement>('[data-cookie-settings]').forEach(link => {
    link.addEventListener('click', event => {
      event.preventDefault();
      show();
      banner.querySelector<HTMLButtonElement>('[data-consent="accepted"]')?.focus({ preventScroll: true });
    });
  });

  const saved = getConsent();
  if (saved) {
    applyConsent(saved);
  } else {
    window.setTimeout(show, 1200);
  }
}
