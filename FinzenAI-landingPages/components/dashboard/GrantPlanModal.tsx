'use client';

import { useState } from 'react';
import { X, Gift, Loader2, AlertTriangle } from 'lucide-react';
import { grantPlan, revokeGrant, type PlanGrant, type UserListItem } from '@/lib/dashboard-api';

// Atajos: son los períodos que de verdad se usan. El campo libre queda debajo
// para cualquier otro caso.
const ATAJOS = [
  { dias: 30, label: '1 mes' },
  { dias: 60, label: '2 meses' },
  { dias: 90, label: '3 meses' },
];

interface Props {
  user: UserListItem;
  concesionActual?: PlanGrant;
  onClose: () => void;
  onDone: () => void;
}

export default function GrantPlanModal({ user, concesionActual, onClose, onDone }: Props) {
  const [plan, setPlan] = useState<'PREMIUM' | 'PRO'>('PRO');
  const [dias, setDias] = useState(90);
  const [motivo, setMotivo] = useState('');
  const [avisar, setAvisar] = useState(true);
  const [mensaje, setMensaje] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const vigente = concesionActual?.vigente ? concesionActual : undefined;

  // Se calcula al vuelo para que la fecha exacta esté a la vista antes de
  // confirmar: "90 días" es abstracto, "hasta el 10 de noviembre" no.
  const hasta = new Date(Date.now() + dias * 86400000).toLocaleDateString('es-ES', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  const otorgar = async () => {
    if (motivo.trim().length < 3) {
      setError('Escribe un motivo: dentro de unos meses será lo único que explique por qué esta persona tiene un plan sin pagarlo.');
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      await grantPlan(user.id, {
        plan,
        days: dias,
        reason: motivo.trim(),
        notify: avisar,
        message: mensaje.trim() || undefined,
      });
      onDone();
    } catch (e: any) {
      setError(e.message);
      setGuardando(false);
    }
  };

  const retirar = async () => {
    setGuardando(true);
    setError(null);
    try {
      await revokeGrant(user.id);
      onDone();
    } catch (e: any) {
      setError(e.message);
      setGuardando(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div className="flex items-start justify-between p-5 border-b border-finzen-gray/15">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-finzen-blue/10 text-finzen-blue flex items-center justify-center">
              <Gift size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-finzen-black">Período de gracia</h2>
              <p className="text-sm text-finzen-gray">
                {user.name} {user.lastName} · {user.email}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-finzen-gray hover:text-finzen-black">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Concesión vigente, si la hay */}
          {vigente && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm">
              <p className="text-amber-900 font-medium">
                Ya tiene {vigente.grantedPlan} hasta el{' '}
                {new Date(vigente.grantedUntil!).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
              {vigente.grantedReason && (
                <p className="text-amber-800 mt-0.5">Motivo: {vigente.grantedReason}</p>
              )}
              <p className="text-amber-800 mt-1.5 text-xs">
                Otorgar otra la <strong>reemplaza</strong>: los días se cuentan desde hoy, no se suman a los que le quedan.
              </p>
            </div>
          )}

          {/* Plan */}
          <div>
            <label className="block text-xs font-semibold text-finzen-gray uppercase tracking-wider mb-2">
              Plan a regalar
            </label>
            <div className="flex gap-2">
              {(['PREMIUM', 'PRO'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPlan(p)}
                  className={`flex-1 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                    plan === p
                      ? 'border-finzen-blue bg-finzen-blue/5 text-finzen-blue'
                      : 'border-finzen-gray/20 text-finzen-gray hover:bg-finzen-white'
                  }`}
                >
                  {p === 'PREMIUM' ? 'Plus' : 'Pro'}
                </button>
              ))}
            </div>
          </div>

          {/* Duración */}
          <div>
            <label className="block text-xs font-semibold text-finzen-gray uppercase tracking-wider mb-2">
              Duración
            </label>
            <div className="flex gap-2 mb-2">
              {ATAJOS.map((a) => (
                <button
                  key={a.dias}
                  onClick={() => setDias(a.dias)}
                  className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    dias === a.dias
                      ? 'border-finzen-blue bg-finzen-blue/5 text-finzen-blue'
                      : 'border-finzen-gray/20 text-finzen-gray hover:bg-finzen-white'
                  }`}
                >
                  {a.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={365}
                value={dias}
                onChange={(e) => setDias(Math.max(1, Math.min(365, Number(e.target.value) || 1)))}
                className="w-24 px-3 py-2 rounded-lg border border-finzen-gray/20 text-sm"
              />
              <span className="text-sm text-finzen-gray">
                días · vence el <strong className="text-finzen-black">{hasta}</strong>
              </span>
            </div>
          </div>

          {/* Motivo */}
          <div>
            <label className="block text-xs font-semibold text-finzen-gray uppercase tracking-wider mb-2">
              Motivo
            </label>
            <input
              type="text"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="win-back tras cancelación · disculpa por bug · beta tester"
              className="w-full px-3 py-2 rounded-lg border border-finzen-gray/20 text-sm"
            />
          </div>

          {/* Aviso al usuario */}
          <div className="rounded-lg border border-finzen-gray/20 p-3">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={avisar}
                onChange={(e) => setAvisar(e.target.checked)}
                className="mt-0.5"
              />
              <span className="text-sm text-finzen-black">
                Avisarle con una notificación
                <span className="block text-xs text-finzen-gray mt-0.5">
                  Un regalo del que no se entera no cambia nada. Apágalo solo si vas a
                  escribirle tú — dos mensajes diciendo lo mismo abaratan el gesto.
                </span>
              </span>
            </label>

            {avisar && (
              <div className="mt-3 pl-6">
                <input
                  type="text"
                  value={mensaje}
                  onChange={(e) => setMensaje(e.target.value)}
                  placeholder={`Tienes FinZen ${plan === 'PREMIUM' ? 'Plus' : 'Pro'} activo hasta el ${hasta}, sin costo y sin tarjeta.`}
                  className="w-full px-3 py-2 rounded-lg border border-finzen-gray/20 text-sm"
                />
                <p className="text-xs text-finzen-gray mt-1">
                  Opcional. Vacío usa ese texto. Se envía aunque tenga el marketing
                  silenciado y aunque sea de madrugada: es un aviso de su cuenta, y si se
                  descarta se pierde para siempre.
                </p>
              </div>
            )}
          </div>

          {/* Aviso del correo, que es la parte que se olvida */}
          {plan === 'PRO' && (
            <div className="flex gap-2 rounded-lg bg-finzen-white border border-finzen-gray/20 p-3">
              <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-finzen-gray leading-relaxed">
                Regalar Pro le devuelve el <strong>permiso</strong> de sincronizar el correo, pero no la conexión:
                al bajar de Pro se borran y el OAuth lo tiene que rehacer la persona desde la app.
                Si se lo prometes por correo, dile ese paso.
              </p>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>
          )}
        </div>

        {/* Acciones */}
        <div className="flex items-center justify-between gap-3 p-5 border-t border-finzen-gray/15">
          {vigente ? (
            <button
              onClick={retirar}
              disabled={guardando}
              className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
            >
              Retirar concesión
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={guardando}
              className="px-4 py-2 rounded-lg border border-finzen-gray/20 text-sm font-medium text-finzen-gray hover:bg-finzen-white disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={otorgar}
              disabled={guardando}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-finzen-blue text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
            >
              {guardando && <Loader2 size={14} className="animate-spin" />}
              {vigente ? 'Reemplazar' : 'Otorgar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
