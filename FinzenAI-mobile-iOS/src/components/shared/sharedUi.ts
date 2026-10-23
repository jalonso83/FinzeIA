import { StyleSheet } from 'react-native';
import { formatCurrency } from '../../utils/currency';

/**
 * Piezas comunes de las pantallas de compartidos.
 *
 * En iOS ninguna de estas pantallas abre un <Modal> encima de otro: las
 * confirmaciones ("¿Seguro que quieres salir?") se pintan DENTRO de la misma
 * hoja, cambiando lo que muestra.
 */

/** Texto para el usuario a partir de un error de axios del backend de compartidos. */
export function mensajeDeError(error: any, porDefecto = 'Algo salió mal. Intenta de nuevo.'): string {
  const data = error?.response?.data;
  if (data?.message && typeof data.message === 'string') return data.message;
  if (!error?.response) return 'No hay conexión. Revisa tu internet e intenta de nuevo.';
  return porDefecto;
}

/** true si el backend dice que hace falta mejorar el plan. */
export function pideMejorarPlan(error: any): boolean {
  return error?.response?.data?.upgrade === true;
}

/**
 * Montos de un compartido: van en la moneda del DUEÑO, que puede no ser la de
 * quien mira. Sin moneda conocida se usa la del usuario (`deRespaldo`).
 */
export function montoEn(monto: number, moneda: string | undefined, deRespaldo: (n: number) => string): string {
  return moneda ? formatCurrency(monto, moneda) : deRespaldo(monto);
}

export function fechaCorta(fecha: string): string {
  const d = new Date(fecha);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('es-DO', { day: 'numeric', month: 'short', timeZone: 'UTC' });
}

export const sheet = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  closeButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 32,
  },
  content: {
    padding: 20,
    paddingBottom: 48,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
  },
  muted: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  primaryButton: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: 'white',
  },
  secondaryButtonText: {
    color: '#1e293b',
    fontSize: 16,
    fontWeight: '600',
  },
  dangerButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
  },
  dangerButtonText: {
    color: '#dc2626',
    fontSize: 16,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.6,
  },
  errorBox: {
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorText: {
    color: '#b91c1c',
    fontSize: 14,
    lineHeight: 20,
  },
  infoBox: {
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  infoText: {
    color: '#1e40af',
    fontSize: 14,
    lineHeight: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rowTitle: {
    fontSize: 15,
    color: '#1e293b',
    fontWeight: '500',
  },
  rowSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  rowAmount: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
});
