'use client';

import { TrendingUp, TrendingDown } from 'lucide-react';

interface KPICardProps {
  label: string;
  value: string;
  change: string | null;
  changeType: 'positive' | 'negative' | 'neutral';
}

export default function KPICard({ label, value, change, changeType }: KPICardProps) {
  return (
    <div className="bg-white rounded-xl border border-finzen-gray/20 p-5 hover:shadow-md transition-shadow">
      <p className="text-sm text-finzen-gray font-medium mb-1">{label}</p>
      <p className="text-2xl font-bold text-finzen-black">{value}</p>
      {change && (
        <div className={`flex items-center gap-1 mt-2 text-sm font-medium ${
          changeType === 'positive' ? 'text-finzen-green' :
          changeType === 'negative' ? 'text-finzen-red' :
          'text-finzen-gray'
        }`}>
          {changeType === 'positive' && <TrendingUp size={14} />}
          {changeType === 'negative' && <TrendingDown size={14} />}
          <span>{change}</span>
          <span className="text-finzen-gray font-normal">vs prev</span>
        </div>
      )}
    </div>
  );
}
