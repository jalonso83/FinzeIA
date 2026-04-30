import { generateEventId, getAttributionPayload } from './attribution';

// IDs públicos — leídos desde env vars en build time. Si faltan, los helpers no-op
// silenciosamente en lugar de romper la app.
const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;
const TIKTOK_PIXEL_ID = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID;

// Backend que recibe los eventos para mirror server-side a Meta CAPI + TikTok Events API.
// Default a producción Railway si no se setea.
const BACKEND_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  'https://finzenai-backend-production.up.railway.app';

// ─── Window typings ─────────────────────────────────────────────

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
    ttq?: {
      track: (event: string, params?: Record<string, unknown>, options?: { event_id?: string }) => void;
      page: () => void;
      [key: string]: unknown;
    };
  }
}

// ─── Internal helpers ───────────────────────────────────────────

function gtag(...args: unknown[]) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag(...args);
  }
}

/**
 * Llama fbq con eventID para deduplicación con Conversion API server-side.
 */
function fbqTrack(
  eventName: string,
  params: Record<string, unknown> = {},
  eventID?: string,
): string | undefined {
  if (typeof window === 'undefined' || !window.fbq) return;
  const id = eventID ?? generateEventId();
  window.fbq('track', eventName, params, { eventID: id });
  return id;
}

/**
 * TikTok track con event_id para deduplicación con Events API server-side.
 */
function ttqTrack(
  eventName: string,
  params: Record<string, unknown> = {},
  eventID?: string,
): string | undefined {
  if (typeof window === 'undefined' || !window.ttq) return;
  const id = eventID ?? generateEventId();
  window.ttq.track(eventName, params, { event_id: id });
  return id;
}

/**
 * POSTea el evento al backend para mirror server-side via Meta CAPI + TikTok Events API.
 *
 * Fire-and-forget: NO bloquea la navegación del browser. Usa fetch con keepalive=true
 * para que el request sobreviva si el user navega a otra página inmediatamente
 * después del click (igual concepto que sendBeacon).
 *
 * Si el backend falla (CORS, network, etc.) loguea warning en console pero NO rompe
 * la UX. El Pixel cliente sigue funcionando independientemente.
 */
function postToBackend(
  eventName: 'PageView' | 'ViewContent' | 'Lead' | 'ClickButton' | 'InitiateCheckout',
  eventId: string,
  customData?: Record<string, string | number | boolean>,
): void {
  if (typeof window === 'undefined') return;

  const attribution = getAttributionPayload();
  const lastTouch = attribution.lastTouch;
  const firstTouch = attribution.firstTouch;

  const payload = {
    eventName,
    eventId,
    anonymousId: attribution.anonymousId || undefined,
    source: lastTouch?.source ?? firstTouch?.source ?? null,
    medium: lastTouch?.medium ?? firstTouch?.medium ?? null,
    campaign: lastTouch?.campaign ?? firstTouch?.campaign ?? null,
    fbclid: lastTouch?.fbclid ?? firstTouch?.fbclid ?? null,
    ttclid: lastTouch?.ttclid ?? firstTouch?.ttclid ?? null,
    gclid: lastTouch?.gclid ?? firstTouch?.gclid ?? null,
    pageUrl: window.location.href,
    referrerUrl: document.referrer || null,
    customData,
  };

  // fire-and-forget — no await, errores van a console
  fetch(`${BACKEND_URL}/api/events/track`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    keepalive: true, // sobrevive a navegación del browser
    credentials: 'omit', // no enviar cookies (endpoint público)
  }).catch((err) => {
    if (typeof console !== 'undefined') {
      console.warn('[analytics] Backend track failed (no rompe Pixel cliente):', err);
    }
  });
}

// ─── GA4 + multiplataforma Events ───────────────────────────────

export function trackDownloadIOS(location: string) {
  gtag('event', 'click_download_ios', { location });
  const eventId = generateEventId();
  // Pixel cliente
  trackMetaLead({ location, platform: 'ios' }, eventId);
  trackTiktokClickButton({ button_text: 'Download iOS', location }, eventId);
  // Mirror server-side al backend
  postToBackend('Lead', eventId, { location, platform: 'ios' });
  return eventId;
}

export function trackDownloadAndroid(location: string) {
  gtag('event', 'click_download_android', { location });
  const eventId = generateEventId();
  trackMetaLead({ location, platform: 'android' }, eventId);
  trackTiktokClickButton({ button_text: 'Download Android', location }, eventId);
  postToBackend('Lead', eventId, { location, platform: 'android' });
  return eventId;
}

export function trackScrollSection(sectionName: string) {
  gtag('event', 'scroll_section', { section_name: sectionName });
}

export function trackPricingPlan(plan: string) {
  gtag('event', 'click_pricing_plan', { plan });
  const eventId = generateEventId();
  trackMetaInitiateCheckout({ plan }, eventId);
  trackTiktokClickButton({ button_text: `Plan ${plan}`, location: 'pricing' }, eventId);
  postToBackend('InitiateCheckout', eventId, { plan, location: 'pricing' });
  return eventId;
}

export function trackFAQExpand(questionId: string) {
  gtag('event', 'faq_expand', { question_id: questionId });
}

export function trackCTAImpression(ctaId: string, location: string) {
  gtag('event', 'cta_impression', { cta_id: ctaId, location });
}

// ─── Meta Pixel Events (low-level, sin mirror) ──────────────────

export function trackMetaLead(
  params: Record<string, unknown> = {},
  eventID?: string,
): string | undefined {
  return fbqTrack('Lead', params, eventID);
}

export function trackMetaInitiateCheckout(
  params: Record<string, unknown> = {},
  eventID?: string,
): string | undefined {
  return fbqTrack('InitiateCheckout', params, eventID);
}

export function trackMetaViewContent(
  params: Record<string, unknown> = {},
  eventID?: string,
): string | undefined {
  return fbqTrack('ViewContent', params, eventID);
}

// ─── TikTok Pixel Events (low-level, sin mirror) ────────────────

export function trackTiktokClickButton(
  params: Record<string, unknown> = {},
  eventID?: string,
): string | undefined {
  return ttqTrack('ClickButton', params, eventID);
}

export function trackTiktokViewContent(
  params: Record<string, unknown> = {},
  eventID?: string,
): string | undefined {
  return ttqTrack('ViewContent', params, eventID);
}

export function trackTiktokInitiateCheckout(
  params: Record<string, unknown> = {},
  eventID?: string,
): string | undefined {
  return ttqTrack('InitiateCheckout', params, eventID);
}

export { GA_MEASUREMENT_ID, META_PIXEL_ID, TIKTOK_PIXEL_ID };
