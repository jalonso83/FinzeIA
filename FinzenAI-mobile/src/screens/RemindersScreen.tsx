import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { remindersAPI, PaymentReminder, UpcomingPayment, ReminderStats, PaymentType } from '../utils/api';
import { useCurrency } from '../hooks/useCurrency';
import CustomModal from '../components/modals/CustomModal';
import UpgradeModal from '../components/subscriptions/UpgradeModal';
import { useSubscriptionStore } from '../stores/subscriptionStore';

import { logger } from '../utils/logger';
// Mapeo de tipos de pago a iconos de Ionicons
const PAYMENT_TYPE_ICONS: Record<PaymentType, keyof typeof Ionicons.glyphMap> = {
  CREDIT_CARD: 'card',
  LOAN: 'cash',
  MORTGAGE: 'home',
  UTILITY: 'flash',
  INSURANCE: 'shield-checkmark',
  SUBSCRIPTION: 'repeat',
  OTHER: 'ellipsis-horizontal',
};

// Mapeo de colores por tipo
const PAYMENT_TYPE_COLORS: Record<PaymentType, string> = {
  CREDIT_CARD: '#2563EB',
  LOAN: '#F59E0B',
  MORTGAGE: '#10B981',
  UTILITY: '#3B82F6',
  INSURANCE: '#EC4899',
  SUBSCRIPTION: '#06B6D4',
  OTHER: '#6B7280',
};

