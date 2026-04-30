'use client';

interface FunnelStep {
  etapa: string;
  valor: number;
  porcentaje: string;
}

export default function FunnelChart({ data }: { data: FunnelStep[] }) {
  if (!data.length) return null;

  // maxValue debe ser el MAYOR valor del array (no asumir que el primero lo es).
  // Si el primer step viene en 0 (ej. PageView no capturado) pero hay valores
  // en steps siguientes, igual queremos renderizar barras proporcionales.
  const maxValue = Math.max(...data.map(s => s.valor));

  // Si TODOS los valores son 0 → no hay actividad en el período.
  if (maxValue === 0) {
    return (
      <div className="bg-white rounded-xl border border-finzen-gray/20 p-5">
        <h3 className="text-sm font-semibold text-finzen-black mb-3">Funnel de Conversión</h3>
        <div className="text-center text-sm text-finzen-gray py-8">
          Sin actividad en el período seleccionado.
        </div>
      </div>
    );
  }

  // Renderizamos cada barra con width proporcional al valor / maxValue.
  // Mínimo visual de 8% para que valores muy chicos (1-2 conversiones) sigan
  // siendo visibles en pantalla. Si valor es 0, sí dejamos width 0 para que
  // se vea la diferencia con steps que sí tienen algo.
  return (
    <div className="bg-white rounded-xl border border-finzen-gray/20 p-5">
      <h3 className="text-sm font-semibold text-finzen-black mb-5">Funnel de Conversión</h3>
      <div className="space-y-3">
        {data.map((step, index) => {
          const proportional = (step.valor / maxValue) * 100;
          const widthPercent = step.valor === 0 ? 0 : Math.max(proportional, 8);
          const isLast = index === data.length - 1;

          return (
            <div key={step.etapa} className="flex items-center gap-4">
              <div className="w-24 shrink-0 text-right">
                <span className="text-sm text-finzen-black font-medium">{step.etapa}</span>
              </div>
              <div className="flex-1 relative">
                <div className="h-8 bg-finzen-white rounded-md overflow-hidden">
                  <div
                    className="h-full rounded-md transition-all duration-500"
                    style={{
                      width: `${widthPercent}%`,
                      backgroundColor: isLast ? '#6cad7f' : '#204274',
                      opacity: 1 - (index * 0.1),
                    }}
                  />
                </div>
              </div>
              <div className="w-20 shrink-0 flex items-center gap-2">
                <span className="text-sm font-bold text-finzen-black">{step.valor}</span>
                <span className="text-xs text-finzen-gray">({step.porcentaje})</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
