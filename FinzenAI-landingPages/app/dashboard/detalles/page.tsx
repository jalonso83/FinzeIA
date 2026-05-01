'use client';

import { useState } from 'react';
import { Users, DollarSign, Activity, Calculator, HeartPulse, Megaphone, Loader2 } from 'lucide-react';
import BannerSuperior from '@/components/dashboard/BannerSuperior';
import DateRangePicker from '@/components/dashboard/DateRangePicker';
import ChartLine from '@/components/dashboard/ChartLine';
import FunnelChart from '@/components/dashboard/FunnelChart';
import CohortHeatmap from '@/components/dashboard/CohortHeatmap';
import OpenAICostsCard from '@/components/dashboard/OpenAICostsCard';
import { useDashboardData } from '@/hooks/useDashboardData';
import type { AcquisitionData } from '@/lib/dashboard-api';

const tabs = [
  { id: 'usuarios', label: 'Usuarios', icon: Users },
  { id: 'adquisicion', label: 'Adquisición', icon: Megaphone },
  { id: 'revenue', label: 'Revenue', icon: DollarSign },
  { id: 'engagement', label: 'Engagement', icon: Activity },
  { id: 'economics', label: 'Unit Economics', icon: Calculator },
  { id: 'salud', label: 'Salud Fin.', icon: HeartPulse },
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

function buildUserGrowthData(users: any) {
  if (!users?.registrationsByDay) return [];
  return users.registrationsByDay.map((r: any) => {
    const d = new Date(r.day);
    return {
      date: d.toLocaleDateString('es', { day: '2-digit', month: 'short', timeZone: 'UTC' }),
      registros: r.count,
    };
  });
}

function buildFunnelData(users: any) {
  if (!users?.funnel) return [];
  const f = users.funnel;
  const base = f.registered || 1;
  const pct = (v: number) => `${Math.round((v / base) * 100)}%`;
  return [
    { etapa: 'Registro', valor: f.registered, porcentaje: '100%' },
    { etapa: 'Onboarding', valor: f.onboarded, porcentaje: pct(f.onboarded) },
    { etapa: 'Activación', valor: f.activated, porcentaje: pct(f.activated) },
    { etapa: 'Retención D1', valor: f.retainedD1, porcentaje: pct(f.retainedD1) },
    { etapa: 'Retención D7', valor: f.retainedD7, porcentaje: pct(f.retainedD7) },
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
    const pct = (v: number) => (size > 0 ? Math.round((v / size) * 100) : 0);
    return {
      semana: label,
      d1: evaluable(1) ? pct(c.d1) : null,
      d7: evaluable(7) ? pct(c.d7) : null,
      d14: evaluable(14) ? pct(c.d14) : null,
      d30: evaluable(30) ? pct(c.d30) : null,
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
        title="Registros Diarios"
        tooltip="Muestra el número de nuevas registraciones por día. Útil para identificar picos de adquisición o efectividad de campañas de marketing."
      >
        <ChartLine
          title=""
          data={buildUserGrowthData(users)}
          xKey="date"
          lines={[
            { dataKey: 'registros', color: '#204274', name: 'Registros' },
          ]}
        />
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
  const subsPorcentaje = totalUsers > 0 ? ((totalPaidSubs / totalUsers) * 100).toFixed(1) : '0';

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

// ─── Tab: Engagement ─────────────────────────────────────────────
function TabEngagement({ engagement }: { engagement: any }) {
  if (!engagement) return null;

  return (
    <div>
      <Section
        title="Métricas de Engagement"
        tooltip="Actividad y profundidad de uso. Arriba lo que un directivo evalúa primero: base activa, adopción del feature core (Zenio) y formación de hábito (rachas). Abajo: calidad del onboarding, profundidad y viralidad."
      >
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          {/* ── Fila 1 — TOP-LINE de engagement (highlight) ───────── */}
          <StatBox label="Usuarios Activos" value={String(engagement.activeUsers)} highlight tooltip="Usuarios que registraron al menos 1 transacción (con fecha en el período seleccionado). Mide actividad financiera, no toda actividad en la app." />
          <StatBox label="Adopción TX" value={`${engagement.txAdoptionRate}%`} highlight tooltip="% del cohort registrado en el período que hizo al menos 1 transacción durante el mismo período. Cohort y actividad están alineados (no se mezcla con users legacy). Excluye users registrados en la última hora (sin chance razonable de activarse). Métrica de activación core: si es bajo, los users registran pero no usan la app." />
          <StatBox label="Adopción Zenio" value={`${engagement.zenioAdoptionRate}%`} highlight tooltip="% del cohort registrado en el período que usó Zenio (chat v2, agentes o transcripción) durante el mismo período. Cohort-consistent — no incluye legacy users. Mide adopción del feature diferenciador (AI) por usuarios nuevos." />

          {/* ── Fila 2 — Calidad del funnel y profundidad ─────────── */}
          <StatBox label="Racha Activa" value={`${engagement.streakActiveRate}%`} tooltip="% de usuarios activos con racha (streak) viva en el período. Indica formación de hábito vía gamification. Si está estancado, las streaks no están enganchando." />
          <StatBox label="Tasa Onboarding" value={`${engagement.onboardingRate}%`} tooltip="% de usuarios registrados en el período que ya completaron el onboarding con Zenio." />
          <StatBox
            label="Time-to-First-TX"
            value={engagement.timeToFirstTx?.medianHours !== null ? `${engagement.timeToFirstTx?.medianHours}h (${engagement.timeToFirstTx?.firstTxRate}%)` : '—'}
            tooltip="Mediana de horas entre registro y primera transacción del cohorte del período. Entre paréntesis: % del cohorte que llegó a hacer primera tx. Solo cohortes con ≥1h desde registro."
          />

          {/* ── Fila 3 — Detalle de Zenio + Viralidad ─────────────── */}
          <StatBox label="TX / Usuario Activo" value={String(engagement.transactionsPerActiveUser)} tooltip="Promedio de transacciones por usuario activo en el período. Indica profundidad de uso. Nota: es promedio simple — no refleja distribución." />
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
            value={`${unitEconomics.grossMargin.toFixed(1)}%`}
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
        tooltip="Costos fijos hardcodeados (actualizar en backend cuando cambien) + variables calculados desde DB. % calculado sobre el total."
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
                    <span className={`px-2 py-1 rounded ${row.type === 'fixed' ? 'bg-finzen-gray/10' : 'bg-finzen-blue/10 text-finzen-blue'}`}>
                      {row.type === 'fixed' ? 'Fijo' : 'Variable'}
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
            label="Runway"
            value={runwayLabel}
            highlight
            tooltip="Meses que el ingreso bruto acumulado cubriría la pérdida mensual actual. ∞ si actualmente no hay burn (cash flow positivo)."
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
  return { text: `${sign}${Math.abs(change).toFixed(1)}%`, className: cls };
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
        tooltip="Agrupa eventos por utm_source. 'Directo' = users que llegaron sin UTM (escribieron la URL directo, click en bookmark, búsqueda orgánica sin tracking). CR% = Subscriptions / Visitors."
      >
        {bySource.length === 0 ? (
          <div className="rounded-lg border border-finzen-gray/20 bg-white p-6 text-center text-sm text-finzen-gray">
            Sin sources atribuidos en el período.
          </div>
        ) : (
          <div className="rounded-lg border border-finzen-gray/20 bg-white overflow-x-auto">
            <table className="w-full min-w-[700px] text-sm">
              <thead className="bg-finzen-white border-b border-finzen-gray/20">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-finzen-gray uppercase">Source</th>
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
                  <tr key={`${row.source}-${idx}`} className="border-b border-finzen-gray/10 last:border-0 hover:bg-finzen-white/50">
                    <td className="px-4 py-3 text-finzen-black font-medium">{row.source}</td>
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

// ─── Main Page ───────────────────────────────────────────────────
export default function DashboardDetalles() {
  const { range, setRange, pulse, users, revenue, engagement, openaiCosts, unitEconomics, financialHealth, acquisition, loading, error } = useDashboardData();
  const [activeTab, setActiveTab] = useState('usuarios');

  if (loading && !pulse) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-finzen-blue" />
        <span className="ml-3 text-finzen-gray">Cargando datos...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-finzen-red font-medium">Error cargando datos</p>
          <p className="text-sm text-finzen-gray mt-1">{error}</p>
        </div>
      </div>
    );
  }

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
        <DateRangePicker value={range} onChange={setRange} />
      </div>

      {/* Banner Superior */}
      <BannerSuperior data={bannerData} />

      {/* Tabs */}
      <div className="flex overflow-x-auto gap-1 bg-white rounded-xl border border-finzen-gray/20 p-1.5 mb-6 no-scrollbar">
        {tabs.map((tab) => {
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
