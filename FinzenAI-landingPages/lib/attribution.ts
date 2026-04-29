/**
 * Marketing Attribution — captura UTM params + click IDs
 *
 * - First-touch: cookie 90 días, NUNCA se sobrescribe
 * - Last-touch: sessionStorage, se actualiza en cada visita con UTMs nuevos
 * - anonymousId: localStorage UUID, persiste hasta que el user limpie storage
 *
 * Todo es client-side. SSR-safe (revisa typeof window antes de tocar storage).
 */

// ─── Constantes ─────────────────────────────────────────────────

const COOKIE_FIRST_TOUCH = 'finzen_first_touch';
const STORAGE_LAST_TOUCH = 'finzen_last_touch';
const STORAGE_ANONYMOUS_ID = 'finzen_anonymous_id';

const FIRST_TOUCH_TTL_DAYS = 90;

// Cap por valor — defiende contra cookies oversized (límite browser ~4KB total)
const MAX_PARAM_LENGTH = 200;
// Cap del cookie payload completo — si excede, no escribimos (silent failure mejor que cookie corrupta)
const MAX_COOKIE_PAYLOAD = 3500;

// ─── Tipos ──────────────────────────────────────────────────────

export interface AttributionData {
  source: string | null;
  medium: string | null;
  campaign: string | null;
  term: string | null;
  content: string | null;
  fbclid: string | null;
  ttclid: string | null;
  gclid: string | null;
  landingPage: string | null;
  referrer: string | null;
  capturedAt: string;
}

export interface AttributionPayload {
  anonymousId: string;
  firstTouch: AttributionData | null;
  lastTouch: AttributionData | null;
}

// ─── Helpers internos ───────────────────────────────────────────

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

function generateUUID(): string {
  if (isBrowser() && typeof crypto !== 'undefined') {
    if (crypto.randomUUID) return crypto.randomUUID();
    // Fallback usando getRandomValues (cripto-seguro, navegadores sin randomUUID)
    if (crypto.getRandomValues) {
      const bytes = new Uint8Array(16);
      crypto.getRandomValues(bytes);
      bytes[6] = (bytes[6] & 0x0f) | 0x40;
      bytes[8] = (bytes[8] & 0x3f) | 0x80;
      const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
      return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    }
  }
  // Fallback final (último recurso, no debería ejecutarse en navegadores modernos)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Limpia un valor de URL param: cap de longitud, strip control chars.
 * No previene XSS aguas abajo — eso es responsabilidad del consumidor.
 * Solo evita que basura/ataques rompan la persistencia client-side.
 */
function sanitizeParam(value: string | null): string | null {
  if (!value) return null;
  // eslint-disable-next-line no-control-regex
  const stripped = value.replace(/[\x00-\x1F\x7F]/g, '').trim();
  if (!stripped) return null;
  return stripped.length > MAX_PARAM_LENGTH ? stripped.slice(0, MAX_PARAM_LENGTH) : stripped;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function setCookie(name: string, value: string, days: number) {
  if (!isBrowser()) return;
  // Reject silenciosamente si el payload es demasiado grande para evitar cookie corrupta
  if (value.length > MAX_COOKIE_PAYLOAD) return;

  const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
  // Secure solo si estamos en HTTPS (producción). En localhost (HTTP) sin Secure para dev.
  const isHttps = window.location.protocol === 'https:';
  const secureFlag = isHttps ? '; Secure' : '';
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax${secureFlag}`;
}

function getCookie(name: string): string | null {
  if (!isBrowser()) return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${escapeRegex(name)}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function safeJSONParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function readStorage(key: string): string | null {
  if (!isBrowser()) return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    // Safari modo privado puede tirar QuotaExceeded
    return null;
  }
}

function writeStorage(key: string, value: string) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Silently ignore — Safari private mode, storage full, etc.
  }
}

function readSession(key: string): string | null {
  if (!isBrowser()) return null;
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeSession(key: string, value: string) {
  if (!isBrowser()) return;
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

// ─── API pública ────────────────────────────────────────────────

/**
 * Devuelve el anonymousId del visitante. Lo crea si no existe.
 * Persiste en localStorage hasta que el user limpie storage.
 */
export function getOrCreateAnonymousId(): string {
  if (!isBrowser()) return '';
  const existing = readStorage(STORAGE_ANONYMOUS_ID);
  if (existing) return existing;
  const newId = generateUUID();
  writeStorage(STORAGE_ANONYMOUS_ID, newId);
  return newId;
}

/**
 * Lee UTMs y click_ids de la URL actual.
 * Devuelve null si no hay ninguno (no contamina con datos vacíos).
 */
function readAttributionFromURL(): AttributionData | null {
  if (!isBrowser()) return null;

  const params = new URLSearchParams(window.location.search);

  const source = sanitizeParam(params.get('utm_source'));
  const medium = sanitizeParam(params.get('utm_medium'));
  const campaign = sanitizeParam(params.get('utm_campaign'));
  const term = sanitizeParam(params.get('utm_term'));
  const content = sanitizeParam(params.get('utm_content'));
  const fbclid = sanitizeParam(params.get('fbclid'));
  const ttclid = sanitizeParam(params.get('ttclid'));
  const gclid = sanitizeParam(params.get('gclid'));

  // Si no hay NI UTMs NI click IDs, no es tráfico atribuible — no creamos registro
  const hasAnything =
    source || medium || campaign || term || content || fbclid || ttclid || gclid;
  if (!hasAnything) return null;

  // Referrer también con cap (URLs largas con session tokens, etc.)
  const referrer = sanitizeParam(document.referrer || null);
  const landingPage = sanitizeParam(window.location.pathname);

  return {
    source,
    medium,
    campaign,
    term,
    content,
    fbclid,
    ttclid,
    gclid,
    landingPage,
    referrer,
    capturedAt: new Date().toISOString(),
  };
}

/**
 * Captura UTM/click_ids del URL actual y persiste:
 *  - first-touch en cookie 90d (NO sobrescribe si ya existe)
 *  - last-touch en sessionStorage (siempre actualiza)
 *
 * Llamada principal. Idempotente — segura de invocar múltiples veces.
 * Re-invocar después de SPA navigation (Next router push) refresca last-touch.
 */
export function captureAttribution(): void {
  if (!isBrowser()) return;

  // Asegurar anonymousId existe (para futuro tracking)
  getOrCreateAnonymousId();

  const current = readAttributionFromURL();
  if (!current) return;

  // First-touch: solo si NO existe ya
  const existingFirstTouch = getCookie(COOKIE_FIRST_TOUCH);
  if (!existingFirstTouch) {
    setCookie(COOKIE_FIRST_TOUCH, JSON.stringify(current), FIRST_TOUCH_TTL_DAYS);
  }

  // Last-touch: siempre actualizar
  writeSession(STORAGE_LAST_TOUCH, JSON.stringify(current));
}

/**
 * Devuelve el payload completo para enviar al backend cuando un user se registre.
 * Usado por el flujo mobile (deeplink → register endpoint).
 */
export function getAttributionPayload(): AttributionPayload {
  return {
    anonymousId: getOrCreateAnonymousId(),
    firstTouch: safeJSONParse<AttributionData>(getCookie(COOKIE_FIRST_TOUCH)),
    lastTouch: safeJSONParse<AttributionData>(readSession(STORAGE_LAST_TOUCH)),
  };
}

/**
 * Genera un event_id UUID para deduplicación entre Pixel cliente y Conversion API server.
 * El MISMO event_id debe pasarse al fbq('track', ..., {eventID}) y al server.
 */
export function generateEventId(): string {
  return generateUUID();
}
