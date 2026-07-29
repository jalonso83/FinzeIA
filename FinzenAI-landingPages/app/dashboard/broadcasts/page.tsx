'use client';

// ─────────────────────────────────────────────────────────────────────────
// Notificaciones masivas (broadcast) — conectado al backend real.
// Composer split con preview en vivo + estimador real (/preview) + envío real
// (/broadcasts + /:id/send). Incluye "Modo prueba" para enviar SOLO al admin.
// ─────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import {
  Megaphone, Send, Bell, Save, AlertTriangle, Check, ChevronRight, ChevronLeft, X,
  Clock, Smartphone, Apple, Plus, Sparkles, Tag, Settings2, Loader2, Bot, Trash2,
} from 'lucide-react';
import {
  previewBroadcast, createBroadcast, sendBroadcastById, fetchBroadcasts, fetchBroadcastStats,
  approveBroadcastById, rejectBroadcastById, deleteBroadcastById,
  activateBroadcastById, deactivateBroadcastById,
  type BroadcastAudience, type BroadcastItem, type BroadcastSendResult, type BroadcastStats,
} from '@/lib/dashboard-api';

type BroadcastType = 'ANNOUNCEMENT' | 'MARKETING' | 'SYSTEM';
type Plan = 'FREE' | 'PREMIUM' | 'PRO';
type Platform = 'IOS' | 'ANDROID';
type Segment = 'never_activated' | 'dormant' | 'active' | 'trial_available';
type DormantDays = '7' | '14' | '30';

const TYPE_META: Record<BroadcastType, { label: string; desc: string; icon: typeof Sparkles; chip: string }> = {
  ANNOUNCEMENT: { label: 'Anuncio', desc: 'Novedades y cambios de producto', icon: Sparkles, chip: 'bg-blue-100 text-blue-700' },
  MARKETING: { label: 'Promoción', desc: 'Ofertas, descuentos, upgrade', icon: Tag, chip: 'bg-emerald-100 text-emerald-700' },
  SYSTEM: { label: 'Sistema', desc: 'Mantenimiento, avisos críticos', icon: Settings2, chip: 'bg-gray-100 text-gray-600' },
};

const SEGMENT_META: Record<Segment, { label: string; desc: string }> = {
  never_activated: { label: 'Nunca activó', desc: 'Registrado, 0 transacciones de por vida' },
  dormant: { label: 'Dormidos', desc: 'Tuvo actividad, pero nada en el umbral elegido' },
  active: { label: 'Activos', desc: 'Actividad reciente (para anuncios / promos)' },
  trial_available: { label: 'Prueba sin usar', desc: 'FREE que nunca activó sus 7 días gratis (no pedimos tarjeta)' },
};

const DORMANT_OPTIONS: { value: DormantDays; label: string }[] = [
  { value: '7', label: '7 días' },
  { value: '14', label: '14 días' },
  { value: '30', label: '30 días' },
];

const SCREEN_OPTIONS = [
  { value: '', label: 'Abrir la app (sin pantalla específica)' },
  { value: 'Zenio', label: 'Zenio (chat IA)' },
  { value: 'Subscriptions', label: 'Suscripciones / Upgrade' },
  { value: 'Transactions', label: 'Transacciones' },
  { value: 'Budgets', label: 'Presupuestos' },
  { value: 'Goals', label: 'Metas' },
  { value: 'AntExpenseDetective', label: 'Detector de gastos hormiga' },
];

// Destinos que el SLOT del dashboard sabe abrir (= Action Registry del móvil,
// AnnouncementSlot.tsx KNOWN_ACTIONS). Push soporta más; el slot solo estos. Si el
// admin elige otro destino para el slot, el botón no se mostrará ahí.
const SLOT_ACTIONS = ['Transactions', 'Budgets', 'Goals', 'Subscriptions'];

const COUNTRY_OPTIONS = ['Todos', 'República Dominicana', 'México', 'Colombia', 'Estados Unidos', 'España'];

const TITLE_MAX = 100;
const BODY_MAX = 200;

const STATUS_META: Record<string, { label: string; chip: string }> = {
  PENDING_APPROVAL: { label: 'Propuesta del agente', chip: 'bg-amber-100 text-amber-700' },
  REJECTED: { label: 'Rechazada', chip: 'bg-gray-200 text-gray-500' },
  DRAFT: { label: 'Borrador', chip: 'bg-gray-100 text-gray-600' },
  SENDING: { label: 'Enviando', chip: 'bg-blue-100 text-blue-700' },
  SENT: { label: 'Enviado', chip: 'bg-emerald-100 text-emerald-700' },
  FAILED: { label: 'Falló', chip: 'bg-red-100 text-red-700' },
  ACTIVE: { label: 'Activa (siempre encendida)', chip: 'bg-teal-100 text-teal-700' },
  ENDED: { label: 'Apagada', chip: 'bg-gray-200 text-gray-500' },
};

// Nombres legibles de los segmentos del catálogo del agente (Agent API).
const AGENT_SEGMENT_LABELS: Record<string, string> = {
  never_activated: 'Nunca activados',
  dormant: 'Dormidos',
  active: 'Activos',
  budget_exceeded: 'Presupuesto excedido',
  trial_ending: 'Trial por vencer',
  trial_available: 'Prueba sin usar',
};

// ─── Vista previa del push (teléfono) ────────────────────────────────────
function PhonePreview({ title, body, type }: { title: string; body: string; type: BroadcastType }) {
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-[260px] h-[520px] rounded-[2.5rem] bg-finzen-black p-3 shadow-xl">
        <div className="absolute left-1/2 -translate-x-1/2 top-3 w-28 h-5 bg-finzen-black rounded-b-2xl z-10" />
        <div className="w-full h-full rounded-[2rem] bg-gradient-to-b from-slate-700 to-slate-900 overflow-hidden flex flex-col items-center pt-14 px-3">
          <p className="text-white text-5xl font-light tracking-tight mt-1">9:41</p>
          <p className="text-white/70 text-xs mt-0.5 mb-5">jueves 5 de junio</p>
          <div className="w-full rounded-2xl bg-white/95 backdrop-blur px-3 py-2.5 shadow-lg">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-5 h-5 rounded-md bg-finzen-blue flex items-center justify-center shrink-0">
                <Bell size={11} className="text-white" />
              </div>
              <span className="text-[11px] font-semibold text-finzen-black">FinZen AI</span>
              <span className="text-[10px] text-finzen-gray ml-auto">ahora</span>
            </div>
            <p className="text-[12px] font-semibold text-finzen-black leading-tight break-words">
              {title || 'Título de tu mensaje'}
            </p>
            <p className="text-[11px] text-finzen-gray leading-snug mt-0.5 break-words">
              {body || 'Aquí aparece el cuerpo del mensaje tal como lo verá el usuario.'}
            </p>
          </div>
        </div>
      </div>
      <p className="text-xs text-finzen-gray mt-3 flex items-center gap-1.5">
        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${TYPE_META[type].chip}`}>
          {TYPE_META[type].label}
        </span>
        Así lo verá el usuario
      </p>
    </div>
  );
}

// ─── Vista previa del slot (mini-dashboard) ──────────────────────────────
function SlotPreview({ title, body, ctaLabel, screen, type }: { title: string; body: string; ctaLabel: string; screen: string; type: BroadcastType }) {
  const accent = type === 'MARKETING'
    ? { bg: '#ecfdf5', border: '#a7f3d0', btn: '#059669' }
    : type === 'SYSTEM'
      ? { bg: '#fffbeb', border: '#fde68a', btn: '#d97706' }
      : { bg: '#eff6ff', border: '#bfdbfe', btn: '#2563EB' };
  return (
    <div className="flex flex-col items-center">
      <div className="w-[260px] rounded-2xl border border-finzen-gray/20 bg-finzen-white overflow-hidden shadow-sm">
        {/* header mock con el chip de plan */}
        <div className="flex items-center justify-between px-3 py-2 bg-white border-b border-finzen-gray/10">
          <span className="text-[10px] font-medium text-finzen-gray">🆓 Gratis ⌄</span>
          <span className="text-[10px] text-finzen-gray">🔔 (J)</span>
        </div>
        <div className="p-2.5 space-y-2">
          {/* banner del slot */}
          <div className="rounded-xl border p-2.5" style={{ backgroundColor: accent.bg, borderColor: accent.border }}>
            <p className="text-[12px] font-bold text-finzen-black leading-tight break-words">{title || 'Título del mensaje'}</p>
            {body ? <p className="text-[11px] text-finzen-gray leading-snug mt-0.5 break-words">{body}</p> : null}
            {screen && SLOT_ACTIONS.includes(screen) ? (
              <span className="mt-2 inline-flex items-center gap-1 rounded-md px-2.5 py-1" style={{ backgroundColor: accent.btn }}>
                <span className="text-[11px] font-semibold text-white">{ctaLabel || 'Ver'}</span>
                <span className="text-white text-[11px]">›</span>
              </span>
            ) : null}
          </div>
          {/* resto del dash atenuado */}
          <div className="rounded-lg bg-white border border-finzen-gray/10 p-2 opacity-50">
            <p className="text-[10px] text-finzen-gray">Balance Actual…</p>
          </div>
        </div>
      </div>
      <p className="text-xs text-finzen-gray mt-3 flex items-center gap-1.5">
        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${TYPE_META[type].chip}`}>
          {TYPE_META[type].label}
        </span>
        En el slot del dashboard
      </p>
    </div>
  );
}

