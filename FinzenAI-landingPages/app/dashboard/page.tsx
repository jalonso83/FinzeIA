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

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

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
    {
      label: 'Trials Iniciados',
      value: String(pulse.trialsStarted ?? 0),
      change: null,
      changeType: 'neutral' as const,
      tooltip: 'Trials que arrancaron dentro del período seleccionado, contados por su fecha real de activación (trial_device_registry). Incluye los que ya terminaron o convirtieron, no solo los activos.',
    },
    {
      label: 'Conversión Trial→Pago',
      value: `${pulse.trialConversionRate ?? 0}%`,
      change: null,
      changeType: pulse.trialConversionRate >= 20 ? ('positive' as const) : 'neutral' as const,
      tooltip: 'De los trials iniciados en el período, % que llegó a tener un pago exitoso. Ojo: trials recientes aún pueden convertir, así que en rangos cortos esta tasa puede subir con el tiempo.',
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

function buildTrialsByMonth(pulse: any) {
  if (!pulse?.trialsByMonth) return [];
  return pulse.trialsByMonth.map((m: any) => {
    const d = new Date(m.month + '-01T00:00:00Z');
    return {
      date: d.toLocaleDateString('es', { month: 'short', year: '2-digit', timeZone: 'UTC' }),
      trials: m.trials,
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

function buildBannerData(pulse: any, revenue: any, financialHealth: any) {
  if (!pulse) return null;
  return {
    mrrNeto: revenue?.mrrCurrent ?? pulse.mrrEstimated,
    mrrCambio: revenue?.mrrChange ?? 0,
    mau: pulse.mau,
    runway: financialHealth?.runway ?? null,
  };
}

// ─── Component ──────────────────────────────────────────────────

export default function DashboardPulso() {
  const { range, setRange, pulse, users, revenue, engagement, openaiCosts, financialHealth, loading, error } = useDashboardData();

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
  const trialsByMonthData = buildTrialsByMonth(pulse);
  const channelData = buildChannelData(engagement);
  const quickStatsData = buildQuickStats(pulse);
  const bannerData = buildBannerData(pulse, revenue, financialHealth);
  const openaiCostKpi = buildOpenAICostKpi(openaiCosts);

  const allKpiCards = openaiCostKpi ? [...kpiCards, openaiCostKpi] : kpiCards;

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

      {/* #8: disclaimer cuando el período de comparación cruza el inicio del tracking */}
      {pulse?.prevPeriodTruncated && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          ⚠️ Las comparaciones <strong>«vs período anterior»</strong> (ej. % de cambio en registros y MRR) usan un período previo que es anterior al inicio del tracking limpio
          {pulse.trackingStart ? ` (${new Date(pulse.trackingStart).toLocaleDateString('es-ES')})` : ''}. La base de comparación es parcial, por lo que esos porcentajes pueden estar inflados. Interprétalos con cautela.
        </div>
      )}

      {/* Banner Superior */}
      <BannerSuperior data={bannerData} />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        {allKpiCards.map((kpi) => (
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <ChartDonut
          title="Distribución por Plan"
          data={planDist}
        />
        <ChartBar
          title="Registros por País"
          data={channelData}
        />
      </div>

      {/* Charts Row 3 — Tendencia de trials (últimos 12 meses, independiente del filtro) */}
      <div className="grid grid-cols-1 gap-6 mb-6">
        <div>
          <ChartLine
            title="Trials Iniciados por Mes (últimos 12 meses)"
            data={trialsByMonthData}
            xKey="date"
            lines={[
              { dataKey: 'trials', color: '#6cad7f', name: 'Trials' },
            ]}
          />
          <p className="text-xs text-finzen-gray mt-2 px-1">
            Por fecha real de activación (trial_device_registry). Esta serie es de los últimos 12 meses y no depende del filtro de fechas de arriba.
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <QuickStats data={quickStatsData} />
    </div>
  );
}
