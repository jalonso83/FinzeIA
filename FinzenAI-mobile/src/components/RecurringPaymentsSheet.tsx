import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Switch,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { recurringAPI, RecurringTransaction, RecurrenceFrequency } from '../utils/api';
import { useCurrency } from '../hooks/useCurrency';
import { logger } from '../utils/logger';

// ─────────────────────────────────────────────────────────────────────────
// "Pagos automáticos": todas las reglas de recurrencia del usuario en un solo
// lugar, con un switch por cada una.
//
// Se renderiza como View absoluto (no <Modal>) para poder montarse dentro de
// otro Modal sin romper iOS, que no soporta modales anidados.
// ─────────────────────────────────────────────────────────────────────────

const FREQUENCY_LABELS: Record<RecurrenceFrequency, string> = {
  WEEKLY: 'Semanal',
  BIWEEKLY: 'Quincenal',
  MONTHLY: 'Mensual',
};

interface RecurringPaymentsSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Se llama si el usuario cambió algo, para que la pantalla refresque. */
  onChanged?: () => void;
}

/** "15 de agosto" a partir de un ISO. Las fechas vienen a medianoche UTC. */
const formatNextRun = (iso: string): string => {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('es-DO', {
      day: 'numeric',
      month: 'long',
      timeZone: 'UTC',
    });
  } catch {
    return '';
  }
};

