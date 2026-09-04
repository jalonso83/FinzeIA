'use client';

import { Suspense, useEffect, useState, type ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import { Users, DollarSign, Activity, Calculator, HeartPulse, Megaphone, Loader2, FlaskConical, Check, Minus, LayoutGrid, ChevronDown } from 'lucide-react';
import BannerSuperior from '@/components/dashboard/BannerSuperior';
import DateRangePicker from '@/components/dashboard/DateRangePicker';
import PdfExportPopover from '@/components/dashboard/PdfExportPopover';
import ChartLine from '@/components/dashboard/ChartLine';
import UserGrowthChart from '@/components/dashboard/UserGrowthChart';
import FunnelChart from '@/components/dashboard/FunnelChart';
import CohortHeatmap from '@/components/dashboard/CohortHeatmap';
import OpenAICostsCard from '@/components/dashboard/OpenAICostsCard';
import { useDashboardData } from '@/hooks/useDashboardData';
import { computeRollingParams, fetchH10Stats, fetchH13Stats, type AcquisitionData, type H10Stats, type H13Stats } from '@/lib/dashboard-api';
import { canSeeDetallesTab, canSeeFinancials, getClientRole, type Role } from '@/lib/roles';
import { PdfCoverPage } from './PdfCoverPage';
import { PdfGlossary } from './PdfGlossary';
import { TabPulso } from './TabPulso';
import './print.css';

const tabs = [
  { id: 'usuarios', label: 'Usuarios', icon: Users },
  { id: 'adquisicion', label: 'Adquisición', icon: Megaphone },
  { id: 'revenue', label: 'Revenue', icon: DollarSign },
  { id: 'engagement', label: 'Engagement', icon: Activity },
  { id: 'economics', label: 'Unit Economics', icon: Calculator },
  { id: 'salud', label: 'Salud Fin.', icon: HeartPulse },
  { id: 'experimentos', label: 'Experimentos', icon: FlaskConical },
];

// ─── Collapsible Section ─────────────────────────────────────────
function Section({ title, defaultOpen = true, children, tooltip }: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  tooltip?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [showTip, setShowTip] = useState(false);
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 text-sm font-semibold text-finzen-black hover:text-finzen-blue transition-colors"
        >
          <span className="text-finzen-blue">{open ? '▼' : '▶'}</span>
          {title}
        </button>
        {tooltip && (
          <div className="relative" onMouseEnter={() => setShowTip(true)} onMouseLeave={() => setShowTip(false)}>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-finzen-gray/40 cursor-help"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
            {showTip && (
              <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 px-3 py-2 bg-finzen-black text-white text-xs rounded-lg shadow-lg whitespace-normal">
                {tooltip}
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-finzen-black" />
              </div>
            )}
          </div>
        )}
      </div>
      {open && <div>{children}</div>}
    </div>
  );
}

// ─── Stat Box with Tooltip ────────────────────────────────────────
function StatBox({ label, value, highlight, tooltip }: { label: string; value: string; highlight?: boolean; tooltip?: string }) {
  const [showTip, setShowTip] = useState(false);
  return (
    <div className={`rounded-lg border p-4 relative ${highlight ? 'border-finzen-green bg-finzen-green/5' : 'border-finzen-gray/20 bg-white'}`}>
      <div className="flex items-center gap-1">
        <p className="text-xs text-finzen-gray font-medium">{label}</p>
        {tooltip && (
          <div className="relative" onMouseEnter={() => setShowTip(true)} onMouseLeave={() => setShowTip(false)}>
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-finzen-gray/40 cursor-help"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
            {showTip && (
              <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 px-3 py-2 bg-finzen-black text-white text-xs rounded-lg shadow-lg">
                {tooltip}
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-finzen-black" />
              </div>
            )}
          </div>
        )}
      </div>
      <p className={`text-xl font-bold mt-1 ${highlight ? 'text-finzen-green' : 'text-finzen-black'}`}>{value}</p>
    </div>
  );
}

// ─── Data transformers ───────────────────────────────────────────

function buildFunnelData(users: any) {
  if (!users?.funnel) return [];
  const f = users.funnel;
  const base = f.registered || 1;
  const pct = (v: number) => `${((v / base) * 100).toFixed(2)}%`;
  // D1/D7 NO se dividen contra `registered` (incluye users sin edad para cumplir
  // la ventana → tasa hundida). Se dividen contra su cohorte madura (cohortD1/D7),
  // que el backend ya calcula con el mismo LEAST que el numerador. Si la cohorte
  // madura es 0 (período entero dentro de la ventana), no es evaluable → "—".
  const pctOf = (v: number, denom: number) =>
    denom > 0 ? `${((v / denom) * 100).toFixed(2)}%` : '—';
  // La etapa 'Onboarding' se retiró al eliminar el muro definitivamente (jul-2026):
  // entrar a la app ya marca onboardingCompleted=true (config.ts markAppEntered), así
  // que el escalón daba ~100% siempre y solo agregaba ruido al embudo.
  return [
    { etapa: 'Registro', valor: f.registered, porcentaje: '100%' },
    { etapa: 'Verificados', valor: f.verified, porcentaje: pct(f.verified) },
    { etapa: 'Activación', valor: f.activated, porcentaje: pct(f.activated) },
    { etapa: 'Retención D1', valor: f.retainedD1, porcentaje: pctOf(f.retainedD1, f.cohortD1) },
    { etapa: 'Retención D7', valor: f.retainedD7, porcentaje: pctOf(f.retainedD7, f.cohortD7) },
    { etapa: 'Trial', valor: f.trialStarted, porcentaje: pct(f.trialStarted) },
    { etapa: 'Paid', valor: f.paid, porcentaje: pct(f.paid) },
  ];
}

function buildCohortData(users: any) {
  if (!users?.cohorts) return [];
  const now = Date.now();
  const DAY = 86400000;
  return users.cohorts.map((c: any) => {
    const d = new Date(c.week);
    const label = d.toLocaleDateString('es', { day: '2-digit', month: 'short', timeZone: 'UTC' });
    const size = c.size || 0;
    const weekStart = d.getTime();
    // For each bucket, only show % if the cohort has had enough time to reach day N.
    // The cohort is a week, so we use the END of the week (start + 7d) as the youngest user.
    // A bucket is evaluable when (now - end-of-cohort-week) >= N days.
    const evaluable = (n: number) => now - (weekStart + 7 * DAY) >= n * DAY;
    // Devolvemos % + conteo crudo (numerador/denominador). Redondeo a ENTERO (no 2
    // decimales) para no sugerir una precisión que no existe con muestras chicas.
    const cell = (v: number | null, n: number) =>
      !evaluable(n) || v === null ? null : { pct: size > 0 ? Math.round((v / size) * 100) : 0, raw: v };
    return {
      semana: label,
      size,
      d1: cell(c.d1, 1),
      d7: cell(c.d7, 7),
      d14: cell(c.d14, 14),
      d30: cell(c.d30, 30),
    };
  });
}

function buildMrrTrend(revenue: any) {
  if (!revenue?.mrrTrend) return [];
  return revenue.mrrTrend.map((m: any) => {
    const d = new Date(m.month);
    return {
      date: d.toLocaleDateString('es', { month: 'short', year: '2-digit', timeZone: 'UTC' }),
      mrr: m.mrr,
    };
  });
}

// ─── Tab: Usuarios ───────────────────────────────────────────────
function TabUsuarios({ users }: { users: any }) {
  return (
    <div>
      <Section
        title="Registros de Usuarios"
        tooltip="Nuevas registraciones en el período, con periodicidad seleccionable (diaria, semanal o mensual). Útil para identificar picos de adquisición o efectividad de campañas."
      >
        <UserGrowthChart title="" registrationsByDay={users?.registrationsByDay} />
      </Section>

      <Section
        title="Funnel Completo"
        tooltip="Del cohorte de usuarios registrados en el período seleccionado, muestra cuántos avanzaron a cada etapa. El % se calcula vs total registrados (base 100%)."
      >
        <FunnelChart data={buildFunnelData(users)} />
      </Section>

      <Section
        title="Cohortes de Retención"
        tooltip="Agrupa usuarios por semana de registro y muestra qué % se mantienen activos en D1, D7, D14 y D30. Indica qué tan bien retienes usuarios nuevos."
      >
        <CohortHeatmap data={buildCohortData(users)} />
      </Section>
    </div>
  );
}

