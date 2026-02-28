'use client';

import { funnelData } from '@/lib/dashboard-mock-data';

export default function FunnelChart() {
  const maxValue = funnelData[0].valor;

  return (
    <div className="bg-white rounded-xl border border-finzen-gray/20 p-5">
      <h3 className="text-sm font-semibold text-finzen-black mb-5">Funnel de Conversión</h3>
      <div className="space-y-3">
        {funnelData.map((step, index) => {
          const widthPercent = Math.max((step.valor / maxValue) * 100, 8);
          const isLast = index === funnelData.length - 1;

          return (
            <div key={step.etapa} className="flex items-center gap-4">
              <div className="w-24 shrink-0 text-right">
                <span className="text-sm text-finzen-black font-medium">{step.etapa}</span>
              </div>
              <div className="flex-1 relative">
                <div className="h-8 bg-finzen-white rounded-md overflow-hidden">
                  <div
                    className="h-full rounded-md transition-all duration-500"
                    style={{
                      width: `${widthPercent}%`,
                      backgroundColor: isLast ? '#6cad7f' : '#204274',
                      opacity: 1 - (index * 0.1),
                    }}
                  />
                </div>
              </div>
              <div className="w-20 shrink-0 flex items-center gap-2">
                <span className="text-sm font-bold text-finzen-black">{step.valor}</span>
                <span className="text-xs text-finzen-gray">({step.porcentaje})</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
