'use client';

import BannerSuperior from '@/components/dashboard/BannerSuperior';
import KPICard from '@/components/dashboard/KPICard';
import ChartLine from '@/components/dashboard/ChartLine';
import ChartDonut from '@/components/dashboard/ChartDonut';
import ChartBar from '@/components/dashboard/ChartBar';
import QuickStats from '@/components/dashboard/QuickStats';
import DateRangePicker from '@/components/dashboard/DateRangePicker';
import {
  kpiCards,
  userGrowthData,
  mrrTrendData,
  planDistribution,
  channelData,
} from '@/lib/dashboard-mock-data';

export default function DashboardPulso() {
  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-finzen-black">Pulso</h1>
          <p className="text-sm text-finzen-gray mt-1">Vista general del estado de FinZen AI</p>
        </div>
        <DateRangePicker />
      </div>

      {/* Banner Superior */}
      <BannerSuperior />

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
            { dataKey: 'activaciones', color: '#6cad7f', name: 'Activaciones' },
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
          data={planDistribution}
        />
        <ChartBar
          title="Registros por Canal"
          data={channelData}
        />
      </div>

      {/* Quick Stats */}
      <QuickStats />
    </div>
  );
}