// ─── Modal de confirmación con countdown ─────────────────────────────────
function ConfirmModal({
  target, type, audienceLabel, singleTarget, sending, evergreen, onCancel, onConfirm,
}: {
  target: number; type: BroadcastType; audienceLabel: string; singleTarget: boolean; sending: boolean;
  evergreen?: boolean;
  onCancel: () => void; onConfirm: () => void;
}) {
  const [seconds, setSeconds] = useState(singleTarget || evergreen ? 0 : 5);
  useEffect(() => {
    if (seconds <= 0) return;
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  if (evergreen) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
        <div className="w-full max-w-md rounded-xl bg-white shadow-2xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <Megaphone size={20} className="text-teal-600" />
            <h3 className="text-lg font-bold text-finzen-black">Activar campaña siempre encendida</h3>
          </div>
          <p className="text-sm text-finzen-black">
            A partir de ahora, <span className="font-semibold">cada usuario nuevo</span> verá este slot en el dashboard al entrar por primera vez. La campaña se irá inscribiendo sola; puedes apagarla cuando quieras desde el historial.
          </p>
          <p className="text-xs text-finzen-gray mt-1">{TYPE_META[type].label} · Slot del dashboard · Disparador: primera entrada</p>
          <div className="flex items-center justify-end gap-2 mt-5">
            <button
              onClick={onCancel}
              disabled={sending}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-finzen-gray/20 text-finzen-gray hover:bg-finzen-white transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              disabled={sending}
              className="px-4 py-2 text-sm font-medium rounded-lg text-white bg-teal-600 hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              {sending ? <><Loader2 size={14} className="animate-spin" /> Activando…</> : <><Check size={14} /> Activar campaña</>}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-2xl p-6">
        <div className="flex items-center gap-2 mb-3">
          {singleTarget
            ? <Megaphone size={20} className="text-finzen-blue" />
            : <AlertTriangle size={20} className="text-finzen-red" />}
          <h3 className="text-lg font-bold text-finzen-black">{singleTarget ? 'Confirmar envío dirigido' : 'Confirmar envío'}</h3>
        </div>
        <p className="text-sm text-finzen-black">
          {singleTarget ? 'Vas a enviar este mensaje a ' : 'Estás por enviar a '}
          <span className="font-bold text-finzen-blue">{target.toLocaleString('es')}</span>
          {singleTarget ? ' destinatario(s).' : ' usuarios.'}
        </p>
        <p className="text-xs text-finzen-gray mt-1">{TYPE_META[type].label} · {audienceLabel}</p>
        {!singleTarget && (
          <div className="mt-3 rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-700">
            Esta acción no se puede deshacer y envía push real a usuarios.
          </div>
        )}
        <div className="flex items-center justify-end gap-2 mt-5">
          <button
            onClick={onCancel}
            disabled={sending}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-finzen-gray/20 text-finzen-gray hover:bg-finzen-white transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={seconds > 0 || sending}
            className={`px-4 py-2 text-sm font-medium rounded-lg text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 ${
              singleTarget ? 'bg-finzen-blue hover:bg-blue-700' : 'bg-finzen-red hover:bg-red-600'
            }`}
          >
            {sending
              ? <><Loader2 size={14} className="animate-spin" /> Enviando…</>
              : seconds > 0
                ? <><Clock size={14} /> Enviar ({seconds}s)</>
                : <><Send size={14} /> {singleTarget ? 'Enviar' : 'Enviar ahora'}</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Criterios de una campaña evergreen ──────────────────────────────────
// Una campaña siempre encendida NO se define por filtros de audiencia: el
// backend no consulta segmentos, inscribe usuario por usuario cuando dispara su
// trigger (ver enrollInEvergreen). Por eso su `audience` viene vacío, y pintar
// los bullets normales mostraba "Segmento: — · Planes: — · Plataforma: —", que
// se lee como "faltan datos" cuando la verdad es la contraria: entran todos.
const TRIGGER_LABELS: Record<string, string> = {
  first_app_entry: 'entra por primera vez a la app',
};

function evergreenCriteriaLines(b: BroadcastItem): string[] {
  const a = b.audience ?? ({} as BroadcastAudience);
  const lines = [
    `Disparador: ${b.trigger ? (TRIGGER_LABELS[b.trigger] ?? b.trigger) : 'sin disparador configurado'}`,
  ];

  // Hoy las evergreen no llevan filtros, pero si alguna los tuviera hay que
  // mostrarlos: decir "todos" cuando en realidad hay un filtro sería peor que
  // los guiones que esto vino a arreglar.
  const plans = a.plans ?? [];
  const platforms = a.platforms ?? [];
  const hasCountry = Boolean(a.country && a.country !== 'Todos');
  const hasFilters = plans.length > 0 || platforms.length > 0 || hasCountry;

  if (!hasFilters) {
    lines.push('Alcance: todos los usuarios nuevos, sin filtro de plan, plataforma ni país');
  } else {
    if (plans.length) lines.push(`Planes: ${plans.map((p) => (p === 'PREMIUM' ? 'Plus' : p === 'FREE' ? 'Free' : 'Pro')).join(', ')}`);
    if (platforms.length) lines.push(`Plataforma: ${platforms.map((p) => (p === 'IOS' ? 'iOS' : 'Android')).join(', ')}`);
    if (hasCountry) lines.push(`País: ${a.country}`);
  }

  lines.push('Cada usuario se inscribe una sola vez, en el momento en que dispara el evento');
  return lines;
}

// ─── Criterios de audiencia en lenguaje humano ───────────────────────────
// Traduce el JSON de audiencia guardado en la campaña (broadcast.audience) a
// bullets legibles: "quién exactamente recibió/recibirá esto".
function audienceCriteriaLines(b: BroadcastItem): string[] {
  const a = b.audience ?? ({} as BroadcastAudience);
  if (a.targetEmail) return [`Envío dirigido a un solo usuario: ${a.targetEmail}`];
  if (a.test) return ['Envío de prueba (solo al admin que lo creó)'];

  const segLabel = (s: string) => {
    switch (s) {
      case 'never_activated': return 'Nunca activaron (0 transacciones de por vida)';
      case 'dormant': return `Dormidos (sin actividad hace ${a.dormantDays ?? 14}+ días)`;
      case 'active': return `Activos (actividad en los últimos ${a.dormantDays ?? 14} días)`;
      case 'budget_exceeded': return 'Presupuesto excedido (gasto superó el monto de un presupuesto vigente)';
      case 'trial_ending': return `Trial por vencer (en los próximos ${a.trialEndingDays ?? 3} días)`;
      case 'trial_available': return 'Prueba sin usar (FREE que nunca activó sus 7 días gratis)';
      default: return s;
    }
  };
  const planName = (p: string) => (p === 'PREMIUM' ? 'Plus' : p === 'FREE' ? 'Free' : p === 'PRO' ? 'Pro' : p);
  const plans = a.plans ?? [];
  const platforms = a.platforms ?? [];

  return [
    `Segmento: ${(a.segments ?? []).map(segLabel).join('  ·  o  ·  ') || '—'}`,
    `Planes: ${plans.length >= 3 ? 'todos (Free, Plus, Pro)' : plans.map(planName).join(', ') || '—'}`,
    `Plataforma: ${platforms.length >= 2 ? 'iOS y Android' : platforms.map((p) => (p === 'IOS' ? 'iOS' : 'Android')).join(', ') || '—'}`,
    `País: ${a.country && a.country !== 'Todos' ? a.country : 'todos'}`,
  ];
}

// ─── Métricas de campaña (funnel + holdout) ──────────────────────────────
function FunnelBox({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="rounded-lg bg-finzen-white border border-finzen-gray/20 p-3 text-center">
      <p className="text-lg font-bold text-finzen-black">{value.toLocaleString('es')}</p>
      <p className="text-[11px] text-finzen-gray">{label}</p>
      {sub ? <p className="text-[11px] text-finzen-blue font-medium">{sub}</p> : null}
    </div>
  );
}

function CampaignStatsModal({ broadcast, onClose }: { broadcast: BroadcastItem; onClose: () => void }) {
  const [stats, setStats] = useState<BroadcastStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'efecto' | 'criterios'>('efecto');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchBroadcastStats(broadcast.id)
      .then((s) => { if (!cancelled) setStats(s); })
      .catch((e) => { if (!cancelled) setError(e?.message === 'UNAUTHORIZED' ? 'Sesión expirada.' : (e?.message || 'Error al cargar.')); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [broadcast.id]);

  const pct = (num: number, den: number) => (den > 0 ? Math.round((num / den) * 1000) / 10 : 0);

  // Una evergreen se describe por su disparador, no por filtros de audiencia.
  const isEvergreen = broadcast.mode === 'EVERGREEN';

  // Ventana post-envío (7d) aún abierta: los números "después" siguen creciendo.
  const daysSinceSend = broadcast.sentAt
    ? Math.floor((Date.now() - new Date(broadcast.sentAt).getTime()) / (24 * 60 * 60 * 1000))
    : null;
  const windowIncomplete = daysSinceSend !== null && daysSinceSend < 7;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-lg font-bold text-finzen-black">Efecto de la campaña</h3>
          <button onClick={onClose} className="text-finzen-gray hover:text-finzen-black"><X size={18} /></button>
        </div>
        <div className="mb-3 rounded-lg border border-finzen-gray/15 bg-finzen-white px-3 py-2.5">
          <p className="text-sm font-semibold text-finzen-black">{broadcast.title}</p>
          {broadcast.body ? (
            <p className="text-[13px] text-finzen-gray leading-snug mt-1 whitespace-pre-wrap">{broadcast.body}</p>
          ) : null}
        </div>

        {/* Tabs internos: efecto (métricas) / criterios (a quién se envió) */}
        <div className="flex items-center gap-1 bg-finzen-white rounded-lg p-1 border border-finzen-gray/20 w-fit mb-4">
          {([['efecto', 'Efecto'], ['criterios', 'Criterios de la campaña']] as const).map(([t, label]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                tab === t ? 'bg-white text-finzen-black shadow-sm' : 'text-finzen-gray hover:text-finzen-black'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'criterios' ? (
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold text-finzen-gray uppercase tracking-wider mb-2">
                {isEvergreen ? 'Se inscribe automáticamente a cada usuario que' : 'Se eligieron los usuarios que cumplen'}
              </p>
              <ul className="space-y-1.5">
                {(isEvergreen ? evergreenCriteriaLines(broadcast) : audienceCriteriaLines(broadcast)).map((line, i) => (
                  <li key={i} className="text-sm text-finzen-black flex items-start gap-2">
                    <Check size={14} className="text-finzen-blue mt-0.5 shrink-0" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold text-finzen-gray uppercase tracking-wider mb-2">
                {isEvergreen ? 'Configuración' : 'Configuración del envío'}
              </p>
              <ul className="space-y-1.5 text-sm text-finzen-black">
                <li>Superficie: {broadcast.surface === 'slot' ? 'slot del dashboard' : broadcast.surface === 'both' ? 'push + slot' : 'push'}</li>
                <li>
                  Holdout (control): {broadcast.holdoutPct ?? 0}%
                  {/* En evergreen el holdout no se reparte sobre una audiencia
                      calculada de golpe, sino usuario por usuario al inscribirse. */}
                  {isEvergreen && (broadcast.holdoutPct ?? 0) > 0 ? ' — se decide al inscribir a cada usuario' : ''}
                </li>
                <li>Tipo: {TYPE_META[broadcast.type]?.label ?? broadcast.type}</li>
                {isEvergreen && broadcast.activatedAt ? (
                  <li>Encendida: {new Date(broadcast.activatedAt).toLocaleDateString('es', { day: '2-digit', month: 'long', year: 'numeric' })}{!broadcast.endedAt ? ' · inscribiendo en vivo' : ''}</li>
                ) : null}
                {isEvergreen && broadcast.endedAt ? (
                  <li>Apagada: {new Date(broadcast.endedAt).toLocaleDateString('es', { day: '2-digit', month: 'long', year: 'numeric' })} — dejó de inscribir; los ya inscritos se siguen midiendo</li>
                ) : null}
                {!isEvergreen && broadcast.sentAt ? (
                  <li>Enviada: {new Date(broadcast.sentAt).toLocaleDateString('es', { day: '2-digit', month: 'long', year: 'numeric' })}</li>
                ) : null}
                {broadcast.createdBy === 'growth-agent' ? (
                  <li className="flex items-center gap-1.5"><Bot size={13} className="text-amber-600" /> Propuesta por el agente de crecimiento</li>
                ) : null}
              </ul>
            </div>
            <p className="text-[11px] text-finzen-gray">
              {isEvergreen
                ? 'Los usuarios con opt-out de este tipo de notificación se excluyen automáticamente al inscribirse.'
                : 'Los usuarios con opt-out de este tipo de notificación se excluyen automáticamente al enviar.'}
            </p>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="animate-spin text-finzen-blue" size={26} /></div>
        ) : error ? (
          <div className="text-center text-red-600 text-sm py-8">{error}</div>
        ) : stats ? (
          <div className="space-y-5">
            {stats.mode === 'EVERGREEN' && (
              <div className="rounded-lg border border-teal-200 bg-teal-50 px-3 py-2.5 text-[13px] text-teal-800">
                <span className="font-semibold">Campaña siempre encendida.</span>{' '}
                Inscritos hasta ahora: <span className="font-bold">{(stats.enrolled ?? 0).toLocaleString('es')}</span>.
                Cada usuario nuevo se inscribe al entrar; la ventana de 7 días de activación se mide desde la inscripción de cada uno.
              </div>
            )}
            {windowIncomplete && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-[12px] text-blue-800">
                ⏳ La ventana de medición de 7 días aún no se completa (van {daysSinceSend} {daysSinceSend === 1 ? 'día' : 'días'}).
                Las impresiones y el % de &quot;transaccionaron después&quot; seguirán subiendo — revisa de nuevo el{' '}
                {broadcast.sentAt ? new Date(new Date(broadcast.sentAt).getTime() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('es', { day: '2-digit', month: 'short' }) : ''}.
              </div>
            )}
            <div>
              <p className="text-xs font-semibold text-finzen-gray uppercase tracking-wider mb-2">Funnel del slot</p>
              <div className="grid grid-cols-3 gap-2">
                <FunnelBox label="Expuestos" value={stats.exposed} />
                <FunnelBox label="Impresiones" value={stats.impressions} sub={`${pct(stats.impressions, stats.exposed)}%`} />
                <FunnelBox label="Clicks" value={stats.clicks} sub={`${pct(stats.clicks, stats.impressions)}%`} />
              </div>
              {stats.impressions === 0 && (
                <p className="text-[11px] text-finzen-gray mt-1.5">Sin impresiones de slot (campaña de push, o el slot todavía no llegó a las apps).</p>
              )}
            </div>

            <div>
              <p className="text-xs font-semibold text-finzen-gray uppercase tracking-wider mb-2">Efecto en activación (tx en 7d)</p>
              {stats.mode === 'EVERGREEN' ? (
                // Evergreen sin holdout: la ven todos los nuevos. Métrica descriptiva
                // = % de los expuestos que hizo su 1ª transacción en 7d desde que se
                // inscribió. La comparación pre/inscripción no aplica (antes de entrar
                // a la app casi nadie transacciona), así que no la mostramos.
                <div className="rounded-lg border border-finzen-gray/20 p-4">
                  <p className="text-xs text-finzen-gray">Activaron (1ª tx en 7d desde que vieron el slot)</p>
                  <p className="text-2xl font-bold text-finzen-blue">{stats.exposedTxRate}%</p>
                  <p className="text-[11px] text-finzen-gray">{stats.exposedTx}/{stats.exposed} usuarios expuestos</p>
                  <p className="text-[11px] text-finzen-gray bg-finzen-white border border-finzen-gray/20 rounded-md px-2.5 py-1.5 mt-2">
                    Sin holdout (la ve todo usuario nuevo) esto es la tasa de activación de la cohorte, <span className="font-semibold">no un efecto causal</span>. Para comparar, mira la activación histórica de usuarios nuevos antes de existir el slot.
                  </p>
                </div>
              ) : stats.holdout === 0 ? (
                // Sin holdout no hay medición causal, pero sí referencia descriptiva:
                // % de expuestos con tx después del envío vs. los 7 días anteriores
                // (cada usuario como su propio control).
                <div className="rounded-lg border border-finzen-gray/20 p-4">
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div>
                      <p className="text-xs text-finzen-gray">Transaccionaron después (7d)</p>
                      <p className="text-xl font-bold text-finzen-blue">{stats.exposedTxRate}%</p>
                      <p className="text-[11px] text-finzen-gray">{stats.exposedTx}/{stats.exposed}</p>
                    </div>
                    <div>
                      <p className="text-xs text-finzen-gray">Antes del envío (7d previos)</p>
                      <p className="text-xl font-bold text-finzen-gray">
                        {stats.exposedTxBeforeRate != null ? `${stats.exposedTxBeforeRate}%` : '—'}
                      </p>
                      <p className="text-[11px] text-finzen-gray">
                        {stats.exposedTxBefore != null ? `${stats.exposedTxBefore}/${stats.exposed}` : 'no disponible'}
                      </p>
                    </div>
                  </div>
                  {stats.prePostPts != null && (
                    <div className={`rounded-md px-3 py-2 text-sm ${stats.prePostPts > 0 ? 'bg-emerald-50 text-emerald-700' : stats.prePostPts < 0 ? 'bg-red-50 text-red-700' : 'bg-finzen-white text-finzen-gray'}`}>
                      <span className="font-semibold">Pre/post:</span> {stats.prePostPts >= 0 ? '+' : ''}{stats.prePostPts} pts
                    </div>
                  )}
                  <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2.5 py-1.5 mt-2">
                    Sin holdout esto es una <span className="font-semibold">referencia descriptiva, no efecto causal</span> (quincenas, tendencias, etc. también mueven el número). Para medir el efecto real usa holdout &gt; 0 en audiencias de 300+ usuarios.
                  </p>
                </div>
              ) : (
                <div className="rounded-lg border border-finzen-gray/20 p-4">
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div>
                      <p className="text-xs text-finzen-gray">Expuestos</p>
                      <p className="text-xl font-bold text-finzen-blue">{stats.exposedTxRate}%</p>
                      <p className="text-[11px] text-finzen-gray">{stats.exposedTx}/{stats.exposed}</p>
                    </div>
                    <div>
                      <p className="text-xs text-finzen-gray">Control (holdout)</p>
                      <p className="text-xl font-bold text-finzen-gray">{stats.holdoutTxRate}%</p>
                      <p className="text-[11px] text-finzen-gray">{stats.holdoutTx}/{stats.holdout}</p>
                    </div>
                  </div>
                  <div className={`rounded-md px-3 py-2 text-sm ${stats.liftPts > 0 ? 'bg-emerald-50 text-emerald-700' : stats.liftPts < 0 ? 'bg-red-50 text-red-700' : 'bg-finzen-white text-finzen-gray'}`}>
                    <span className="font-semibold">Lift:</span> {stats.liftPts >= 0 ? '+' : ''}{stats.liftPts} pts{' '}
                    {stats.liftPts > 0 ? '(el mensaje sumó activación)' : stats.liftPts < 0 ? '(el mensaje restó — revisar)' : '(sin efecto medible)'}
                  </div>
                </div>
              )}
            </div>

            <p className="text-[11px] text-finzen-gray">
              Activación = ≥1 transacción válida en los 7 días posteriores al envío. Expuestos vs holdout reconstruido por el bucket de la campaña.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ─── Modal de propuesta del agente / borrador ────────────────────────────
// Flujo de aprobación humana: el agente de crecimiento crea propuestas en
// PENDING_APPROVAL; aquí el admin las revisa (mensaje + rationale + alcance
// real) y las aprueba (→ DRAFT), rechaza (→ REJECTED) o, ya aprobadas, las
// envía (mismo camino /send que el composer, con countdown).
function ProposalModal({
  broadcast, onClose, onChanged, onSent,
}: {
  broadcast: BroadcastItem;
  onClose: () => void;
  onChanged: () => void;                       // refresca el historial tras aprobar/rechazar
  onSent: (r: BroadcastSendResult) => void;    // banner de resultado tras enviar
}) {
  const [status, setStatus] = useState(broadcast.status);
  const [estimate, setEstimate] = useState<{ target: number; optedOut: number } | null>(null);
  const [estimateError, setEstimateError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sendSeconds, setSendSeconds] = useState(5);

  const data = (broadcast.data ?? {}) as Record<string, unknown>;
  const rationale = typeof data.rationale === 'string' ? data.rationale : null;
  const segmentSlug = typeof data.segment_slug === 'string' ? data.segment_slug : null;
  const isAgent = broadcast.createdBy === 'growth-agent' || data.proposed_by === 'growth-agent';

  // Alcance real recalculado en vivo (mismo /preview del composer).
  useEffect(() => {
    let cancelled = false;
    previewBroadcast(broadcast.type, broadcast.audience)
      .then((r) => { if (!cancelled) setEstimate(r); })
      .catch((e: any) => {
        if (!cancelled) setEstimateError(e?.message === 'UNAUTHORIZED' ? 'Sesión expirada.' : (e?.message || 'Error al calcular audiencia.'));
      });
    return () => { cancelled = true; };
  }, [broadcast]);

  // Countdown de seguridad para el envío (solo cuando está en DRAFT).
  useEffect(() => {
    if (status !== 'DRAFT' || sendSeconds <= 0) return;
    const t = setTimeout(() => setSendSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [status, sendSeconds]);

  const run = async (action: () => Promise<void>) => {
    setWorking(true);
    setError(null);
    try {
      await action();
    } catch (e: any) {
      setError(e?.message === 'UNAUTHORIZED' ? 'Sesión expirada, vuelve a iniciar sesión.' : (e?.message || 'Error.'));
    } finally {
      setWorking(false);
    }
  };

  const handleApprove = () => run(async () => {
    await approveBroadcastById(broadcast.id);
    setStatus('DRAFT');
    setSendSeconds(5);
    onChanged();
  });
  const handleReject = () => run(async () => {
    await rejectBroadcastById(broadcast.id);
    setStatus('REJECTED');
    onChanged();
  });
  const handleSend = () => run(async () => {
    const result = await sendBroadcastById(broadcast.id);
    onChanged();
    onSent(result);
    onClose();
  });

  const segmentLabel = segmentSlug
    ? (AGENT_SEGMENT_LABELS[segmentSlug] ?? segmentSlug)
    : (broadcast.audience?.segments ?? []).map((s) => AGENT_SEGMENT_LABELS[s] ?? s).join(', ') || '—';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-lg font-bold text-finzen-black flex items-center gap-2">
            {isAgent ? <><Bot size={18} className="text-amber-600" /> Propuesta del agente</> : 'Borrador'}
          </h3>
          <button onClick={onClose} className="text-finzen-gray hover:text-finzen-black"><X size={18} /></button>
        </div>
        <p className="text-xs text-finzen-gray mb-4">
          {new Date(broadcast.createdAt).toLocaleDateString('es', { day: '2-digit', month: 'long', year: 'numeric' })}
          {' · '}Segmento: <span className="font-medium text-finzen-black">{segmentLabel}</span>
          {' · '}Superficie: {broadcast.surface ?? 'push'}
          {' · '}Holdout: {broadcast.holdoutPct ?? 0}%
        </p>

        {/* Mensaje propuesto */}
        <div className="rounded-lg border border-finzen-gray/15 bg-finzen-white px-3 py-2.5 mb-3">
          <p className="text-sm font-semibold text-finzen-black">{broadcast.title}</p>
          <p className="text-[13px] text-finzen-gray leading-snug mt-1 whitespace-pre-wrap">{broadcast.body}</p>
        </div>

        {/* Rationale del agente */}
        {rationale && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 mb-3">
            <p className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider mb-1">Por qué lo propone</p>
            <p className="text-[13px] text-amber-900 leading-snug whitespace-pre-wrap">{rationale}</p>
          </div>
        )}

        {/* Alcance real */}
        <div className="rounded-lg bg-finzen-white border border-finzen-gray/20 p-3 mb-4">
          {estimateError ? (
            <p className="text-sm text-finzen-red flex items-center gap-1.5"><AlertTriangle size={14} /> {estimateError}</p>
          ) : estimate ? (
            <p className="text-sm text-finzen-black">
              👥 <span className="font-bold text-finzen-blue">{estimate.target.toLocaleString('es')}</span> usuarios recibirían esto
              {estimate.optedOut > 0 ? <span className="text-xs text-finzen-gray"> · {estimate.optedOut.toLocaleString('es')} excluidos por opt-out</span> : null}
            </p>
          ) : (
            <p className="text-sm text-finzen-gray flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Calculando alcance…</p>
          )}
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 mb-3 text-sm text-red-700 flex items-center gap-1.5">
            <AlertTriangle size={14} /> {error}
          </div>
        )}

        {/* Acciones según estado */}
        {status === 'PENDING_APPROVAL' ? (
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={handleReject}
              disabled={working}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              Rechazar
            </button>
            <button
              onClick={handleApprove}
              disabled={working}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-finzen-blue text-white hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {working ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Aprobar
            </button>
          </div>
        ) : status === 'DRAFT' ? (
          <div>
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 mb-3 text-sm text-emerald-700 flex items-center gap-1.5">
              <Check size={14} /> Aprobada. Puedes enviarla ahora o cerrar y enviarla luego desde el historial.
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={onClose}
                disabled={working}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-finzen-gray/20 text-finzen-gray hover:bg-finzen-white transition-colors disabled:opacity-50"
              >
                Cerrar
              </button>
              <button
                onClick={handleSend}
                disabled={working || sendSeconds > 0 || !estimate || estimate.target === 0}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-finzen-red text-white hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                {working
                  ? <><Loader2 size={14} className="animate-spin" /> Enviando…</>
                  : sendSeconds > 0
                    ? <><Clock size={14} /> Enviar ({sendSeconds}s)</>
                    : <><Send size={14} /> Enviar ahora</>}
              </button>
            </div>
          </div>
        ) : status === 'REJECTED' ? (
          <div className="flex items-center justify-between">
            <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-500">Rechazada</span>
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-lg border border-finzen-gray/20 text-finzen-gray hover:bg-finzen-white transition-colors">Cerrar</button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ─── Página ──────────────────────────────────────────────────────────────
export default function BroadcastsPage() {
  const [view, setView] = useState<'new' | 'history'>('new');

  // Contenido
  const [type, setType] = useState<BroadcastType>('ANNOUNCEMENT');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [screen, setScreen] = useState('');
  const [surface, setSurface] = useState<'push' | 'slot' | 'both'>('push'); // dónde aparece
  const [ctaLabel, setCtaLabel] = useState('');   // texto del botón del slot
  const [holdoutPct, setHoldoutPct] = useState(0); // % control para medir efecto
  // Modo de la campaña: puntual (default) o siempre encendida (evergreen).
  const [mode, setMode] = useState<'ONE_SHOT' | 'EVERGREEN'>('ONE_SHOT');
  const isEvergreen = mode === 'EVERGREEN';

  // Audiencia
  const [plans, setPlans] = useState<Plan[]>(['FREE', 'PREMIUM', 'PRO']);
  const [platforms, setPlatforms] = useState<Platform[]>(['IOS', 'ANDROID']);
  const [country, setCountry] = useState('Todos');
  const [segments, setSegments] = useState<Segment[]>(['never_activated', 'dormant']);
  const [dormantDays, setDormantDays] = useState<DormantDays>('14');
  const [targetMode, setTargetMode] = useState<'segments' | 'user'>('segments');
  const [targetEmail, setTargetEmail] = useState('');

  // Estimación / envío
  const [estimate, setEstimate] = useState<{ target: number; optedOut: number } | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sentResult, setSentResult] = useState<BroadcastSendResult | null>(null);
  const [evergreenActivated, setEvergreenActivated] = useState(false);

  // Historial
  const [historyItems, setHistoryItems] = useState<BroadcastItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyReload, setHistoryReload] = useState(0); // bump para refrescar tras aprobar/rechazar/enviar
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [statsTarget, setStatsTarget] = useState<BroadcastItem | null>(null); // campaña cuyas métricas se ven
  const [proposalTarget, setProposalTarget] = useState<BroadcastItem | null>(null); // propuesta/borrador en revisión
  // Eliminación con confirmación de dos clicks (el primero arma, el segundo ejecuta).
  const [deleteArmedId, setDeleteArmedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const togglePlan = (p: Plan) =>
    setPlans((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]));
  const togglePlatform = (p: Platform) =>
    setPlatforms((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]));
  const toggleSegment = (s: Segment) =>
    setSegments((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));

  const invalidate = () => setEstimate(null);

  const buildAudience = (): BroadcastAudience => {
    const base = {
      plans,
      platforms,
      country: country === 'Todos' ? undefined : country,
      segments,
      dormantDays: Number(dormantDays),
    };
    if (targetMode === 'user') return { ...base, targetEmail: targetEmail.trim() };
    return base;
  };

  const recalc = async () => {
    setPreviewing(true);
    setPreviewError(null);
    try {
      const result = await previewBroadcast(type, buildAudience());
      setEstimate(result);
    } catch (e: any) {
      setEstimate(null);
      setPreviewError(e?.message === 'UNAUTHORIZED' ? 'Sesión expirada, vuelve a iniciar sesión.' : (e?.message || 'Error al calcular audiencia.'));
    } finally {
      setPreviewing(false);
    }
  };

  const segmentsSummary = targetMode === 'user'
    ? `Usuario: ${targetEmail.trim() || '—'}`
    : segments.length
      ? segments.map((s) => (s === 'dormant' ? `Dormidos ${dormantDays}d` : SEGMENT_META[s].label)).join(', ')
      : 'Sin segmento';

  // Evergreen no necesita estimación previa: inscribe a cada usuario nuevo al entrar
  // (la audiencia es "todos los nuevos"); basta con título y mensaje.
  const canSend = isEvergreen
    ? (title.trim().length > 0 && body.trim().length > 0)
    : (!!estimate && estimate.target > 0
      && title.trim().length > 0 && body.trim().length > 0
      && (
        (targetMode === 'user' && targetEmail.trim().length > 0)
        || (targetMode === 'segments' && segments.length > 0)
      ));

  const resetComposer = () => {
    setTitle('');
    setBody('');
    setScreen('');
    setCtaLabel('');
    setEstimate(null);
  };

  const handleConfirm = async () => {
    setSending(true);
    setSendError(null);
    try {
      // data lleva el destino (screen) y, para el slot, el texto del botón (ctaLabel).
      const data: Record<string, string | number> = {};
      if (screen) data.screen = screen;
      if (ctaLabel.trim()) data.ctaLabel = ctaLabel.trim();

      if (isEvergreen) {
        // Evergreen de bienvenida: siempre en el slot, sin holdout (la ven todos los
        // nuevos), y con prioridad alta para ganarle al mensaje local hardcodeado
        // del dashboard (que tiene prioridad 0). Se crea y se activa (no se "envía").
        data.priority = 100;
        const created = await createBroadcast({
          title: title.trim(),
          body: body.trim(),
          type,
          data,
          surface: 'slot',
          holdoutPct: 0,
          mode: 'EVERGREEN',
          trigger: 'first_app_entry',
          audience: buildAudience(),
        });
        await activateBroadcastById(created.id);
        setShowConfirm(false);
        setEvergreenActivated(true);
        resetComposer();
        setMode('ONE_SHOT');
        return;
      }

      const created = await createBroadcast({
        title: title.trim(),
        body: body.trim(),
        type,
        data: Object.keys(data).length ? data : undefined,
        surface,
        holdoutPct,
        audience: buildAudience(),
      });
      const result = await sendBroadcastById(created.id);
      setShowConfirm(false);
      setSentResult(result);
      resetComposer();
    } catch (e: any) {
      setSendError(e?.message === 'UNAUTHORIZED' ? 'Sesión expirada, vuelve a iniciar sesión.' : (e?.message || (isEvergreen ? 'Error al activar la campaña.' : 'Error al enviar.')));
    } finally {
      setSending(false);
    }
  };

  // Carga del historial al entrar a esa vista (y al cambiar de página o bumpear historyReload).
  useEffect(() => {
    if (view !== 'history') return;
    let cancelled = false;
    setHistoryLoading(true);
    setHistoryError(null);
    setDeleteArmedId(null);
    fetchBroadcasts(historyPage)
      .then((r) => {
        if (cancelled) return;
        setHistoryItems(r.items);
        setHistoryTotalPages(r.pagination?.totalPages ?? 1);
        // Si la página quedó vacía (ej. se eliminó el último ítem), retrocede una.
        if (r.items.length === 0 && historyPage > 1) setHistoryPage((p) => p - 1);
      })
      .catch((e: any) => { if (!cancelled) setHistoryError(e?.message === 'UNAUTHORIZED' ? 'Sesión expirada.' : (e?.message || 'Error al cargar.')); })
      .finally(() => { if (!cancelled) setHistoryLoading(false); });
    return () => { cancelled = true; };
  }, [view, historyReload, historyPage]);

  // Eliminar/ocultar campaña (segundo click del basurero).
  const handleDelete = async (b: BroadcastItem) => {
    setDeletingId(b.id);
    try {
      await deleteBroadcastById(b.id);
      setDeleteArmedId(null);
      setHistoryReload((n) => n + 1);
    } catch (e: any) {
      setHistoryError(e?.message === 'UNAUTHORIZED' ? 'Sesión expirada.' : (e?.message || 'Error al eliminar.'));
    } finally {
      setDeletingId(null);
    }
  };

  // Encender / apagar una campaña evergreen desde el historial.
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const handleToggleEvergreen = async (b: BroadcastItem) => {
    setTogglingId(b.id);
    setHistoryError(null);
    try {
      if (b.status === 'ACTIVE') await deactivateBroadcastById(b.id);
      else await activateBroadcastById(b.id);
      setHistoryReload((n) => n + 1);
    } catch (e: any) {
      setHistoryError(e?.message === 'UNAUTHORIZED' ? 'Sesión expirada.' : (e?.message || 'Error al cambiar el estado.'));
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-finzen-black">Mensajes</h1>
            {targetMode === 'user' ? (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-700">
                Envío dirigido: 1 usuario
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-700">
                Envía push real
              </span>
            )}
          </div>
          <p className="text-sm text-finzen-gray mt-0.5">Notificaciones push masivas a la app.</p>
        </div>
        <div className="flex items-center gap-1 bg-finzen-white rounded-lg p-1 border border-finzen-gray/20">
          <button
            onClick={() => setView('new')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              view === 'new' ? 'bg-white text-finzen-black shadow-sm' : 'text-finzen-gray hover:text-finzen-black'
            }`}
          >
            <Plus size={14} /> Nuevo mensaje
          </button>
          <button
            onClick={() => setView('history')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              view === 'history' ? 'bg-white text-finzen-black shadow-sm' : 'text-finzen-gray hover:text-finzen-black'
            }`}
          >
            <Clock size={14} /> Historial
          </button>
        </div>
      </div>

      {/* Banner resultado de envío */}
      {sentResult !== null && (
        <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
          <p className="text-sm text-emerald-700 flex items-center gap-2">
            <Check size={16} />
            Enviado a <span className="font-bold">{sentResult.targetCount.toLocaleString('es')}</span> usuario(s) ·{' '}
            {sentResult.successCount} entregas, {sentResult.failureCount} fallos
            {sentResult.suppressed > 0 ? `, ${sentResult.suppressed} en horario silencioso` : ''}.
          </p>
          <button onClick={() => setSentResult(null)} className="text-emerald-700 hover:text-emerald-900"><X size={16} /></button>
        </div>
      )}
      {evergreenActivated && (
        <div className="flex items-center justify-between rounded-lg border border-teal-200 bg-teal-50 px-4 py-3">
          <p className="text-sm text-teal-800 flex items-center gap-2">
            <Check size={16} />
            Campaña siempre encendida <span className="font-semibold">activada</span>. Se irá inscribiendo sola con cada usuario nuevo que entre; sigue su avance en el historial.
          </p>
          <button onClick={() => setEvergreenActivated(false)} className="text-teal-800 hover:text-teal-950"><X size={16} /></button>
        </div>
      )}
      {sendError && (
        <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm text-red-700 flex items-center gap-2"><AlertTriangle size={16} /> {sendError}</p>
          <button onClick={() => setSendError(null)} className="text-red-700 hover:text-red-900"><X size={16} /></button>
        </div>
      )}

      {view === 'history' ? (
        // ─── HISTORIAL ───────────────────────────────────────────────
        <div className="overflow-x-auto border border-finzen-gray/20 rounded-lg">
          {historyLoading ? (
            <div className="flex items-center justify-center py-16"><Loader2 size={28} className="animate-spin text-finzen-blue" /></div>
          ) : historyError ? (
            <div className="p-6 text-center text-red-600 text-sm">{historyError}</div>
          ) : historyItems.length === 0 ? (
            <div className="p-10 text-center text-finzen-gray text-sm">Todavía no se ha enviado ningún mensaje.</div>
          ) : (
            <table className="w-full min-w-[820px]">
              <thead>
                <tr className="bg-finzen-white text-left text-xs font-semibold text-finzen-gray uppercase tracking-wider">
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Título</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 text-center">Audiencia</th>
                  <th className="px-4 py-3 text-center">Entrega</th>
                  <th className="px-4 py-3 text-center w-24"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-finzen-gray/10">
                {historyItems.map((b) => {
                  const status = STATUS_META[b.status] ?? { label: b.status, chip: 'bg-gray-100 text-gray-600' };
                  // Entrega = tokens entregados / tokens intentados (≤100%). Antes
                  // dividía por usuarios, y como un usuario puede tener varios
                  // dispositivos, daba >100% (ej. 200% = 1 usuario con 2 dispositivos).
                  const attempted = (b.successCount ?? 0) + (b.failureCount ?? 0);
                  const delivery = b.successCount != null && attempted > 0
                    ? `${Math.round((b.successCount / attempted) * 100)}%` : '—';
                  // Propuestas del agente y borradores se revisan/aprueban/envían
                  // en su propio modal; el resto abre las métricas de campaña.
                  // Las evergreen (aunque estén en DRAFT) abren métricas, no el modal de propuesta.
                  const isEvergreenRow = b.mode === 'EVERGREEN';
                  const needsReview = !isEvergreenRow && (b.status === 'PENDING_APPROVAL' || b.status === 'DRAFT' || b.status === 'REJECTED');
                  const isAgentRow = b.createdBy === 'growth-agent';
                  return (
                    <tr
                      key={b.id}
                      onClick={() => (needsReview ? setProposalTarget(b) : setStatsTarget(b))}
                      title={needsReview ? 'Revisar propuesta / borrador' : 'Ver métricas de la campaña'}
                      className="hover:bg-finzen-white/80 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3 text-sm text-finzen-gray">
                        {new Date(b.createdAt).toLocaleDateString('es', { day: '2-digit', month: 'short' })}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-finzen-black">
                        {isAgentRow ? <Bot size={13} className="inline mr-1.5 -mt-0.5 text-amber-600" aria-label="Propuesto por el agente" /> : null}
                        {b.title}{b.audience?.test ? <span className="ml-1.5 text-[10px] text-finzen-blue">(prueba)</span> : null}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_META[b.type]?.chip ?? ''}`}>
                          {TYPE_META[b.type]?.label ?? b.type}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${status.chip}`}>{status.label}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-center text-finzen-black">{b.targetCount ?? '—'}</td>
                      <td className="px-4 py-3 text-sm text-center text-finzen-gray">{delivery}</td>
                      <td className="px-4 py-3 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        {isEvergreenRow && (b.status === 'ACTIVE' || b.status === 'DRAFT') && (
                          <button
                            onClick={() => handleToggleEvergreen(b)}
                            disabled={togglingId === b.id}
                            title={b.status === 'ACTIVE' ? 'Apagar (deja de inscribir; la medición se conserva)' : 'Encender (empieza a inscribir usuarios nuevos)'}
                            className={`px-2 py-1 text-[11px] font-semibold rounded-md mr-1 transition-colors disabled:opacity-50 inline-flex items-center gap-1 ${
                              b.status === 'ACTIVE' ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-teal-600 text-white hover:bg-teal-700'
                            }`}
                          >
                            {togglingId === b.id ? <Loader2 size={11} className="animate-spin" /> : null}
                            {b.status === 'ACTIVE' ? 'Apagar' : 'Encender'}
                          </button>
                        )}
                        {deleteArmedId === b.id ? (
                          <button
                            onClick={() => handleDelete(b)}
                            disabled={deletingId === b.id}
                            title={b.status === 'SENT' || b.status === 'FAILED' || b.status === 'SENDING'
                              ? 'Ocultar del historial (la medición se conserva)'
                              : 'Eliminar definitivamente'}
                            className="px-2 py-1 text-[11px] font-semibold rounded-md bg-finzen-red text-white hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center gap-1 mx-auto"
                          >
                            {deletingId === b.id ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                            ¿Seguro?
                          </button>
                        ) : (
                          <button
                            onClick={() => setDeleteArmedId(b.id)}
                            title="Quitar del historial"
                            className="p-1.5 rounded-md text-finzen-gray/60 hover:text-finzen-red hover:bg-red-50 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          {/* Paginado */}
          {!historyLoading && !historyError && historyTotalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-finzen-gray/10 bg-finzen-white">
              <button
                onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                disabled={historyPage <= 1}
                className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg border border-finzen-gray/20 text-finzen-gray hover:text-finzen-black hover:bg-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={14} /> Anterior
              </button>
              <span className="text-xs text-finzen-gray">Página {historyPage} de {historyTotalPages}</span>
              <button
                onClick={() => setHistoryPage((p) => Math.min(historyTotalPages, p + 1))}
                disabled={historyPage >= historyTotalPages}
                className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg border border-finzen-gray/20 text-finzen-gray hover:text-finzen-black hover:bg-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Siguiente <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      ) : (
        // ─── COMPOSER (split) ────────────────────────────────────────
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 items-start">
          <div className="space-y-5">
            {/* Contenido */}
            <div className="bg-white rounded-xl border border-finzen-gray/20 p-5">
              <h3 className="text-sm font-semibold text-finzen-black mb-4">Contenido</h3>
              <div className="grid grid-cols-3 gap-2 mb-4">
                {(Object.keys(TYPE_META) as BroadcastType[]).map((t) => {
                  const meta = TYPE_META[t];
                  const Icon = meta.icon;
                  const active = type === t;
                  return (
                    <button
                      key={t}
                      onClick={() => { setType(t); invalidate(); }}
                      className={`text-left rounded-lg border p-3 transition-all ${
                        active ? 'border-finzen-blue bg-finzen-blue/5 ring-1 ring-finzen-blue' : 'border-finzen-gray/20 hover:border-finzen-gray/40'
                      }`}
                    >
                      <Icon size={16} className={active ? 'text-finzen-blue' : 'text-finzen-gray'} />
                      <p className="text-sm font-medium text-finzen-black mt-1.5">{meta.label}</p>
                      <p className="text-[11px] text-finzen-gray leading-tight mt-0.5">{meta.desc}</p>
                    </button>
                  );
                })}
              </div>

              <div className="mb-4">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-finzen-black">Título</label>
                  <span className="text-xs text-finzen-gray">{title.length}/{TITLE_MAX}</span>
                </div>
                <input
                  type="text" value={title} maxLength={TITLE_MAX}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ej: Nueva función ✨"
                  className="w-full px-3 py-2 text-sm border border-finzen-gray/20 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-finzen-blue/20 focus:border-finzen-blue transition-all"
                />
              </div>

              <div className="mb-4">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-finzen-black">Mensaje</label>
                  <span className="text-xs text-finzen-gray">{body.length}/{BODY_MAX}</span>
                </div>
                <textarea
                  value={body} maxLength={BODY_MAX} rows={3}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Ej: Ya puedes dividir gastos con amigos. ¡Pruébalo!"
                  className="w-full px-3 py-2 text-sm border border-finzen-gray/20 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-finzen-blue/20 focus:border-finzen-blue transition-all resize-none"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-finzen-black block mb-1">Al tocar la notificación</label>
                <select
                  value={screen} onChange={(e) => setScreen(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-finzen-gray/20 rounded-lg bg-white text-finzen-black focus:outline-none focus:ring-2 focus:ring-finzen-blue/20 focus:border-finzen-blue"
                >
                  {SCREEN_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                {surface !== 'push' && screen && !SLOT_ACTIONS.includes(screen) && (
                  <p className="text-[11px] text-amber-600 mt-1">
                    ⚠ Este destino no abre desde el slot del dashboard; ahí el botón no se mostrará (sí funciona en push).
                  </p>
                )}
              </div>

              {/* Modo: puntual (se envía una vez) o siempre encendida (evergreen) */}
              <div className="mt-4">
                <label className="text-sm font-medium text-finzen-black block mb-1.5">Modo de la campaña</label>
                <div className="grid grid-cols-2 gap-2">
                  {([['ONE_SHOT', 'Puntual', 'Se envía una vez a la audiencia actual'], ['EVERGREEN', 'Siempre encendida', 'Inscribe a cada usuario nuevo al entrar']] as const).map(([val, label, desc]) => (
                    <button
                      key={val}
                      onClick={() => setMode(val)}
                      className={`text-left rounded-lg border px-3 py-2 transition-all ${
                        mode === val
                          ? 'border-finzen-blue bg-finzen-blue/5 ring-1 ring-finzen-blue'
                          : 'border-finzen-gray/20 hover:border-finzen-gray/40'
                      }`}
                    >
                      <span className={`block text-sm font-medium ${mode === val ? 'text-finzen-blue' : 'text-finzen-black'}`}>{label}</span>
                      <span className="block text-[11px] text-finzen-gray mt-0.5">{desc}</span>
                    </button>
                  ))}
                </div>
                {isEvergreen && (
                  <p className="text-[11px] text-teal-700 bg-teal-50 border border-teal-200 rounded-lg px-3 py-2 mt-2">
                    Se mostrará en el <span className="font-semibold">slot del dashboard</span> a <span className="font-semibold">cada usuario nuevo</span> cuando entre por primera vez (disparador: primera entrada). La ven todos (sin holdout). Empieza a inscribir al <span className="font-semibold">activarla</span>; puedes apagarla cuando quieras desde el historial.
                  </p>
                )}
              </div>

              {/* Superficie: dónde aparece el mensaje (ortogonal al tipo). En evergreen va forzado a slot. */}
              {!isEvergreen && (
              <div className="mt-4">
                <label className="text-sm font-medium text-finzen-black block mb-1.5">Mostrar en</label>
                <div className="grid grid-cols-3 gap-2">
                  {([['push', 'Push'], ['slot', 'Slot dashboard'], ['both', 'Ambos']] as const).map(([val, label]) => (
                    <button
                      key={val}
                      onClick={() => setSurface(val)}
                      className={`text-center rounded-lg border px-2 py-2 text-sm transition-all ${
                        surface === val
                          ? 'border-finzen-blue bg-finzen-blue/5 text-finzen-blue ring-1 ring-finzen-blue'
                          : 'border-finzen-gray/20 text-finzen-gray hover:border-finzen-gray/40'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              )}

              {/* Texto del botón del slot (solo si aparece en el slot; evergreen siempre es slot) */}
              {(isEvergreen || surface !== 'push') && (
                <div className="mt-4">
                  <label className="text-sm font-medium text-finzen-black block mb-1">Texto del botón (slot)</label>
                  <input
                    type="text" value={ctaLabel} maxLength={30}
                    onChange={(e) => setCtaLabel(e.target.value)}
                    placeholder="Ej: Registrar gasto"
                    className="w-full px-3 py-2 text-sm border border-finzen-gray/20 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-finzen-blue/20 focus:border-finzen-blue transition-all"
                  />
                  <p className="text-[11px] text-finzen-gray mt-1">
                    El botón lleva a la pantalla de arriba. Solo aparece si elegiste una pantalla destino; si dejas el texto vacío, dice &quot;Ver&quot;.
                  </p>
                </div>
              )}

              {/* Holdout: % de control que NO recibe (para medir el efecto causal). No aplica a evergreen (la ven todos). */}
              {!isEvergreen && (
              <div className="mt-4">
                <label className="text-sm font-medium text-finzen-black block mb-1">
                  Holdout (control): <span className="text-finzen-blue font-semibold">{holdoutPct}%</span>
                </label>
                <input
                  type="range" min={0} max={50} step={5}
                  value={holdoutPct}
                  onChange={(e) => setHoldoutPct(Number(e.target.value))}
                  className="w-full accent-finzen-blue"
                />
                <p className="text-[11px] text-finzen-gray mt-1">
                  % de la audiencia elegible que NO recibe el mensaje, para medir su efecto real (expuestos vs control). 0 = sin medición causal.
                </p>
              </div>
              )}
            </div>

            {/* Audiencia */}
            <div className="bg-white rounded-xl border border-finzen-gray/20 p-5">
              <h3 className="text-sm font-semibold text-finzen-black mb-3">Audiencia</h3>
              {isEvergreen ? (
                <div className="rounded-lg bg-teal-50 border border-teal-200 px-3 py-3 text-sm text-teal-800">
                  Esta campaña alcanza a <span className="font-semibold">todos los usuarios nuevos</span> cuando entran por primera vez al dashboard. No se aplican filtros de plan, plataforma ni segmento.
                </div>
              ) : (
              <>
              <div className="flex flex-wrap gap-1 mb-4 bg-finzen-white rounded-lg p-1 border border-finzen-gray/20 w-fit">
                {([['segments', 'Por segmento'], ['user', 'Usuario específico']] as const).map(([m, label]) => (
                  <button
                    key={m}
                    onClick={() => { setTargetMode(m); invalidate(); }}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                      targetMode === m ? 'bg-white text-finzen-black shadow-sm' : 'text-finzen-gray hover:text-finzen-black'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {targetMode === 'user' ? (
                <div>
                  <p className="text-xs font-medium text-finzen-gray uppercase tracking-wider mb-1.5">Email del usuario</p>
                  <input
                    type="email"
                    value={targetEmail}
                    onChange={(e) => { setTargetEmail(e.target.value); invalidate(); }}
                    placeholder="usuario@email.com"
                    className="w-full px-3 py-2 text-sm border border-finzen-gray/20 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-finzen-blue/20 focus:border-finzen-blue transition-all"
                  />
                  <p className="text-[11px] text-finzen-gray mt-1.5">
                    Envía solo a ese usuario (todos sus dispositivos activos), ignorando segmentación, opt-out y horario silencioso.
                  </p>
                </div>
              ) : (
                <div>
                  {/* Plan */}
                  <div className="mb-3">
                    <p className="text-xs font-medium text-finzen-gray uppercase tracking-wider mb-1.5">Plan</p>
                    <div className="flex flex-wrap gap-2">
                      {(['FREE', 'PREMIUM', 'PRO'] as Plan[]).map((p) => (
                        <button
                          key={p}
                          onClick={() => { togglePlan(p); invalidate(); }}
                          className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                            plans.includes(p) ? 'border-finzen-blue bg-finzen-blue/5 text-finzen-blue' : 'border-finzen-gray/20 text-finzen-gray'
                          }`}
                        >
                          {plans.includes(p) && <Check size={12} className="inline mr-1" />}
                          {p === 'PREMIUM' ? 'Plus' : p === 'FREE' ? 'Free' : 'Pro'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Plataforma */}
                  <div className="mb-3">
                    <p className="text-xs font-medium text-finzen-gray uppercase tracking-wider mb-1.5">Plataforma</p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => { togglePlatform('IOS'); invalidate(); }}
                        className={`px-3 py-1.5 text-sm rounded-lg border transition-colors flex items-center gap-1.5 ${
                          platforms.includes('IOS') ? 'border-finzen-blue bg-finzen-blue/5 text-finzen-blue' : 'border-finzen-gray/20 text-finzen-gray'
                        }`}
                      >
                        <Apple size={13} /> iOS
                      </button>
                      <button
                        onClick={() => { togglePlatform('ANDROID'); invalidate(); }}
                        className={`px-3 py-1.5 text-sm rounded-lg border transition-colors flex items-center gap-1.5 ${
                          platforms.includes('ANDROID') ? 'border-finzen-blue bg-finzen-blue/5 text-finzen-blue' : 'border-finzen-gray/20 text-finzen-gray'
                        }`}
                      >
                        <Smartphone size={13} /> Android
                      </button>
                    </div>
                  </div>

                  {/* Segmento */}
                  <div className="mb-3">
                    <p className="text-xs font-medium text-finzen-gray uppercase tracking-wider mb-1.5">Segmento</p>
                    <div className="space-y-2">
                      {(['never_activated', 'dormant', 'active', 'trial_available'] as Segment[]).map((s) => {
                        const meta = SEGMENT_META[s];
                        const checked = segments.includes(s);
                        return (
                          <button
                            key={s}
                            onClick={() => { toggleSegment(s); invalidate(); }}
                            className={`w-full text-left flex items-start gap-2.5 rounded-lg border p-2.5 transition-all ${
                              checked ? 'border-finzen-blue bg-finzen-blue/5' : 'border-finzen-gray/20 hover:border-finzen-gray/40'
                            }`}
                          >
                            <span className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                              checked ? 'bg-finzen-blue border-finzen-blue' : 'border-finzen-gray/40'
                            }`}>
                              {checked && <Check size={11} className="text-white" />}
                            </span>
                            <span>
                              <span className="text-sm font-medium text-finzen-black block leading-tight">{meta.label}</span>
                              <span className="text-[11px] text-finzen-gray">{meta.desc}</span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* País + umbral */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs font-medium text-finzen-gray uppercase tracking-wider mb-1.5">País</p>
                      <select
                        value={country} onChange={(e) => { setCountry(e.target.value); invalidate(); }}
                        className="w-full px-3 py-2 text-sm border border-finzen-gray/20 rounded-lg bg-white text-finzen-black focus:outline-none focus:ring-2 focus:ring-finzen-blue/20 focus:border-finzen-blue"
                      >
                        {COUNTRY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-finzen-gray uppercase tracking-wider mb-1.5">Inactivo hace</p>
                      <select
                        value={dormantDays}
                        disabled={!segments.includes('dormant')}
                        onChange={(e) => { setDormantDays(e.target.value as DormantDays); invalidate(); }}
                        title="Aplica al segmento Dormidos"
                        className="w-full px-3 py-2 text-sm border border-finzen-gray/20 rounded-lg bg-white text-finzen-black focus:outline-none focus:ring-2 focus:ring-finzen-blue/20 focus:border-finzen-blue disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {DORMANT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Estimación */}
              <div className="mt-4 rounded-lg bg-finzen-white border border-finzen-gray/20 p-3">
                {previewError ? (
                  <p className="text-sm text-finzen-red flex items-center gap-1.5"><AlertTriangle size={14} /> {previewError}</p>
                ) : estimate ? (
                  <div className="space-y-1">
                    <p className="text-sm text-finzen-black flex items-center gap-2">
                      👥 <span className="font-bold text-finzen-blue">{estimate.target.toLocaleString('es')}</span>{' '}
                      {targetMode !== 'segments' ? 'destinatario' : 'usuarios recibirán esto'}
                    </p>
                    {estimate.optedOut > 0 && (
                      <p className="text-xs text-finzen-gray">🔕 {estimate.optedOut.toLocaleString('es')} excluidos por opt-out</p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-finzen-gray">Audiencia sin calcular. Recalcula para ver el alcance.</p>
                )}
                <button
                  onClick={recalc}
                  disabled={previewing}
                  className="mt-2 px-3 py-1.5 text-sm font-medium rounded-lg border border-finzen-gray/20 text-finzen-gray hover:text-finzen-black hover:bg-white transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  {previewing && <Loader2 size={13} className="animate-spin" />}
                  {targetMode === 'segments' ? 'Recalcular audiencia' : 'Verificar destinatario'}
                </button>
              </div>
              </>
              )}
            </div>

            {/* Acciones */}
            <div className="flex items-center justify-end gap-2">
              <button className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg border border-finzen-gray/20 text-finzen-gray hover:bg-finzen-white transition-colors">
                <Save size={14} /> Guardar borrador
              </button>
              <button
                onClick={() => setShowConfirm(true)}
                disabled={!canSend}
                title={!canSend ? (isEvergreen ? 'Completa título y mensaje' : 'Completa título, mensaje y recalcula la audiencia') : ''}
                className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${isEvergreen ? 'bg-teal-600 hover:bg-teal-700' : 'bg-finzen-blue hover:bg-blue-700'}`}
              >
                {isEvergreen ? 'Activar campaña' : (targetMode === 'segments' ? 'Enviar ahora' : 'Enviar')} <ChevronRight size={14} />
              </button>
            </div>
          </div>

          {/* Preview en vivo */}
          <div className="lg:sticky lg:top-20">
            <div className="bg-white rounded-xl border border-finzen-gray/20 p-5">
              <h3 className="text-sm font-semibold text-finzen-black mb-4 flex items-center gap-1.5">
                <Megaphone size={14} /> Vista previa
              </h3>
              <div className="flex flex-col items-center gap-5">
                {!isEvergreen && (surface === 'push' || surface === 'both') && (
                  <PhonePreview title={title} body={body} type={type} />
                )}
                {(isEvergreen || surface === 'slot' || surface === 'both') && (
                  <SlotPreview title={title} body={body} ctaLabel={ctaLabel} screen={screen} type={type} />
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showConfirm && (estimate || isEvergreen) && (
        <ConfirmModal
          target={estimate?.target ?? 0}
          type={type}
          audienceLabel={segmentsSummary}
          singleTarget={targetMode !== 'segments'}
          sending={sending}
          evergreen={isEvergreen}
          onCancel={() => setShowConfirm(false)}
          onConfirm={handleConfirm}
        />
      )}

      {statsTarget && (
        <CampaignStatsModal broadcast={statsTarget} onClose={() => setStatsTarget(null)} />
      )}

      {proposalTarget && (
        <ProposalModal
          broadcast={proposalTarget}
          onClose={() => setProposalTarget(null)}
          onChanged={() => setHistoryReload((n) => n + 1)}
          onSent={(r) => setSentResult(r)}
        />
      )}
    </div>
  );
}