const RecurringPaymentsSheet: React.FC<RecurringPaymentsSheetProps> = ({
  visible,
  onClose,
  onChanged,
}) => {
  // La moneda sale del perfil del usuario, no se asume RD$: la app soporta 22
  // países y un usuario en México vería sus montos en una moneda que no es la suya.
  const { formatCurrency } = useCurrency();

  const [rules, setRules] = useState<RecurringTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // Ids con una operación en vuelo, para deshabilitar solo ese switch.
  const [updatingIds, setUpdatingIds] = useState<string[]>([]);

  const loadRules = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await recurringAPI.getAll();
      setRules(response.data.recurringTransactions || []);
    } catch (err: any) {
      logger.error('Error loading recurring transactions:', err);
      setError('No se pudieron cargar tus pagos automáticos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      loadRules();
    }
  }, [visible, loadRules]);

  const handleToggle = async (rule: RecurringTransaction, nextActive: boolean) => {
    // Optimista: el switch responde de una, y si falla se revierte.
    setError(''); // limpiar el error de un intento anterior
    setUpdatingIds(prev => [...prev, rule.id]);
    setRules(prev =>
      prev.map(r => (r.id === rule.id ? { ...r, isActive: nextActive } : r))
    );

    try {
      const response = await recurringAPI.toggle(rule.id, nextActive);
      // El backend recalcula nextRunDate al reactivar: usamos su versión.
      setRules(prev =>
        prev.map(r => (r.id === rule.id ? response.data.recurringTransaction : r))
      );
      onChanged?.();
    } catch (err: any) {
      logger.error('Error toggling recurring transaction:', err);
      setRules(prev =>
        prev.map(r => (r.id === rule.id ? { ...r, isActive: !nextActive } : r))
      );
      setError('No se pudo actualizar. Intenta de nuevo.');
    } finally {
      setUpdatingIds(prev => prev.filter(id => id !== rule.id));
    }
  };

  /**
   * Eliminar la regla. Borra SOLO la plantilla: en el schema la relación es
   * `onDelete: SetNull`, así que las transacciones ya generadas se conservan y
   * únicamente pierden el vínculo. Por eso la confirmación lo dice explícito —
   * si el usuario cree que va a perder su historial, no lo toca.
   */
  const handleDelete = (rule: RecurringTransaction) => {
    const nombre = rule.description || rule.category?.name || 'este movimiento';

    Alert.alert(
      'Eliminar pago automático',
      `Dejaremos de registrar "${nombre}" automáticamente. Las transacciones que ya se crearon se mantienen en tu historial.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            setError('');
            setUpdatingIds(prev => [...prev, rule.id]);
            // Optimista: la fila desaparece de una.
            setRules(prev => prev.filter(r => r.id !== rule.id));

            try {
              await recurringAPI.delete(rule.id);
              onChanged?.();
            } catch (err: any) {
              logger.error('Error deleting recurring transaction:', err);
              // Recargamos en vez de restaurar una copia previa: entre que se
              // abrió el diálogo y falló el borrado, el usuario pudo pausar
              // otra regla, y restaurar una foto vieja se comería ese cambio.
              await loadRules();
              setError('No se pudo eliminar. Intenta de nuevo.');
            } finally {
              setUpdatingIds(prev => prev.filter(id => id !== rule.id));
            }
          },
        },
      ],
    );
  };

  if (!visible) return null;

  const activeCount = rules.filter(r => r.isActive).length;

  return (
    <View style={styles.overlay}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#64748b" />
          </TouchableOpacity>
          <Text style={styles.title}>Pagos automáticos</Text>
          <View style={styles.headerSpacer} />
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#2563EB" />
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle-outline" size={18} color="#dc2626" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {rules.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="repeat" size={44} color="#cbd5e1" />
                <Text style={styles.emptyTitle}>Todavía no tienes pagos automáticos</Text>
                <Text style={styles.emptyText}>
                  Al crear un gasto o ingreso, activa "Repetir automáticamente" y
                  aparecerá aquí.
                </Text>
              </View>
            ) : (
              <>
                <Text style={styles.summary}>
                  {activeCount === 1
                    ? '1 repetición activa'
                    : `${activeCount} repeticiones activas`}
                  {rules.length > activeCount ? ` · ${rules.length - activeCount} en pausa` : ''}
                </Text>

                {rules.map(rule => {
                  const isIncome = rule.type === 'INCOME';
                  return (
                    <View
                      key={rule.id}
                      style={[styles.card, !rule.isActive && styles.cardInactive]}
                    >
                      <View style={styles.cardLeft}>
                        <View
                          style={[
                            styles.iconCircle,
                            { backgroundColor: isIncome ? '#dcfce7' : '#fee2e2' },
                          ]}
                        >
                          <Ionicons
                            name={isIncome ? 'arrow-down' : 'arrow-up'}
                            size={16}
                            color={isIncome ? '#16a34a' : '#dc2626'}
                          />
                        </View>

                        <View style={styles.cardInfo}>
                          <Text style={styles.cardTitle} numberOfLines={1}>
                            {rule.description || rule.category?.name || 'Movimiento'}
                          </Text>
                          <Text style={styles.cardMeta}>
                            {FREQUENCY_LABELS[rule.frequency]}
                            {rule.category?.name ? ` · ${rule.category.name}` : ''}
                          </Text>
                          <Text
                            style={[
                              styles.cardAmount,
                              { color: isIncome ? '#16a34a' : '#dc2626' },
                            ]}
                          >
                            {isIncome ? '+' : '-'}
                            {formatCurrency(rule.amount)}
                          </Text>
                          <Text style={styles.cardNext}>
                            {rule.isActive
                              ? `Próximo: ${formatNextRun(rule.nextRunDate)}`
                              : 'En pausa'}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.cardActions}>
                        <Switch
                          value={rule.isActive}
                          onValueChange={value => handleToggle(rule, value)}
                          disabled={updatingIds.includes(rule.id)}
                          trackColor={{ false: '#cbd5e1', true: '#93c5fd' }}
                          thumbColor={rule.isActive ? '#2563EB' : '#f1f5f9'}
                        />

                        <TouchableOpacity
                          onPress={() => handleDelete(rule)}
                          disabled={updatingIds.includes(rule.id)}
                          style={styles.deleteButton}
                          // Área táctil mayor que el icono: 20px es muy chico
                          // para el dedo y quedaría pegado al switch.
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                          accessibilityLabel={`Eliminar pago automático ${rule.description || rule.category?.name || ''}`}
                        >
                          <Ionicons
                            name="trash-outline"
                            size={20}
                            color={updatingIds.includes(rule.id) ? '#cbd5e1' : '#94a3b8'}
                          />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}

                <Text style={styles.footNote}>
                  Al pausar, dejamos de registrar el movimiento y puedes
                  reactivarlo cuando quieras. Al eliminar, se quita de esta lista
                  para siempre. En ambos casos, las transacciones que ya se
                  crearon se mantienen.
                </Text>
              </>
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#ffffff',
    zIndex: 1000,
  },
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  closeButton: {
    padding: 4,
    width: 32,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1e293b',
  },
  headerSpacer: {
    width: 32,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  summary: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    marginBottom: 10,
  },
  cardInactive: {
    backgroundColor: '#f8fafc',
    opacity: 0.75,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    paddingRight: 12,
  },
  // Switch y papelera apilados: en fila competían por el ancho con montos
  // largos (ej. RD$ 125,000.00) y apretaban el texto de la izquierda.
  cardActions: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    marginTop: 12,
    padding: 2,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
  },
  cardMeta: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  cardAmount: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 4,
  },
  cardNext: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#475569',
    marginTop: 14,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 19,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fef2f2',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fecaca',
    padding: 12,
    marginBottom: 12,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: '#dc2626',
  },
  footNote: {
    fontSize: 12,
    color: '#94a3b8',
    lineHeight: 18,
    marginTop: 8,
    textAlign: 'center',
  },
});

export default RecurringPaymentsSheet;
