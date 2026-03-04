'use client';

import { Clock } from 'lucide-react';

interface QuickStatsData {
  retencionD1: string;
  retencionD7: string;
  retencionD30: string;
  dauMau: string;
  trialToPaid: string;
}

export default function QuickStats({ data }: { data: QuickStatsData | null }) {
  const stats = [
    { label: 'Retención D1', value: data?.retencionD1 ?? '—' },
    { label: 'D7', value: data?.retencionD7 ?? '—' },
    { label: 'D30', value: data?.retencionD30 ?? '—' },
    { label: 'DAU/MAU', value: data?.dauMau ?? '—' },
    { label: 'Trial → Paid', value: data?.trialToPaid ?? '—' },
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
          <span className="text-xs">en vivo</span>
        </div>
      </div>
    </div>
  );
}
