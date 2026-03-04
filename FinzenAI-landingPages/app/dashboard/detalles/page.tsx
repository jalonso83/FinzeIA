'use client';

import { useState } from 'react';
import { Users, DollarSign, Activity, Calculator, HeartPulse, Loader2 } from 'lucide-react';
import BannerSuperior from '@/components/dashboard/BannerSuperior';
import DateRangePicker from '@/components/dashboard/DateRangePicker';
import ChartLine from '@/components/dashboard/ChartLine';
import FunnelChart from '@/components/dashboard/FunnelChart';
import CohortHeatmap from '@/components/dashboard/CohortHeatmap';
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
function Section({ title, defaultOpen = true, children }: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mb-6">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-sm font-semibold text-finzen-black hover:text-finzen-blue transition-colors mb-3"
      >
        <span className="text-finzen-blue">{open ? '▼' : '▶'}</span>
        {title}
      </button>
      {open && <div>{children}</div>}
    </div>
  );
}

// ─── Stat Box ────────────────────────────────────────────────────
function StatBox({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg border p-4 ${highlight ? 'border-finzen-green bg-finzen-green/5' : 'border-finzen-gray/20 bg-white'}`}>
      <p className="text-xs text-finzen-gray font-medium">{label}</p>
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
      <Section title="Registros Diarios">
        <ChartLine
          title=""
          data={buildUserGrowthData(users)}
          xKey="date"
          lines={[
            { dataKey: 'registros', color: '#204274', name: 'Registros' },
          ]}
        />
      </Section>

      <Section title="Funnel Completo">
        <FunnelChart data={buildFunnelData(users)} />
      </Section>

      <Section title="Cohortes de Retención">
        <CohortHeatmap data={buildCohortData(users)} />
      </Section>
    </div>
  );
}

// ─── Tab: Revenue ────────────────────────────────────────────────
function TabRevenue({ revenue }: { revenue: any }) {
  if (!revenue) return null;

  const totalPaidSubs = (revenue.subscriptionsByStatus?.ACTIVE || 0) +
    (revenue.subscriptionsByStatus?.TRIALING || 0);

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
      <Section title="Métricas de Revenue">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatBox label="MRR Actual" value={`$${revenue.mrrCurrent?.toFixed(2)}`} highlight />
          <StatBox label="MRR Anterior" value={`$${revenue.mrrPrevious?.toFixed(2)}`} />
          <StatBox label="Cambio" value={`${revenue.mrrChange > 0 ? '+' : ''}${revenue.mrrChange}%`} highlight />
          <StatBox label="ARPU" value={`$${revenue.arpu?.toFixed(2)}`} />
          <StatBox label="Pagos Exitosos" value={String(revenue.payments?.succeeded ?? 0)} />
          <StatBox label="Pagos Fallidos" value={String(revenue.payments?.failed ?? 0)} />
          <StatBox label="Ingresos Total" value={`$${Number(revenue.payments?.totalAmount ?? 0).toFixed(2)}`} />
          <StatBox label="Total Suscripciones" value={String(totalPaidSubs)} />
        </div>
      </Section>

      <Section title="MRR Trend">
        <ChartLine
          title=""
          data={buildMrrTrend(revenue)}
          xKey="date"
          lines={[{ dataKey: 'mrr', color: '#6cad7f', name: 'MRR ($)' }]}
        />
      </Section>

      <Section title="Revenue por Plan">
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

      <Section title="Métricas de Trial">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <StatBox label="Trials Activos" value={String(revenue.trialsActive)} />
          <StatBox label="Cancelaciones (30d)" value={String(revenue.cancellations30d)} />
          <StatBox label="Trial → Paid" value={`${revenue.trialToPaidRate}%`} highlight />
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
      <Section title="Métricas de Engagement">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <StatBox label="Consultas Zenio (total)" value={String(engagement.zenioTotalQueries)} highlight />
          <StatBox label="Usuarios Activos" value={String(engagement.activeUsers)} />
          <StatBox label="TX / Usuario Activo" value={String(engagement.transactionsPerActiveUser)} />
          <StatBox label="Tasa Onboarding" value={`${engagement.onboardingRate}%`} />
          <StatBox label="Referidos Totales" value={String(engagement.referrals?.total ?? 0)} />
          <StatBox label="Referidos Convertidos" value={String(engagement.referrals?.converted ?? 0)} />
        </div>
      </Section>
    </div>
  );
}

// ─── Tab: Unit Economics (mock — sin API) ────────────────────────
function TabEconomics() {
  return (
    <div>
      <Section title="Costos por Usuario">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatBox label="Costo IA / Usuario" value={unitEconomics.costoIAPorUsuario} />
          <StatBox label="Costo Infra / Usuario" value={unitEconomics.costoInfraPorUsuario} />
          <StatBox label="Costo Total / Usuario" value={unitEconomics.costoTotalPorUsuario} />
          <StatBox label="Margen Bruto" value={unitEconomics.margenBruto} highlight />
        </div>
      </Section>

      <Section title="Break-Even">
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

      <Section title="Desglose de Costos">
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
      <Section title="Estado General">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <StatBox label="Balance en Cuenta" value={financialHealth.balanceCuenta} highlight />
          <StatBox label="Ingresos Mensuales" value={financialHealth.ingresosMensuales} />
          <StatBox label="Gastos Mensuales" value={financialHealth.gastosMensuales} />
          <StatBox label="Runway" value={financialHealth.runway} highlight />
          <StatBox label="Burn Rate" value={financialHealth.burnRate} />
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
  const { range, setRange, pulse, users, revenue, engagement, loading, error } = useDashboardData();
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
      case 'revenue': return <TabRevenue revenue={revenue} />;
      case 'engagement': return <TabEngagement engagement={engagement} />;
      case 'economics': return <TabEconomics />;
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
