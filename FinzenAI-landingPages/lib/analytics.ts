// GA4 Measurement ID — replace with real ID
const GA_MEASUREMENT_ID = 'G-XXXXXXXXXX';
// Meta Pixel ID — replace with real ID
const META_PIXEL_ID = 'XXXXXXXXXX';

// ─── GA4 Helpers ────────────────────────────────────────────────

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

function gtag(...args: unknown[]) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag(...args);
  }
}

export function trackDownloadIOS(location: string) {
  gtag('event', 'click_download_ios', { location });
  trackMetaLead();
}

export function trackDownloadAndroid(location: string) {
  gtag('event', 'click_download_android', { location });
  trackMetaLead();
}

export function trackScrollSection(sectionName: string) {
  gtag('event', 'scroll_section', { section_name: sectionName });
}

export function trackPricingPlan(plan: string) {
  gtag('event', 'click_pricing_plan', { plan });
}

export function trackFAQExpand(questionId: string) {
  gtag('event', 'faq_expand', { question_id: questionId });
}

export function trackCTAImpression(ctaId: string, location: string) {
  gtag('event', 'cta_impression', { cta_id: ctaId, location });
}

// ─── Meta Pixel Helpers ─────────────────────────────────────────

function trackMetaLead() {
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('track', 'Lead');
  }
}

export { GA_MEASUREMENT_ID, META_PIXEL_ID };
