'use client';

import { useState, useRef, useEffect } from 'react';
import { Download, Loader2, ChevronDown } from 'lucide-react';
import {
  computeRollingParams,
  computeMonthParams,
  computeQuarterParams,
  MONTH_NAMES,
  type DateRange,
  type PeriodParams,
} from '@/lib/dashboard-api';

type PeriodType = 'rolling' | 'month' | 'quarter';

const ROLLING_RANGES: DateRange[] = ['7d', '14d', '30d', '90d'];
const QUARTERS = [1, 2, 3, 4];
const QUARTER_HINTS: Record<number, string> = {
  1: 'Ene–Mar',
  2: 'Abr–Jun',
  3: 'Jul–Sep',
  4: 'Oct–Dic',
};

/**
 * Botón "Descargar PDF" con popover para elegir el periodo del reporte:
 * rolling (últimos N días), mes calendario o trimestre. Calcula from/to + label
 * y los manda al endpoint del backend, que dispara la generación con Puppeteer.
 */
export default function PdfExportPopover() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-11
  const currentQuarter = Math.floor(currentMonth / 3) + 1;

  const [open, setOpen] = useState(false);
  const [periodType, setPeriodType] = useState<PeriodType>('month');
  const [rollingRange, setRollingRange] = useState<DateRange>('30d');
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(currentMonth);
  const [quarter, setQuarter] = useState(currentQuarter);
  const [isDownloading, setIsDownloading] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Cerrar el popover al hacer click fuera.
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Años seleccionables: desde 2025 hasta el actual.
  const years: number[] = [];
  for (let y = currentYear; y >= 2025; y--) years.push(y);

  const isMonthDisabled = (y: number, m: number) =>
    y > currentYear || (y === currentYear && m > currentMonth);
  const isQuarterDisabled = (y: number, q: number) =>
    y > currentYear || (y === currentYear && q > currentQuarter);

  const buildPeriod = (): PeriodParams | null => {
    if (periodType === 'rolling') return computeRollingParams(rollingRange);
    if (periodType === 'month') {
      if (isMonthDisabled(year, month)) return null;
      return computeMonthParams(year, month);
    }
    if (isQuarterDisabled(year, quarter)) return null;
    return computeQuarterParams(year, quarter);
  };

  const handleGenerate = async () => {
    if (isDownloading) return;
    const period = buildPeriod();
    if (!period) {
      alert('El periodo seleccionado es futuro. Elige un periodo ya transcurrido.');
      return;
    }
    setIsDownloading(true);
    try {
      const qs = new URLSearchParams({
        from: period.from,
        to: period.to,
        label: period.label,
      });
      const res = await fetch(`/api/admin/dashboard/pdf?${qs.toString()}`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Error ${res.status}: ${text || 'sin detalle'}`);
      }
      const blob = await res.blob();

      // Filename viene del backend en Content-Disposition.
      const cd = res.headers.get('content-disposition') || '';
      const match = cd.match(/filename="?([^";]+)"?/);
      const filename = match ? match[1] : `finzen-reporte-${period.label}.pdf`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setOpen(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      alert(`No se pudo generar el PDF: ${msg}`);
    } finally {
      setIsDownloading(false);
    }
  };

  const segBtn = (active: boolean) =>
    `flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
      active ? 'bg-finzen-blue text-white' : 'text-finzen-gray hover:text-finzen-black'
    }`;

  const selectClass =
    'w-full px-3 py-2 text-sm border border-finzen-gray/20 rounded-lg bg-white text-finzen-gray focus:outline-none focus:ring-2 focus:ring-finzen-blue/20 focus:border-finzen-blue';

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={isDownloading}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-finzen-blue text-white hover:bg-finzen-blue/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
      >
        {isDownloading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Generando PDF...
          </>
        ) : (
          <>
            <Download size={16} />
            Descargar PDF
            <ChevronDown size={16} />
          </>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 z-50 w-80 bg-white rounded-xl border border-finzen-gray/20 shadow-lg p-4">
          <p className="text-xs font-semibold text-finzen-gray uppercase tracking-wide mb-2">
            Periodo del reporte
          </p>

          {/* Tipo de periodo */}
          <div className="flex items-center gap-1 bg-finzen-white rounded-lg border border-finzen-gray/20 p-1 mb-3">
            <button className={segBtn(periodType === 'rolling')} onClick={() => setPeriodType('rolling')}>
              Rolling
            </button>
            <button className={segBtn(periodType === 'month')} onClick={() => setPeriodType('month')}>
              Mes
            </button>
            <button className={segBtn(periodType === 'quarter')} onClick={() => setPeriodType('quarter')}>
              Trimestre
            </button>
          </div>

          {/* Rolling */}
          {periodType === 'rolling' && (
            <div className="flex items-center gap-1 bg-finzen-white rounded-lg border border-finzen-gray/20 p-1 mb-3">
              {ROLLING_RANGES.map((r) => (
                <button
                  key={r}
                  onClick={() => setRollingRange(r)}
                  className={`flex-1 px-2 py-1.5 rounded-md text-sm font-medium transition-all ${
                    rollingRange === r ? 'bg-finzen-blue text-white' : 'text-finzen-gray hover:text-finzen-black'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          )}

          {/* Mes */}
          {periodType === 'month' && (
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div>
                <label className="block text-xs text-finzen-gray mb-1">Mes</label>
                <select className={selectClass} value={month} onChange={(e) => setMonth(Number(e.target.value))}>
                  {MONTH_NAMES.map((name, idx) => (
                    <option key={idx} value={idx} disabled={isMonthDisabled(year, idx)}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-finzen-gray mb-1">Año</label>
                <select className={selectClass} value={year} onChange={(e) => setYear(Number(e.target.value))}>
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Trimestre */}
          {periodType === 'quarter' && (
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div>
                <label className="block text-xs text-finzen-gray mb-1">Trimestre</label>
                <select className={selectClass} value={quarter} onChange={(e) => setQuarter(Number(e.target.value))}>
                  {QUARTERS.map((q) => (
                    <option key={q} value={q} disabled={isQuarterDisabled(year, q)}>
                      Q{q} ({QUARTER_HINTS[q]})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-finzen-gray mb-1">Año</label>
                <select className={selectClass} value={year} onChange={(e) => setYear(Number(e.target.value))}>
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={isDownloading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-finzen-blue text-white hover:bg-finzen-blue/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isDownloading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Generando PDF...
              </>
            ) : (
              <>
                <Download size={16} />
                Generar PDF
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
