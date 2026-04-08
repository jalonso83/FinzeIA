'use client';

import { Clock, Info } from 'lucide-react';
import { useState } from 'react';

function StatTooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative inline-flex" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      <Info size={12} className="text-finzen-gray/40 cursor-help" />
      {show && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 px-3 py-2 bg-finzen-black text-white text-xs rounded-lg shadow-lg">
          {text}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-finzen-black" />
        </div>
      )}
    </div>
  );
}

interface QuickStatsData {
  retencionD1: string;
  retencionD7: string;
  retencionD30: string;
  dauMau: string;
  trialToPaid: string;
}

export default function QuickStats({ data }: { data: QuickStatsData | null }) {
  const stats = [
    { label: 'Retención D1', value: data?.retencionD1 ?? '—', tooltip: 'Porcentaje de usuarios que volvieron a usar la app al día siguiente de registrarse.' },
    { label: 'D7', value: data?.retencionD7 ?? '—', tooltip: 'Porcentaje de usuarios que volvieron a los 7 días de registrarse.' },
    { label: 'D30', value: data?.retencionD30 ?? '—', tooltip: 'Porcentaje de usuarios que siguen activos 30 días después de registrarse.' },
    { label: 'DAU/MAU', value: data?.dauMau ?? '—', tooltip: 'Ratio de usuarios diarios vs mensuales. Mide qué tan "pegajosa" es la app. >20% es bueno.' },
    { label: 'Trial → Paid', value: data?.trialToPaid ?? '—', tooltip: 'Porcentaje de usuarios que terminaron el trial y se suscribieron a un plan de pago.' },
  ];

  return (
    <div className="bg-white rounded-xl border border-finzen-gray/20 p-4 mt-6">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        {stats.map((stat) => (
          <div key={stat.label} className="flex items-center gap-2">
            <span className="text-sm text-finzen-gray">{stat.label}:</span>
            <span className="text-sm font-bold text-finzen-black">{stat.value}</span>
            <StatTooltip text={stat.tooltip} />
          </div>
        ))}
        <div className="flex items-center gap-1.5 ml-auto text-finzen-gray">
          <Clock size={14} />
          <span className="text-xs">en vivo</span>
        </div>
      </div>
    </div>
  );
}