export default function RemindersScreen() {
  const navigation = useNavigation<any>();
  const { formatCurrency } = useCurrency();
  const { canCreateReminder, getRemindersLimit, isFreePlan } = useSubscriptionStore();

  const [reminders, setReminders] = useState<PaymentReminder[]>([]);
  const [upcomingPayments, setUpcomingPayments] = useState<UpcomingPayment[]>([]);
  const [stats, setStats] = useState<ReminderStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [reminderToDelete, setReminderToDelete] = useState<PaymentReminder | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Calcular conteo de recordatorios activos
  const activeRemindersCount = reminders.filter(r => r.isActive).length;
  const remindersLimit = getRemindersLimit();
  const isLimitReached = !canCreateReminder(activeRemindersCount);

  const loadData = async () => {
    try {
      const [remindersRes, upcomingRes, statsRes] = await Promise.all([
        remindersAPI.getAll(false), // Obtener todos, activos e inactivos
        remindersAPI.getUpcoming(30),
        remindersAPI.getStats(),
      ]);

      setReminders(remindersRes.data.reminders || []);
      setUpcomingPayments(upcomingRes.data.upcoming || []);
      setStats(statsRes.data.stats || null);
    } catch (error) {
      logger.error('Error loading reminders:', error);
      setErrorMessage('No se pudieron cargar los recordatorios');
      setShowErrorModal(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Recargar datos cuando la pantalla obtiene foco
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Helper para verificar si hay modales visibles
  const isModalVisible = showErrorModal || showSuccessModal || showDeleteConfirmModal || showUpgradeModal;

  const handleAddReminder = () => {
    if (isModalVisible) return;

    // Verificar límite de plan
    if (isLimitReached) {
      setShowUpgradeModal(true);
      return;
    }

    navigation.navigate('AddReminder');
  };

  const handleEditReminder = (reminder: PaymentReminder) => {
    if (isModalVisible) return;
    navigation.navigate('AddReminder', { reminder });
  };

  const handleGoBack = () => {
    if (isModalVisible) return;
    navigation.goBack();
  };

  const handleDeleteReminder = (reminder: PaymentReminder) => {
    if (showErrorModal || showSuccessModal) return;
    setReminderToDelete(reminder);
    setShowDeleteConfirmModal(true);
  };

  const confirmDeleteReminder = async () => {
    if (!reminderToDelete) return;

    try {
      await remindersAPI.delete(reminderToDelete.id);
      setShowDeleteConfirmModal(false);
      setReminderToDelete(null);
      loadData();

      setTimeout(() => {
        setSuccessMessage('Recordatorio eliminado correctamente');
        setShowSuccessModal(true);
      }, 300);
    } catch (error) {
      logger.error('Error deleting reminder:', error);
      setShowDeleteConfirmModal(false);
      setReminderToDelete(null);

      setTimeout(() => {
        setErrorMessage('No se pudo eliminar el recordatorio');
        setShowErrorModal(true);
      }, 300);
    }
  };

  const handleToggleReminder = async (reminder: PaymentReminder) => {
    // Si está intentando activar, verificar límite
    if (!reminder.isActive && isLimitReached) {
      setShowUpgradeModal(true);
      return;
    }

    try {
      await remindersAPI.toggle(reminder.id, !reminder.isActive);
      // Actualizar localmente para respuesta inmediata
      setReminders(prev =>
        prev.map(r =>
          r.id === reminder.id ? { ...r, isActive: !r.isActive } : r
        )
      );
    } catch (error: any) {
      logger.error('Error toggling reminder:', error);
      // Si es error 403, mostrar modal de upgrade
      if (error.response?.status === 403) {
        setShowUpgradeModal(true);
      } else {
        setErrorMessage('No se pudo cambiar el estado del recordatorio');
        setShowErrorModal(true);
      }
    }
  };

  const getDaysUntilDueColor = (days: number): string => {
    if (days < 0) return '#DC2626'; // Vencido - rojo
    if (days === 0) return '#DC2626'; // Hoy - rojo
    if (days <= 3) return '#F59E0B'; // Pronto - amarillo
    if (days <= 7) return '#3B82F6'; // Esta semana - azul
    return '#10B981'; // Más de una semana - verde
  };

  const getDaysUntilDueText = (days: number): string => {
    if (days < 0) return `Vencido hace ${Math.abs(days)} día${Math.abs(days) !== 1 ? 's' : ''}`;
    if (days === 0) return 'Vence hoy';
    if (days === 1) return 'Vence mañana';
    return `Vence en ${days} días`;
  };

  const formatDueDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-DO', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Cargando recordatorios...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleGoBack}
        >
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Recordatorios de Pago</Text>
          {/* Indicador de límite para usuarios FREE */}
          {isFreePlan() && (
            <View style={styles.limitBadge}>
              <Text style={styles.limitBadgeText}>
                {activeRemindersCount}/{remindersLimit}
              </Text>
            </View>
          )}
        </View>
        <TouchableOpacity
          style={[styles.addButton, isLimitReached && styles.addButtonLimited]}
          onPress={handleAddReminder}
        >
          {isLimitReached ? (
            <Ionicons name="lock-closed" size={20} color="white" />
          ) : (
            <Ionicons name="add" size={24} color="white" />
          )}
        </TouchableOpacity>
      </View>

      {/* Banner de límite alcanzado para FREE */}
      {isFreePlan() && isLimitReached && (
        <TouchableOpacity
          style={styles.limitBanner}
          onPress={() => setShowUpgradeModal(true)}
        >
          <View style={styles.limitBannerContent}>
            <Ionicons name="information-circle" size={20} color="#D97706" />
            <Text style={styles.limitBannerText}>
              Límite de {remindersLimit} recordatorios alcanzado
            </Text>
          </View>
          <View style={styles.upgradeBadge}>
            <Text style={styles.upgradeBadgeText}>PLUS</Text>
            <Ionicons name="chevron-forward" size={14} color="#D97706" />
          </View>
        </TouchableOpacity>
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563EB']} />
        }
      >
        {/* Estadísticas */}
        {stats && reminders.length > 0 && (
          <View style={styles.statsContainer}>
            <Text style={styles.sectionTitle}>Resumen del Mes</Text>
            <View style={styles.statsCards}>
              <View style={styles.statCardSmall}>
                <Text style={styles.statValue}>{stats.activeReminders}</Text>
                <Text style={styles.statLabel}>Activos</Text>
              </View>
              <View style={styles.statCardLarge}>
                <Text style={[styles.statValue, { color: '#2563EB' }]} numberOfLines={1} adjustsFontSizeToFit>
                  {formatCurrency(stats.totalMonthlyAmount)}
                </Text>
                <Text style={styles.statLabel}>Total Mensual</Text>
              </View>
              <View style={styles.statCardSmall}>
                <Text style={[styles.statValue, { color: '#F59E0B' }]}>
                  {stats.upcomingThisWeek}
                </Text>
                <Text style={styles.statLabel}>Esta Semana</Text>
              </View>
            </View>
          </View>
        )}

        {/* Próximos Pagos */}
        {upcomingPayments.length > 0 && (
          <View style={styles.upcomingContainer}>
            <Text style={styles.sectionTitle}>Próximos Pagos</Text>
            {upcomingPayments.slice(0, 5).map((payment) => (
              <View key={payment.id} style={styles.upcomingCard}>
                <View
                  style={[
                    styles.upcomingIcon,
                    { backgroundColor: PAYMENT_TYPE_COLORS[payment.type] },
                  ]}
                >
                  <Ionicons
                    name={PAYMENT_TYPE_ICONS[payment.type]}
                    size={20}
                    color="white"
                  />
                </View>
                <View style={styles.upcomingInfo}>
                  <Text style={styles.upcomingName}>{payment.name}</Text>
                  <Text
                    style={[
                      styles.upcomingDays,
                      { color: getDaysUntilDueColor(payment.daysUntilDue) },
                    ]}
                  >
                    {getDaysUntilDueText(payment.daysUntilDue)}
                  </Text>
                </View>
                <View style={styles.upcomingRight}>
                  {payment.amount && (
                    <Text style={styles.upcomingAmount}>
                      {formatCurrency(payment.amount)}
                    </Text>
                  )}
                  <Text style={styles.upcomingDate}>
                    {formatDueDate(payment.dueDate)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Lista de Recordatorios */}
        <View style={styles.remindersContainer}>
          <Text style={styles.sectionTitle}>Mis Recordatorios</Text>

          {reminders.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="notifications-outline" size={64} color="#9CA3AF" />
              <Text style={styles.emptyTitle}>No hay recordatorios</Text>
              <Text style={styles.emptySubtitle}>
                Agrega recordatorios para no olvidar tus pagos importantes
              </Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={handleAddReminder}
              >
                <Ionicons name="add" size={20} color="white" />
                <Text style={styles.emptyButtonText}>Agregar Recordatorio</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.remindersList}>
              {reminders.map((reminder) => (
                <TouchableOpacity
                  key={reminder.id}
                  style={[
                    styles.reminderCard,
                    !reminder.isActive && styles.reminderCardInactive,
                  ]}
                  onPress={() => handleEditReminder(reminder)}
                  activeOpacity={0.7}
                >
                  {/* Header del recordatorio */}
                  <View style={styles.reminderHeader}>
                    <View
                      style={[
                        styles.reminderIcon,
                        { backgroundColor: PAYMENT_TYPE_COLORS[reminder.type] },
                        !reminder.isActive && styles.reminderIconInactive,
                      ]}
                    >
                      <Ionicons
                        name={PAYMENT_TYPE_ICONS[reminder.type]}
                        size={20}
                        color="white"
                      />
                    </View>
                    <View style={styles.reminderInfo}>
                      <Text
                        style={[
                          styles.reminderName,
                          !reminder.isActive && styles.reminderNameInactive,
                        ]}
                        numberOfLines={1}
                      >
                        {reminder.name}
                      </Text>
                      <Text style={styles.reminderType}>
                        {reminder.typeInfo?.label || reminder.type}
                      </Text>
                    </View>
                    <View style={styles.reminderActions}>
                      <Switch
                        value={reminder.isActive}
                        onValueChange={() => handleToggleReminder(reminder)}
                        trackColor={{ false: '#e2e8f0', true: '#93c5fd' }}
                        thumbColor={reminder.isActive ? '#2563EB' : '#94a3b8'}
                      />
                    </View>
                  </View>

                  {/* Detalles */}
                  <View style={styles.reminderDetails}>
                    <View style={styles.detailRow}>
                      <Ionicons name="calendar" size={14} color="#64748b" />
                      <Text style={styles.detailText}>
                        Pago: día {reminder.dueDay}
                      </Text>
                    </View>
                    {reminder.cutoffDay && (
                      <View style={styles.detailRow}>
                        <Ionicons name="cut" size={14} color="#64748b" />
                        <Text style={styles.detailText}>
                          Corte: día {reminder.cutoffDay}
                        </Text>
                      </View>
                    )}
                    {reminder.amount && (
                      <View style={styles.detailRow}>
                        <Ionicons name="cash" size={14} color="#64748b" />
                        <Text style={styles.detailText}>
                          Monto: {formatCurrency(reminder.amount)}
                        </Text>
                      </View>
                    )}
                    {reminder.type === 'CREDIT_CARD' && reminder.creditLimit && (
                      <View style={styles.detailRow}>
                        <Ionicons name="card" size={14} color="#64748b" />
                        <Text style={styles.detailText}>
                          Límite: {formatCurrency(reminder.creditLimit)}
                          {reminder.isDualCurrency && reminder.creditLimitUSD && (
                            <Text> + ${Number(reminder.creditLimitUSD).toLocaleString()} USD</Text>
                          )}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Días de recordatorio y botón eliminar */}
                  <View style={styles.reminderFooter}>
                    <View style={styles.reminderDaysWrapper}>
                      <Text style={styles.reminderDaysLabel}>Recordar:</Text>
                      <View style={styles.reminderDaysBadges}>
                        {reminder.reminderDays.map((day, index) => (
                          <View key={index} style={styles.reminderDayBadge}>
                            <Text style={styles.reminderDayText}>
                              {day === 0 ? 'Hoy' : `${day}d antes`}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                    {/* Botón eliminar */}
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => handleDeleteReminder(reminder)}
                    >
                      <Ionicons name="trash-outline" size={20} color="#DC2626" />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Modal de confirmación de eliminación */}
      <CustomModal
        visible={showDeleteConfirmModal}
        type="warning"
        title="Eliminar Recordatorio"
        message={`¿Estás seguro de que quieres eliminar "${reminderToDelete?.name}"?`}
        buttonText="Eliminar"
        showSecondaryButton={true}
        secondaryButtonText="Cancelar"
        onSecondaryPress={() => {
          setShowDeleteConfirmModal(false);
          setReminderToDelete(null);
        }}
        onClose={confirmDeleteReminder}
      />

      {/* Modal de éxito */}
      <CustomModal
        visible={showSuccessModal}
        type="success"
        title="¡Éxito!"
        message={successMessage}
        buttonText="Continuar"
        onClose={() => setShowSuccessModal(false)}
      />

      {/* Modal de error */}
      <CustomModal
        visible={showErrorModal}
        type="error"
        title="Error"
        message={errorMessage}
        buttonText="Entendido"
        onClose={() => setShowErrorModal(false)}
      />

      {/* Modal de upgrade */}
      <UpgradeModal
        visible={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        limitType="reminders"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backButton: {
    padding: 4,
  },
  titleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
    gap: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    textAlign: 'center',
  },
  limitBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  limitBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#D97706',
  },
  addButton: {
    backgroundColor: '#2563EB',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonLimited: {
    backgroundColor: '#9CA3AF',
  },
  limitBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFBEB',
    marginHorizontal: 20,
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  limitBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  limitBannerText: {
    fontSize: 13,
    color: '#92400E',
    fontWeight: '500',
  },
  upgradeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 2,
  },
  upgradeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D97706',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#64748b',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 12,
  },
  // Stats
  statsContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statsCards: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  statCardSmall: {
    flex: 0.85,
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
  },
  statCardLarge: {
    flex: 1.3,
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  statLabel: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 4,
    textAlign: 'center',
  },
  // Upcoming
  upcomingContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  upcomingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  upcomingIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  upcomingInfo: {
    flex: 1,
    marginLeft: 12,
  },
  upcomingName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  upcomingDays: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  upcomingRight: {
    alignItems: 'flex-end',
  },
  upcomingAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  upcomingDate: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  // Reminders List
  remindersContainer: {
    marginBottom: 20,
  },
  remindersList: {
    gap: 12,
  },
  reminderCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  reminderCardInactive: {
    opacity: 0.6,
  },
  reminderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  reminderIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reminderIconInactive: {
    backgroundColor: '#9CA3AF',
  },
  reminderInfo: {
    flex: 1,
    marginLeft: 12,
  },
  reminderName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  reminderNameInactive: {
    color: '#64748b',
  },
  reminderType: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  reminderActions: {
    marginLeft: 8,
  },
  reminderDetails: {
    gap: 6,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 13,
    color: '#64748b',
  },
  reminderFooter: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  reminderDaysWrapper: {
    flex: 1,
  },
  reminderDaysLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 6,
  },
  reminderDaysBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  reminderDayBadge: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  reminderDayText: {
    fontSize: 11,
    color: '#1d4ed8',
    fontWeight: '500',
  },
  deleteButton: {
    padding: 10,
    marginLeft: 12,
    backgroundColor: '#fef2f2',
    borderRadius: 10,
    alignSelf: 'center',
  },
  // Empty
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 20,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 20,
    gap: 8,
  },
  emptyButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});
