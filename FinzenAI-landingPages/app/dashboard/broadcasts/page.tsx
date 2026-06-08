'use client';

// ─────────────────────────────────────────────────────────────────────────
// PROTOTIPO ESTÁTICO — Notificaciones masivas (broadcast)
// Solo frontend, datos simulados. NO envía nada real ni llama al backend.
// El estimador de audiencia y el historial usan datos mock para validar la UI
// antes de construir el backend (modelo Broadcast + broadcastService).
// ─────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import {
  Megaphone, Send, Bell, Save, AlertTriangle, Check, ChevronRight, X,
  Clock, Smartphone, Apple, Plus, Sparkles, Tag, Settings2,
} from 'lucide-react';

type BroadcastType = 'ANNOUNCEMENT' | 'MARKETING' | 'SYSTEM';
type Plan = 'FREE' | 'PREMIUM' | 'PRO';
type Platform = 'IOS' | 'ANDROID';
type Activity = 'any' | '90' | '30' | '7';

const TYPE_META: Record<BroadcastType, { label: string; desc: string; icon: typeof Sparkles; chip: string }> = {
  ANNOUNCEMENT: { label: 'Anuncio', desc: 'Novedades y cambios de producto', icon: Sparkles, chip: 'bg-blue-100 text-blue-700' },
  MARKETING: { label: 'Promoción', desc: 'Ofertas, descuentos, upgrade', icon: Tag, chip: 'bg-emerald-100 text-emerald-700' },
  SYSTEM: { label: 'Sistema', desc: 'Mantenimiento, avisos críticos', icon: Settings2, chip: 'bg-gray-100 text-gray-600' },
};

const SCREEN_OPTIONS = [
  { value: '', label: 'Abrir la app (sin pantalla específica)' },
  { value: 'Zenio', label: 'Zenio (chat IA)' },
  { value: 'Subscriptions', label: 'Suscripciones / Upgrade' },
  { value: 'Transactions', label: 'Transacciones' },
  { value: 'Goals', label: 'Metas' },
  { value: 'AntExpenseDetective', label: 'Detector de gastos hormiga' },
];

const ACTIVITY_OPTIONS: { value: Activity; label: string }[] = [
  { value: 'any', label: 'Cualquiera' },
  { value: '90', label: 'Activos últimos 90 días' },
  { value: '30', label: 'Activos últimos 30 días' },
  { value: '7', label: 'Activos últimos 7 días' },
];

const COUNTRY_OPTIONS = ['Todos', 'República Dominicana', 'México', 'Colombia', 'Estados Unidos', 'España'];

const TITLE_MAX = 100;
const BODY_MAX = 200;

// ─── Estimador de audiencia (SIMULADO) ───────────────────────────────────
// Base mock por plan; se ajusta por plataforma, actividad y país para que el
// número cambie de forma creíble al mover los filtros. NO consulta la BD.
const PLAN_BASE: Record<Plan, number> = { FREE: 1810, PREMIUM: 384, PRO: 121 };
const ACTIVITY_FACTOR: Record<Activity, number> = { any: 1, '90': 0.82, '30': 0.56, '7': 0.31 };

function estimateAudience(opts: {
  plans: Plan[]; platforms: Platform[]; country: string; activity: Activity; type: BroadcastType;
}): { target: number; optedOut: number } {
  let base = opts.plans.reduce((sum, p) => sum + PLAN_BASE[p], 0);

  // Plataforma: ambas = 1; solo una reduce la base (~iOS 45% / Android 55%).
  if (opts.platforms.length === 1) {
    base *= opts.platforms[0] === 'IOS' ? 0.45 : 0.55;
  } else if (opts.platforms.length === 0) {
    base = 0;
  }

  base *= ACTIVITY_FACTOR[opts.activity];
  if (opts.country !== 'Todos') base *= 0.4;

  const reachable = Math.round(base);
  // Marketing respeta opt-out (~12% simulado); anuncios/sistema no.
  const optedOut = opts.type === 'MARKETING' ? Math.round(reachable * 0.12) : 0;
  return { target: Math.max(0, reachable - optedOut), optedOut };
}

