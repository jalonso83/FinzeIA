'use client';

import { Loader2 } from 'lucide-react';
import BannerSuperior from '@/components/dashboard/BannerSuperior';
import KPICard from '@/components/dashboard/KPICard';
import ChartLine from '@/components/dashboard/ChartLine';
import ChartDonut from '@/components/dashboard/ChartDonut';
import ChartBar from '@/components/dashboard/ChartBar';
import QuickStats from '@/components/dashboard/QuickStats';
import DateRangePicker from '@/components/dashboard/DateRangePicker';
import { useDashboardData } from '@/hooks/useDashboardData';

// ─── Data transformers ──────────────────────────────────────────

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
      tooltip: 'Usuarios que completaron el onboarding con Zenio y tienen su perfil configurado.',
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
      date: d.toLocaleDateString('es', { day: '2-digit', month: 'short' }),
      registros: r.count,
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
  const dauMau = pulse.mau > 0 ? Math.round((pulse.dau / pulse.mau) * 100) : 0;
  return {
    retencionD1: `${pulse.retentionD1}%`,
    retencionD7: `${pulse.retentionD7}%`,
    retencionD30: `${pulse.retentionD30}%`,
    dauMau: `${dauMau}%`,
    trialToPaid: `${pulse.trialToPaidRate}%`,
  };
}

function buildBannerData(pulse: any, revenue: any) {
  if (!pulse) return null;
  return {
    mrrNeto: revenue?.mrrCurrent ?? pulse.mrrEstimated,
    mrrCambio: revenue?.mrrChange ?? 0,
    mau: pulse.mau,
  };
}

// ─── Component ──────────────────────────────────────────────────

export default function DashboardPulso() {
  const { range, setRange, pulse, users, revenue, engagement, loading, error } = useDashboardData();

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

  const kpiCards = buildKpiCards(pulse);
  const userGrowthData = buildUserGrowthData(users);
  const mrrTrendData = buildMrrTrend(revenue);
  const planDist = buildPlanDistribution(pulse);
  const channelData = buildChannelData(engagement);
  const quickStatsData = buildQuickStats(pulse);
  const bannerData = buildBannerData(pulse, revenue);

  return (
    <div className={loading ? 'opacity-60 pointer-events-none' : ''}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-finzen-black">Pulso</h1>
          <p className="text-sm text-finzen-gray mt-1">Vista general del estado de FinZen AI</p>
        </div>
        <DateRangePicker value={range} onChange={setRange} />
      </div>

      {/* Banner Superior */}
      <BannerSuperior data={bannerData} />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        {kpiCards.map((kpi) => (
          <KPICard key={kpi.label} {...kpi} />
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
