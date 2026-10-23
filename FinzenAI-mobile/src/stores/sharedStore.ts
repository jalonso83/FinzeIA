import { create } from 'zustand';

/**
 * Presupuestos y metas compartidos (2026-10).
 *
 * - `enabled`: si esta persona puede COMPARTIR (flag del servidor, con lista
 *   blanca). Lo que otros le comparten se ve siempre: aceptar depende del flag
 *   de quien invita, no del invitado.
 * - `invitacion`: la pantalla de aceptar vive en MainNavigator (es un <Modal> y
 *   en iOS no puede abrirse encima de otro). Cualquiera la pide con
 *   `abrirInvitacion(codigo)`; con '' se abre pidiendo el código.
 * - `version`: sube al aceptar/salir/confirmar, para que las pantallas recarguen
 *   lo compartido sin depender de los triggers de presupuestos y metas.
 */
interface SharedStore {
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;

  /** `automatica`: la abrió la app sola (al entrar), no un toque del usuario. */
  invitacion: { codigo: string; automatica: boolean } | null;
  abrirInvitacion: (codigo?: string, automatica?: boolean) => void;
  cerrarInvitacion: () => void;

  version: number;
  refrescarCompartidos: () => void;
}

export const useSharedStore = create<SharedStore>((set) => ({
  enabled: false,
  setEnabled: (enabled) => set({ enabled }),

  invitacion: null,
  abrirInvitacion: (codigo = '', automatica = false) => set({ invitacion: { codigo, automatica } }),
  cerrarInvitacion: () => set({ invitacion: null }),

  version: 0,
  refrescarCompartidos: () => set((state) => ({ version: state.version + 1 })),
}));
