'use client';

import { Clock } from 'lucide-react';
import { quickStats } from '@/lib/dashboard-mock-data';

export default function QuickStats() {
  const stats = [
    { label: 'Retención D1', value: quickStats.retencionD1 },
    { label: 'D7', value: quickStats.retencionD7 },
    { label: 'D30', value: quickStats.retencionD30 },
    { label: 'DAU/MAU', value: quickStats.dauMau },
    { label: 'Trial → Paid', value: quickStats.trialToPaid },
  ];

  return (
    <div className="bg-white rounded-xl border border-finzen-gray/20 p-4 mt-6">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        {stats.map((stat) => (
          <div key={stat.label} className="flex items-center gap-2">
            <span className="text-sm text-finzen-gray">{stat.label}:</span>
            <span className="text-sm font-bold text-finzen-black">{stat.value}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5 ml-auto text-finzen-gray">
          <Clock size={14} />
          <span className="text-xs">{quickStats.ultimaActualizacion}</span>
        </div>
      </div>
    </div>
  );
}
