'use client';

import { Fuel, DollarSign, Users, Info } from 'lucide-react';
import { useState } from 'react';

interface BannerData {
  mrrNeto: number;
  mrrCambio: number;
  mau: number;
  runway: number | null; // null = sin burn (cash flow positivo) → ∞
}

function Tooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative inline-flex" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      <Info size={13} className="opacity-50 cursor-help" />
      {show && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 px-3 py-2 bg-finzen-black text-white text-xs rounded-lg shadow-lg">
          {text}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-finzen-black" />
        </div>
      )}
    </div>
  );
}

function getRunwayColor(months: number | null) {
  if (months === null) return 'text-finzen-green bg-finzen-green/10'; // ∞ = sin burn
  if (months > 6) return 'text-finzen-green bg-finzen-green/10';
  if (months >= 3) return 'text-finzen-yellow bg-finzen-yellow/10';
  return 'text-finzen-red bg-finzen-red/10';
}

function getRunwayDot(months: number | null) {
  if (months === null) return 'bg-finzen-green';
  if (months > 6) return 'bg-finzen-green';
  if (months >= 3) return 'bg-finzen-yellow';
  return 'bg-finzen-red';
}

export default function BannerSuperior({ data }: { data: BannerData | null }) {
  const mrrNeto = data?.mrrNeto ?? 0;
  const mrrCambio = data?.mrrCambio ?? 0;
  const mau = data?.mau ?? 0;
  const runway = data?.runway ?? null;
  const runwayLabel = runway === null ? '∞ meses' : `${runway} meses`;

  return (
    <div className="bg-white rounded-xl border border-finzen-gray/20 p-4 mb-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Runway */}
        <div className={`flex items-center gap-3 px-4 py-2 rounded-lg ${getRunwayColor(runway)}`}>
          <div className={`w-2.5 h-2.5 rounded-full ${getRunwayDot(runway)} animate-pulse`} />
          <Fuel size={18} />
          <div>
            <div className="flex items-center gap-1"><p className="text-xs font-medium opacity-70">Runway</p><Tooltip text="Meses que el ingreso bruto acumulado cubriría la pérdida mensual actual. ∞ = cash flow positivo (no hay burn)." /></div>
            <p className="text-lg font-bold">{runwayLabel}</p>
          </div>
        </div>

        {/* MRR Neto */}
        <div className="flex items-center gap-3 px-4 py-2 rounded-lg bg-finzen-blue/5 text-finzen-blue">
          <DollarSign size={18} />
          <div>
            <div className="flex items-center gap-1"><p className="text-xs font-medium opacity-70">MRR Neto</p><Tooltip text="Ingreso Mensual Recurrente. Suma de lo que pagan los suscriptores activos cada mes (sin trials)." /></div>
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
            <div className="flex items-center gap-1"><p className="text-xs font-medium opacity-70">MAU</p><Tooltip text="Monthly Active Users. Usuarios únicos que usaron la app al menos una vez en los últimos 30 días." /></div>
            <p className="text-lg font-bold">{mau}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
