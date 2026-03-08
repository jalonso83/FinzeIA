'use client';

import { TrendingUp, TrendingDown } from 'lucide-react';
import Icon from '@/components/ui/Icon';

interface KPICardProps {
  label: string;
  value: string;
  change: string | null;
  changeType: 'positive' | 'negative' | 'neutral';
}

export default function KPICard({ label, value, change, changeType }: KPICardProps) {
  return (
    <div className="bg-white rounded-xl border border-finzen-gray/20 p-5 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
      <p className="text-sm text-finzen-gray font-medium mb-1 tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-finzen-black tracking-tight" style={{textShadow: '0 1px 2px rgba(0,0,0,0.05)'}}>{value}</p>
      {change && (
        <div className={`flex items-center gap-2 mt-2 text-sm font-medium transition-all duration-200 ${
          changeType === 'positive' ? 'text-finzen-green' :
          changeType === 'negative' ? 'text-finzen-red' :
          'text-finzen-gray'
        }`}>
          <Icon 
            icon={changeType === 'positive' ? TrendingUp : TrendingDown} 
            size={14}
            color={changeType === 'positive' ? 'text-finzen-green' : 'text-finzen-red'}
            variant="default"
            animate={false}
            className="transition-transform duration-200 group-hover:scale-110"
          />
          <span className="font-semibold">{change}</span>
          <span className="text-finzen-gray font-normal tracking-wide">vs prev</span>
        </div>
      )}
    </div>
  );
}
