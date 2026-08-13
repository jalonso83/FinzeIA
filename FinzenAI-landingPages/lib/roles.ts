// ─── Roles y control de acceso del dashboard ────────────────────────────────
// Fuente ÚNICA de verdad para qué ve/puede cada rol. La usan:
//   - login (server): resolver el rol por email.
//   - middleware (edge): bloquear rutas de página por rol.
//   - proxy /api/admin/[...path] (server): bloquear/redactar endpoints por rol.
//   - layout / páginas (client): filtrar navegación y ocultar widgets.
//
// Modelo de amenaza: empleados de confianza. El enforcement REAL (que el dato no
// llegue al navegador) vive en el proxy (bloqueo 403 + redacción de campos). El
// filtrado de UI es cosmético encima de eso.

export type Role = 'admin' | 'marketing';

// ── Resolución de rol por email (solo server; usa process.env) ───────────────
const FALLBACK_ADMIN_EMAILS = ['jalonso83@gmail.com', 'junior.urena15@gmail.com'];

function parseEmails(env?: string): string[] {
  if (!env || !env.trim()) return [];
  return env.split(',').map((e) => e.trim().toLowerCase().replace(/\r/g, '')).filter(Boolean);
}

export function getAdminEmails(): string[] {
  const e = parseEmails(process.env.ADMIN_EMAILS);
  return e.length ? e : FALLBACK_ADMIN_EMAILS;
}

export function getMarketingEmails(): string[] {
  return parseEmails(process.env.MARKETING_EMAILS);
}

/** Devuelve el rol del email o null si no está autorizado. Admin gana sobre marketing. */
export function getRoleForEmail(email: string): Role | null {
  const e = email.toLowerCase().trim();
  if (getAdminEmails().includes(e)) return 'admin';
  if (getMarketingEmails().includes(e)) return 'marketing';
  return null;
}

/** Decodifica el email del JWT (sin verificar firma — solo para decidir gating;
 *  el backend valida la firma en la llamada real). Funciona en edge y node. */
function emailFromToken(token: string): string | null {
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const b64 = part.replace(/-/g, '+').replace(/_/g, '/');
    const json = typeof atob !== 'undefined' ? atob(b64) : Buffer.from(b64, 'base64').toString('utf8');
    const payload = JSON.parse(json) as { email?: string };
    return payload.email ?? null;
  } catch {
    return null;
  }
}

/** Rol autoritativo para ENFORCEMENT: derivado del email dentro del admin-token.
 *  A diferencia de una cookie de rol, el usuario no puede forjarlo (un token con
 *  otro email lo rechaza el backend). Fail-closed: si no se resuelve → 'marketing'. */
export function getRoleFromToken(token: string | undefined): Role {
  if (!token) return 'marketing';
  const email = emailFromToken(token);
  if (!email) return 'marketing';
  return getRoleForEmail(email) ?? 'marketing';
}

// ── Política de acceso (pura; segura para client y edge) ─────────────────────

// Rutas de página (bajo /dashboard) que el rol marketing NO puede abrir.
const MARKETING_BLOCKED_SECTIONS = ['/dashboard/usuarios', '/dashboard/feedback'];

/** ¿El rol puede abrir esta ruta de /dashboard? */
export function canAccessSection(role: Role, pathname: string): boolean {
  if (role === 'admin') return true;
  return !MARKETING_BLOCKED_SECTIONS.some((s) => pathname === s || pathname.startsWith(s + '/'));
}

// Endpoints de /api/admin/<path> que el rol marketing NO puede consumir.
// PII de usuarios individuales + finanzas internas detalladas.
// Nota: TODA subruta users/* (list, countries, resend-verification-bulk, ...) se
// bloquea aparte; solo el agregado exacto `users` (cohortes/funnel) está permitido.
const MARKETING_BLOCKED_API = [
  'feedback',          // buzón con PII
  'revenue',           // MRR, Stripe/RevenueCat, ARPU
  'unit-economics',    // márgenes, costos internos, break-even
  'financial-health',  // burn, runway
  'openai-costs',      // costos internos de IA
  'dashboard/pdf',     // PDF con TODAS las finanzas + PII (se genera con todos los tabs)
  'grants',            // concesiones de plan: devuelve correo y nombre de cada usuario
];

/** Normaliza el path del proxy (quita slashes de borde). */
function normalizeApiPath(apiPath: string): string {
  return apiPath.replace(/^\/+/, '').replace(/\/+$/, '');
}

/** ¿El rol puede consumir este endpoint /api/admin/<path>? */
export function canAccessApi(role: Role, apiPath: string): boolean {
  if (role === 'admin') return true;
  const p = normalizeApiPath(apiPath);
  // Users: solo el agregado exacto (cohortes/funnel). Cualquier subruta = PII.
  if (p === 'users') return true;
  if (p === 'users' || p.startsWith('users/')) return false;
  return !MARKETING_BLOCKED_API.some((b) => p === b || p.startsWith(b + '/'));
}

// Redacción de campos sensibles en endpoints permitidos.
// `pulse` sí lo ve marketing (usuarios/país/retención/conversión), pero se le
// quitan los números financieros del payload ANTES de mandarlo al navegador.
const MARKETING_REDACT: Record<string, string[]> = {
  pulse: ['mrrEstimated'],
};

/** Campos a borrar del `data` para este rol+endpoint (o [] si ninguno). */
export function fieldsToRedact(role: Role, apiPath: string): string[] {
  if (role === 'admin') return [];
  return MARKETING_REDACT[normalizeApiPath(apiPath)] ?? [];
}

// Sub-pestañas de la página Detalles que ve cada rol (ids del array `tabs`).
const MARKETING_DETALLES_TABS = ['usuarios', 'adquisicion', 'engagement', 'experimentos'];

/** ¿El rol ve esta sub-pestaña de Detalles? (bloquea revenue/economics/salud a marketing) */
export function canSeeDetallesTab(role: Role, tabId: string): boolean {
  if (role === 'admin') return true;
  return MARKETING_DETALLES_TABS.includes(tabId);
}

/** ¿El rol ve widgets financieros (banner MRR/runway, costos)? */
export function canSeeFinancials(role: Role): boolean {
  return role === 'admin';
}

// ── Lectura del rol en el cliente (desde la cookie admin-user) ───────────────
/** Lee el rol desde la cookie `admin-user` (client-side). Default 'admin' si falta
 *  (retrocompat: solo los fundadores tienen sesiones previas sin rol). */
export function getClientRole(): Role {
  if (typeof document === 'undefined') return 'admin';
  try {
    const cookie = document.cookie.split('; ').find((c) => c.startsWith('admin-user='));
    if (!cookie) return 'admin';
    const value = decodeURIComponent(cookie.split('=').slice(1).join('='));
    const parsed = JSON.parse(value) as { role?: Role };
    return parsed.role === 'marketing' ? 'marketing' : 'admin';
  } catch {
    return 'admin';
  }
}
