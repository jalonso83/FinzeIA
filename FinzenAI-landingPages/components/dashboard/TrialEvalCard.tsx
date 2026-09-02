'use client';

import type { TrialEvalData, ContrasteEmailSync } from '@/lib/dashboard-api';

/**
 * Eval del Trial PRO de 21 días — firmada el 1 de septiembre de 2026.
 *
 * Los umbrales vienen del documento y se pintan al lado de cada número para
 * que la lectura no dependa de recordarlos. No se cambian sin documentar por
 * qué: es la disciplina que la eval fija en su primer párrafo.
 *
 * Nada aquí declara un veredicto. El veredicto es del 1 de noviembre y lo da
 * la primaria (suscripciones nuevas por mes), que vive en otra sección.
 */

interface Props {
  data: TrialEvalData | null;
}

/** Un número grande con su umbral debajo, en verde si lo cumple. */
function Metrica({
  etiqueta,
  valor,
  sufijo = '',
  umbral,
  cumple,
  nota,
  invertido = false,
}: {
  etiqueta: string;
  valor: number | string;
  sufijo?: string;
  umbral?: string;
  cumple?: boolean | null;
  nota?: string;
  /** true = pasarse del umbral es MALO (ej: cancelación temprana). */
  invertido?: boolean;
}) {
  const color =
    cumple == null
      ? 'text-slate-900'
      : cumple
        ? invertido ? 'text-rose-600' : 'text-emerald-600'
        : invertido ? 'text-emerald-600' : 'text-slate-900';

  return (
    <div className="bg-white rounded-xl border border-finzen-gray/20 p-5">
      <p className="text-sm text-finzen-gray font-medium tracking-wide mb-1">{etiqueta}</p>
      <p className={`text-3xl font-bold tabular-nums ${color}`}>
        {valor}
        {sufijo && <span className="text-xl font-semibold">{sufijo}</span>}
      </p>
      {umbral && <p className="text-xs text-finzen-gray mt-2">{umbral}</p>}
      {nota && <p className="text-xs text-slate-500 mt-1">{nota}</p>}
    </div>
  );
}

/** El contraste de §4B: activadores contra no activadores. */
function Contraste({ titulo, c, umbralPuntos }: { titulo: string; c: ContrasteEmailSync; umbralPuntos: number }) {
  // Sin cohorte en alguno de los dos lados no hay contraste que leer. Con
  // muestras chicas la diferencia puede ser enorme y no significar nada, así
  // que se avisa en vez de pintar un número que invita a concluir.
  const hayMuestra = c.conEmailSync.cohorte > 0 && c.sinEmailSync.cohorte > 0;
  const muestraChica = hayMuestra && (c.conEmailSync.cohorte < 20 || c.sinEmailSync.cohorte < 20);
  const cumple = hayMuestra && c.diferenciaPuntos >= umbralPuntos;

  return (
    <div className="bg-white rounded-xl border border-finzen-gray/20 p-5">
      <div className="flex items-baseline justify-between mb-1">
        <p className="text-sm font-semibold text-slate-900">{titulo}</p>
        <span className="text-xs text-finzen-gray">umbral ≥{umbralPuntos} pts</span>
      </div>
      {/* Definición ACUMULATIVA, distinta de la ventana que usa la curva de
          abajo. Se dice porque los dos números conviven en la misma pantalla y
          sin esto parecería que uno de los dos está mal. */}
      <p className="text-xs text-finzen-gray mb-3">
        Hizo algo el día {titulo.includes('D7') ? '7' : '30'} <strong>o después</strong>
      </p>

      {!hayMuestra ? (
        <p className="text-sm text-finzen-gray">Sin muestra en alguno de los dos grupos todavía.</p>
      ) : (
        <>
          <p className={`text-3xl font-bold tabular-nums ${cumple ? 'text-emerald-600' : 'text-slate-900'}`}>
            {c.diferenciaPuntos > 0 ? '+' : ''}
            {c.diferenciaPuntos}
            <span className="text-xl font-semibold"> pts</span>
          </p>
          <div className="mt-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-finzen-gray">Conectó el correo</span>
              <span className="tabular-nums font-medium">
                {c.conEmailSync.pct}% <span className="text-finzen-gray">({c.conEmailSync.cohorte})</span>
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-finzen-gray">No conectó</span>
              <span className="tabular-nums font-medium">
                {c.sinEmailSync.pct}% <span className="text-finzen-gray">({c.sinEmailSync.cohorte})</span>
              </span>
            </div>
          </div>
          {muestraChica && (
            <p className="text-xs text-amber-600 mt-3">
              Muestra pequeña: la diferencia todavía no es interpretable.
            </p>
          )}
        </>
      )}
    </div>
  );
}

