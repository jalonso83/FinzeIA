'use client';

// ─────────────────────────────────────────────────────────────────────────
// Notificaciones masivas (broadcast) — conectado al backend real.
// Composer split con preview en vivo + estimador real (/preview) + envío real
// (/broadcasts + /:id/send). Incluye "Modo prueba" para enviar SOLO al admin.
// ─────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import {
  Megaphone, Send, Bell, Save, AlertTriangle, Check, ChevronRight, X,
  Clock, Smartphone, Apple, Plus, Sparkles, Tag, Settings2, Loader2,
} from 'lucide-react';
import {
  previewBroadcast, createBroadcast, sendBroadcastById, fetchBroadcasts,
  type BroadcastAudience, type BroadcastItem, type BroadcastSendResult,
} from '@/lib/dashboard-api';

type BroadcastType = 'ANNOUNCEMENT' | 'MARKETING' | 'SYSTEM';
type Plan = 'FREE' | 'PREMIUM' | 'PRO';
type Platform = 'IOS' | 'ANDROID';
type Segment = 'never_activated' | 'dormant' | 'active';
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
  DRAFT: { label: 'Borrador', chip: 'bg-gray-100 text-gray-600' },
  SENDING: { label: 'Enviando', chip: 'bg-blue-100 text-blue-700' },
  SENT: { label: 'Enviado', chip: 'bg-emerald-100 text-emerald-700' },
  FAILED: { label: 'Falló', chip: 'bg-red-100 text-red-700' },
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
  target, type, audienceLabel, singleTarget, sending, onCancel, onConfirm,
}: {
  target: number; type: BroadcastType; audienceLabel: string; singleTarget: boolean; sending: boolean;
  onCancel: () => void; onConfirm: () => void;
}) {
  const [seconds, setSeconds] = useState(singleTarget ? 0 : 5);
  useEffect(() => {
    if (seconds <= 0) return;
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

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

  // Historial
  const [historyItems, setHistoryItems] = useState<BroadcastItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

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

  const canSend = !!estimate && estimate.target > 0
    && title.trim().length > 0 && body.trim().length > 0
    && (
      (targetMode === 'user' && targetEmail.trim().length > 0)
      || (targetMode === 'segments' && segments.length > 0)
    );

  const handleConfirm = async () => {
    setSending(true);
    setSendError(null);
    try {
      // data lleva el destino (screen) y, para el slot, el texto del botón (ctaLabel).
      const data: Record<string, string> = {};
      if (screen) data.screen = screen;
      if (ctaLabel.trim()) data.ctaLabel = ctaLabel.trim();
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
      setTitle('');
      setBody('');
      setScreen('');
      setCtaLabel('');
      setEstimate(null);
    } catch (e: any) {
      setSendError(e?.message === 'UNAUTHORIZED' ? 'Sesión expirada, vuelve a iniciar sesión.' : (e?.message || 'Error al enviar.'));
    } finally {
      setSending(false);
    }
  };

  // Carga del historial al entrar a esa vista.
  useEffect(() => {
    if (view !== 'history') return;
    let cancelled = false;
    setHistoryLoading(true);
    setHistoryError(null);
    fetchBroadcasts(1)
      .then((r) => { if (!cancelled) setHistoryItems(r.items); })
      .catch((e: any) => { if (!cancelled) setHistoryError(e?.message === 'UNAUTHORIZED' ? 'Sesión expirada.' : (e?.message || 'Error al cargar.')); })
      .finally(() => { if (!cancelled) setHistoryLoading(false); });
    return () => { cancelled = true; };
  }, [view]);

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
                </tr>
              </thead>
              <tbody className="divide-y divide-finzen-gray/10">
                {historyItems.map((b) => {
                  const status = STATUS_META[b.status] ?? { label: b.status, chip: 'bg-gray-100 text-gray-600' };
                  const delivery = b.targetCount && b.successCount != null && b.targetCount > 0
                    ? `${Math.round((b.successCount / b.targetCount) * 100)}%` : '—';
                  return (
                    <tr key={b.id} className="hover:bg-finzen-white/80 transition-colors">
                      <td className="px-4 py-3 text-sm text-finzen-gray">
                        {new Date(b.createdAt).toLocaleDateString('es', { day: '2-digit', month: 'short' })}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-finzen-black">
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
                    </tr>
                  );
                })}
              </tbody>
            </table>
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

              {/* Superficie: dónde aparece el mensaje (ortogonal al tipo) */}
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

              {/* Texto del botón del slot (solo si aparece en el slot) */}
              {surface !== 'push' && (
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

              {/* Holdout: % de control que NO recibe (para medir el efecto causal) */}
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
            </div>

            {/* Audiencia */}
            <div className="bg-white rounded-xl border border-finzen-gray/20 p-5">
              <h3 className="text-sm font-semibold text-finzen-black mb-3">Audiencia</h3>
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
                      {(['never_activated', 'dormant', 'active'] as Segment[]).map((s) => {
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
            </div>

            {/* Acciones */}
            <div className="flex items-center justify-end gap-2">
              <button className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg border border-finzen-gray/20 text-finzen-gray hover:bg-finzen-white transition-colors">
                <Save size={14} /> Guardar borrador
              </button>
              <button
                onClick={() => setShowConfirm(true)}
                disabled={!canSend}
                title={!canSend ? 'Completa título, mensaje y recalcula la audiencia' : ''}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-finzen-blue text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {targetMode === 'segments' ? 'Enviar ahora' : 'Enviar'} <ChevronRight size={14} />
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
                {(surface === 'push' || surface === 'both') && (
                  <PhonePreview title={title} body={body} type={type} />
                )}
                {(surface === 'slot' || surface === 'both') && (
                  <SlotPreview title={title} body={body} ctaLabel={ctaLabel} screen={screen} type={type} />
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showConfirm && estimate && (
        <ConfirmModal
          target={estimate.target}
          type={type}
          audienceLabel={segmentsSummary}
          singleTarget={targetMode !== 'segments'}
          sending={sending}
          onCancel={() => setShowConfirm(false)}
          onConfirm={handleConfirm}
        />
      )}
    </div>
  );
}
