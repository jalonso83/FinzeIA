'use client';

import { Fuel, DollarSign, Users } from 'lucide-react';
import { bannerData } from '@/lib/dashboard-mock-data';

function getRunwayColor(months: number) {
  if (months > 6) return 'text-finzen-green bg-finzen-green/10';
  if (months >= 3) return 'text-finzen-yellow bg-finzen-yellow/10';
  return 'text-finzen-red bg-finzen-red/10';
}

function getRunwayDot(months: number) {
  if (months > 6) return 'bg-finzen-green';
  if (months >= 3) return 'bg-finzen-yellow';
  return 'bg-finzen-red';
}

export default function BannerSuperior() {
  const { runway, mrrNeto, mrrCambio, mau } = bannerData;

  return (
    <div className="bg-white rounded-xl border border-finzen-gray/20 p-4 mb-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Runway */}
        <div className={`flex items-center gap-3 px-4 py-2 rounded-lg ${getRunwayColor(runway)}`}>
          <div className={`w-2.5 h-2.5 rounded-full ${getRunwayDot(runway)} animate-pulse`} />
          <Fuel size={18} />
          <div>
            <p className="text-xs font-medium opacity-70">Runway</p>
            <p className="text-lg font-bold">{runway} meses</p>
          </div>
        </div>

        {/* MRR Neto */}
        <div className="flex items-center gap-3 px-4 py-2 rounded-lg bg-finzen-blue/5 text-finzen-blue">
          <DollarSign size={18} />
          <div>
            <p className="text-xs font-medium opacity-70">MRR Neto</p>
            <p className="text-lg font-bold">
              ${mrrNeto}{' '}
              <span className="text-sm font-medium text-finzen-green">↑{mrrCambio}%</span>
            </p>
          </div>
        </div>

        {/* MAU */}
        <div className="flex items-center gap-3 px-4 py-2 rounded-lg bg-finzen-blue/5 text-finzen-blue">
          <Users size={18} />
          <div>
            <p className="text-xs font-medium opacity-70">MAU</p>
            <p className="text-lg font-bold">{mau}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
