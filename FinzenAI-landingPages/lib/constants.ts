// ─── Store Links ────────────────────────────────────────────────

const APP_STORE_BASE = 'https://apps.apple.com/app/finzen-ai/id0000000000';
const PLAY_STORE_BASE =
  'https://play.google.com/store/apps/details?id=com.jl.alonso.finzenaimobile';

export function getAppStoreLink(section: string) {
  return `${APP_STORE_BASE}?utm_source=website&utm_medium=${section}&utm_campaign=launch`;
}

export function getPlayStoreLink(section: string) {
  return `${PLAY_STORE_BASE}&utm_source=website&utm_medium=${section}&utm_campaign=launch`;
}

// ─── Section IDs ────────────────────────────────────────────────

export const SECTION_IDS = [
  'hero',
  'pain-points',
  'solution',
  'features',
  'zenio',
  'how-it-works',
  'pricing',
  'use-cases',
  'faq',
  'final-cta',
] as const;

// ─── Navbar Links ───────────────────────────────────────────────

export const NAV_LINKS = [
  { label: 'Características', href: '#features' },
  { label: 'Zenio AI', href: '#zenio' },
  { label: 'Precios', href: '#pricing' },
  { label: 'FAQ', href: '#faq' },
];

// ─── Contact & Social ───────────────────────────────────────────

export const CONTACT_EMAIL = 'hola@finzenai.com';
export const INSTAGRAM_HANDLE = '@finzenai';
export const INSTAGRAM_URL = 'https://instagram.com/finzenai';
export const COMPANY_NAME = 'Abundance Lab LLC';
export const COPYRIGHT_YEAR = 2026;
