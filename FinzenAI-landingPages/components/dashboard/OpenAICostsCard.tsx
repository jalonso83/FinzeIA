'use client';

import { AlertCircle } from 'lucide-react';
import { OpenAICostsData } from '@/lib/dashboard-api';
import ChartLine from './ChartLine';

interface OpenAICostsCardProps {
  data: OpenAICostsData;
}

export default function OpenAICostsCard({ data }: OpenAICostsCardProps) {
  if (!data) return null;

  const costTrendData = data.costTrend.map((d) => ({
    date: new Date(d.date).toLocaleDateString('es', { day: '2-digit', month: 'short' }),
    costo: d.cost,
  }));

  const topFeatures = Object.entries(data.costByFeature)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  const topModels = Object.entries(data.costByModel)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  const hasAnomalies = data.anomalies && data.anomalies.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-finzen-black">Costos de OpenAI</h2>
          <p className="text-sm text-finzen-gray mt-1">
            Período: {data.period.from} a {data.period.to}
          </p>
        </div>
      </div>

      {/* Total Cost KPI */}
      <div className="bg-white rounded-xl border border-finzen-gray/20 p-6">
        <p className="text-sm text-finzen-gray font-medium mb-2">Costo Total</p>
        <div className="flex items-baseline gap-3">
          <p className="text-4xl font-bold text-finzen-black">
            ${data.totalCost.toFixed(2)}
          </p>
          <p className="text-sm text-finzen-gray">USD</p>
        </div>
      </div>

      {/* Trend Chart */}
      <ChartLine
        title="Tendencia Diaria de Costos"
        data={costTrendData}
        xKey="date"
        lines={[{ dataKey: 'costo', color: '#ef4444', name: 'Costo ($)' }]}
        height={250}
      />

      {/* Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Feature */}
        <div className="bg-white rounded-xl border border-finzen-gray/20 p-5">
          <h3 className="text-sm font-semibold text-finzen-black mb-4">Costos por Feature</h3>
          <div className="space-y-3">
            {topFeatures.map(([feature, cost]) => (
              <div key={feature} className="flex items-center justify-between pb-3 border-b border-finzen-gray/10 last:border-b-0">
                <span className="text-sm text-finzen-black capitalize">{feature}</span>
                <span className="text-sm font-semibold text-finzen-black">${cost.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* By Model */}
        <div className="bg-white rounded-xl border border-finzen-gray/20 p-5">
          <h3 className="text-sm font-semibold text-finzen-black mb-4">Costos por Modelo</h3>
          <div className="space-y-3">
            {topModels.map(([model, cost]) => (
              <div key={model} className="flex items-center justify-between pb-3 border-b border-finzen-gray/10 last:border-b-0">
                <span className="text-sm text-finzen-black font-mono">{model}</span>
                <span className="text-sm font-semibold text-finzen-black">${cost.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* By Plan */}
      {Object.keys(data.costByPlan).length > 0 && (
        <div className="bg-white rounded-xl border border-finzen-gray/20 p-5">
          <h3 className="text-sm font-semibold text-finzen-black mb-4">Costos por Plan</h3>
          <div className="grid grid-cols-3 gap-4">
            {Object.entries(data.costByPlan).map(([plan, cost]) => (
              <div key={plan} className="text-center p-4 rounded-lg bg-finzen-gray/5">
                <p className="text-xs text-finzen-gray font-medium uppercase">{plan}</p>
                <p className="text-lg font-bold text-finzen-black mt-2">${cost.toFixed(2)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Users */}
      {data.topUsers && data.topUsers.length > 0 && (
        <div className="bg-white rounded-xl border border-finzen-gray/20 p-5">
          <h3 className="text-sm font-semibold text-finzen-black mb-4">Top Usuarios</h3>
          <div className="space-y-2">
            {data.topUsers.map((user, idx) => (
              <div key={user.userId} className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-finzen-gray/5">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-finzen-gray bg-finzen-gray/20 rounded-full w-6 h-6 flex items-center justify-center">
                    #{idx + 1}
                  </span>
                  <span className="text-sm text-finzen-black font-medium">{user.name}</span>
                </div>
                <span className="text-sm font-semibold text-finzen-black">${user.cost.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Anomalies Alert */}
      {hasAnomalies && (
        <div className="bg-finzen-red/10 border border-finzen-red/30 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-finzen-red mt-0.5 flex-shrink-0" size={18} />
            <div>
              <h3 className="text-sm font-semibold text-finzen-red mb-2">Anomalías Detectadas</h3>
              <div className="space-y-2">
                {data.anomalies.map((anomaly, idx) => (
                  <div key={idx} className="text-xs text-finzen-red/80">
                    <span className="font-medium capitalize">{anomaly.feature}:</span> ${anomaly.dailyCost.toFixed(2)}{' '}
                    <span className="text-finzen-red/60">({anomaly.reason})</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
