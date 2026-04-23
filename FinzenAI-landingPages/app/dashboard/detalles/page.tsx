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
import {
  unitEconomics,
  costBreakdown,
  financialHealth,
} from '@/lib/dashboard-mock-data';

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
      date: d.toLocaleDateString('es', { day: '2-digit', month: 'short' }),
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
  return users.cohorts.map((c: any) => {
    const d = new Date(c.week);
    const label = d.toLocaleDateString('es', { day: '2-digit', month: 'short' });
    const size = c.size || 1;
    const pct = (v: number) => Math.round((v / size) * 100);
    // If value is 0 and it's a future period, show null
    const now = new Date();
    const weekDate = new Date(c.week);
    return {
      semana: label,
      d1: pct(c.d1),
      d7: weekDate.getTime() + 7 * 86400000 > now.getTime() && c.d7 === 0 ? null : pct(c.d7),
      d14: weekDate.getTime() + 14 * 86400000 > now.getTime() && c.d14 === 0 ? null : pct(c.d14),
      d30: weekDate.getTime() + 30 * 86400000 > now.getTime() && c.d30 === 0 ? null : pct(c.d30),
    };
  });
}

function buildMrrTrend(revenue: any) {
  if (!revenue?.mrrTrend) return [];
  return revenue.mrrTrend.map((m: any) => {
    const d = new Date(m.month);
    return {
      date: d.toLocaleDateString('es', { month: 'short', year: '2-digit' }),
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
        tooltip="Visualiza el camino del usuario desde registro hasta suscripción pagada. Cada etapa muestra cuántos usuarios avanzan, identificando dónde se pierden potenciales clientes."
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
  const totalPaidSubs = (pulse?.planDistribution?.['PREMIUM'] || 0) + (pulse?.planDistribution?.['PRO'] || 0);
  const subsPorcentaje = totalUsers > 0 ? ((totalPaidSubs / totalUsers) * 100).toFixed(1) : '0';

  const revenueByPlanRows = [
    {
      plan: `Plus ($4.99/mes)`,
      usuarios: revenue.mrrTrend?.[revenue.mrrTrend.length - 1]?.premium ?? '—',
      mrr: `$${revenue.revenueByPlan?.PREMIUM?.toFixed(2) ?? '0.00'}`,
    },
    {
      plan: `Pro ($9.99/mes)`,
      usuarios: revenue.mrrTrend?.[revenue.mrrTrend.length - 1]?.pro ?? '—',
      mrr: `$${revenue.revenueByPlan?.PRO?.toFixed(2) ?? '0.00'}`,
    },
  ];

  return (
    <div>
      <Section
        title="Métricas de Revenue"
        tooltip="Resumen de ingresos mensuales recurrentes (MRR), cambios porcentuales, ARPU y estado de pagos. Indicadores clave para medir la salud financiera."
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatBox label="MRR Actual" value={`$${revenue.mrrCurrent?.toFixed(2)}`} highlight tooltip="Ingreso Mensual Recurrente actual. Solo suscripciones activas pagando (sin trials)." />
          <StatBox label="Stripe" value={`$${revenue.revenueByPlatform?.stripe?.toFixed(2) ?? '0.00'}`} tooltip="Ingresos totales de Stripe (pagos web) en el período." />
          <StatBox label="RevenueCat" value={`$${revenue.revenueByPlatform?.revenuecat?.toFixed(2) ?? '0.00'}`} tooltip="Ingresos totales de RevenueCat (compras in-app iOS/Android) en el período." />
          <StatBox label="ARPU" value={`$${revenue.arpu?.toFixed(2)}`} tooltip="Average Revenue Per User. Ingreso promedio por suscriptor activo pagando." />
          <StatBox label="Pagos Exitosos" value={String(revenue.payments?.succeeded ?? 0)} tooltip="Número de pagos procesados con éxito en el período." />
          <StatBox label="Pagos Fallidos" value={String(revenue.payments?.failed ?? 0)} tooltip="Pagos que no se pudieron procesar (tarjeta rechazada, fondos insuficientes, etc.)." />
          <StatBox label="Ingresos Total" value={`$${Number(revenue.payments?.totalAmount ?? 0).toFixed(2)}`} tooltip="Suma total de pagos exitosos en el período." />
          <StatBox label="Total Suscripciones" value={`${totalPaidSubs} / ${totalUsers} (${subsPorcentaje}%)`} tooltip="Usuarios con plan PREMIUM (Plus) o PRO activos, sobre el total de usuarios registrados." />
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
        tooltip="Información sobre usuarios en período de prueba: cuántos están activos, tasas de cancelación y conversión trial a pago."
      >
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <StatBox label="Trials Activos" value={String(revenue.trialsActive)} tooltip="Usuarios en período de prueba gratuita de 7 días." />
          <StatBox label="Cancelaciones (30d)" value={String(revenue.cancellations30d)} tooltip="Suscripciones pagadas canceladas en los últimos 30 días." />
          <StatBox label="Trial → Paid" value={`${revenue.trialToPaidRate}%`} highlight tooltip="Porcentaje de trials que terminaron y se convirtieron en suscripción de pago." />
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
        tooltip="Indicadores de actividad del usuario: consultas a Zenio, transacciones registradas, tasa de onboarding y referidos. Mide qué tan activos son los usuarios."
      >
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <StatBox label="Consultas Zenio (total)" value={String(engagement.zenioTotalQueries)} highlight tooltip="Total de mensajes enviados a Zenio por todos los usuarios." />
          <StatBox label="Usuarios Activos" value={String(engagement.activeUsers)} tooltip="Usuarios que registraron al menos 1 transacción en el período." />
          <StatBox label="TX / Usuario Activo" value={String(engagement.transactionsPerActiveUser)} tooltip="Promedio de transacciones por usuario activo. Mayor = más engagement." />
          <StatBox label="Tasa Onboarding" value={`${engagement.onboardingRate}%`} tooltip="Porcentaje de usuarios del período que completaron el onboarding con Zenio." />
          <StatBox label="Referidos Totales" value={String(engagement.referrals?.total ?? 0)} tooltip="Invitaciones de referido enviadas en el período." />
          <StatBox label="Referidos Convertidos" value={String(engagement.referrals?.converted ?? 0)} tooltip="Referidos que se registraron y activaron su cuenta." />
        </div>
      </Section>
    </div>
  );
}

// ─── Tab: Unit Economics (mock — sin API) ────────────────────────
function TabEconomics({ openaiCosts }: { openaiCosts: any }) {
  return (
    <div>
      <Section
        title="Costos por Usuario"
        tooltip="Desglose de costos operativos por usuario: costo de IA (OpenAI), infraestructura y total. Esencial para calcular rentabilidad."
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatBox label="Costo IA / Usuario" value={unitEconomics.costoIAPorUsuario} tooltip="Costo mensual de OpenAI (Zenio) por usuario activo." />
          <StatBox label="Costo Infra / Usuario" value={unitEconomics.costoInfraPorUsuario} tooltip="Costo mensual de infraestructura (Railway, Firebase, etc.) por usuario." />
          <StatBox label="Costo Total / Usuario" value={unitEconomics.costoTotalPorUsuario} tooltip="Suma de costo IA + infraestructura por usuario al mes." />
          <StatBox label="Margen Bruto" value={unitEconomics.margenBruto} highlight tooltip="Porcentaje de ingreso que queda después de costos directos. Mayor = más rentable." />
        </div>
      </Section>

      <Section
        title="Break-Even"
        tooltip="Progreso hacia el punto de equilibrio: cuántos usuarios activos necesitas para que ingresos = gastos. Objetivo crítico para viabilidad."
      >
        <div className="bg-white rounded-xl border border-finzen-gray/20 p-5 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div>
              <p className="text-sm text-finzen-gray">Progreso al Break-Even</p>
              <p className="text-lg font-bold text-finzen-black">
                {unitEconomics.usuariosActuales} / {unitEconomics.breakEvenUsuarios} usuarios
              </p>
            </div>
            <span className="text-2xl font-bold text-finzen-blue">{unitEconomics.progresoBreakEven}</span>
          </div>
          <div className="w-full bg-finzen-white rounded-full h-4 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-finzen-blue to-finzen-green transition-all duration-1000"
              style={{ width: unitEconomics.progresoBreakEven }}
            />
          </div>
        </div>
      </Section>

      <Section
        title="Desglose de Costos"
        tooltip="Detalle de cada concepto de gasto: OpenAI, infraestructura, servicios, etc. Muestra en qué se invierte cada dólar."
      >
        <div className="bg-white rounded-xl border border-finzen-gray/20 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-finzen-gray/10">
                <th className="text-left text-xs font-medium text-finzen-gray p-4">Concepto</th>
                <th className="text-right text-xs font-medium text-finzen-gray p-4">Costo</th>
                <th className="text-right text-xs font-medium text-finzen-gray p-4">%</th>
              </tr>
            </thead>
            <tbody>
              {costBreakdown.map((row) => (
                <tr key={row.concepto} className="border-b border-finzen-gray/10 last:border-0">
                  <td className="text-sm text-finzen-black p-4">{row.concepto}</td>
                  <td className="text-sm text-right font-medium text-finzen-black p-4">{row.costo}</td>
                  <td className="text-sm text-right text-finzen-gray p-4">{row.porcentaje}</td>
                </tr>
              ))}
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
  const { range, setRange, pulse, users, revenue, engagement, openaiCosts, loading, error } = useDashboardData();
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
      case 'economics': return <TabEconomics openaiCosts={openaiCosts} />;
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
