import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import notificationService, { NotificationPreferences } from '../services/notificationService';
import { useSubscriptionStore } from '../stores/subscriptionStore';
import UpgradeModal from '../components/subscriptions/UpgradeModal';
import CustomModal from '../components/modals/CustomModal';

import { logger } from '../utils/logger';
interface NotificationSettingsScreenProps {
  onClose?: () => void;
}

export default function NotificationSettingsScreen({ onClose }: NotificationSettingsScreenProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [isEnabled, setIsEnabled] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showProModal, setShowProModal] = useState(false);

  // Subscription check for budget alerts and PRO notifications
  const { hasBudgetAlerts, canUseProNotifications, openPlansModal } = useSubscriptionStore();
  const canUseBudgetAlerts = hasBudgetAlerts();
  const canUseProFeatures = canUseProNotifications();

  // Memoizado: Carga de datos (definido antes de useEffects que lo usan)
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Verificar estado de notificaciones
      const enabled = await notificationService.isEnabled();
      setIsEnabled(enabled);

      // Obtener token
      const currentToken = notificationService.getToken();
      setToken(currentToken);

      // Cargar preferencias
      const prefs = await notificationService.getPreferences();
      if (prefs) {
        setPreferences(prefs);
      } else {
        // Valores por defecto
        setPreferences({
          emailSyncEnabled: true,
          budgetAlertsEnabled: true,
          goalRemindersEnabled: true,
          weeklyReportEnabled: true,
          tipsEnabled: true,
          antExpenseAlertsEnabled: true,
          budgetAlertThreshold: 80,
          goalReminderFrequency: 7, // Semanal por defecto
          quietHoursStart: null,
          quietHoursEnd: null,
          antExpenseAmountThreshold: 500, // Umbral de monto por defecto
          antExpenseMinFrequency: 3,      // Frecuencia mínima por defecto
        });
      }
    } catch (error) {
      logger.error('Error cargando configuración de notificaciones:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggle = async (key: keyof NotificationPreferences, value: boolean | number) => {
    if (!preferences) return;

    const newPreferences = { ...preferences, [key]: value };
    setPreferences(newPreferences);

    setSaving(true);
    try {
      await notificationService.updatePreferences({ [key]: value });
    } catch (error) {
      logger.error('Error guardando preferencia:', error);
      // Revertir cambio
      setPreferences(preferences);
    } finally {
      setSaving(false);
    }
  };

  const handleThresholdChange = async (value: number) => {
    if (!preferences) return;

    const newPreferences = { ...preferences, budgetAlertThreshold: value };
    setPreferences(newPreferences);
  };

  const handleThresholdComplete = async (value: number) => {
    setSaving(true);
    try {
      await notificationService.updatePreferences({ budgetAlertThreshold: Math.round(value) });
    } catch (error) {
      logger.error('Error guardando umbral:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleQuietHoursChange = async (start: number | null, end: number | null) => {
    if (!preferences) return;

    const newPreferences = { ...preferences, quietHoursStart: start, quietHoursEnd: end };
    setPreferences(newPreferences);

    setSaving(true);
    try {
      await notificationService.updatePreferences({ quietHoursStart: start, quietHoursEnd: end });
    } catch (error) {
      logger.error('Error guardando horas silenciosas:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleGoalReminderFrequencyChange = async (frequency: number) => {
    if (!preferences) return;

    const newPreferences = { ...preferences, goalReminderFrequency: frequency };
    setPreferences(newPreferences);

    setSaving(true);
    try {
      await notificationService.updatePreferences({ goalReminderFrequency: frequency });
    } catch (error) {
      logger.error('Error guardando frecuencia de recordatorio:', error);
      setPreferences(preferences);
    } finally {
      setSaving(false);
    }
  };

  const getFrequencyLabel = (days: number): string => {
    switch (days) {
      case 0: return 'Nunca';
      case 3: return '3 días';
      case 7: return 'Semanal';
      case 14: return 'Quincenal';
      case 30: return 'Mensual';
      default: return `${days} días`;
    }
  };

  const handleTestNotification = async () => {
    setSaving(true);
    try {
      const success = await notificationService.sendTest();
      if (success) {
        Alert.alert('Prueba enviada', 'Deberías recibir una notificación de prueba en breve.');
      } else {
        Alert.alert('Error', 'No se pudo enviar la notificación de prueba.');
      }
    } catch (error) {
      Alert.alert('Error', 'Hubo un problema enviando la notificación de prueba.');
    } finally {
      setSaving(false);
    }
  };

  const formatHour = (hour: number | null): string => {
    if (hour === null) return 'No configurado';
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:00 ${period}`;
  };

  if (loading || !preferences) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          {onClose && (
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#64748b" />
            </TouchableOpacity>
          )}
          <Text style={styles.headerTitle}>Notificaciones</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Cargando configuración...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#374151" />
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>Notificaciones</Text>
        <View style={{ width: 40 }}>
          {saving && <ActivityIndicator size="small" color="#2563EB" />}
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Estado de notificaciones */}
        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <View style={[styles.statusIcon, { backgroundColor: isEnabled ? '#D1FAE5' : '#FEE2E2' }]}>
              <Ionicons
                name={isEnabled ? 'notifications' : 'notifications-off'}
                size={24}
                color={isEnabled ? '#059669' : '#DC2626'}
              />
            </View>
            <View style={styles.statusText}>
              <Text style={styles.statusTitle}>
                Notificaciones {isEnabled ? 'activadas' : 'desactivadas'}
              </Text>
              <Text style={styles.statusSubtitle}>
                {isEnabled
                  ? 'Recibirás alertas y recordatorios'
                  : 'Actívalas en la configuración del dispositivo'}
              </Text>
            </View>
          </View>
          {!isEnabled && (
            <TouchableOpacity
              style={styles.enableButton}
              onPress={() => notificationService.openSettings()}
            >
              <Text style={styles.enableButtonText}>Abrir configuración</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Sección de tipos de notificaciones */}
        <Text style={styles.sectionTitle}>Tipos de notificaciones</Text>

        <View style={styles.settingsCard}>
          {/* Sincronización de emails - PRO */}
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => !canUseProFeatures && setShowProModal(true)}
            activeOpacity={canUseProFeatures ? 1 : 0.7}
          >
            <View style={styles.settingInfo}>
              <Ionicons name="mail-outline" size={22} color={canUseProFeatures ? "#2563EB" : "#9CA3AF"} style={styles.settingIcon} />
              <View style={styles.settingTextContainer}>
                <View style={styles.settingTitleRow}>
                  <Text style={[styles.settingTitle, !canUseProFeatures && styles.settingTitleDisabled]}>
                    Sincronización de emails
                  </Text>
                  {!canUseProFeatures && (
                    <View style={styles.proBadge}>
                      <Text style={styles.proBadgeText}>PRO</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.settingDescription, !canUseProFeatures && styles.settingDescriptionDisabled]}>
                  {canUseProFeatures
                    ? 'Cuando se importan transacciones'
                    : 'Disponible con plan PRO'}
                </Text>
              </View>
            </View>
            {canUseProFeatures ? (
              <Switch
                value={preferences?.emailSyncEnabled ?? true}
                onValueChange={(value) => handleToggle('emailSyncEnabled', value)}
                trackColor={{ false: '#D1D5DB', true: '#2563EB' }}
                thumbColor={preferences?.emailSyncEnabled ? '#2563EB' : '#9CA3AF'}
              />
            ) : (
              <View style={styles.lockIcon}>
                <Ionicons name="lock-closed" size={18} color="#9CA3AF" />
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => !canUseBudgetAlerts && setShowUpgradeModal(true)}
            activeOpacity={canUseBudgetAlerts ? 1 : 0.7}
          >
            <View style={styles.settingInfo}>
              <Ionicons name="wallet-outline" size={22} color={canUseBudgetAlerts ? "#F59E0B" : "#9CA3AF"} style={styles.settingIcon} />
              <View style={styles.settingTextContainer}>
                <View style={styles.settingTitleRow}>
                  <Text style={[styles.settingTitle, !canUseBudgetAlerts && styles.settingTitleDisabled]}>
                    Alertas de presupuesto
                  </Text>
                  {!canUseBudgetAlerts && (
                    <View style={styles.plusBadge}>
                      <Text style={styles.plusBadgeText}>PLUS</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.settingDescription, !canUseBudgetAlerts && styles.settingDescriptionDisabled]}>
                  {canUseBudgetAlerts
                    ? 'Cuando estás por exceder un presupuesto'
                    : 'Disponible con plan PLUS o superior'}
                </Text>
              </View>
            </View>
            {canUseBudgetAlerts ? (
              <Switch
                value={preferences?.budgetAlertsEnabled ?? true}
                onValueChange={(value) => handleToggle('budgetAlertsEnabled', value)}
                trackColor={{ false: '#D1D5DB', true: '#2563EB' }}
                thumbColor={preferences?.budgetAlertsEnabled ? '#2563EB' : '#9CA3AF'}
              />
            ) : (
              <View style={styles.lockIcon}>
                <Ionicons name="lock-closed" size={18} color="#9CA3AF" />
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Ionicons name="flag-outline" size={22} color="#10B981" style={styles.settingIcon} />
              <View>
                <Text style={styles.settingTitle}>Recordatorios de metas</Text>
                <Text style={styles.settingDescription}>Para mantenerte motivado</Text>
              </View>
            </View>
            <Switch
              value={preferences?.goalRemindersEnabled ?? true}
              onValueChange={(value) => handleToggle('goalRemindersEnabled', value)}
              trackColor={{ false: '#D1D5DB', true: '#2563EB' }}
              thumbColor={preferences?.goalRemindersEnabled ? '#2563EB' : '#9CA3AF'}
            />
          </View>

          <View style={styles.divider} />

          {/* Reporte quincenal - PRO */}
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => !canUseProFeatures && setShowProModal(true)}
            activeOpacity={canUseProFeatures ? 1 : 0.7}
          >
            <View style={styles.settingInfo}>
              <Ionicons name="bar-chart-outline" size={22} color={canUseProFeatures ? "#1E40AF" : "#9CA3AF"} style={styles.settingIcon} />
              <View style={styles.settingTextContainer}>
                <View style={styles.settingTitleRow}>
                  <Text style={[styles.settingTitle, !canUseProFeatures && styles.settingTitleDisabled]}>
                    Reporte quincenal
                  </Text>
                  {!canUseProFeatures && (
                    <View style={styles.proBadge}>
                      <Text style={styles.proBadgeText}>PRO</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.settingDescription, !canUseProFeatures && styles.settingDescriptionDisabled]}>
                  {canUseProFeatures
                    ? 'Resumen de tus finanzas'
                    : 'Disponible con plan PRO'}
                </Text>
              </View>
            </View>
            {canUseProFeatures ? (
              <Switch
                value={preferences?.weeklyReportEnabled ?? true}
                onValueChange={(value) => handleToggle('weeklyReportEnabled', value)}
                trackColor={{ false: '#D1D5DB', true: '#2563EB' }}
                thumbColor={preferences?.weeklyReportEnabled ? '#2563EB' : '#9CA3AF'}
              />
            ) : (
              <View style={styles.lockIcon}>
                <Ionicons name="lock-closed" size={18} color="#9CA3AF" />
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Alertas de gastos hormiga - PRO */}
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => !canUseProFeatures && setShowProModal(true)}
            activeOpacity={canUseProFeatures ? 1 : 0.7}
          >
            <View style={styles.settingInfo}>
              <Ionicons name="bug-outline" size={22} color={canUseProFeatures ? "#F59E0B" : "#9CA3AF"} style={styles.settingIcon} />
              <View style={styles.settingTextContainer}>
                <View style={styles.settingTitleRow}>
                  <Text style={[styles.settingTitle, !canUseProFeatures && styles.settingTitleDisabled]}>
                    Alertas de gastos hormiga
                  </Text>
                  {!canUseProFeatures && (
                    <View style={styles.proBadge}>
                      <Text style={styles.proBadgeText}>PRO</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.settingDescription, !canUseProFeatures && styles.settingDescriptionDisabled]}>
                  {canUseProFeatures
                    ? 'Análisis automático quincenal'
                    : 'Disponible con plan PRO'}
                </Text>
              </View>
            </View>
            {canUseProFeatures ? (
              <Switch
                value={preferences?.antExpenseAlertsEnabled ?? true}
                onValueChange={(value) => handleToggle('antExpenseAlertsEnabled', value)}
                trackColor={{ false: '#D1D5DB', true: '#2563EB' }}
                thumbColor={preferences?.antExpenseAlertsEnabled ? '#2563EB' : '#9CA3AF'}
              />
            ) : (
              <View style={styles.lockIcon}>
                <Ionicons name="lock-closed" size={18} color="#9CA3AF" />
              </View>
            )}
          </TouchableOpacity>

          {/* Configuración de gastos hormiga - Solo visible si PRO y alertas habilitadas */}
          {canUseProFeatures && preferences?.antExpenseAlertsEnabled && (
            <View style={styles.antConfigContainer}>
              {/* Umbral de monto */}
              <View style={styles.antConfigItem}>
                <Text style={styles.antConfigLabel}>Monto máximo para gasto hormiga</Text>
                <Text style={styles.antConfigValue}>
                  RD$ {preferences?.antExpenseAmountThreshold ?? 500}
                </Text>
                <Slider
                  style={styles.slider}
                  minimumValue={50}
                  maximumValue={2000}
                  step={50}
                  value={preferences?.antExpenseAmountThreshold ?? 500}
                  onSlidingComplete={(value) => {
                    setPreferences(prev => prev ? { ...prev, antExpenseAmountThreshold: value } : null);
                    handleToggle('antExpenseAmountThreshold', value);
                  }}
                  minimumTrackTintColor="#2B4C7E"
                  maximumTrackTintColor="#D1D5DB"
                  thumbTintColor="#2B4C7E"
                />
                <View style={styles.sliderLabels}>
                  <Text style={styles.sliderLabel}>RD$50</Text>
                  <Text style={styles.sliderLabel}>RD$2,000</Text>
                </View>
              </View>

              {/* Frecuencia mínima */}
              <View style={styles.antConfigItem}>
                <Text style={styles.antConfigLabel}>Repeticiones mínimas para detectar</Text>
                <Text style={styles.antConfigValue}>
                  {preferences?.antExpenseMinFrequency ?? 3} veces
                </Text>
                <Slider
                  style={styles.slider}
                  minimumValue={2}
                  maximumValue={10}
                  step={1}
                  value={preferences?.antExpenseMinFrequency ?? 3}
                  onSlidingComplete={(value) => {
                    setPreferences(prev => prev ? { ...prev, antExpenseMinFrequency: value } : null);
                    handleToggle('antExpenseMinFrequency', value);
                  }}
                  minimumTrackTintColor="#2B4C7E"
                  maximumTrackTintColor="#D1D5DB"
                  thumbTintColor="#2B4C7E"
                />
                <View style={styles.sliderLabels}>
                  <Text style={styles.sliderLabel}>2 veces</Text>
                  <Text style={styles.sliderLabel}>10 veces</Text>
                </View>
              </View>

              <Text style={styles.antConfigDescription}>
                Se detectarán gastos menores a RD${preferences?.antExpenseAmountThreshold ?? 500} que se repitan al menos {preferences?.antExpenseMinFrequency ?? 3} veces en el período.
              </Text>
            </View>
          )}

          <View style={styles.divider} />

          {/* Tips financieros - PRO */}
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => !canUseProFeatures && setShowProModal(true)}
            activeOpacity={canUseProFeatures ? 1 : 0.7}
          >
            <View style={styles.settingInfo}>
              <Ionicons name="bulb-outline" size={22} color={canUseProFeatures ? "#EC4899" : "#9CA3AF"} style={styles.settingIcon} />
              <View style={styles.settingTextContainer}>
                <View style={styles.settingTitleRow}>
                  <Text style={[styles.settingTitle, !canUseProFeatures && styles.settingTitleDisabled]}>
                    Tips financieros
                  </Text>
                  {!canUseProFeatures && (
                    <View style={styles.proBadge}>
                      <Text style={styles.proBadgeText}>PRO</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.settingDescription, !canUseProFeatures && styles.settingDescriptionDisabled]}>
                  {canUseProFeatures
                    ? 'Consejos personalizados'
                    : 'Disponible con plan PRO'}
                </Text>
              </View>
            </View>
            {canUseProFeatures ? (
              <Switch
                value={preferences?.tipsEnabled ?? true}
                onValueChange={(value) => handleToggle('tipsEnabled', value)}
                trackColor={{ false: '#D1D5DB', true: '#2563EB' }}
                thumbColor={preferences?.tipsEnabled ? '#2563EB' : '#9CA3AF'}
              />
            ) : (
              <View style={styles.lockIcon}>
                <Ionicons name="lock-closed" size={18} color="#9CA3AF" />
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Umbral de alerta de presupuesto */}
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>Umbral de alerta</Text>
          {!canUseBudgetAlerts && (
            <View style={styles.plusBadgeSmall}>
              <Text style={styles.plusBadgeSmallText}>PLUS</Text>
            </View>
          )}
        </View>
        <TouchableOpacity
          style={[styles.settingsCard, !canUseBudgetAlerts && styles.settingsCardDisabled]}
          onPress={() => !canUseBudgetAlerts && setShowUpgradeModal(true)}
          activeOpacity={canUseBudgetAlerts ? 1 : 0.7}
          disabled={canUseBudgetAlerts}
        >
          <Text style={[styles.thresholdLabel, !canUseBudgetAlerts && styles.thresholdLabelDisabled]}>
            Alertar cuando el presupuesto llegue al{' '}
            <Text style={[styles.thresholdValue, !canUseBudgetAlerts && styles.thresholdValueDisabled]}>
              {Math.round(preferences?.budgetAlertThreshold ?? 80)}%
            </Text>
          </Text>
          <Slider
            style={styles.slider}
            minimumValue={50}
            maximumValue={95}
            step={5}
            value={preferences?.budgetAlertThreshold ?? 80}
            onValueChange={handleThresholdChange}
            onSlidingComplete={handleThresholdComplete}
            minimumTrackTintColor={canUseBudgetAlerts ? "#F59E0B" : "#D1D5DB"}
            maximumTrackTintColor="#E5E7EB"
            thumbTintColor={canUseBudgetAlerts ? "#F59E0B" : "#D1D5DB"}
            disabled={!canUseBudgetAlerts}
          />
          <View style={styles.sliderLabels}>
            <Text style={[styles.sliderLabel, !canUseBudgetAlerts && styles.sliderLabelDisabled]}>50%</Text>
            <Text style={[styles.sliderLabel, !canUseBudgetAlerts && styles.sliderLabelDisabled]}>95%</Text>
          </View>
          {!canUseBudgetAlerts && (
            <View style={styles.upgradeHint}>
              <Ionicons name="sparkles" size={14} color="#F59E0B" />
              <Text style={styles.upgradeHintText}>Mejora a PLUS para personalizar alertas</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Frecuencia de recordatorio de metas */}
        <Text style={styles.sectionTitle}>Recordatorio de metas</Text>
        <View style={styles.settingsCard}>
          <View style={styles.goalReminderHeader}>
            <Ionicons name="flag" size={20} color="#10B981" />
            <Text style={styles.goalReminderTitle}>Recordarme contribuir cada:</Text>
          </View>

          <View style={styles.frequencyButtonsContainer}>
            {[0, 3, 7, 14, 30].map((days) => (
              <TouchableOpacity
                key={days}
                style={[
                  styles.frequencyButton,
                  (preferences?.goalReminderFrequency ?? 7) === days && styles.frequencyButtonActive
                ]}
                onPress={() => handleGoalReminderFrequencyChange(days)}
              >
                <Text style={[
                  styles.frequencyButtonText,
                  (preferences?.goalReminderFrequency ?? 7) === days && styles.frequencyButtonTextActive
                ]}>
                  {getFrequencyLabel(days)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.goalReminderDescription}>
            {(preferences?.goalReminderFrequency ?? 7) === 0
              ? 'No recibirás recordatorios de contribución a tus metas'
              : `Te recordaremos si llevas ${preferences?.goalReminderFrequency ?? 7} días sin aportar a tus metas activas`}
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Upgrade Modal for Budget Alerts */}
      <UpgradeModal
        visible={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        limitType="budgetAlerts"
      />

      {/* Modal PRO - Para notificaciones PRO */}
      <CustomModal
        visible={showProModal}
        type="warning"
        title="Función PRO"
        message={`Las notificaciones inteligentes están disponibles exclusivamente para usuarios del plan PRO.\n\n¡Mejora tu plan para recibir alertas personalizadas!`}
        buttonText="Ver Planes"
        onClose={() => {
          setShowProModal(false);
          openPlansModal();
        }}
        showSecondaryButton={true}
        secondaryButtonText="Cerrar"
        onSecondaryPress={() => setShowProModal(false)}
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  statusCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  statusText: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  statusSubtitle: {
    fontSize: 13,
    color: '#64748b',
  },
  enableButton: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    alignItems: 'center',
  },
  enableButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2563EB',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  plusBadgeSmall: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  plusBadgeSmallText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#D97706',
    letterSpacing: 0.3,
  },
  settingsCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  settingsCardDisabled: {
    opacity: 0.7,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    marginRight: 14,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1e293b',
    marginBottom: 2,
  },
  settingTitleDisabled: {
    color: '#9CA3AF',
  },
  settingDescription: {
    fontSize: 12,
    color: '#64748b',
  },
  settingDescriptionDisabled: {
    color: '#D1D5DB',
  },
  settingTextContainer: {
    flex: 1,
  },
  settingTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  plusBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  plusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#D97706',
    letterSpacing: 0.5,
  },
  proBadge: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  proBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  lockIcon: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 18,
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginHorizontal: 12,
  },
  thresholdLabel: {
    fontSize: 14,
    color: '#475569',
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  thresholdLabelDisabled: {
    color: '#9CA3AF',
  },
  thresholdValue: {
    fontWeight: '700',
    color: '#F59E0B',
  },
  thresholdValueDisabled: {
    color: '#D1D5DB',
  },
  slider: {
    marginHorizontal: 8,
    marginTop: 8,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  sliderLabel: {
    fontSize: 12,
    color: '#94a3b8',
  },
  sliderLabelDisabled: {
    color: '#D1D5DB',
  },
  upgradeHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    marginTop: 4,
  },
  upgradeHintText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#D97706',
  },
  quietHoursInfo: {
    fontSize: 13,
    color: '#64748b',
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
  },
  quietHoursRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingBottom: 16,
    gap: 16,
  },
  quietHoursItem: {
    flex: 1,
  },
  quietHoursLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 6,
  },
  quietHoursButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  quietHoursButtonText: {
    fontSize: 14,
    color: '#475569',
  },
  goalReminderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
  },
  goalReminderTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#475569',
  },
  frequencyButtonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  frequencyButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  frequencyButtonActive: {
    backgroundColor: '#D1FAE5',
    borderColor: '#10B981',
  },
  frequencyButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
  },
  frequencyButtonTextActive: {
    color: '#059669',
  },
  goalReminderDescription: {
    fontSize: 12,
    color: '#94A3B8',
    paddingHorizontal: 12,
    paddingBottom: 12,
    fontStyle: 'italic',
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
    marginBottom: 16,
  },
  testButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2563EB',
  },
  debugCard: {
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  debugTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 4,
  },
  debugText: {
    fontSize: 10,
    color: '#B45309',
    fontFamily: 'monospace',
  },
  // Estilos para configuración de gastos hormiga
  antConfigContainer: {
    backgroundColor: '#F0F9FF',
    borderRadius: 8,
    marginHorizontal: 12,
    marginTop: 8,
    marginBottom: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  antConfigItem: {
    marginBottom: 16,
  },
  antConfigLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1E3A5F',
    marginBottom: 4,
  },
  antConfigValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2B4C7E',
    marginBottom: 8,
  },
  antConfigDescription: {
    fontSize: 12,
    color: '#64748B',
    fontStyle: 'italic',
    marginTop: 4,
    textAlign: 'center',
    lineHeight: 18,
  },
});