// ─── Tab: Revenue ────────────────────────────────────────────────
function TabRevenue({ revenue, pulse }: { revenue: any; pulse: any }) {
  if (!revenue) return null;

  const totalUsers = pulse?.totalUsers || 0;
  const totalPaidSubs = (revenue.subscribersByPlan?.PREMIUM || 0) + (revenue.subscribersByPlan?.PRO || 0);
  const subsPorcentaje = totalUsers > 0 ? ((totalPaidSubs / totalUsers) * 100).toFixed(2) : '0';

  const revenueByPlanRows = [
    {
      plan: `Plus ($4.99/mes)`,
      usuarios: revenue.subscribersByPlan?.PREMIUM ?? 0,
      mrr: `$${revenue.revenueByPlan?.PREMIUM?.toFixed(2) ?? '0.00'}`,
    },
    {
      plan: `Pro ($9.99/mes)`,
      usuarios: revenue.subscribersByPlan?.PRO ?? 0,
      mrr: `$${revenue.revenueByPlan?.PRO?.toFixed(2) ?? '0.00'}`,
    },
  ];

  return (
    <div>
      <Section
        title="Métricas de Revenue"
        tooltip="Resumen de ingresos: arriba el top-line (MRR, ingresos totales, suscripciones, ARPU); abajo el desglose por canal y la salud operativa de los cobros."
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {/* ── Fila 1 — Top-line ─────────────────────────────────── */}
          <StatBox label="MRR Actual" value={`$${revenue.mrrCurrent?.toFixed(2)}`} highlight tooltip="Ingreso Mensual Recurrente actual. Solo suscripciones activas pagando (sin trials)." />
          <StatBox label="Ingresos Total" value={`$${Number(revenue.payments?.totalAmount ?? 0).toFixed(2)}`} highlight tooltip="Suma total de pagos exitosos en el período." />
          <StatBox label="Total Suscripciones" value={`${totalPaidSubs} / ${totalUsers} (${subsPorcentaje}%)`} highlight tooltip="Usuarios pagando actualmente (Plus o Pro con status ACTIVE), sobre el total de usuarios registrados. NO incluye trials." />
          <StatBox label="ARPU" value={`$${revenue.arpu?.toFixed(2)}`} highlight tooltip="Average Revenue Per User. Ingreso promedio por suscriptor activo pagando." />

          {/* ── Fila 2 — Canal y salud operativa ──────────────────── */}
          <StatBox label="Stripe" value={`$${revenue.revenueByPlatform?.stripe?.toFixed(2) ?? '0.00'}`} tooltip="Ingresos totales de Stripe (pagos web) en el período." />
          <StatBox label="RevenueCat" value={`$${revenue.revenueByPlatform?.revenuecat?.toFixed(2) ?? '0.00'}`} tooltip="Ingresos totales de RevenueCat (compras in-app iOS/Android) en el período." />
          <StatBox label="Pagos Exitosos" value={String(revenue.payments?.succeeded ?? 0)} tooltip="Número de pagos procesados con éxito en el período." />
          <StatBox label="Pagos Fallidos" value={String(revenue.payments?.failed ?? 0)} tooltip="Pagos que no se pudieron procesar (tarjeta rechazada, fondos insuficientes, etc.)." />
        </div>
      </Section>

      <Section
        title="MRR Trend"
        tooltip="Tendencia histórica del Ingreso Mensual Recurrente. Muestra crecimiento o caídas en ingresos pagados a lo largo del tiempo."
      >
        <ChartLine
          title=""
          data={buildMrrTrend(revenue)}
          xKey="date"
          lines={[{ dataKey: 'mrr', color: '#6cad7f', name: 'MRR ($)' }]}
        />
      </Section>

      <Section
        title="Revenue por Plan"
        tooltip="Desglose de ingresos (MRR) por cada plan de suscripción. Muestra qué plan genera más ingresos y cuántos usuarios pagan por cada uno."
      >
        <div className="bg-white rounded-xl border border-finzen-gray/20 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-finzen-gray/10">
                <th className="text-left text-xs font-medium text-finzen-gray p-4">Plan</th>
                <th className="text-center text-xs font-medium text-finzen-gray p-4">Usuarios</th>
                <th className="text-right text-xs font-medium text-finzen-gray p-4">MRR</th>
              </tr>
            </thead>
            <tbody>
              {revenueByPlanRows.map((row) => (
                <tr key={row.plan} className="border-b border-finzen-gray/10 last:border-0">
                  <td className="text-sm font-medium text-finzen-black p-4">{row.plan}</td>
                  <td className="text-sm text-center text-finzen-black p-4">{row.usuarios}</td>
                  <td className="text-sm text-right font-bold text-finzen-green p-4">{row.mrr}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section
        title="Métricas de Trial"
        tooltip="Información sobre usuarios en período de prueba: cuántos están activos y tasas de cancelación."
      >
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <StatBox label="Trials Activos" value={String(revenue.trialsActive)} tooltip="Usuarios en período de prueba gratuita de 7 días." />
          <StatBox label="Cancelaciones (30d)" value={String(revenue.cancellations30d)} tooltip="Usuarios que pagaron hace 30-60 días pero no en los últimos 30 (attrition real basado en pagos). Captura mensuales correctamente; anuales pueden tardar hasta su fecha de no-renovación." />
        </div>
      </Section>
    </div>
  );
}

// ─── Base activa de funcionalidades (inventario estático × plan) ──
// Verificado contra config/stripe.ts PLANS + gating por ruta (2026-06-30).
// Valores = límites ENFORCED (no marketing). "Plus" = nombre visible de PREMIUM.
type CellVal = boolean | string;
const FEATURE_INVENTORY: { group: string; accent: string; rows: { name: string; note?: string; free: CellVal; plus: CellVal; pro: CellVal }[] }[] = [
  {
    group: 'Core — todos los planes',
    accent: 'text-emerald-700 bg-emerald-50',
    rows: [
      { name: 'Transacciones', free: '∞', plus: '∞', pro: '∞' },
      { name: 'Categorías', free: true, plus: true, pro: true },
      { name: 'Gamificación', note: 'FinScore, rachas, badges, retos, ranking', free: true, plus: true, pro: true },
      { name: 'Reportes básicos', free: true, plus: true, pro: true },
      { name: 'Calculadoras financieras básicas', free: true, plus: true, pro: true },
      { name: 'Calculadora de inversión', free: true, plus: true, pro: true },
      { name: 'Detector de gastos hormiga', free: 'Básico', plus: 'Completo', pro: 'Completo' },
      { name: 'Referidos', free: true, plus: true, pro: true },
      { name: 'Notificaciones push', free: true, plus: true, pro: true },
      { name: 'Prueba gratis 7 días', free: true, plus: true, pro: true },
    ],
  },
  {
    group: 'Límites que escalan',
    accent: 'text-finzen-blue bg-blue-50',
    rows: [
      { name: 'Presupuestos', free: '4', plus: '∞', pro: '∞' },
      { name: 'Metas de ahorro', free: '2', plus: '∞', pro: '∞' },
      { name: 'Consultas Zenio (IA)', free: '15/mes', plus: '∞', pro: '∞' },
      { name: 'Recordatorios de pago', free: '2', plus: '∞', pro: '∞' },
    ],
  },
  {
    group: 'Plus y Pro',
    accent: 'text-indigo-700 bg-indigo-50',
    rows: [
      { name: 'Alertas de umbral en presupuestos', free: false, plus: true, pro: true },
      { name: 'Zenio con voz (Text-to-Speech)', free: false, plus: true, pro: true },
      { name: 'Reportes avanzados con IA', free: false, plus: true, pro: true },
      { name: 'Exportar datos (CSV/PDF)', free: false, plus: true, pro: true },
      { name: 'Reto Skip vs Save', free: false, plus: true, pro: true },
    ],
  },
  {
    group: 'Pro exclusivo',
    accent: 'text-purple-700 bg-purple-50',
    rows: [
      { name: 'Integración bancaria / Email Sync', free: false, plus: false, pro: true },
      { name: 'Alertas automáticas de gastos hormiga', free: false, plus: false, pro: true },
      { name: 'Reportes quincenales con IA', free: false, plus: false, pro: true },
      { name: 'Acceso anticipado a nuevas features', free: false, plus: false, pro: true },
    ],
  },
];

function FeatureCell({ value }: { value: CellVal }) {
  if (value === true) return <Check size={16} className="text-emerald-600 inline" strokeWidth={3} />;
  if (value === false) return <Minus size={15} className="text-finzen-gray/30 inline" />;
  return <span className="inline-block text-xs font-bold text-finzen-black bg-finzen-white rounded px-1.5 py-0.5">{value}</span>;
}

function FeatureInventory() {
  const flat: Array<any> = [];
  FEATURE_INVENTORY.forEach((g) => {
    flat.push({ kind: 'group', group: g.group, accent: g.accent });
    g.rows.forEach((r) => flat.push({ kind: 'row', ...r }));
  });
  const totalFeatures = FEATURE_INVENTORY.reduce((s, g) => s + g.rows.length, 0);

  return (
    <Section
      title="Base activa de funcionalidades"
      tooltip="Inventario completo de funcionalidades de FinZen y qué incluye cada plan. Verificado contra la configuración real de planes (no el marketing)."
    >
      <div className="rounded-xl border border-finzen-gray/20 bg-white overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-finzen-gray/10">
          <LayoutGrid size={16} className="text-finzen-blue" />
          <span className="text-sm font-semibold text-finzen-black">Stock de funcionalidades</span>
          <span className="text-[11px] text-finzen-gray bg-finzen-white px-2 py-0.5 rounded-full">{totalFeatures} funcionalidades</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-white">
                <th className="text-left font-semibold text-finzen-black px-4 py-3 min-w-[220px]">Funcionalidad</th>
                <th className="text-center font-semibold text-finzen-gray px-3 py-3 w-24">
                  Gratis<span className="block text-[10px] font-normal text-finzen-gray/70">$0</span>
                </th>
                <th className="text-center font-semibold text-finzen-green px-3 py-3 w-24 bg-finzen-green/5">
                  Plus<span className="block text-[10px] font-normal text-finzen-green/70">$4.99</span>
                </th>
                <th className="text-center font-semibold text-finzen-blue px-3 py-3 w-24">
                  Pro<span className="block text-[10px] font-normal text-finzen-blue/70">$9.99</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {flat.map((item, i) =>
                item.kind === 'group' ? (
                  <tr key={`g-${i}`}>
                    <td colSpan={4} className={`px-4 py-1.5 text-[11px] font-bold uppercase tracking-wide ${item.accent}`}>{item.group}</td>
                  </tr>
                ) : (
                  <tr key={`r-${i}`} className="border-t border-finzen-gray/10 hover:bg-finzen-white/40 transition-colors">
                    <td className="px-4 py-2.5 text-finzen-black align-top">
                      {item.name}
                      {item.note && <span className="block text-[11px] text-finzen-gray">{item.note}</span>}
                    </td>
                    <td className="text-center px-3 py-2.5"><FeatureCell value={item.free} /></td>
                    <td className="text-center px-3 py-2.5 bg-finzen-green/5"><FeatureCell value={item.plus} /></td>
                    <td className="text-center px-3 py-2.5"><FeatureCell value={item.pro} /></td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-finzen-gray px-4 py-2.5 border-t border-finzen-gray/10 bg-finzen-white/30">
          <Check size={11} className="inline text-emerald-600" strokeWidth={3} /> incluido · <Minus size={11} className="inline text-finzen-gray/40" /> no incluido · ∞ ilimitado. Verificado contra la config real de planes. «Plus» es el nombre visible de PREMIUM.
        </p>
      </div>
    </Section>
  );
}

// ─── Tab: Engagement ─────────────────────────────────────────────
function TabEngagement({ engagement }: { engagement: any }) {
  if (!engagement) return null;

  return (
    <div>
      {/* ── INVENTARIO DE FUNCIONALIDADES (estático, arriba de todo) ─ */}
      <FeatureInventory />

      {/* ── GRUPO A — BASE ACTIVA (top-line, highlight) ──────────── */}
      <Section
        title="Base Activa"
        tooltip="Lo primero que evalúa un directivo: cuántos usan la app de verdad y qué tanto adoptan los features core (transacciones y Zenio)."
      >
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <StatBox label="Usuarios Activos" value={String(engagement.activeUsers)} highlight tooltip="Usuarios que registraron al menos 1 transacción (con fecha en el período seleccionado). Mide actividad financiera, no toda actividad en la app." />
          <StatBox label="Adopción TX" value={`${engagement.txAdoptionRate}%`} highlight tooltip="% del cohort registrado en el período que hizo al menos 1 transacción durante el mismo período. Cohort y actividad están alineados (no se mezcla con users legacy). Excluye users registrados en la última hora (sin chance razonable de activarse). Métrica de activación core: si es bajo, los users registran pero no usan la app." />
          <StatBox label="Adopción Zenio real" value={`${engagement.zenioRealAdoptionRate ?? 0}%`} highlight tooltip="% del cohort que usó Zenio en un día POSTERIOR a su registro = uso voluntario real. Excluye el onboarding conversacional (que cae en el día de registro e infla la métrica). Esta es la adopción honesta del feature AI." />
        </div>
      </Section>

      {/* ── GRUPO B — ACTIVACIÓN ─────────────────────────────────────
          Se quitaron los KPIs de onboarding (tasa, skip, sin terminar, saltó-vs-chat)
          al eliminar el muro definitivamente (rollout 100%, jul-2026): entrar a la app
          marca `onboardingCompleted=true` (config.ts markAppEntered), así que esa tasa
          medía "abrió la app"; y el botón de saltar vivía en la pantalla del muro, o sea
          que ya nadie vuelve a ser 'skipped'. El resultado del experimento queda en
          Experimentos → Entrada libre. */}
      <Section
        title="Activación"
        tooltip="Qué tan rápido el usuario llega a su primera transacción. La activación en sí (% que registra algo) está arriba, en Base Activa: 'Adopción TX'."
      >
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <StatBox
            label="Time-to-First-TX"
            value={engagement.timeToFirstTx?.medianHours !== null ? `${engagement.timeToFirstTx?.medianHours}h (${engagement.timeToFirstTx?.firstTxRate}%)` : '—'}
            tooltip="Mediana de horas entre registro y primera transacción del cohorte del período. Entre paréntesis: % del cohorte que llegó a hacer primera tx. Solo cohortes con ≥1h desde registro."
          />
          <StatBox label="Tocó Zenio (incl. onboarding)" value={`${engagement.zenioAdoptionRate}%`} tooltip="% del cohort que generó CUALQUIER uso de Zenio en el período, incluido el onboarding conversacional. Sin muro tiende a converger con 'Adopción Zenio real' (ya nadie pasa forzado por el chat); se mantiene durante la transición para poder comparar." />
        </div>
      </Section>

      {/* ── GRUPO C — HÁBITO & PROFUNDIDAD ───────────────────────── */}
      <Section
        title="Hábito & Profundidad"
        tooltip="Qué tan pegajosa es la app: formación de hábito (rachas) y profundidad de uso (transacciones y mensajes por usuario)."
      >
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <StatBox label="Racha de Hábito" value={`${engagement.streakActiveRate}%`} tooltip="% de usuarios activos (≥1 tx) con racha de hábito real: currentStreak ≥ 2 (volvieron en días consecutivos). Se exige ≥2 porque una racha de 1 la crea cualquier actividad única y no indica hábito. Mide retorno real, no cobertura de la tabla de rachas." />
          <StatBox label="TX / Usuario Activo" value={String(engagement.transactionsPerActiveUser)} tooltip="Promedio de transacciones por usuario activo en el período. Indica profundidad de uso. Nota: es promedio simple — no refleja distribución." />
          {/* Estas dos tarjetas NO son comparables entre sí y por eso el título de
              cada una dice explícitamente qué mide y de cuándo. Miden distinto en
              dos ejes a la vez: una son mensajes de la persona y la otra son
              llamadas a la IA (el onboarding entra en la segunda y no en la
              primera), y además la primera ignora el filtro de fechas. Sin eso en
              el título, el "de por vida" sale MENOR que el de 90 días y parece un
              error de cálculo. */}
          <StatBox label="Mensajes escritos a Zenio (de por vida)" value={String(engagement.zenioMessagesTotal ?? 0)} tooltip="Mensajes que las personas le escribieron a Zenio, desde que existe la app. Cada mensaje suma 1 — no son hilos de conversación. Excluye saludos automáticos y onboarding, así que es el número limpio de uso real. Es la suma de la columna 'Zenio' de la tabla de Usuarios. NO respeta el filtro de período: pongas 7, 30 o 90 días, siempre muestra el acumulado completo. Ojo: el contador vive en la tabla de suscripciones, así que los usuarios borrados se llevaron su cuenta — puede quedar corto por abajo." />
          <StatBox label="Llamadas a OpenAI de Zenio (período)" value={String(engagement.zenioMessagesThisMonth ?? 0)} tooltip="LLAMADAS a la IA, no mensajes de la persona: un mensaje puede disparar varias llamadas, y aquí entran también el onboarding y los saludos automáticos, que la tarjeta de al lado excluye. Por eso este número puede superar al 'de por vida' y no es una contradicción. Hasta el 21-ago-2026 el onboarding corría por Zenio y domina el volumen viejo (en junio, el 92% ocurrió el mismo día del registro); apagado el onboarding, de esa fecha en adelante estas llamadas ya son casi todas conversación real. Sale de openai_daily_usage, prorrateado por la parte del costo que es de Zenio, porque esa tabla guarda el total de IA del día e incluye el lector de correos y la voz: es una estimación, no un conteo exacto." />
          <StatBox label="Usuarios que usaron Zenio (período)" value={String(engagement.zenioUsuariosPeriodo ?? 0)} tooltip="Personas distintas que tuvieron alguna actividad de Zenio dentro del período. Esta es la métrica honesta para decir 'cuánta gente usa Zenio': el conteo de llamadas de al lado sube si pocos usuarios escriben mucho, este no. Misma salvedad del onboarding: antes del 21-ago-2026 entra gente que solo pasó por el formulario de bienvenida." />
        </div>
      </Section>

      {/* ── GRUPO E — FUNCIONALIDADES EXTRA (uso de features) ────── */}
      {engagement.featureUsage && (() => {
        const fu = engagement.featureUsage;
        return (
          <Section
            title="Funcionalidades Extra"
            tooltip="Uso de herramientas más allá del core (Gastos Hormiga, calculadoras). La adopción de features de pago se mide contra la base CON ACCESO (pagando + trial), no toda la base."
          >
            <p className="text-xs font-semibold text-finzen-gray mb-2 mt-1">🐜 Gastos Hormiga</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-5">
              <StatBox label="Usuarios" value={String(fu.antExpense?.users ?? 0)} tooltip="Usuarios únicos que corrieron un análisis de gastos hormiga en el período." />
              <StatBox label="Adopción" value={`${fu.antExpense?.adoptionRate ?? 0}%`} tooltip="Usuarios que usaron Gastos Hormiga / usuarios activos del período. Feature de todos los planes → base = activos." />
              <StatBox label="Abrió → Usó" value={`${fu.antExpense?.openedUsers ?? 0} → ${fu.antExpense?.users ?? 0} (${fu.antExpense?.openedToUsedRate ?? 0}%)`} tooltip="Embudo: abrieron la pantalla → corrieron un análisis. % = de los que abrieron, cuántos la usaron. Bajo = problema de valor/UX; pocos que abren = problema de descubrimiento." />
            </div>

            <p className="text-xs font-semibold text-finzen-gray mb-2">🧮 Calculadoras <span className="font-normal">(gratis · todos los planes)</span></p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-2">
              <StatBox label="Usuarios" value={String(fu.calculatorsFree?.users ?? 0)} tooltip="Usuarios únicos que usaron alguna calculadora gratis (inversión, meta o inflación) en el período." />
              <StatBox label="Usos totales" value={String(fu.calculatorsFree?.calls ?? 0)} tooltip="Total de cálculos corridos (inversión + meta + inflación)." />
              <StatBox label="Adopción" value={`${fu.calculatorsFree?.adoptionRate ?? 0}%`} tooltip="Usuarios que usaron calculadoras / usuarios activos. Base = activos (son gratis)." />
            </div>
            <div className="flex flex-wrap items-center gap-2 mb-5 px-1">
              <span className="text-xs text-finzen-gray font-semibold mr-1">Desglose:</span>
              {(fu.calculatorsFree?.breakdown ?? []).map((c: any) => (
                <span key={c.key} className="inline-flex items-center gap-1.5 text-sm bg-white border border-finzen-gray/25 rounded-full px-3 py-1">
                  <span className="text-finzen-black font-medium">{c.label}</span>
                  <span className="font-bold text-finzen-blue">{c.calls}</span>
                </span>
              ))}
            </div>

            <p className="text-xs font-semibold text-finzen-gray mb-2">💸 Skip vs Save <span className="font-normal">(Plus / Pro)</span></p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-2">
              <StatBox label="Usuarios" value={String(fu.skipVsSave?.users ?? 0)} tooltip="Usuarios únicos que usaron el reto Skip vs Save en el período (exclusivo de planes Plus/Pro)." />
              <StatBox label="Adopción" value={`${fu.skipVsSave?.adoptionRate ?? 0}%`} highlight tooltip="Usuarios que usaron Skip vs Save / BASE CON ACCESO (pagando PREMIUM/PRO + en trial). NO se mide contra toda la base porque los FREE no pueden abrirlo." />
              <StatBox label="Usos totales" value={String(fu.skipVsSave?.calls ?? 0)} tooltip="Total de cálculos de Skip vs Save en el período." />
            </div>
            <p className="text-[11px] text-finzen-gray mb-1 px-1">Base con acceso (pagando + trial): {fu.skipVsSave?.accessBase ?? 0} usuarios.</p>

            <p className="text-xs font-semibold text-finzen-gray mb-2 mt-6">🎟️ Prueba gratis <span className="font-normal">(embudo: ver planes → activar)</span></p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-2">
              <StatBox
                label="Vieron los planes"
                value={String(fu.trialFunnel?.viewedUsers ?? 0)}
                tooltip="Usuarios únicos que abrieron la pantalla de Suscripciones en el período. Se mide por la llamada a /subscriptions/plans, que solo hace esa pantalla."
              />
              <StatBox
                label="Llegan a verla"
                value={`${fu.trialFunnel?.viewRate ?? 0}%`}
                highlight
                tooltip="Vieron los planes / usuarios FREE que todavía pueden activar su prueba. Si este número es muy bajo, el problema es de DESCUBRIMIENTO: no encuentran la pantalla, y cambiar el texto de adentro no mueve nada."
              />
              <StatBox
                label="Vieron → Activaron"
                value={`${fu.trialFunnel?.startedUsers ?? 0} (${fu.trialFunnel?.viewToStartRate ?? 0}%)`}
                tooltip="De los que vieron los planes, cuántos activaron la prueba. Si llegan muchos y activan pocos, el problema es de la PANTALLA (el mensaje de 'sin tarjeta' solo aparece después de tocar un plan de pago)."
              />
            </div>
            <p className="text-[11px] text-finzen-gray mb-1 px-1">
              Base elegible: {fu.trialFunnel?.eligibleBase ?? 0} usuarios FREE con la prueba todavía disponible (es un stock, no del período).
            </p>
          </Section>
        );
      })()}

      {/* ── GRUPO D — VIRALIDAD ──────────────────────────────────── */}
      <Section
        title="Viralidad"
        tooltip="Crecimiento orgánico vía referidos: cuántas invitaciones se generan y cuántas convierten."
      >
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <StatBox label="Referidos Enviados" value={String(engagement.referrals?.total ?? 0)} tooltip="Invitaciones de referido creadas en el período (top del funnel viral)." />
          <StatBox label="Conversión Referidos" value={`${engagement.referrals?.converted ?? 0} (${engagement.referrals?.conversionRate ?? 0}%)`} tooltip="Referidos creados en el período que terminaron convirtiéndose en usuarios activos. El % es vs total de referidos enviados (mismo cohorte)." />
        </div>
      </Section>
    </div>
  );
}

// ─── Tab: Unit Economics (data real desde backend) ───────────────
function TabEconomics({ openaiCosts, unitEconomics }: { openaiCosts: any; unitEconomics: any }) {
  if (!unitEconomics) return null;

  const breakEvenLabel = unitEconomics.breakEven.usersNeeded !== null
    ? `${unitEconomics.breakEven.currentPayingUsers} / ${unitEconomics.breakEven.usersNeeded}`
    : `${unitEconomics.breakEven.currentPayingUsers} / —`;

  const progressWidth = unitEconomics.breakEven.usersNeeded !== null
    ? `${unitEconomics.breakEven.progressPct}%`
    : '0%';

  const cashFlowPositive = unitEconomics.cashFlowMonthly >= 0;

  return (
    <div>
      {/* ── SECCIÓN 1 — SALUD ECONÓMICA (top-line, highlight) ─────── */}
      <Section
        title="Salud Económica"
        tooltip="Vista ejecutiva: ¿gano dinero? ¿cuánto cuesta mantener el negocio? ¿estoy en break-even?"
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatBox
            label="Margen Bruto"
            value={`${unitEconomics.grossMargin.toFixed(2)}%`}
            highlight
            tooltip="(MRR − costos variables) / MRR × 100. Excluye costos fijos por convención SaaS. Indica rentabilidad a escala."
          />
          <StatBox
            label="MRR"
            value={`$${unitEconomics.mrrCurrent.toFixed(2)}`}
            highlight
            tooltip="Ingreso Mensual Recurrente actual (suma normalizada de suscripciones activas pagadas)."
          />
          <StatBox
            label="Costo Total Mensual"
            value={`$${unitEconomics.totalCostMonthly.toFixed(2)}`}
            highlight
            tooltip={`Suma de costos fijos ($${unitEconomics.fixedCosts.total.toFixed(2)}) + variables (OpenAI, fees) escalados a mensual.`}
          />
          <StatBox
            label="Cash Flow Mensual"
            value={`${cashFlowPositive ? '+' : ''}$${unitEconomics.cashFlowMonthly.toFixed(2)}`}
            highlight
            tooltip="MRR − Costo Total. Positivo = profit, negativo = burn. Es la métrica más honesta de viabilidad mensual."
          />
        </div>
      </Section>

      {/* ── SECCIÓN 2 — BREAK-EVEN ───────────────────────────────── */}
      <Section
        title="Break-Even"
        tooltip="Punto de equilibrio: cuántos suscriptores pagados necesitas para que la contribución (ARPU − costo variable por user) cubra los costos fijos mensuales."
      >
        <div className="bg-white rounded-xl border border-finzen-gray/20 p-5 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div>
              <p className="text-sm text-finzen-gray">Progreso al Break-Even (suscriptores pagando)</p>
              <p className="text-lg font-bold text-finzen-black">
                {breakEvenLabel} usuarios
              </p>
              {unitEconomics.breakEven.usersNeeded === null && (
                <p className="text-xs text-finzen-red mt-1">
                  Imposible calcular: contribución por user es negativa o cero. Revisar pricing o costos variables.
                </p>
              )}
            </div>
            <span className="text-2xl font-bold text-finzen-blue">{progressWidth}</span>
          </div>
          <div className="w-full bg-finzen-white rounded-full h-4 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-finzen-blue to-finzen-green transition-all duration-1000"
              style={{ width: progressWidth }}
            />
          </div>
        </div>
      </Section>

      {/* ── SECCIÓN 3 — COSTOS POR USUARIO ───────────────────────── */}
      <Section
        title="Costos por Usuario"
        tooltip="Dos lentes: (1) por usuario ACTIVO con tx en período — la economía real. (2) por usuario TOTAL registrado — incluye dormidos, vista más conservadora."
      >
        {/* Header con denominadores */}
        <div className="bg-white rounded-xl border border-finzen-gray/20 p-4 mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-finzen-gray">Usuarios activos (tx en período)</p>
            <p className="text-lg font-bold text-finzen-blue">{unitEconomics.activeUsers}</p>
          </div>
          <div className="text-finzen-gray text-sm">vs</div>
          <div>
            <p className="text-xs text-finzen-gray">Usuarios totales (registrados)</p>
            <p className="text-lg font-bold text-finzen-black">{unitEconomics.totalUsers}</p>
          </div>
        </div>

        {/* Por usuario activo (primario) */}
        <p className="text-xs font-semibold text-finzen-gray mb-2 uppercase tracking-wide">
          Por usuario activo ({unitEconomics.activeUsers}) — economía real
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
          <StatBox label="Costo IA / Usuario" value={`$${unitEconomics.costAIPerUser.toFixed(2)}`} tooltip="Costo OpenAI escalado a mensual / usuarios con ≥1 tx en el período." />
          <StatBox label="Costo Infra / Usuario" value={`$${unitEconomics.costInfraPerUser.toFixed(2)}`} tooltip={`Costos fijos $${unitEconomics.fixedCosts.total.toFixed(2)} / activos.`} />
          <StatBox label="Costo Total / Usuario" value={`$${unitEconomics.costPerUser.toFixed(2)}`} tooltip="Costo total mensual / activos. Indicador clave para unit economics." />
        </div>

        {/* Por usuario total (secundario, más tenue) */}
        <p className="text-xs font-semibold text-finzen-gray mb-2 uppercase tracking-wide">
          Por usuario total ({unitEconomics.totalUsers}) — vista conservadora
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6 opacity-75">
          <StatBox label="Costo IA / Total" value={`$${unitEconomics.costAIPerTotalUser.toFixed(2)}`} tooltip="Mismo cálculo pero dividido entre TODOS los usuarios registrados (incluye dormidos)." />
          <StatBox label="Costo Infra / Total" value={`$${unitEconomics.costInfraPerTotalUser.toFixed(2)}`} tooltip="Costos fijos / total registrados." />
          <StatBox label="Costo Total / Total" value={`$${unitEconomics.costPerTotalUser.toFixed(2)}`} tooltip="Costo total / total registrados. Vista más optimista del costo unitario." />
        </div>
      </Section>

      {/* ── SECCIÓN 4 — DESGLOSE DE COSTOS ───────────────────────── */}
      <Section
        title="Desglose de Costos"
        tooltip="Costos fijos hardcodeados (actualizar en backend cuando cambien) + marketing calculado desde los costos reales de campañas (por fecha) + variables calculados desde DB. % calculado sobre el total."
      >
        <div className="bg-white rounded-xl border border-finzen-gray/20 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-finzen-gray/10">
                <th className="text-left text-xs font-medium text-finzen-gray p-4">Concepto</th>
                <th className="text-left text-xs font-medium text-finzen-gray p-4">Tipo</th>
                <th className="text-right text-xs font-medium text-finzen-gray p-4">Costo /mes</th>
                <th className="text-right text-xs font-medium text-finzen-gray p-4">%</th>
              </tr>
            </thead>
            <tbody>
              {unitEconomics.breakdown.map((row: any) => (
                <tr key={row.concepto} className="border-b border-finzen-gray/10 last:border-0">
                  <td className="text-sm text-finzen-black p-4">{row.concepto}</td>
                  <td className="text-xs text-finzen-gray p-4 capitalize">
                    <span className={`px-2 py-1 rounded ${
                      row.type === 'fixed' ? 'bg-finzen-gray/10'
                      : row.type === 'marketing' ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-finzen-blue/10 text-finzen-blue'}`}>
                      {row.type === 'fixed' ? 'Fijo' : row.type === 'marketing' ? 'Marketing (real)' : 'Variable'}
                    </span>
                  </td>
                  <td className="text-sm text-right font-medium text-finzen-black p-4">${row.costo.toFixed(2)}</td>
                  <td className="text-sm text-right text-finzen-gray p-4">{row.porcentaje}%</td>
                </tr>
              ))}
              <tr className="border-t-2 border-finzen-gray/30 font-bold bg-finzen-white/50">
                <td className="text-sm text-finzen-black p-4">TOTAL</td>
                <td></td>
                <td className="text-sm text-right text-finzen-black p-4">${unitEconomics.totalCostMonthly.toFixed(2)}</td>
                <td className="text-sm text-right text-finzen-gray p-4">100%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      {openaiCosts && (
        <Section
          title="Costos de OpenAI - Detalle Completo"
          tooltip="Desglose detallado de costos por feature, modelo, usuario y detección de anomalías."
        >
          <OpenAICostsCard data={openaiCosts} />
        </Section>
      )}
    </div>
  );
}

// ─── Tab: Salud Financiera (data real desde backend) ─────────────
function TabSalud({ financialHealth }: { financialHealth: any }) {
  if (!financialHealth) return null;

  const getEstadoColor = (estado: string) => {
    if (estado === 'Sostenible') return 'text-finzen-green bg-finzen-green/10';
    if (estado === 'Precaución') return 'text-finzen-yellow bg-finzen-yellow/10';
    return 'text-finzen-red bg-finzen-red/10';
  };

  const cashFlowPositive = financialHealth.cashFlowThisMonth >= 0;
  const runwayLabel = financialHealth.runway !== null
    ? `${financialHealth.runway} meses`
    : '∞';

  return (
    <div>
      <Section
        title="Estado General"
        tooltip={`Panorama financiero. Ingreso bruto acumulado all-time. Métricas de mes actual desde ${financialHealth.currentMonth.from}.`}
      >
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <StatBox
            label="Ingreso Bruto Total"
            value={`$${financialHealth.grossIncomeTotal.toFixed(2)}`}
            highlight
            tooltip="Suma de TODOS los pagos exitosos de toda la historia (sin filtro de fecha). Es el dinero total que ha entrado a la empresa."
          />
          <StatBox
            label="Ingresos Mes Actual"
            value={`$${financialHealth.incomeThisMonth.toFixed(2)}`}
            tooltip={`Pagos exitosos del mes calendario actual (desde ${financialHealth.currentMonth.from} hasta hoy).`}
          />
          <StatBox
            label="Gastos Mes Actual"
            value={`$${financialHealth.expensesThisMonth.toFixed(2)}`}
            tooltip={`Costos fijos ($${financialHealth.fixedExpensesThisMonth.toFixed(2)}) + variables (OpenAI + fees: $${financialHealth.variableExpensesThisMonth.toFixed(2)}) del mes en curso.`}
          />
          <StatBox
            label="Cobertura (ingreso acum./burn)"
            value={runwayLabel}
            highlight
            tooltip="Meses que el ingreso bruto acumulado cubriría la pérdida mensual actual. NO es runway de caja: no se rastrea caja disponible. ∞ si actualmente no hay burn (cash flow positivo)."
          />
          <StatBox
            label="Burn Rate"
            value={`${financialHealth.burnRate >= 0 ? '$' : '-$'}${Math.abs(financialHealth.burnRate).toFixed(2)}/mes`}
            tooltip={`Gastos − Ingresos del mes. Positivo = pérdida mensual neta. Negativo = ganancia. Cash Flow Mes: ${cashFlowPositive ? '+' : ''}$${financialHealth.cashFlowThisMonth.toFixed(2)}.`}
          />
          <div className="rounded-lg border border-finzen-gray/20 bg-white p-4">
            <p className="text-xs text-finzen-gray font-medium">Estado</p>
            <span className={`inline-block mt-2 px-3 py-1 rounded-full text-sm font-bold ${getEstadoColor(financialHealth.estado)}`}>
              {financialHealth.estado}
            </span>
            <p className="text-xs text-finzen-gray mt-2">
              {financialHealth.estado === 'Sostenible' && 'Cash flow ≥ 0'}
              {financialHealth.estado === 'Precaución' && 'Burn activo, runway ≥ 6 meses'}
              {financialHealth.estado === 'Crítico' && 'Burn activo, runway < 6 meses'}
            </p>
          </div>
        </div>
      </Section>
    </div>
  );
}

// ─── Tab: Adquisición ────────────────────────────────────────────
function formatChangeBadge(change: number): { text: string; className: string } {
  if (change === 0) return { text: '0%', className: 'text-finzen-gray' };
  const sign = change > 0 ? '↑' : '↓';
  const cls = change > 0 ? 'text-finzen-green' : 'text-finzen-red';
  return { text: `${sign}${Math.abs(change).toFixed(2)}%`, className: cls };
}

function TabAdquisicion({ acquisition }: { acquisition: AcquisitionData | null }) {
  if (!acquisition) {
    return (
      <div className="rounded-xl border border-finzen-gray/20 bg-white p-8 text-center">
        <p className="text-finzen-gray">No hay datos de adquisición disponibles para el período seleccionado.</p>
      </div>
    );
  }

  const { kpis, funnel, eventsByDay, bySource, cohort } = acquisition;
  const trackingDate = cohort.trackingStartDate
    ? new Date(cohort.trackingStartDate).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })
    : null;

  // Banner del cohort histórico — visible siempre que haya users pre-tracking.
  // Si trackingStartDate es null (sin eventos aún), igual mostramos el banner con
  // copy distinto: "tracking aún no se ha iniciado".
  const cohortBanner = cohort.historicalUsersCount > 0 ? (
    <div className="mb-6 rounded-xl border border-finzen-blue/20 bg-finzen-blue/5 p-4">
      <p className="text-sm text-finzen-black">
        <strong className="text-finzen-blue">ℹ️ Cohort histórico:</strong>{' '}
        {trackingDate ? (
          <>
            {cohort.historicalUsersCount.toLocaleString('es')} usuarios se registraron antes del {trackingDate} (sin attribution).
          </>
        ) : (
          <>
            {cohort.historicalUsersCount.toLocaleString('es')} usuarios registrados hasta ahora. El sistema de tracking aún no ha capturado eventos —{' '}
            <strong>todos están marcados como Pre-tracking</strong>.
          </>
        )}{' '}
        Para verlos, ve al tab <strong>Usuarios</strong> y filtra por cohort &quot;Pre-tracking&quot;.
      </p>
    </div>
  ) : null;

  // KPI cards arriba
  const kpiCards = [
    { label: 'Visitantes', value: kpis.pageViews, change: kpis.pageViewsChange, tooltip: 'Visitantes únicos en el período. Cada navegador cuenta como 1, no se cuentan recargas (DISTINCT por anonymousId).' },
    { label: 'Leads', value: kpis.leads, change: kpis.leadsChange, tooltip: 'Clics en CTAs de descarga (App Store / Google Play). Indica intención de conversión. Cuenta cada click — un mismo usuario puede generar varios leads.' },
    { label: 'Registros', value: kpis.registrations, change: kpis.registrationsChange, tooltip: 'Usuarios únicos que completaron signup en la app durante el período. Disparado server-side desde el endpoint de registro.' },
    { label: 'Subscriptions', value: kpis.subscriptions, change: kpis.subscriptionsChange, tooltip: 'Usuarios únicos con pago confirmado (Stripe + RevenueCat). Solo cuenta nuevas suscripciones, no renovaciones.' },
  ];

  // Eventos por día — para el line chart
  const eventsByDayChart = eventsByDay.map(d => {
    const date = new Date(d.day);
    return {
      date: date.toLocaleDateString('es', { day: '2-digit', month: 'short', timeZone: 'UTC' }),
      pageViews: d.pageViews,
      leads: d.leads,
      registrations: d.registrations,
      subscriptions: d.subscriptions,
    };
  });

  // Funnel data — todos los % son cumulativos vs Visitors (base 100%).
  // Esto mantiene consistencia: cada etapa muestra "qué % del total inicial llegó hasta acá".
  const cumulativePct = (count: number) =>
    funnel.visitors > 0 ? `${((count / funnel.visitors) * 100).toFixed(2)}%` : '0%';
  const funnelData = [
    { etapa: 'Visitantes', valor: funnel.visitors, porcentaje: '100%' },
    { etapa: 'Leads', valor: funnel.leads, porcentaje: cumulativePct(funnel.leads) },
    { etapa: 'Registros', valor: funnel.registrations, porcentaje: cumulativePct(funnel.registrations) },
    { etapa: 'Subscriptions', valor: funnel.subscriptions, porcentaje: cumulativePct(funnel.subscriptions) },
  ];

  return (
    <div>
      {cohortBanner}

      {/* Sección 1 — KPIs */}
      <Section
        title="KPIs de Adquisición"
        tooltip="Conteo de eventos de marketing en el período. Cada flecha compara con el período anterior de la misma duración."
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-2">
          {kpiCards.map((kpi) => {
            const badge = formatChangeBadge(kpi.change);
            return (
              <div key={kpi.label} className="rounded-lg border border-finzen-gray/20 bg-white p-4">
                <p className="text-xs text-finzen-gray font-medium">{kpi.label}</p>
                <p className="text-2xl font-bold mt-1 text-finzen-black">{kpi.value.toLocaleString('es')}</p>
                <p className={`text-xs mt-1 font-medium ${badge.className}`}>{badge.text} vs período anterior</p>
              </div>
            );
          })}
        </div>
      </Section>

      {/* Sección 2 — Funnel */}
      <Section
        title="Funnel de Conversión"
        tooltip="Desde Visitors (PageView) hasta Subscriptions, muestra el % que avanza en cada etapa. Útil para identificar dónde se cae la conversión."
      >
        <FunnelChart data={funnelData} />
      </Section>

      {/* Sección 3 — Eventos por día */}
      <Section
        title="Eventos por Día"
        tooltip="Serie temporal de cada evento (PageView, Lead, Registro, Subscribe) durante el período. Útil para correlacionar con campañas activas o picos de tráfico."
      >
        {eventsByDayChart.length === 0 ? (
          <div className="rounded-lg border border-finzen-gray/20 bg-white p-6 text-center text-sm text-finzen-gray">
            Sin eventos en el período seleccionado.
          </div>
        ) : (
          <ChartLine
            title=""
            data={eventsByDayChart}
            xKey="date"
            lines={[
              { dataKey: 'pageViews', color: '#9ca3af', name: 'Visitantes' },
              { dataKey: 'leads', color: '#204274', name: 'Leads' },
              { dataKey: 'registrations', color: '#7c3aed', name: 'Registros' },
              { dataKey: 'subscriptions', color: '#10b981', name: 'Subscriptions' },
            ]}
          />
        )}
      </Section>

      {/* Sección 4 — Top Sources */}
      <Section
        title="Top Sources (canales de adquisición)"
        tooltip="Agrupa eventos por utm_source. 'Directo' = users que llegaron sin UTM (escribieron la URL directo, click en bookmark, búsqueda orgánica sin tracking). Registros = anonymousIds únicos que dieron click al botón 'Descargar' (cada Lead cuenta como atribución). CR% = Registros / Visitors."
      >
        <div className="mb-3 inline-flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-800">
          <span>📌</span>
          <span>Datos lifetime — el filtro de fechas no aplica aquí</span>
        </div>
        {bySource.length === 0 ? (
          <div className="rounded-lg border border-finzen-gray/20 bg-white p-6 text-center text-sm text-finzen-gray">
            Sin sources atribuidos todavía.
          </div>
        ) : (
          <div className="rounded-lg border border-finzen-gray/20 bg-white overflow-x-auto">
            <table className="w-full min-w-[800px] text-sm">
              <thead className="bg-finzen-white border-b border-finzen-gray/20">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-finzen-gray uppercase">Source</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-finzen-gray uppercase">Medium</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-finzen-gray uppercase">Campaign</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-finzen-gray uppercase">Fecha inicio</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-finzen-gray uppercase">Inversión</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-finzen-gray uppercase">Visitors</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-finzen-gray uppercase">Leads</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-finzen-gray uppercase">Registros</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-finzen-gray uppercase">Subs</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-finzen-gray uppercase">Revenue</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-finzen-gray uppercase">CR%</th>
                </tr>
              </thead>
              <tbody>
                {bySource.map((row, idx) => (
                  <tr key={`${row.source}-${row.campaign ?? 'none'}-${idx}`} className="border-b border-finzen-gray/10 last:border-0 hover:bg-finzen-white/50">
                    <td className="px-4 py-3 text-finzen-black font-medium">{row.source}</td>
                    <td className="px-4 py-3 text-finzen-black">{row.medium ?? <span className="text-finzen-gray/50">—</span>}</td>
                    <td className="px-4 py-3 text-finzen-black">{row.campaign ?? <span className="text-finzen-gray/50">—</span>}</td>
                    <td className="px-4 py-3 text-finzen-black">
                      {row.campaignDate
                        ? new Date(row.campaignDate).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })
                        : <span className="text-finzen-gray/50">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right text-finzen-black">
                      {row.costUSD > 0 ? `$${row.costUSD.toFixed(2)}` : <span className="text-finzen-gray/50">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right text-finzen-black">{row.visitors.toLocaleString('es')}</td>
                    <td className="px-4 py-3 text-right text-finzen-black">{row.leads.toLocaleString('es')}</td>
                    <td className="px-4 py-3 text-right text-finzen-black">{row.registrations.toLocaleString('es')}</td>
                    <td className="px-4 py-3 text-right text-finzen-black font-semibold">{row.subscriptions.toLocaleString('es')}</td>
                    <td className="px-4 py-3 text-right text-finzen-black">${row.revenue.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-finzen-green font-medium">{row.conversionRate.toFixed(2)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  );
}

// ─── Loading / Error fallbacks ───────────────────────────────────
function DashboardLoading() {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-finzen-blue" />
      <span className="ml-3 text-finzen-gray">Cargando datos...</span>
    </div>
  );
}

function DashboardError({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <p className="text-finzen-red font-medium">Error cargando datos</p>
        <p className="text-sm text-finzen-gray mt-1">{message}</p>
      </div>
    </div>
  );
}

// ─── Tab: Experimentos ───────────────────────────────────────────
function ExpRow({ label, value, sub, strong }: { label: string; value: string; sub?: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-finzen-gray">{label}</span>
      <span className={`text-sm ${strong ? 'font-bold text-finzen-black' : 'text-finzen-black'}`}>
        {value}{sub ? <span className="text-[11px] text-finzen-gray ml-1">({sub})</span> : null}
      </span>
    </div>
  );
}

// ─── Acordeón de experimentos ────────────────────────────────────
// La lista va a crecer (H15, H16...), así que por defecto todo va plegado y en
// la cabecera queda lo que se lee de un vistazo: nombre, estado y el número que
// decide. Así se escanea la lista entera sin abrir nada, y se despliega solo el
// que interesa. Se pueden tener varios abiertos a la vez: comparar dos
// experimentos es un caso real, y un acordeón exclusivo lo impediría.
function ExperimentAccordion({
  title,
  tag,
  statusLabel,
  statusOk,
  summary,
  defaultOpen = false,
  children,
}: {
  title: string;
  tag: string;
  statusLabel: string;
  statusOk: boolean;
  summary?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="bg-white rounded-xl border border-finzen-gray/20 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 p-5 text-left hover:bg-finzen-white/60 transition-colors"
      >
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <ChevronDown
            size={16}
            className={`text-finzen-gray shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          />
          <FlaskConical size={18} className="text-finzen-blue shrink-0" />
          <h3 className="text-lg font-bold text-finzen-black">{title}</h3>
          <span className="text-[11px] text-finzen-gray bg-finzen-white px-2 py-0.5 rounded-full">{tag}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* El resumen se oculta en móvil: ahí no hay ancho para el título, el
              estado y el número a la vez sin que se rompa la línea. */}
          {summary ? <span className="hidden sm:inline text-xs text-finzen-gray">{summary}</span> : null}
          <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${statusOk ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
            {statusLabel}
          </span>
        </div>
      </button>

      {open && <div className="px-5 pb-5 pt-0">{children}</div>}
    </div>
  );
}

function ArmCard({ title, arm, accent }: { title: string; arm: H10Stats['variant']; accent: string }) {
  return (
    <div className="rounded-lg border border-finzen-gray/20 p-4">
      <p className="text-sm font-semibold mb-3" style={{ color: accent }}>{title}</p>
      <div className="space-y-2">
        <ExpRow label="Usuarios (n)" value={arm.n.toLocaleString('es')} />
        <ExpRow label="Entraron a la app" value={`${arm.enteredRate}%`} sub={`${arm.entered}/${arm.n}`} />
        <ExpRow label="Activación (1ª tx 7d)" value={`${arm.activationRate}%`} sub={`${arm.activated}/${arm.n}`} strong />
      </div>
    </div>
  );
}

function TabExperimentos({ from, to }: { from?: string; to?: string }) {
  const [stats, setStats] = useState<H10Stats | null>(null);
  const [h13, setH13] = useState<H13Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    // Los dos experimentos se piden en paralelo y fallan por separado: si uno se
    // cae, el otro se sigue viendo (antes un error dejaba el tab entero vacío).
    Promise.allSettled([fetchH10Stats(from, to), fetchH13Stats(from, to)])
      .then(([r10, r13]) => {
        if (cancelled) return;
        setStats(r10.status === 'fulfilled' ? r10.value : null);
        setH13(r13.status === 'fulfilled' ? r13.value : null);
        if (r10.status === 'rejected' && r13.status === 'rejected') {
          const e: any = r10.reason;
          setError(e?.message === 'UNAUTHORIZED' ? 'Sesión expirada.' : (e?.message || 'Error al cargar.'));
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [from, to]);

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="animate-spin text-finzen-blue" size={28} /></div>;
  if (error) return <div className="p-6 text-center text-red-600 text-sm">{error}</div>;
  if (!stats) return h13 ? <div className="space-y-6"><H13Card stats={h13} /></div> : null;

  const { variant, control, activationLiftPts, entryLiftPts, rollbackTriggered, rollbackThresholdPts, pct, enabled, activationWindowDays, experimentStart, sufficientSample, minSamplePerArm } = stats;

  return (
    <div className="space-y-6">
      <ExperimentAccordion
        title="Entrada libre"
        tag="onboarding no bloqueante · H10"
        statusLabel={enabled ? `Corriendo · ${pct}% variante` : 'Apagado'}
        statusOk={enabled}
        summary={
          sufficientSample
            ? `${activationLiftPts >= 0 ? '+' : ''}${activationLiftPts} pts de activación`
            : '⏳ acumulando muestra'
        }
      >
        <p className="text-sm text-finzen-gray mb-4">
          Deja entrar al dashboard sin forzar el onboarding. La métrica que decide es la <strong>activación</strong> (1ª transacción válida en {activationWindowDays} días): no debe caer ≥{rollbackThresholdPts} pts vs el control.
        </p>

        {!enabled && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            ⚠️ El experimento está <strong>apagado</strong> (flag en false). El split por bucket se calcula igual, pero la variante todavía NO recibe el tratamiento — los números no son concluyentes hasta prender el flag.
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ArmCard title="Variante (sin muro)" arm={variant} accent="#2563EB" />
          <ArmCard title="Control (con muro)" arm={control} accent="#64748b" />
        </div>

        <div className={`mt-4 rounded-lg border px-4 py-3 ${!sufficientSample ? 'border-gray-200 bg-gray-50' : rollbackTriggered ? 'border-red-200 bg-red-50' : 'border-emerald-200 bg-emerald-50'}`}>
          <p className="text-sm text-finzen-black">
            <span className="font-semibold">Lift de activación:</span>{' '}
            <span className={`font-bold ${!sufficientSample ? 'text-finzen-gray' : activationLiftPts < 0 ? 'text-red-600' : 'text-emerald-700'}`}>
              {activationLiftPts >= 0 ? '+' : ''}{activationLiftPts} pts
            </span>{' '}
            <span className="text-finzen-gray">(variante {variant.activationRate}% vs control {control.activationRate}%)</span>
          </p>
          <p className="text-xs text-finzen-gray mt-1">
            {!sufficientSample
              ? `⏳ Acumulando muestra (${variant.n} variante / ${control.n} control; se necesitan ≥${minSamplePerArm} por brazo). El lift aún NO es concluyente — con pocos usuarios es ruido.`
              : rollbackTriggered
              ? `🔴 La activación cayó ≥${rollbackThresholdPts} pts → señal de ROLLBACK (canibalización).`
              : `🟢 No-inferioridad sostenida. Tasa de entrada: ${entryLiftPts >= 0 ? '+' : ''}${entryLiftPts} pts.`}
          </p>
        </div>

        {experimentStart ? (
          <p className="text-[11px] text-finzen-gray mt-4">
            Inicio del experimento: {new Date(experimentStart).toLocaleDateString('es-ES')}. La cohorte se ancla ahí (registros desde esa fecha) y excluye usuarios pre-experimento. Whitelist de QA excluida. Split reconstruido con el mismo bucket que decide la entrada.
          </p>
        ) : (
          <p className="text-[11px] text-amber-600 mt-4">
            ⚠️ Todavía no hay usuarios que hayan entrado por el camino sin muro (el flag está apagado o nadie nuevo ha entrado aún). En cuanto entre el primero, el inicio se detecta solo y los números se vuelven concluyentes.
          </p>
        )}
      </ExperimentAccordion>

      {h13 && <H13Card stats={h13} />}
    </div>
  );
}

// ─── H13 · Reto de la Primera Semana ─────────────────────────────
// La primaria se calcula sobre participantes MADUROS (ventana de 7 días ya
// cerrada). Por eso cada brazo muestra "n" y, aparte, cuántos siguen en curso:
// sin esa distinción, un reto recién asignado parecería un fracaso.
function H13ArmCard({ title, arm, accent, targetDays, showFunnel }: {
  title: string;
  arm: H13Stats['reto'];
  accent: string;
  targetDays: number;
  showFunnel: boolean;
}) {
  return (
    <div className="rounded-lg border border-finzen-gray/20 p-4">
      <p className="text-sm font-semibold mb-3" style={{ color: accent }}>{title}</p>
      <div className="space-y-2">
        <ExpRow label="Asignados (n)" value={arm.n.toLocaleString('es')} sub={arm.inProgress > 0 ? `${arm.inProgress} aún en ventana` : undefined} />
        <ExpRow label="Ventana cerrada" value={arm.matured.toLocaleString('es')} />
        <ExpRow label={`≥${targetDays} días con registro`} value={`${arm.targetRate}%`} sub={`${arm.reachedTarget}/${arm.matured}`} strong />
        {showFunnel && (
          <>
            <ExpRow label="Aceptaron el reto" value={`${arm.acceptRate}%`} sub={`${arm.accepted}/${arm.offered} ofrecidos`} />
            <ExpRow label="Rechazaron" value={arm.declined.toLocaleString('es')} />
          </>
        )}
      </div>
    </div>
  );
}

function H13Card({ stats }: { stats: H13Stats }) {
  const { reto, control, targetLiftPts, targetLiftRatio, enabled, targetDays, windowDays, experimentStart, sufficientSample, minSamplePerArm } = stats;
  // Umbral pre-comprometido (provisional hasta que se firme con el baseline): reto ≥2× control.
  const meetsThreshold = targetLiftRatio !== null && targetLiftRatio >= 2;

  return (
    <ExperimentAccordion
      title="Reto de la Primera Semana"
      tag="H13 · 50/50"
      statusLabel={enabled ? 'Corriendo' : 'Apagado'}
      statusOk={enabled}
      summary={
        sufficientSample
          ? `${targetLiftPts >= 0 ? '+' : ''}${targetLiftPts} pts${targetLiftRatio !== null ? ` · ${targetLiftRatio}×` : ''}`
          : '⏳ acumulando muestra'
      }
    >
      <p className="text-sm text-finzen-gray mb-4">
        Al registrar su primera transacción, la mitad recibe el reto: registrar en {targetDays} días dentro de los próximos {windowDays}, con recordatorio a la hora que elija. La otra mitad no ve nada. La métrica que decide es el <strong>% que llega a {targetDays} días con registro</strong>.
      </p>

      {!enabled && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          ⚠️ El experimento está <strong>apagado</strong> (H13_ENABLED en false). Nadie se está asignando salvo la whitelist de QA, que se excluye de estos números.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <H13ArmCard title="Reto" arm={reto} accent="#2563EB" targetDays={targetDays} showFunnel />
        <H13ArmCard title="Control (sin reto)" arm={control} accent="#64748b" targetDays={targetDays} showFunnel={false} />
      </div>

      <div className={`mt-4 rounded-lg border px-4 py-3 ${!sufficientSample ? 'border-gray-200 bg-gray-50' : meetsThreshold ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
        <p className="text-sm text-finzen-black">
          <span className="font-semibold">Diferencia:</span>{' '}
          <span className={`font-bold ${!sufficientSample ? 'text-finzen-gray' : targetLiftPts < 0 ? 'text-red-600' : 'text-emerald-700'}`}>
            {targetLiftPts >= 0 ? '+' : ''}{targetLiftPts} pts
          </span>{' '}
          <span className="text-finzen-gray">
            (reto {reto.targetRate}% vs control {control.targetRate}%
            {targetLiftRatio !== null ? ` · ${targetLiftRatio}×` : ''})
          </span>
        </p>
        <p className="text-xs text-finzen-gray mt-1">
          {!sufficientSample
            ? `⏳ Acumulando muestra (${reto.matured} reto / ${control.matured} control con ventana cerrada; se necesitan ≥${minSamplePerArm} por brazo). Todavía NO es concluyente.`
            : meetsThreshold
            ? `🟢 El reto supera el umbral pre-comprometido (≥2× el control).`
            : `🟡 Por debajo del umbral pre-comprometido (≥2× el control).`}
        </p>
      </div>

      {experimentStart ? (
        <p className="text-[11px] text-finzen-gray mt-4">
          Inicio del experimento: {new Date(experimentStart).toLocaleDateString('es-ES')}. La cohorte son los asignados desde esa fecha, excluyendo la whitelist de QA. El % se calcula solo sobre quienes ya cerraron su ventana de {windowDays} días, con la misma definición de día local y transacción válida que usa la app.
        </p>
      ) : (
        <p className="text-[11px] text-amber-600 mt-4">
          ⚠️ El experimento todavía no ha arrancado: la fecha de inicio se estampa sola la primera vez que el flag global se ve activo. Hasta entonces no se mide nada, para no mezclar usuarios pre-experimento.
        </p>
      )}
    </ExperimentAccordion>
  );
}

// ─── PDF Render — todos los tabs apilados + cover + glosario ─────
interface PdfRenderProps {
  periodLabel: string;
  fromDate: string;
  toDate: string;
  generatedBy: string | null;
  users: any;
  acquisition: AcquisitionData | null;
  revenue: any;
  pulse: any;
  engagement: any;
  openaiCosts: any;
  unitEconomics: any;
  financialHealth: any;
}

function PdfRender({ periodLabel, fromDate, toDate, generatedBy, users, acquisition, revenue, pulse, engagement, openaiCosts, unitEconomics, financialHealth }: PdfRenderProps) {
  return (
    <div data-pdf-mode="true">
      <PdfCoverPage periodLabel={periodLabel} fromDate={fromDate} toDate={toDate} generatedBy={generatedBy} />

      {/* Resumen Ejecutivo (Pulso) — primera sección, vista general antes del detalle */}
      <section className="pdf-tab-section">
        <h2 className="text-2xl font-bold text-finzen-black mb-4">Resumen Ejecutivo</h2>
        <TabPulso
          pulse={pulse}
          users={users}
          revenue={revenue}
          engagement={engagement}
          openaiCosts={openaiCosts}
          financialHealth={financialHealth}
        />
      </section>

      {/* Tabs apilados, cada uno empieza en página nueva */}
      <section className="pdf-tab-section">
        <h2 className="text-2xl font-bold text-finzen-black mb-4">Usuarios</h2>
        <TabUsuarios users={users} />
      </section>

      <section className="pdf-tab-section">
        <h2 className="text-2xl font-bold text-finzen-black mb-4">Adquisición</h2>
        <TabAdquisicion acquisition={acquisition} />
      </section>

      <section className="pdf-tab-section">
        <h2 className="text-2xl font-bold text-finzen-black mb-4">Revenue</h2>
        <TabRevenue revenue={revenue} pulse={pulse} />
      </section>

      <section className="pdf-tab-section">
        <h2 className="text-2xl font-bold text-finzen-black mb-4">Engagement</h2>
        <TabEngagement engagement={engagement} />
      </section>

      <section className="pdf-tab-section">
        <h2 className="text-2xl font-bold text-finzen-black mb-4">Unit Economics</h2>
        <TabEconomics openaiCosts={openaiCosts} unitEconomics={unitEconomics} />
      </section>

      <section className="pdf-tab-section">
        <h2 className="text-2xl font-bold text-finzen-black mb-4">Salud Financiera</h2>
        <p className="text-xs text-finzen-gray italic mb-3">
          Nota: Salud Financiera refleja siempre el mes en curso, independiente del periodo del reporte.
        </p>
        <TabSalud financialHealth={financialHealth} />
      </section>

      <PdfGlossary />
    </div>
  );
}

// ─── Inner — tiene acceso a useSearchParams ──────────────────────
function DashboardDetallesInner() {
  const searchParams = useSearchParams();
  const isPdfMode = searchParams.get('mode') === 'pdf';
  const fromParam = searchParams.get('from');
  const toParam = searchParams.get('to');
  const labelParam = searchParams.get('label');
  const generatedBy = searchParams.get('generatedBy'); // viene vía Puppeteer URL

  const { range, setRange, customPeriod, setCustomPeriod, pulse, users, revenue, engagement, openaiCosts, unitEconomics, financialHealth, acquisition, loading, error } = useDashboardData();
  const [activeTab, setActiveTab] = useState('usuarios');
  const [role, setRole] = useState<Role>('admin');
  useEffect(() => { setRole(getClientRole()); }, []);

  // Sub-pestañas visibles según rol (marketing no ve Revenue/Unit Economics/Salud).
  const visibleTabs = tabs.filter((t) => canSeeDetallesTab(role, t.id));
  // Si el rol no puede ver la pestaña activa, caer a la primera permitida.
  useEffect(() => {
    if (!canSeeDetallesTab(role, activeTab)) {
      setActiveTab(visibleTabs[0]?.id ?? 'adquisicion');
    }
  }, [role, activeTab, visibleTabs]);

  // Aplicar el periodo absoluto que viene en la URL (caso PDF generado por backend
  // vía Puppeteer): from/to/label. Dispara el fetch con esas fechas exactas.
  useEffect(() => {
    if (fromParam && toParam) {
      const label = labelParam || `${fromParam} — ${toParam}`;
      if (
        !customPeriod ||
        customPeriod.from !== fromParam ||
        customPeriod.to !== toParam ||
        customPeriod.label !== label
      ) {
        setCustomPeriod({ from: fromParam, to: toParam, label });
      }
    }
  }, [fromParam, toParam, labelParam, customPeriod, setCustomPeriod]);

  // Señal a Puppeteer que el PDF está listo para captura.
  // Delay de 1500ms para que charts (recharts) terminen sus animaciones.
  useEffect(() => {
    if (typeof window === 'undefined' || !isPdfMode) return;
    if (loading || !pulse) return;

    const t = setTimeout(() => {
      (window as Window & { __PDF_READY__?: boolean }).__PDF_READY__ = true;
    }, 1500);
    return () => clearTimeout(t);
  }, [isPdfMode, loading, pulse]);

  if (loading && !pulse) return <DashboardLoading />;
  if (error) return <DashboardError message={error} />;

  // ─── Modo PDF ─────────────────────────────────────────────────
  if (isPdfMode) {
    const period = customPeriod ?? computeRollingParams(range);
    return (
      <PdfRender
        periodLabel={period.label}
        fromDate={period.from}
        toDate={period.to}
        generatedBy={generatedBy}
        users={users}
        acquisition={acquisition}
        revenue={revenue}
        pulse={pulse}
        engagement={engagement}
        openaiCosts={openaiCosts}
        unitEconomics={unitEconomics}
        financialHealth={financialHealth}
      />
    );
  }

  // ─── Modo dashboard interactivo (comportamiento normal) ────────
  const bannerData = pulse ? {
    mrrNeto: revenue?.mrrCurrent ?? pulse.mrrEstimated,
    mrrCambio: revenue?.mrrChange ?? 0,
    mau: pulse.mau,
    runway: financialHealth?.runway ?? null,
  } : null;

  const renderTab = () => {
    switch (activeTab) {
      case 'usuarios': return <TabUsuarios users={users} />;
      case 'adquisicion': return <TabAdquisicion acquisition={acquisition} />;
      case 'revenue': return <TabRevenue revenue={revenue} pulse={pulse} />;
      case 'engagement': return <TabEngagement engagement={engagement} />;
      case 'economics': return <TabEconomics openaiCosts={openaiCosts} unitEconomics={unitEconomics} />;
      case 'salud': return <TabSalud financialHealth={financialHealth} />;
      case 'experimentos': {
        const period = customPeriod ?? computeRollingParams(range);
        return <TabExperimentos from={period.from} to={period.to} />;
      }
      default: return null;
    }
  };

  return (
    <div className={loading ? 'opacity-60 pointer-events-none' : ''}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-finzen-black">Detalles</h1>
          <p className="text-sm text-finzen-gray mt-1">Análisis detallado por categoría</p>
        </div>
        <div className="flex items-center gap-3">
          <DateRangePicker value={range} onChange={setRange} />
          {/* El PDF incluye todos los tabs (finanzas + PII): solo admin */}
          {canSeeFinancials(role) && <PdfExportPopover />}
        </div>
      </div>

      {/* Banner Superior — solo roles con acceso a finanzas (MRR/runway) */}
      {canSeeFinancials(role) && <BannerSuperior data={bannerData} />}

      {/* #8: disclaimer en las pestañas con comparaciones "vs período anterior" */}
      {pulse?.prevPeriodTruncated && (activeTab === 'adquisicion' || activeTab === 'revenue') && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          ⚠️ Los porcentajes <strong>«vs período anterior»</strong> de esta vista usan un período previo anterior al inicio del tracking limpio
          {pulse.trackingStart ? ` (${new Date(pulse.trackingStart).toLocaleDateString('es-ES')})` : ''}. La base es parcial y los % pueden estar inflados.
        </div>
      )}

      {/* Tabs */}
      <div className="flex overflow-x-auto gap-1 bg-white rounded-xl border border-finzen-gray/20 p-1.5 mb-6 no-scrollbar">
        {visibleTabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-finzen-blue text-white'
                  : 'text-finzen-gray hover:text-finzen-black hover:bg-finzen-white'
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div>{renderTab()}</div>
    </div>
  );
}

// ─── Main Page (wrap con Suspense para useSearchParams) ──────────
export default function DashboardDetalles() {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <DashboardDetallesInner />
    </Suspense>
  );
}
