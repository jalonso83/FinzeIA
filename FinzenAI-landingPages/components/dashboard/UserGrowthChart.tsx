'use client';

import { useState } from 'react';
import ChartLine from './ChartLine';

type Gran = 'day' | 'week' | 'month';

// Lunes (UTC) de la semana de `d` — para agrupar por semana ISO.
function isoWeekStart(d: Date): Date {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = date.getUTCDay(); // 0=Dom .. 6=Sáb
  const diff = (day === 0 ? -6 : 1) - day; // llevar a lunes
  date.setUTCDate(date.getUTCDate() + diff);
  return date;
}

// Agrega los registros diarios ({day,count}) por la periodicidad elegida.
function aggregate(rows: { day: string; count: number }[], gran: Gran) {
  if (gran === 'day') {
    return rows.map((r) => {
      const d = new Date(r.day);
      return { date: d.toLocaleDateString('es', { day: '2-digit', month: 'short', timeZone: 'UTC' }), registros: r.count };
    });
  }
  const buckets = new Map<string, { label: string; registros: number; sort: number }>();
  for (const r of rows) {
    const d = new Date(r.day);
    let key: string, label: string, sort: number;
    if (gran === 'week') {
      const ws = isoWeekStart(d);
      key = ws.toISOString().slice(0, 10);
      label = ws.toLocaleDateString('es', { day: '2-digit', month: 'short', timeZone: 'UTC' });
      sort = ws.getTime();
    } else {
      key = `${d.getUTCFullYear()}-${d.getUTCMonth()}`;
      label = d.toLocaleDateString('es', { month: 'short', year: '2-digit', timeZone: 'UTC' });
      sort = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
    }
    const b = buckets.get(key) ?? { label, registros: 0, sort };
    b.registros += r.count;
    buckets.set(key, b);
  }
  return Array.from(buckets.values()).sort((a, b) => a.sort - b.sort).map((b) => ({ date: b.label, registros: b.registros }));
}

const OPTIONS: { k: Gran; label: string }[] = [
  { k: 'day', label: 'Diario' },
  { k: 'week', label: 'Semanal' },
  { k: 'month', label: 'Mensual' },
];

export default function UserGrowthChart({ title, registrationsByDay }: { title: string; registrationsByDay?: { day: string; count: number }[] }) {
  const [gran, setGran] = useState<Gran>('day');
  const data = aggregate(registrationsByDay ?? [], gran);

  return (
    <div>
      <div className="flex justify-end mb-2">
        <div className="inline-flex rounded-lg border border-finzen-gray/20 overflow-hidden">
          {OPTIONS.map((o) => (
            <button
              key={o.k}
              onClick={() => setGran(o.k)}
              className={`px-3 py-1 text-xs font-medium transition-colors ${gran === o.k ? 'bg-finzen-blue text-white' : 'bg-white text-finzen-gray hover:bg-finzen-white'}`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
      <ChartLine title={title} data={data} xKey="date" lines={[{ dataKey: 'registros', color: '#204274', name: 'Registros' }]} />
    </div>
  );
}
