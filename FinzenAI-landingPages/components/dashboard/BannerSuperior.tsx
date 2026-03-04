'use client';

import { Fuel, DollarSign, Users } from 'lucide-react';

interface BannerData {
  mrrNeto: number;
  mrrCambio: number;
  mau: number;
}

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

// Runway is a manual metric not computed from DB
const RUNWAY_MONTHS = 8;

export default function BannerSuperior({ data }: { data: BannerData | null }) {
  const mrrNeto = data?.mrrNeto ?? 0;
  const mrrCambio = data?.mrrCambio ?? 0;
  const mau = data?.mau ?? 0;

  return (
    <div className="bg-white rounded-xl border border-finzen-gray/20 p-4 mb-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Runway */}
        <div className={`flex items-center gap-3 px-4 py-2 rounded-lg ${getRunwayColor(RUNWAY_MONTHS)}`}>
          <div className={`w-2.5 h-2.5 rounded-full ${getRunwayDot(RUNWAY_MONTHS)} animate-pulse`} />
          <Fuel size={18} />
          <div>
            <p className="text-xs font-medium opacity-70">Runway</p>
            <p className="text-lg font-bold">{RUNWAY_MONTHS} meses</p>
          </div>
        </div>

        {/* MRR Neto */}
        <div className="flex items-center gap-3 px-4 py-2 rounded-lg bg-finzen-blue/5 text-finzen-blue">
          <DollarSign size={18} />
          <div>
            <p className="text-xs font-medium opacity-70">MRR Neto</p>
            <p className="text-lg font-bold">
              ${mrrNeto.toFixed(2)}{' '}
              {mrrCambio !== 0 && (
                <span className={`text-sm font-medium ${mrrCambio >= 0 ? 'text-finzen-green' : 'text-finzen-red'}`}>
                  {mrrCambio >= 0 ? '↑' : '↓'}{Math.abs(mrrCambio)}%
                </span>
              )}
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
