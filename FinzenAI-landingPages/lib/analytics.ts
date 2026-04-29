import { generateEventId } from './attribution';

// IDs públicos — leídos desde env vars en build time. Si faltan, los helpers no-op
// silenciosamente en lugar de romper la app.
const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;
const TIKTOK_PIXEL_ID = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID;

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
 * Si no se pasa eventID, generamos uno y lo retornamos para que el caller
 * lo pueda mandar al backend (que mirror el evento via CAPI).
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
 * Mismo patrón que Meta: genera UUID si no se pasa, lo retorna para mirror server-side.
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

// ─── GA4 Events ─────────────────────────────────────────────────

export function trackDownloadIOS(location: string) {
  gtag('event', 'click_download_ios', { location });
  // Mirror a Meta + TikTok con MISMO event_id para que el backend pueda dedupar
  const eventId = generateEventId();
  trackMetaLead({ location, platform: 'ios' }, eventId);
  trackTiktokClickButton({ button_text: 'Download iOS', location }, eventId);
  return eventId;
}

export function trackDownloadAndroid(location: string) {
  gtag('event', 'click_download_android', { location });
  const eventId = generateEventId();
  trackMetaLead({ location, platform: 'android' }, eventId);
  trackTiktokClickButton({ button_text: 'Download Android', location }, eventId);
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
  return eventId;
}

export function trackFAQExpand(questionId: string) {
  gtag('event', 'faq_expand', { question_id: questionId });
}

export function trackCTAImpression(ctaId: string, location: string) {
  gtag('event', 'cta_impression', { cta_id: ctaId, location });
}

// ─── Meta Pixel Events ──────────────────────────────────────────

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

// ─── TikTok Pixel Events ────────────────────────────────────────

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
