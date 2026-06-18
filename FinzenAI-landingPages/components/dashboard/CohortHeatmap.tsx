'use client';

interface CohortCell {
  pct: number;
  raw: number;
}

interface CohortRow {
  semana: string;
  size: number;
  d1: CohortCell | null;
  d7: CohortCell | null;
  d14: CohortCell | null;
  d30: CohortCell | null;
}

function getCellColor(value: number | null): string {
  if (value === null) return 'bg-finzen-white text-finzen-gray';
  if (value >= 30) return 'bg-finzen-green/20 text-finzen-green';
  if (value >= 20) return 'bg-finzen-green/10 text-finzen-black';
  if (value >= 10) return 'bg-finzen-yellow/10 text-finzen-black';
  return 'bg-finzen-red/10 text-finzen-red';
}

export default function CohortHeatmap({ data }: { data: CohortRow[] }) {
  const periods = ['D1', 'D7', 'D14', 'D30'];

  if (!data.length) {
    return (
      <div className="bg-white rounded-xl border border-finzen-gray/20 p-5">
        <h3 className="text-sm font-semibold text-finzen-black mb-5">Cohortes de Retención</h3>
        <p className="text-sm text-finzen-gray">Sin datos de cohortes para este período</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-finzen-gray/20 p-5">
      <h3 className="text-sm font-semibold text-finzen-black mb-5">Cohortes de Retención</h3>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-left text-xs font-medium text-finzen-gray pb-3 pr-4">Semana</th>
              {periods.map((p) => (
                <th key={p} className="text-center text-xs font-medium text-finzen-gray pb-3 px-3">
                  {p}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row) => {
              const smallSample = row.size > 0 && row.size < 30;
              return (
              <tr key={row.semana}>
                <td className="text-sm font-medium text-finzen-black py-1.5 pr-4 whitespace-nowrap">
                  {row.semana}
                  {smallSample && (
                    <span
                      title="Muestra chica (n<30): interpretar los porcentajes con cautela"
                      className="ml-1.5 align-middle text-[10px] font-semibold text-finzen-yellow bg-finzen-yellow/15 rounded px-1 py-0.5"
                    >
                      n={row.size}
                    </span>
                  )}
                </td>
                {[row.d1, row.d7, row.d14, row.d30].map((cell, i) => (
                  <td key={i} className="py-1.5 px-1">
                    <div className={`text-center text-sm font-semibold rounded-md py-2 ${getCellColor(cell?.pct ?? null)}`}>
                      {cell ? `${cell.pct}% (${cell.raw}/${row.size})` : '—'}
                    </div>
                  </td>
                ))}
              </tr>
            );})}
          </tbody>
        </table>
      </div>
    </div>
  );
}
