'use client';

import { TrendingUp, TrendingDown, Info } from 'lucide-react';
import Icon from '@/components/ui/Icon';
import { useState } from 'react';

interface KPICardProps {
  label: string;
  value: string;
  change: string | null;
  changeType: 'positive' | 'negative' | 'neutral';
  tooltip?: string;
}

export default function KPICard({ label, value, change, changeType, tooltip }: KPICardProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="bg-white rounded-xl border border-finzen-gray/20 p-5 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group relative">
      <div className="flex items-center gap-1.5 mb-1">
        <p className="text-sm text-finzen-gray font-medium tracking-wide">{label}</p>
        {tooltip && (
          <div
            className="relative"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
          >
            <Info size={13} className="text-finzen-gray/50 cursor-help" />
            {showTooltip && (
              <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 px-3 py-2 bg-finzen-black text-white text-xs rounded-lg shadow-lg">
                {tooltip}
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-finzen-black" />
              </div>
            )}
          </div>
        )}
      </div>
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