/**
 * La curva del día 1 al 30, con el día 21 marcado.
 *
 * Es el guardrail que manda en esta eval: el día 22 el usuario pierde Email
 * Sync y vuelve a anotar a mano. Con solo D7 y D30 ese escalón queda escondido
 * dentro de una media, por eso se pinta día a día.
 */
function CurvaRetencion({ datos, periodo }: { datos: TrialEvalData['retencionPorDia']; periodo: { from: string; to: string } }) {
  const fecha = (s: string) =>
    new Date(s).toLocaleDateString('es', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  if (!datos.length) {
    return (
      <div className="bg-white rounded-xl border border-finzen-gray/20 p-5">
        <p className="text-sm font-semibold text-slate-900 mb-2">Retención día a día</p>
        <p className="text-sm text-finzen-gray">
          Todavía no hay cohortes con días cumplidos.
        </p>
      </div>
    );
  }

  const max = Math.max(...datos.map((d) => d.pct), 1);

  // Promedio de los dos tramos que compara el guardrail del acantilado.
  const tramo = (desde: number, hasta: number) => {
    const t = datos.filter((d) => d.dia >= desde && d.dia <= hasta);
    if (!t.length) return null;
    return Math.round((t.reduce((s, d) => s + d.pct, 0) / t.length) * 100) / 100;
  };
  const antes = tramo(14, 21);
  const despues = tramo(22, 30);
  const caida = antes != null && despues != null && antes > 0
    ? Math.round(((antes - despues) / antes) * 10000) / 100
    : null;

  return (
    <div className="bg-white rounded-xl border border-finzen-gray/20 p-5">
      <div className="mb-4">
        <div className="flex items-baseline justify-between">
          <p className="text-sm font-semibold text-slate-900">
            Retención por día desde el registro
          </p>
          <span className="text-xs text-finzen-gray">el trial vence el día 21</span>
        </div>
        {/* El eje NO es calendario. Alguien que se registró el 1 de agosto y
            alguien del 20 caen en la misma barra "día 7": lo que se mide es
            cuánto llevaba CADA UNO desde su propio registro. */}
        <p className="text-xs text-finzen-gray mt-1">
          Cohorte: quienes se registraron entre el <strong>{fecha(periodo.from)}</strong> y el{' '}
          <strong>{fecha(periodo.to)}</strong>. El eje horizontal son días desde el registro de
          cada usuario, no fechas.
        </p>
        {/* Ventana de un día, NO acumulativo. Es lo contrario del contraste de
            arriba, y hay que decirlo: si no, un D7 del 8% junto a una barra del
            2% en el día 7 parece un error de cálculo cuando son dos preguntas
            distintas. */}
        <p className="text-xs text-slate-500 mt-1">
          Cada barra es <strong>solo ese día</strong>, no acumulado — por eso los números son más
          bajos que el D7 y D30 de arriba, que cuentan «ese día o después».
        </p>
      </div>

      <div className="flex items-end gap-[3px] h-32" role="img" aria-label="Retención por día del 1 al 30 desde el registro">
        {datos.map((d) => (
          <div
            key={d.dia}
            className="flex-1 flex flex-col justify-end h-full"
            title={`Día ${d.dia} desde el registro — ${d.pct}% activos (${d.activos} de ${d.cohorte} que ya cumplieron ese día)`}
          >
            <div
              className={`w-full rounded-t ${d.dia === 21 ? 'bg-rose-500' : d.dia > 21 ? 'bg-slate-300' : 'bg-finzen-blue'}`}
              style={{ height: `${Math.max((d.pct / max) * 100, 2)}%` }}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between text-xs text-finzen-gray mt-1">
        <span>día 1</span><span>día 21</span><span>día 30</span>
      </div>

      {/* Cada barra tiene un denominador distinto y conviene decirlo: si no,
          parece que la caída de la derecha es peor de lo que es. */}
      <p className="text-xs text-slate-500 mt-3">
        Cada barra cuenta solo a quien ya lleva ese tiempo registrado, así que el denominador baja
        hacia la derecha: día 1 son {datos[0]?.cohorte ?? 0} personas y día {datos[datos.length - 1]?.dia ?? 30} son{' '}
        {datos[datos.length - 1]?.cohorte ?? 0}. Pasa el cursor por una barra para ver su dato exacto.
      </p>

      {caida != null && (
        <div className={`mt-4 rounded-lg p-3 text-sm ${caida > 40 ? 'bg-rose-50 text-rose-800' : 'bg-slate-50 text-slate-700'}`}>
          <strong>Acantilado del día 21:</strong> {caida}% de caída
          <span className="text-xs block mt-1 opacity-80">
            Días 14-21: {antes}% · Días 22-30: {despues}% · Alarma si supera 40%
          </span>
        </div>
      )}
    </div>
  );
}

export default function TrialEvalCard({ data }: Props) {
  if (!data) return null;

  const { emailSync, desenlaceTrial, contraste, retencionPorDia } = data;
  // La suma de los cuatro estados tiene que dar el total. Si no cuadra, algo
  // está mal clasificado y vale más verlo que esconderlo.
  const suma =
    desenlaceTrial.activos + desenlaceTrial.convirtio + desenlaceTrial.vencio + desenlaceTrial.cancelo;
  const cuadra = suma === desenlaceTrial.total;

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Eval del Trial PRO de 21 días</h2>
        <p className="text-sm text-finzen-gray mt-1">
          Umbrales firmados el 1 de septiembre de 2026, antes de existir datos. Señal direccional
          el 1 de octubre · Veredicto el 1 de noviembre.
        </p>
      </div>

      {/* A2 — el indicador adelantado */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Metrica
          etiqueta="Activación de Email Sync"
          valor={emailSync.pctActivacion}
          sufijo="%"
          umbral="Umbral ≥30% = el display funciona"
          cumple={emailSync.pctActivacion >= 30}
          nota={`${emailSync.activadores} de ${emailSync.nuevosDelPeriodo} usuarios nuevos`}
        />
        <Metrica
          etiqueta="Trials activos"
          valor={desenlaceTrial.activos}
          nota={`${desenlaceTrial.total} iniciados en el período`}
        />
        <Metrica
          etiqueta="Convirtieron"
          valor={desenlaceTrial.convirtio}
          nota={
            desenlaceTrial.convirtio + desenlaceTrial.vencio + desenlaceTrial.cancelo > 0
              ? `${desenlaceTrial.pctConversion}% de los trials resueltos`
              : 'Ningún trial ha vencido todavía'
          }
        />
        <Metrica
          etiqueta="Cancelación temprana"
          valor={desenlaceTrial.pctCancelacionTemprana}
          sufijo="%"
          umbral="Alarma si supera 20%"
          cumple={desenlaceTrial.pctCancelacionTemprana > 20}
          invertido
          nota={`${desenlaceTrial.cancelo} salieron antes del día 21`}
        />
      </div>

      {!cuadra && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-900">
          <strong>Los estados no cuadran:</strong> activos + convirtió + venció + canceló ={' '}
          {suma}, pero el total es {desenlaceTrial.total}. Hay trials mal clasificados.
        </div>
      )}

      {/* A5 — §4B, la prueba de la hipótesis central */}
      <div>
        <p className="text-sm font-semibold text-slate-900 mb-2">
          Contraste: ¿retiene mejor quien conectó el correo?
        </p>
        <p className="text-xs text-finzen-gray mb-3">
          Es la prueba de la hipótesis central del proyecto. No es aleatorizado —quien conecta se
          autoselecciona— así que sugiere, no prueba causalidad.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Contraste titulo="Retención D7" c={contraste.d7} umbralPuntos={8} />
          <Contraste titulo="Retención D30" c={contraste.d30} umbralPuntos={5} />
        </div>
      </div>

      {/* A4 — el guardrail que manda */}
      <CurvaRetencion datos={retencionPorDia} periodo={data.period} />

      <p className="text-xs text-finzen-gray">
        Cohorte limpia desde el 1 de septiembre: el 31 de agosto las variables se encendieron a
        media tarde y ese día quedaron mezclados los dos regímenes.
      </p>
    </section>
  );
}
