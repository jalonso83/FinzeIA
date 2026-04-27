'use client';

import { useState } from 'react';
import { Users, DollarSign, Activity, Calculator, HeartPulse, Loader2 } from 'lucide-react';
import BannerSuperior from '@/components/dashboard/BannerSuperior';
import DateRangePicker from '@/components/dashboard/DateRangePicker';
import ChartLine from '@/components/dashboard/ChartLine';
import FunnelChart from '@/components/dashboard/FunnelChart';
import CohortHeatmap from '@/components/dashboard/CohortHeatmap';
import OpenAICostsCard from '@/components/dashboard/OpenAICostsCard';
import { useDashboardData } from '@/hooks/useDashboardData';
import { financialHealth } from '@/lib/dashboard-mock-data';

const tabs = [
  { id: 'usuarios', label: 'Usuarios', icon: Users },
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
          <StatBox label="Adopción Zenio" value={`${engagement.zenioAdoptionRate}%`} highlight tooltip="% de usuarios activos que conversaron con Zenio en el período. Métrica clave: si la AI es el diferenciador, este % refleja qué tan profundo penetra. Cap a 100% para casos raros donde un user usa Zenio sin registrar tx." />
          <StatBox label="Racha Activa" value={`${engagement.streakActiveRate}%`} highlight tooltip="% de usuarios activos con racha (streak) viva en el período. Indica formación de hábito vía gamification. Si está estancado, las streaks no están enganchando." />

          {/* ── Fila 2 — Calidad del funnel y profundidad ─────────── */}
          <StatBox label="Tasa Onboarding" value={`${engagement.onboardingRate}%`} tooltip="% de usuarios registrados en el período que ya completaron el onboarding con Zenio." />
          <StatBox
            label="Time-to-First-TX"
            value={engagement.timeToFirstTx?.medianHours !== null ? `${engagement.timeToFirstTx?.medianHours}h (${engagement.timeToFirstTx?.firstTxRate}%)` : '—'}
            tooltip="Mediana de horas entre registro y primera transacción del cohorte del período. Entre paréntesis: % del cohorte que llegó a hacer primera tx. Solo cohortes con ≥1h desde registro."
          />
          <StatBox label="TX / Usuario Activo" value={String(engagement.transactionsPerActiveUser)} tooltip="Promedio de transacciones por usuario activo en el período. Indica profundidad de uso. Nota: es promedio simple — no refleja distribución." />

          {/* ── Fila 3 — Detalle de Zenio + Viralidad ─────────────── */}
          <StatBox label="Usuarios usando Zenio" value={String(engagement.zenioActiveUsers)} tooltip="Conteo absoluto de usuarios distintos que conversaron con Zenio en el período (numerador del % Adopción Zenio)." />
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

  return (
    <div>
      <Section
        title="Costos por Usuario"
        tooltip="Desglose de costos operativos por usuario activo (registró ≥1 tx en el período). Costos variables escalados a equivalente mensual; fijos ya prorrateados."
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatBox label="Costo IA / Usuario" value={`$${unitEconomics.costAIPerUser.toFixed(2)}`} tooltip="Costo de OpenAI atribuible a cada usuario activo (escalado a mensual). Calculado desde openai_daily_usage." />
          <StatBox label="Costo Infra / Usuario" value={`$${unitEconomics.costInfraPerUser.toFixed(2)}`} tooltip={`Costos fijos (Railway, Resend, herramientas, etc.) divididos entre usuarios activos. Total fijo: $${unitEconomics.fixedCosts.total.toFixed(2)}/mes.`} />
          <StatBox label="Costo Total / Usuario" value={`$${unitEconomics.costPerUser.toFixed(2)}`} tooltip="Costo total mensual (fijos + variables) dividido entre usuarios activos. Indicador clave para rentabilidad." />
          <StatBox label="Margen Bruto" value={`${unitEconomics.grossMargin.toFixed(1)}%`} highlight tooltip="(MRR − costos variables) / MRR × 100. Excluye costos fijos por convención SaaS. Mayor = más rentable a escala." />
        </div>
      </Section>

      <Section
        title="Break-Even"
        tooltip="Punto de equilibrio: cuántos suscriptores pagados necesitas para que la contribución (ARPU − costo variable) cubra los costos fijos mensuales."
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

// ─── Tab: Salud Financiera (mock — sin API) ──────────────────────
function TabSalud() {
  const getEstadoColor = (estado: string) => {
    if (estado === 'Sostenible') return 'text-finzen-green bg-finzen-green/10';
    if (estado === 'Precaución') return 'text-finzen-yellow bg-finzen-yellow/10';
    return 'text-finzen-red bg-finzen-red/10';
  };

  return (
    <div>
      <Section
        title="Estado General"
        tooltip="Panorama de la salud financiera: balance disponible, ingresos/gastos mensuales, runway (meses de operación) y burn rate."
      >
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <StatBox label="Balance en Cuenta" value={financialHealth.balanceCuenta} highlight tooltip="Capital disponible actualmente en la cuenta de la empresa." />
          <StatBox label="Ingresos Mensuales" value={financialHealth.ingresosMensuales} tooltip="Ingresos totales del mes (suscripciones + otros)." />
          <StatBox label="Gastos Mensuales" value={financialHealth.gastosMensuales} tooltip="Gastos operativos mensuales (infra, IA, servicios, etc.)." />
          <StatBox label="Runway" value={financialHealth.runway} highlight tooltip="Meses que puedes operar con el capital actual sin nuevos ingresos." />
          <StatBox label="Burn Rate" value={financialHealth.burnRate} tooltip="Cuánto dinero se consume al mes. Gastos mensuales menos ingresos." />
          <div className="rounded-lg border border-finzen-gray/20 bg-white p-4">
            <p className="text-xs text-finzen-gray font-medium">Estado</p>
            <span className={`inline-block mt-2 px-3 py-1 rounded-full text-sm font-bold ${getEstadoColor(financialHealth.estado)}`}>
              {financialHealth.estado}
            </span>
          </div>
        </div>
      </Section>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────
export default function DashboardDetalles() {
  const { range, setRange, pulse, users, revenue, engagement, openaiCosts, unitEconomics, loading, error } = useDashboardData();
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
  } : null;

  const renderTab = () => {
    switch (activeTab) {
      case 'usuarios': return <TabUsuarios users={users} />;
      case 'revenue': return <TabRevenue revenue={revenue} pulse={pulse} />;
      case 'engagement': return <TabEngagement engagement={engagement} />;
      case 'economics': return <TabEconomics openaiCosts={openaiCosts} unitEconomics={unitEconomics} />;
      case 'salud': return <TabSalud />;
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