// ─── Historial mock ──────────────────────────────────────────────────────
const MOCK_HISTORY = [
  { date: '05 jun', title: 'Nueva función ✨', type: 'ANNOUNCEMENT' as BroadcastType, audience: 1240, delivery: 92, open: 18, status: 'SENT' },
  { date: '01 jun', title: '50% este fin de semana', type: 'MARKETING' as BroadcastType, audience: 860, delivery: 88, open: 6, status: 'SENT' },
  { date: '28 may', title: 'Mantenimiento programado 3am', type: 'SYSTEM' as BroadcastType, audience: 2010, delivery: 95, open: null, status: 'SENT' },
];

// ─── Vista previa del push (teléfono) ────────────────────────────────────
function PhonePreview({ title, body, type }: { title: string; body: string; type: BroadcastType }) {
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-[260px] h-[520px] rounded-[2.5rem] bg-finzen-black p-3 shadow-xl">
        {/* Notch */}
        <div className="absolute left-1/2 -translate-x-1/2 top-3 w-28 h-5 bg-finzen-black rounded-b-2xl z-10" />
        {/* Pantalla */}
        <div className="w-full h-full rounded-[2rem] bg-gradient-to-b from-slate-700 to-slate-900 overflow-hidden flex flex-col items-center pt-14 px-3">
          <p className="text-white/80 text-xs">9:41</p>
          <p className="text-white text-5xl font-light tracking-tight mt-1">9:41</p>
          <p className="text-white/70 text-xs mt-0.5 mb-5">jueves 5 de junio</p>

          {/* Tarjeta de notificación */}
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

// ─── Modal de confirmación con countdown ─────────────────────────────────
function ConfirmModal({
  target, type, platforms, activityLabel, onCancel, onConfirm,
}: {
  target: number; type: BroadcastType; platforms: Platform[]; activityLabel: string;
  onCancel: () => void; onConfirm: () => void;
}) {
  const [seconds, setSeconds] = useState(5);
  useEffect(() => {
    if (seconds <= 0) return;
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  const platLabel = platforms.length === 2 ? 'iOS + Android' : platforms[0] === 'IOS' ? 'iOS' : 'Android';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-2xl p-6">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle size={20} className="text-finzen-red" />
          <h3 className="text-lg font-bold text-finzen-black">Confirmar envío</h3>
        </div>
        <p className="text-sm text-finzen-black">
          Estás por enviar a{' '}
          <span className="font-bold text-finzen-blue">{target.toLocaleString('es')}</span> usuarios.
        </p>
        <p className="text-xs text-finzen-gray mt-1">
          {TYPE_META[type].label} · {platLabel} · {activityLabel}
        </p>
        <div className="mt-3 rounded-lg bg-finzen-white border border-finzen-gray/20 p-3 text-xs text-finzen-gray">
          Esta acción no se puede deshacer. <span className="font-medium text-finzen-black">(Prototipo: no se enviará nada.)</span>
        </div>
        <div className="flex items-center justify-end gap-2 mt-5">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-finzen-gray/20 text-finzen-gray hover:bg-finzen-white transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={seconds > 0}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-finzen-red text-white hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            {seconds > 0 ? <><Clock size={14} /> Enviar ({seconds}s)</> : <><Send size={14} /> Enviar ahora</>}
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

  // Audiencia
  const [plans, setPlans] = useState<Plan[]>(['FREE', 'PREMIUM', 'PRO']);
  const [platforms, setPlatforms] = useState<Platform[]>(['IOS', 'ANDROID']);
  const [country, setCountry] = useState('Todos');
  const [activity, setActivity] = useState<Activity>('30');

  // Estimación (se recalcula al pedirlo, como el endpoint /preview real)
  const [estimate, setEstimate] = useState<{ target: number; optedOut: number } | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [sentBanner, setSentBanner] = useState<number | null>(null);

  const togglePlan = (p: Plan) =>
    setPlans((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]));
  const togglePlatform = (p: Platform) =>
    setPlatforms((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]));

  // Cualquier cambio en filtros invalida la estimación previa (obliga a recalcular).
  const invalidate = () => setEstimate(null);

  const recalc = () =>
    setEstimate(estimateAudience({ plans, platforms, country, activity, type }));

  const activityLabel = ACTIVITY_OPTIONS.find((o) => o.value === activity)!.label;
  const canSend = !!estimate && estimate.target > 0 && title.trim().length > 0 && body.trim().length > 0;

  const handleConfirm = () => {
    setShowConfirm(false);
    setSentBanner(estimate?.target ?? 0);
    // Reset de contenido tras "enviar" (simulado)
    setTitle('');
    setBody('');
    setScreen('');
    setEstimate(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-finzen-black">Mensajes</h1>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-700">
              Prototipo · no envía
            </span>
          </div>
          <p className="text-sm text-finzen-gray mt-0.5">
            Notificaciones push masivas a la app. Esta versión es solo de interfaz con datos simulados.
          </p>
        </div>
        {/* Toggle vista */}
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

      {/* Banner "enviado" simulado */}
      {sentBanner !== null && (
        <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
          <p className="text-sm text-emerald-700 flex items-center gap-2">
            <Check size={16} />
            Simulación completada: se habría enviado a{' '}
            <span className="font-bold">{sentBanner.toLocaleString('es')}</span> usuarios.
          </p>
          <button onClick={() => setSentBanner(null)} className="text-emerald-700 hover:text-emerald-900">
            <X size={16} />
          </button>
        </div>
      )}

      {view === 'history' ? (
        // ─── HISTORIAL ───────────────────────────────────────────────
        <div className="overflow-x-auto border border-finzen-gray/20 rounded-lg">
          <table className="w-full min-w-[760px]">
            <thead>
              <tr className="bg-finzen-white text-left text-xs font-semibold text-finzen-gray uppercase tracking-wider">
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Título</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3 text-center">Audiencia</th>
                <th className="px-4 py-3 text-center">Entrega</th>
                <th className="px-4 py-3 text-center">Apertura</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-finzen-gray/10">
              {MOCK_HISTORY.map((h, i) => (
                <tr key={i} className="hover:bg-finzen-white/80 transition-colors">
                  <td className="px-4 py-3 text-sm text-finzen-gray">{h.date}</td>
                  <td className="px-4 py-3 text-sm font-medium text-finzen-black">{h.title}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_META[h.type].chip}`}>
                      {TYPE_META[h.type].label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-center text-finzen-black">{h.audience.toLocaleString('es')}</td>
                  <td className="px-4 py-3 text-sm text-center text-finzen-black">{h.delivery}%</td>
                  <td className="px-4 py-3 text-sm text-center text-finzen-gray">{h.open !== null ? `${h.open}%` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="px-4 py-3 text-xs text-finzen-gray bg-finzen-white/50">Datos de ejemplo (mock).</p>
        </div>
      ) : (
        // ─── COMPOSER (split) ────────────────────────────────────────
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 items-start">
          {/* Columna izquierda: formulario */}
          <div className="space-y-5">
            {/* Contenido */}
            <div className="bg-white rounded-xl border border-finzen-gray/20 p-5">
              <h3 className="text-sm font-semibold text-finzen-black mb-4">Contenido</h3>

              {/* Tipo */}
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

              {/* Título */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-finzen-black">Título</label>
                  <span className={`text-xs ${title.length > TITLE_MAX ? 'text-finzen-red' : 'text-finzen-gray'}`}>
                    {title.length}/{TITLE_MAX}
                  </span>
                </div>
                <input
                  type="text"
                  value={title}
                  maxLength={TITLE_MAX}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ej: Nueva función ✨"
                  className="w-full px-3 py-2 text-sm border border-finzen-gray/20 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-finzen-blue/20 focus:border-finzen-blue transition-all"
                />
              </div>

              {/* Cuerpo */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-finzen-black">Mensaje</label>
                  <span className={`text-xs ${body.length > BODY_MAX ? 'text-finzen-red' : 'text-finzen-gray'}`}>
                    {body.length}/{BODY_MAX}
                  </span>
                </div>
                <textarea
                  value={body}
                  maxLength={BODY_MAX}
                  onChange={(e) => setBody(e.target.value)}
                  rows={3}
                  placeholder="Ej: Ya puedes dividir gastos con amigos. ¡Pruébalo!"
                  className="w-full px-3 py-2 text-sm border border-finzen-gray/20 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-finzen-blue/20 focus:border-finzen-blue transition-all resize-none"
                />
              </div>

              {/* Deeplink */}
              <div>
                <label className="text-sm font-medium text-finzen-black block mb-1">Al tocar la notificación</label>
                <select
                  value={screen}
                  onChange={(e) => setScreen(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-finzen-gray/20 rounded-lg bg-white text-finzen-black focus:outline-none focus:ring-2 focus:ring-finzen-blue/20 focus:border-finzen-blue"
                >
                  {SCREEN_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Audiencia */}
            <div className="bg-white rounded-xl border border-finzen-gray/20 p-5">
              <h3 className="text-sm font-semibold text-finzen-black mb-4">Audiencia</h3>

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

              {/* País + Actividad */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-medium text-finzen-gray uppercase tracking-wider mb-1.5">País</p>
                  <select
                    value={country}
                    onChange={(e) => { setCountry(e.target.value); invalidate(); }}
                    className="w-full px-3 py-2 text-sm border border-finzen-gray/20 rounded-lg bg-white text-finzen-black focus:outline-none focus:ring-2 focus:ring-finzen-blue/20 focus:border-finzen-blue"
                  >
                    {COUNTRY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <p className="text-xs font-medium text-finzen-gray uppercase tracking-wider mb-1.5">Actividad</p>
                  <select
                    value={activity}
                    onChange={(e) => { setActivity(e.target.value as Activity); invalidate(); }}
                    className="w-full px-3 py-2 text-sm border border-finzen-gray/20 rounded-lg bg-white text-finzen-black focus:outline-none focus:ring-2 focus:ring-finzen-blue/20 focus:border-finzen-blue"
                  >
                    {ACTIVITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>

              {/* Estimación */}
              <div className="mt-4 rounded-lg bg-finzen-white border border-finzen-gray/20 p-3">
                {estimate ? (
                  <div className="space-y-1">
                    <p className="text-sm text-finzen-black flex items-center gap-2">
                      👥 <span className="font-bold text-finzen-blue">~{estimate.target.toLocaleString('es')}</span> usuarios recibirán esto
                    </p>
                    {estimate.optedOut > 0 && (
                      <p className="text-xs text-finzen-gray">🔕 {estimate.optedOut.toLocaleString('es')} excluidos por opt-out de marketing</p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-finzen-gray">Audiencia sin calcular. Recalcula para ver el alcance.</p>
                )}
                <button
                  onClick={recalc}
                  className="mt-2 px-3 py-1.5 text-sm font-medium rounded-lg border border-finzen-gray/20 text-finzen-gray hover:text-finzen-black hover:bg-white transition-colors"
                >
                  Recalcular audiencia
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
                Enviar ahora <ChevronRight size={14} />
              </button>
            </div>
          </div>

          {/* Columna derecha: preview en vivo (sticky) */}
          <div className="lg:sticky lg:top-20">
            <div className="bg-white rounded-xl border border-finzen-gray/20 p-5">
              <h3 className="text-sm font-semibold text-finzen-black mb-4 flex items-center gap-1.5">
                <Megaphone size={14} /> Vista previa
              </h3>
              <PhonePreview title={title} body={body} type={type} />
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación */}
      {showConfirm && estimate && (
        <ConfirmModal
          target={estimate.target}
          type={type}
          platforms={platforms}
          activityLabel={activityLabel}
          onCancel={() => setShowConfirm(false)}
          onConfirm={handleConfirm}
        />
      )}
    </div>
  );
}
