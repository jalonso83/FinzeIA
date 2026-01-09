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

  // Subscription check for budget alerts
  const { hasBudgetAlerts } = useSubscriptionStore();

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
          budgetAlertThreshold: 80,
          quietHoursStart: null,
          quietHoursEnd: null,
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

  const handleToggle = async (key: keyof NotificationPreferences, value: boolean) => {
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

  if (loading) {
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
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Ionicons name="mail-outline" size={22} color="#2563EB" style={styles.settingIcon} />
              <View>
                <Text style={styles.settingTitle}>Sincronización de emails</Text>
                <Text style={styles.settingDescription}>Cuando se importan transacciones</Text>
              </View>
            </View>
            <Switch
              value={preferences?.emailSyncEnabled ?? true}
              onValueChange={(value) => handleToggle('emailSyncEnabled', value)}
              trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
              thumbColor={preferences?.emailSyncEnabled ? '#2563EB' : '#9CA3AF'}
            />
          </View>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => !hasBudgetAlerts && setShowUpgradeModal(true)}
            activeOpacity={hasBudgetAlerts ? 1 : 0.7}
          >
            <View style={styles.settingInfo}>
              <Ionicons name="wallet-outline" size={22} color={hasBudgetAlerts ? "#F59E0B" : "#9CA3AF"} style={styles.settingIcon} />
              <View style={styles.settingTextContainer}>
                <View style={styles.settingTitleRow}>
                  <Text style={[styles.settingTitle, !hasBudgetAlerts && styles.settingTitleDisabled]}>
                    Alertas de presupuesto
                  </Text>
                  {!hasBudgetAlerts && (
                    <View style={styles.plusBadge}>
                      <Text style={styles.plusBadgeText}>PLUS</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.settingDescription, !hasBudgetAlerts && styles.settingDescriptionDisabled]}>
                  {hasBudgetAlerts
                    ? 'Cuando estás por exceder un presupuesto'
                    : 'Disponible con plan PLUS o superior'}
                </Text>
              </View>
            </View>
            {hasBudgetAlerts ? (
              <Switch
                value={preferences?.budgetAlertsEnabled ?? true}
                onValueChange={(value) => handleToggle('budgetAlertsEnabled', value)}
                trackColor={{ false: '#D1D5DB', true: '#FDE68A' }}
                thumbColor={preferences?.budgetAlertsEnabled ? '#F59E0B' : '#9CA3AF'}
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
              trackColor={{ false: '#D1D5DB', true: '#A7F3D0' }}
              thumbColor={preferences?.goalRemindersEnabled ? '#10B981' : '#9CA3AF'}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Ionicons name="bar-chart-outline" size={22} color="#1E40AF" style={styles.settingIcon} />
              <View>
                <Text style={styles.settingTitle}>Reporte semanal</Text>
                <Text style={styles.settingDescription}>Resumen de tus finanzas</Text>
              </View>
            </View>
            <Switch
              value={preferences?.weeklyReportEnabled ?? true}
              onValueChange={(value) => handleToggle('weeklyReportEnabled', value)}
              trackColor={{ false: '#D1D5DB', true: '#DDD6FE' }}
              thumbColor={preferences?.weeklyReportEnabled ? '#1E40AF' : '#9CA3AF'}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Ionicons name="bulb-outline" size={22} color="#EC4899" style={styles.settingIcon} />
              <View>
                <Text style={styles.settingTitle}>Tips financieros</Text>
                <Text style={styles.settingDescription}>Consejos personalizados</Text>
              </View>
            </View>
            <Switch
              value={preferences?.tipsEnabled ?? true}
              onValueChange={(value) => handleToggle('tipsEnabled', value)}
              trackColor={{ false: '#D1D5DB', true: '#FBCFE8' }}
              thumbColor={preferences?.tipsEnabled ? '#EC4899' : '#9CA3AF'}
            />
          </View>
        </View>

        {/* Umbral de alerta de presupuesto */}
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>Umbral de alerta</Text>
          {!hasBudgetAlerts && (
            <View style={styles.plusBadgeSmall}>
              <Text style={styles.plusBadgeSmallText}>PLUS</Text>
            </View>
          )}
        </View>
        <TouchableOpacity
          style={[styles.settingsCard, !hasBudgetAlerts && styles.settingsCardDisabled]}
          onPress={() => !hasBudgetAlerts && setShowUpgradeModal(true)}
          activeOpacity={hasBudgetAlerts ? 1 : 0.7}
          disabled={hasBudgetAlerts}
        >
          <Text style={[styles.thresholdLabel, !hasBudgetAlerts && styles.thresholdLabelDisabled]}>
            Alertar cuando el presupuesto llegue al{' '}
            <Text style={[styles.thresholdValue, !hasBudgetAlerts && styles.thresholdValueDisabled]}>
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
            minimumTrackTintColor={hasBudgetAlerts ? "#F59E0B" : "#D1D5DB"}
            maximumTrackTintColor="#E5E7EB"
            thumbTintColor={hasBudgetAlerts ? "#F59E0B" : "#D1D5DB"}
            disabled={!hasBudgetAlerts}
          />
          <View style={styles.sliderLabels}>
            <Text style={[styles.sliderLabel, !hasBudgetAlerts && styles.sliderLabelDisabled]}>50%</Text>
            <Text style={[styles.sliderLabel, !hasBudgetAlerts && styles.sliderLabelDisabled]}>95%</Text>
          </View>
          {!hasBudgetAlerts && (
            <View style={styles.upgradeHint}>
              <Ionicons name="sparkles" size={14} color="#F59E0B" />
              <Text style={styles.upgradeHintText}>Mejora a PLUS para personalizar alertas</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Horas silenciosas */}
        <Text style={styles.sectionTitle}>Horas silenciosas</Text>
        <View style={styles.settingsCard}>
          <Text style={styles.quietHoursInfo}>
            No recibirás notificaciones durante este horario
          </Text>
          <View style={styles.quietHoursRow}>
            <View style={styles.quietHoursItem}>
              <Text style={styles.quietHoursLabel}>Inicio</Text>
              <TouchableOpacity
                style={styles.quietHoursButton}
                onPress={() => {
                  Alert.alert(
                    'Hora de inicio',
                    'Selecciona cuándo inicia el horario silencioso',
                    [
                      { text: 'No usar', onPress: () => handleQuietHoursChange(null, preferences?.quietHoursEnd ?? null) },
                      { text: '9 PM', onPress: () => handleQuietHoursChange(21, preferences?.quietHoursEnd ?? 8) },
                      { text: '10 PM', onPress: () => handleQuietHoursChange(22, preferences?.quietHoursEnd ?? 8) },
                      { text: '11 PM', onPress: () => handleQuietHoursChange(23, preferences?.quietHoursEnd ?? 8) },
                      { text: 'Cancelar', style: 'cancel' },
                    ]
                  );
                }}
              >
                <Text style={styles.quietHoursButtonText}>
                  {formatHour(preferences?.quietHoursStart ?? null)}
                </Text>
                <Ionicons name="chevron-down" size={16} color="#64748b" />
              </TouchableOpacity>
            </View>
            <View style={styles.quietHoursItem}>
              <Text style={styles.quietHoursLabel}>Fin</Text>
              <TouchableOpacity
                style={styles.quietHoursButton}
                onPress={() => {
                  Alert.alert(
                    'Hora de fin',
                    'Selecciona cuándo termina el horario silencioso',
                    [
                      { text: 'No usar', onPress: () => handleQuietHoursChange(preferences?.quietHoursStart ?? null, null) },
                      { text: '6 AM', onPress: () => handleQuietHoursChange(preferences?.quietHoursStart ?? 22, 6) },
                      { text: '7 AM', onPress: () => handleQuietHoursChange(preferences?.quietHoursStart ?? 22, 7) },
                      { text: '8 AM', onPress: () => handleQuietHoursChange(preferences?.quietHoursStart ?? 22, 8) },
                      { text: 'Cancelar', style: 'cancel' },
                    ]
                  );
                }}
              >
                <Text style={styles.quietHoursButtonText}>
                  {formatHour(preferences?.quietHoursEnd ?? null)}
                </Text>
                <Ionicons name="chevron-down" size={16} color="#64748b" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Botón de prueba */}
        {__DEV__ && (
          <>
            <Text style={styles.sectionTitle}>Desarrollo</Text>
            <TouchableOpacity
              style={styles.testButton}
              onPress={handleTestNotification}
              disabled={saving}
            >
              <Ionicons name="paper-plane-outline" size={20} color="#2563EB" />
              <Text style={styles.testButtonText}>Enviar notificación de prueba</Text>
            </TouchableOpacity>
          </>
        )}

        {/* Token info (solo desarrollo) */}
        {__DEV__ && token && (
          <View style={styles.debugCard}>
            <Text style={styles.debugTitle}>Token de dispositivo:</Text>
            <Text style={styles.debugText} numberOfLines={3}>{token}</Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Upgrade Modal for Budget Alerts */}
      <UpgradeModal
        visible={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        limitType="budgetAlerts"
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
});
