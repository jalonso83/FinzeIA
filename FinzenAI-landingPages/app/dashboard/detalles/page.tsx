'use client';

import { useState } from 'react';
import { Users, DollarSign, Activity, Calculator, HeartPulse } from 'lucide-react';
import BannerSuperior from '@/components/dashboard/BannerSuperior';
import DateRangePicker from '@/components/dashboard/DateRangePicker';
import ChartLine from '@/components/dashboard/ChartLine';
import FunnelChart from '@/components/dashboard/FunnelChart';
import CohortHeatmap from '@/components/dashboard/CohortHeatmap';
import {
  userGrowthData,
  revenueStats,
  revenueByPlan,
  mrrTrendData,
  engagementStats,
  zenioUsageData,
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

// ─── Tab: Usuarios ───────────────────────────────────────────────
function TabUsuarios() {
  return (
    <div>
      <Section title="Registros Diarios">
        <ChartLine
          title=""
          data={userGrowthData}
          xKey="date"
          lines={[
            { dataKey: 'registros', color: '#204274', name: 'Registros' },
            { dataKey: 'activaciones', color: '#6cad7f', name: 'Activaciones' },
          ]}
        />
      </Section>

      <Section title="Funnel Completo">
        <FunnelChart />
      </Section>

      <Section title="Cohortes de Retención">
        <CohortHeatmap />
      </Section>
    </div>
  );
}

// ─── Tab: Revenue ────────────────────────────────────────────────
function TabRevenue() {
  return (
    <div>
      <Section title="Métricas de Revenue">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatBox label="MRR Actual" value={revenueStats.mrrActual} highlight />
          <StatBox label="MRR Anterior" value={revenueStats.mrrAnterior} />
          <StatBox label="Cambio" value={revenueStats.mrrCambio} highlight />
          <StatBox label="ARPU" value={revenueStats.arpu} />
          <StatBox label="LTV" value={revenueStats.ltv} />
          <StatBox label="CAC" value={revenueStats.cac} />
          <StatBox label="LTV/CAC Ratio" value={revenueStats.ltvCacRatio} highlight />
          <StatBox label="Total Suscripciones" value={String(revenueStats.totalSuscripciones)} />
        </div>
      </Section>

      <Section title="MRR Trend">
        <ChartLine
          title=""
          data={mrrTrendData}
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
              {revenueByPlan.map((row) => (
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
          <StatBox label="Trials Activos" value={String(revenueStats.trials)} />
          <StatBox label="Cancelaciones (30d)" value={String(revenueStats.cancelaciones)} />
          <StatBox label="Trial → Paid" value="42%" highlight />
        </div>
      </Section>
    </div>
  );
}

// ─── Tab: Engagement ─────────────────────────────────────────────
function TabEngagement() {
  return (
    <div>
      <Section title="Métricas de Engagement">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <StatBox label="Sesiones Zenio / Día" value={String(engagementStats.sesionesZenioDiarias)} highlight />
          <StatBox label="Mensajes / Sesión" value={String(engagementStats.promedioMensajesPorSesion)} />
          <StatBox label="Transacciones / Usuario Activo" value={String(engagementStats.transaccionesPorUsuarioActivo)} />
          <StatBox label="Tasa Onboarding" value={engagementStats.tasaOnboarding} />
          <StatBox label="Feature Más Usado" value={engagementStats.featureMasUsado} highlight />
          <StatBox label="Feature Menos Usado" value={engagementStats.featureMenosUsado} />
        </div>
      </Section>

      <Section title="Uso de Zenio AI (Sesiones Diarias)">
        <ChartLine
          title=""
          data={zenioUsageData}
          xKey="date"
          lines={[{ dataKey: 'sesiones', color: '#204274', name: 'Sesiones Zenio' }]}
        />
      </Section>
    </div>
  );
}

// ─── Tab: Unit Economics ─────────────────────────────────────────
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

// ─── Tab: Salud Financiera ───────────────────────────────────────
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
  const [activeTab, setActiveTab] = useState('usuarios');

  const renderTab = () => {
    switch (activeTab) {
      case 'usuarios': return <TabUsuarios />;
      case 'revenue': return <TabRevenue />;
      case 'engagement': return <TabEngagement />;
      case 'economics': return <TabEconomics />;
      case 'salud': return <TabSalud />;
      default: return null;
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-finzen-black">Detalles</h1>
          <p className="text-sm text-finzen-gray mt-1">Análisis detallado por categoría</p>
        </div>
        <DateRangePicker />
      </div>

      {/* Banner Superior */}
      <BannerSuperior />

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
