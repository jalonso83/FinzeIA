'use client';

import BannerSuperior from '@/components/dashboard/BannerSuperior';
import KPICard from '@/components/dashboard/KPICard';
import ChartLine from '@/components/dashboard/ChartLine';
import ChartDonut from '@/components/dashboard/ChartDonut';
import ChartBar from '@/components/dashboard/ChartBar';
import QuickStats from '@/components/dashboard/QuickStats';

/**
 * Sección "Resumen Ejecutivo" del PDF — replica la vista del tab Pulso
 * (`/dashboard/page.tsx`) para que el reporte abra con los KPIs absolutos.
 *
 * Mantenimiento: si la vista Pulso original cambia (KPIs, charts), considerar
 * actualizar también este componente. Hoy hay duplicación de los data
 * transformers para mantener este componente auto-contenido.
 */

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function buildKpiCards(pulse: any) {
  if (!pulse) return [];
  const regChange = pulse.registrationChange;
  return [
    {
      label: 'Total Usuarios',
      value: String(pulse.totalUsers),
      change: null,
      changeType: 'neutral' as const,
      tooltip: 'Número total de usuarios registrados en la plataforma.',
    },
    {
      label: 'Nuevos Registros',
      value: String(pulse.newRegistrations),
      change: regChange !== 0 ? `${regChange > 0 ? '+' : ''}${regChange}%` : null,
      changeType: regChange > 0 ? ('positive' as const) : regChange < 0 ? ('negative' as const) : ('neutral' as const),
      tooltip: 'Usuarios que se registraron en el período seleccionado. El % compara con el período anterior.',
    },
    {
      label: 'Activados',
      value: String(pulse.activatedUsers),
      change: null,
      changeType: 'neutral' as const,
      tooltip: 'Usuarios del período que registraron al menos una transacción (criterio de activación real).',
    },
    {
      label: 'Churn Rate',
      value: `${pulse.churnRate}%`,
      change: null,
      changeType: pulse.churnRate > 10 ? ('negative' as const) : ('neutral' as const),
      tooltip: 'Porcentaje de suscripciones pagadas que se cancelaron en el período. Menor es mejor.',
    },
    {
      label: 'Trials Activos',
      value: String(pulse.trialsActive),
      change: null,
      changeType: 'neutral' as const,
      tooltip: 'Usuarios que están actualmente en período de prueba gratuita de 7 días.',
    },
  ];
}

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

function buildPlanDistribution(pulse: any) {
  if (!pulse?.planDistribution) return [];
  const dist = pulse.planDistribution;
  return [
    { name: 'Free', value: dist.FREE || 0, color: '#b0b8be' },
    { name: 'Plus', value: dist.PREMIUM || 0, color: '#6cad7f' },
    { name: 'Pro', value: dist.PRO || 0, color: '#204274' },
  ];
}

function buildChannelData(engagement: any) {
  if (!engagement?.registrationsByChannel) return [];
  const colors = ['#204274', '#6cad7f', '#f59e0b', '#b0b8be', '#8b5cf6', '#ef4444'];
  return engagement.registrationsByChannel.map((r: any, i: number) => ({
    canal: r.country,
    registros: r.count,
    color: colors[i % colors.length],
  }));
}

function buildQuickStats(pulse: any) {
  if (!pulse) return null;
  const dauMau = pulse.mau > 0 ? ((pulse.dau / pulse.mau) * 100).toFixed(2) : '0.00';
  return {
    retencionD1: `${pulse.retentionD1}%`,
    retencionD7: `${pulse.retentionD7}%`,
    retencionD30: `${pulse.retentionD30}%`,
    dauMau: `${dauMau}%`,
  };
}

function buildBannerData(pulse: any, revenue: any, financialHealth: any) {
  if (!pulse) return null;
  return {
    mrrNeto: revenue?.mrrCurrent ?? pulse.mrrEstimated,
    mrrCambio: revenue?.mrrChange ?? 0,
    mau: pulse.mau,
    runway: financialHealth?.runway ?? null,
  };
}

function buildOpenAICostKpi(openaiCosts: any) {
  if (!openaiCosts) return null;
  return {
    label: 'Costos OpenAI',
    value: formatCurrency(openaiCosts.totalCost),
    change: null,
    changeType: 'neutral' as const,
    tooltip: 'Costo total de OpenAI (Zenio, Email Parser, TTS, etc.) en el período.',
  };
}

interface TabPulsoProps {
  pulse: any;
  users: any;
  revenue: any;
  engagement: any;
  openaiCosts: any;
  financialHealth: any;
}

export function TabPulso({ pulse, users, revenue, engagement, openaiCosts, financialHealth }: TabPulsoProps) {
  if (!pulse) return null;

  const kpiCards = buildKpiCards(pulse);
  const openaiCostKpi = buildOpenAICostKpi(openaiCosts);
  const allKpiCards = openaiCostKpi ? [...kpiCards, openaiCostKpi] : kpiCards;

  const userGrowthData = buildUserGrowthData(users);
  const mrrTrendData = buildMrrTrend(revenue);
  const planDist = buildPlanDistribution(pulse);
  const channelData = buildChannelData(engagement);
  const quickStatsData = buildQuickStats(pulse);
  const bannerData = buildBannerData(pulse, revenue, financialHealth);

  return (
    <div>
      {/* Banner Superior */}
      <BannerSuperior data={bannerData} />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6 mt-6">
        {allKpiCards.map((kpi) => (
          <KPICard key={kpi.label} {...kpi} />
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 pdf-no-break">
        <ChartLine
          title="Crecimiento de Usuarios"
          data={userGrowthData}
          xKey="date"
          lines={[
            { dataKey: 'registros', color: '#204274', name: 'Registros' },
          ]}
        />
        <ChartLine
          title="MRR Neto (Trend)"
          data={mrrTrendData}
          xKey="date"
          lines={[
            { dataKey: 'mrr', color: '#6cad7f', name: 'MRR ($)' },
          ]}
        />
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 pdf-no-break">
        <ChartDonut
          title="Distribución por Plan"
          data={planDist}
        />
        <ChartBar
          title="Registros por País"
          data={channelData}
        />
      </div>

      {/* Quick Stats */}
      <QuickStats data={quickStatsData} />
    </div>
  );
}
