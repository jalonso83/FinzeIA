import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import Slider from '@react-native-community/slider';
import { LinearGradient } from 'expo-linear-gradient';
import { antExpenseAPI } from '../utils/api';
import { useCurrency } from '../hooks/useCurrency';
import {
  AntExpenseAnalysisResponse,
  AntExpenseConfigResponse,
  AntExpenseConfig,
  CategoryStats,
  DEFAULT_ANT_EXPENSE_CONFIG,
} from '../types/antExpense';
import UpgradeModal from '../components/subscriptions/UpgradeModal';
import notificationService from '../services/notificationService';

import { logger } from '../utils/logger';
export default function AntExpenseDetectiveScreen() {
  const navigation = useNavigation();
  const { formatCurrency } = useCurrency();
  const [loading, setLoading] = useState(false);
  const [configLoading, setConfigLoading] = useState(true);
  const [analysis, setAnalysis] = useState<AntExpenseAnalysisResponse | null>(null);
  const [configData, setConfigData] = useState<AntExpenseConfigResponse | null>(null);
  const [animatedValue] = useState(new Animated.Value(0));

  // Configuración del usuario
  const [config, setConfig] = useState<AntExpenseConfig>(DEFAULT_ANT_EXPENSE_CONFIG);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [tempConfig, setTempConfig] = useState<AntExpenseConfig>(DEFAULT_ANT_EXPENSE_CONFIG);

  // Estados temporales para sliders (evita vibraciones)
  const [tempThreshold, setTempThreshold] = useState(DEFAULT_ANT_EXPENSE_CONFIG.antThreshold);
  const [tempFrequency, setTempFrequency] = useState(DEFAULT_ANT_EXPENSE_CONFIG.minFrequency);
  const [tempMonths, setTempMonths] = useState(DEFAULT_ANT_EXPENSE_CONFIG.monthsToAnalyze);

  // Upgrade modal for premium features
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Memoizado: Carga inicial de datos (definido antes de useEffects que lo usan)
  const loadInitialData = useCallback(async () => {
    try {
      setConfigLoading(true);

      // Cargar preferencias del usuario desde notificaciones (configuración centralizada)
      const userPreferences = await notificationService.getPreferences();

      const configResponse = await antExpenseAPI.getConfig();

      if (configResponse.data.success) {
        setConfigData(configResponse.data);

        // Usar la configuración del usuario si existe, sino usar las recomendaciones del backend
        const userConfig: AntExpenseConfig = {
          antThreshold: userPreferences?.antExpenseAmountThreshold ??
            configResponse.data.recommendations.antThreshold.value,
          minFrequency: userPreferences?.antExpenseMinFrequency ??
            configResponse.data.recommendations.minFrequency.value,
          monthsToAnalyze: configResponse.data.recommendations.monthsToAnalyze.value,
        };

        setConfig(userConfig);
        setTempConfig(userConfig);
        setTempThreshold(userConfig.antThreshold);
        setTempFrequency(userConfig.minFrequency);
        setTempMonths(userConfig.monthsToAnalyze);
      }
    } catch (error) {
      logger.error('Error loading config:', error);
    } finally {
      setConfigLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Debounce para los sliders
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setTempConfig({
        antThreshold: tempThreshold,
        minFrequency: tempFrequency,
        monthsToAnalyze: tempMonths,
      });
    }, 150);
    return () => clearTimeout(timeoutId);
  }, [tempThreshold, tempFrequency, tempMonths]);

  const loadAntExpenseAnalysis = async (customConfig?: AntExpenseConfig) => {
    try {
      setLoading(true);

      const configToUse = customConfig || config;
      const response = await antExpenseAPI.analyze({
        antThreshold: configToUse.antThreshold,
        minFrequency: configToUse.minFrequency,
        monthsToAnalyze: configToUse.monthsToAnalyze,
        useAI: true,
      });

      logger.log('[AntExpense] Respuesta del backend:', JSON.stringify(response.data, null, 2));

      setAnalysis(response.data);

      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start();

    } catch (error: any) {
      logger.error('Error loading ant expense analysis:', error);
      Alert.alert(
        'Error',
        error.response?.data?.error || 'No se pudo cargar el análisis de gastos hormiga'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleApplyConfig = () => {
    setConfig(tempConfig);
    setShowConfigModal(false);
    loadAntExpenseAnalysis(tempConfig);
  };

  const resetAnalysis = () => {
    setAnalysis(null);
    animatedValue.setValue(0);
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return '📈';
      case 'down': return '📉';
      default: return '➡️';
    }
  };

  const getSeverityColor = (level: number) => {
    if (level <= 2) return '#059669';
    if (level <= 3) return '#d97706';
    return '#dc2626';
  };

  const getSeverityEmoji = (level: number) => {
    if (level <= 1) return '🌟';
    if (level <= 2) return '👍';
    if (level <= 3) return '⚠️';
    if (level <= 4) return '🚨';
    return '🔥';
  };

  const renderLoadingState = () => (
    <View style={styles.loadingContainer}>
      <Image
        source={require('../assets/isotipo.png')}
        style={styles.zenioIcon}
        resizeMode="contain"
      />
      <Text style={styles.loadingText}>Zenio está analizando tus gastos...</Text>
      <Text style={styles.loadingSubtext}>
        Revisando últimos {config.monthsToAnalyze} meses 🕵️
      </Text>
      <ActivityIndicator size="large" color="#2563EB" style={{ marginTop: 20 }} />
    </View>
  );

  const renderCannotAnalyze = () => (
    <View style={styles.cannotAnalyzeContainer}>
      <Text style={styles.cannotAnalyzeIcon}>📊</Text>
      <Text style={styles.cannotAnalyzeTitle}>No hay suficientes datos</Text>
      <Text style={styles.cannotAnalyzeMessage}>
        {analysis?.cannotAnalyzeReason || 'Necesitas más transacciones para detectar patrones de gastos hormiga.'}
      </Text>

      <View style={styles.requirementsCard}>
        <Text style={styles.requirementsTitle}>Para analizar necesitas:</Text>
        <View style={styles.requirementItem}>
          <Ionicons name="receipt-outline" size={22} color="#2563EB" />
          <Text style={styles.requirementText}>Mínimo 5 gastos registrados</Text>
        </View>
        <View style={styles.requirementItem}>
          <Ionicons name="calendar-outline" size={22} color="#2563EB" />
          <Text style={styles.requirementText}>En los últimos {config.monthsToAnalyze} meses</Text>
        </View>
        <View style={styles.requirementItem}>
          <Ionicons name="cash-outline" size={22} color="#2563EB" />
          <Text style={styles.requirementText}>Montos ≤ {formatCurrency(config.antThreshold)}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.backButtonLarge}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.backButtonLargeText}>Volver</Text>
      </TouchableOpacity>
    </View>
  );

  const renderConfigModal = () => (
    <Modal
      visible={showConfigModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowConfigModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>⚙️ Configurar Análisis</Text>
            <TouchableOpacity onPress={() => setShowConfigModal(false)}>
              <Ionicons name="close" size={24} color="#64748b" />
            </TouchableOpacity>
          </View>

          <View style={styles.configSection}>
            <Text style={styles.configLabel}>
              💵 Monto máximo a considerar "hormiga"
            </Text>
            <View style={styles.sliderContainer}>
              <Slider
                style={styles.slider}
                minimumValue={configData?.configOptions.antThreshold.min || 100}
                maximumValue={configData?.configOptions.antThreshold.max || 2000}
                step={50}
                value={tempThreshold}
                onValueChange={setTempThreshold}
                minimumTrackTintColor="#2563EB"
                maximumTrackTintColor="#e2e8f0"
              />
              <Text style={styles.sliderValue}>
                {formatCurrency(tempConfig.antThreshold)}
              </Text>
            </View>
            <Text style={styles.configHint}>
              Gastos menores a este monto serán considerados "hormiga"
            </Text>
          </View>

          <View style={styles.configSection}>
            <Text style={styles.configLabel}>
              🔄 Frecuencia mínima de repetición
            </Text>
            <View style={styles.sliderContainer}>
              <Slider
                style={styles.slider}
                minimumValue={configData?.configOptions.minFrequency.min || 2}
                maximumValue={configData?.configOptions.minFrequency.max || 10}
                step={1}
                value={tempFrequency}
                onValueChange={setTempFrequency}
                minimumTrackTintColor="#2563EB"
                maximumTrackTintColor="#e2e8f0"
              />
              <Text style={styles.sliderValue}>
                {tempConfig.minFrequency} veces
              </Text>
            </View>
            <Text style={styles.configHint}>
              Solo patrones que se repitan al menos esta cantidad
            </Text>
          </View>

          <View style={styles.configSection}>
            <Text style={styles.configLabel}>
              📅 Período de análisis
            </Text>
            <View style={styles.sliderContainer}>
              <Slider
                style={styles.slider}
                minimumValue={configData?.configOptions.monthsToAnalyze.min || 1}
                maximumValue={Math.min(
                  configData?.configOptions.monthsToAnalyze.max || 12,
                  configData?.userHistory.monthsWithData || 3
                )}
                step={1}
                value={tempMonths}
                onValueChange={setTempMonths}
                minimumTrackTintColor="#2563EB"
                maximumTrackTintColor="#e2e8f0"
              />
              <Text style={styles.sliderValue}>
                {tempConfig.monthsToAnalyze} {tempConfig.monthsToAnalyze === 1 ? 'mes' : 'meses'}
              </Text>
            </View>
            {configData?.userHistory.monthsWithData && (
              <Text style={styles.configHint}>
                Tienes {configData.userHistory.monthsWithData} meses de historial disponible
              </Text>
            )}
          </View>

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={styles.modalButtonSecondary}
              onPress={() => {
                const defaults = DEFAULT_ANT_EXPENSE_CONFIG;
                setTempThreshold(defaults.antThreshold);
                setTempFrequency(defaults.minFrequency);
                setTempMonths(defaults.monthsToAnalyze);
              }}
            >
              <Text style={styles.modalButtonSecondaryText}>Restablecer</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalButtonPrimary}
              onPress={handleApplyConfig}
            >
              <LinearGradient
                colors={['#2563EB', '#1d4ed8']}
                style={styles.modalButtonGradient}
              >
                <Text style={styles.modalButtonPrimaryText}>Aplicar</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderForm = () => (
    <View style={styles.form}>
      <Text style={styles.welcomeText}>
        🕵️ ¡Descubre tus gastos hormiga!
      </Text>
      <Text style={styles.welcomeSubtext}>
        Esos pequeños gastos que pasan desapercibidos pero que suman mucho al final del mes
      </Text>

      <View style={styles.inputSection}>
        <Text style={styles.inputLabel}>📊 Configuración del análisis</Text>

        <View style={styles.configPreview}>
          <View style={styles.configPreviewItem}>
            <Text style={styles.configPreviewLabel}>Monto máximo</Text>
            <Text style={styles.configPreviewValue}>{formatCurrency(config.antThreshold)}</Text>
          </View>
          <View style={styles.configPreviewItem}>
            <Text style={styles.configPreviewLabel}>Frecuencia mín.</Text>
            <Text style={styles.configPreviewValue}>{config.minFrequency} veces</Text>
          </View>
          <View style={styles.configPreviewItem}>
            <Text style={styles.configPreviewLabel}>Período</Text>
            <Text style={styles.configPreviewValue}>{config.monthsToAnalyze} meses</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.configEditButton}
          onPress={() => {
            setTempThreshold(config.antThreshold);
            setTempFrequency(config.minFrequency);
            setTempMonths(config.monthsToAnalyze);
            setShowConfigModal(true);
          }}
        >
          <Ionicons name="settings-outline" size={18} color="#2563EB" />
          <Text style={styles.configEditButtonText}>Ajustar parámetros</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoCardTitle}>💡 ¿Qué son los gastos hormiga?</Text>
        <Text style={styles.infoCardText}>
          Son gastos pequeños y frecuentes que pasan desapercibidos: el café diario, snacks,
          suscripciones que no usas... Juntos pueden representar una fuga importante de dinero.
        </Text>
      </View>

      <TouchableOpacity
        style={styles.analyzeButton}
        onPress={() => loadAntExpenseAnalysis()}
        disabled={loading || configLoading}
      >
        <LinearGradient
          colors={['#2563EB', '#1d4ed8']}
          style={styles.analyzeButtonGradient}
        >
          {loading ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Text style={styles.analyzeButtonText}>ANALIZAR MIS GASTOS</Text>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  const renderAnalysis = () => {
    if (!analysis || !analysis.canAnalyze || !analysis.calculations || !analysis.insights) {
      return renderCannotAnalyze();
    }

    const { calculations, insights, planInfo } = analysis;
    const isLimited = planInfo?.isLimited === true;

    return (
      <Animated.View style={[styles.results, { opacity: animatedValue }]}>
        <Text style={styles.resultTitle}>
          {getSeverityEmoji(insights.severityLevel)} Detective Zenio Reporta
        </Text>

        {analysis.warnings && analysis.warnings.length > 0 && (
          <View style={styles.warningsContainer}>
            {analysis.warnings.map((warning, index) => (
              <View key={index} style={[
                styles.warningItem,
                warning.type === 'error' && styles.warningError,
                warning.type === 'info' && styles.warningInfo,
              ]}>
                <Text style={styles.warningText}>
                  {warning.type === 'error' ? '⚠️' : 'ℹ️'} {warning.message}
                </Text>
              </View>
            ))}
          </View>
        )}

        <View style={[styles.impactCard, { borderColor: getSeverityColor(insights.severityLevel) }]}>
          <Text style={styles.impactMessage}>{insights.impactMessage}</Text>
        </View>

        <View style={styles.mainResults}>
          <View style={styles.totalCard}>
            <Text style={styles.totalLabel}>🐜 Tus Gastos Hormiga</Text>
            <Text style={styles.totalAmount}>
              {formatCurrency(calculations.totalAntExpenses)}
            </Text>
            <Text style={styles.totalPeriod}>
              Últimos {calculations.metadata.actualMonthsAnalyzed} meses ({calculations.percentageOfTotal.toFixed(1)}% del total)
            </Text>
            {calculations.savingsOpportunityPerMonth > 0 && (
              <View style={styles.opportunityBadge}>
                <Text style={styles.opportunityText}>
                  💡 Podrías ahorrar {formatCurrency(calculations.savingsOpportunityPerMonth)}/mes
                </Text>
              </View>
            )}
          </View>
        </View>

        {isLimited && (
          <TouchableOpacity
            style={styles.limitedBanner}
            onPress={() => setShowUpgradeModal(true)}
            activeOpacity={0.8}
          >
            <View style={styles.limitedBannerContent}>
              <View style={styles.limitedBannerIcon}>
                <Ionicons name="sparkles" size={20} color="#D97706" />
              </View>
              <View style={styles.limitedBannerText}>
                <Text style={styles.limitedBannerTitle}>Análisis Básico</Text>
                <Text style={styles.limitedBannerSubtitle}>
                  {planInfo?.upgradeMessage || 'Mejora a PLUS para ver el análisis completo con IA'}
                </Text>
              </View>
              <View style={styles.limitedBannerBadge}>
                <Text style={styles.limitedBannerBadgeText}>PLUS</Text>
              </View>
            </View>
            <View style={styles.limitedBannerAction}>
              <Text style={styles.limitedBannerActionText}>Desbloquear análisis completo</Text>
              <Ionicons name="chevron-forward" size={16} color="#D97706" />
            </View>
          </TouchableOpacity>
        )}

        {calculations.topCriminals.length > 0 && (
          <View style={styles.criminalsSection}>
            <Text style={styles.sectionTitle}>🔍 Principales Fugas de Dinero</Text>
            {calculations.topCriminals.map((criminal: CategoryStats, index: number) => (
              <View key={index} style={styles.criminalItem}>
                <View style={styles.criminalHeader}>
                  <View style={styles.criminalRankContainer}>
                    <Text style={styles.criminalRank}>#{index + 1}</Text>
                  </View>
                  <Text style={styles.criminalIcon}>{criminal.icon}</Text>
                  <View style={styles.criminalInfo}>
                    <Text style={styles.criminalCategory}>{criminal.category}</Text>
                    <Text style={styles.criminalDetails}>
                      {criminal.count}x | Promedio: {formatCurrency(criminal.average)}
                    </Text>
                  </View>
                  <View style={styles.criminalStats}>
                    <Text style={styles.criminalAmount}>{formatCurrency(criminal.total)}</Text>
                    <Text style={styles.criminalTrend}>
                      {getTrendIcon(criminal.trend)} {criminal.trendPercentage > 0 ? '+' : ''}{criminal.trendPercentage.toFixed(0)}%
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {insights.categorySuggestions.length > 0 ? (
          <View style={styles.suggestionsSection}>
            <Text style={styles.sectionTitle}>💡 Sugerencias de Zenio</Text>
            {insights.categorySuggestions.map((catSuggestion, index) => (
              <View key={index} style={styles.categorySuggestion}>
                <Text style={styles.categorySuggestionTitle}>{catSuggestion.category}</Text>
                {catSuggestion.suggestions.map((suggestion, idx) => (
                  <Text key={idx} style={styles.suggestionItem}>• {suggestion}</Text>
                ))}
              </View>
            ))}
          </View>
        ) : isLimited && (
          <TouchableOpacity
            style={styles.lockedSection}
            onPress={() => setShowUpgradeModal(true)}
            activeOpacity={0.7}
          >
            <View style={styles.lockedSectionHeader}>
              <View style={styles.lockedIconContainer}>
                <Ionicons name="lock-closed" size={16} color="#9CA3AF" />
              </View>
              <Text style={styles.lockedSectionTitle}>💡 Sugerencias personalizadas</Text>
              <View style={styles.plusBadgeSmall}>
                <Text style={styles.plusBadgeSmallText}>PLUS</Text>
              </View>
            </View>
            <Text style={styles.lockedSectionDescription}>
              Zenio IA te dará consejos específicos para reducir cada categoría
            </Text>
          </TouchableOpacity>
        )}

        {calculations.monthlyTrend.length > 0 && (
          <View style={styles.trendSection}>
            <Text style={styles.sectionTitle}>📊 Tendencia Mensual</Text>
            <View style={styles.trendChart}>
              {calculations.monthlyTrend.map((month, index) => {
                const maxAmount = Math.max(...calculations.monthlyTrend.map(m => m.total));
                const height = maxAmount > 0 ? (month.total / maxAmount) * 80 : 0;

                return (
                  <View key={index} style={styles.trendBar}>
                    <View style={[styles.trendBarFill, { height: `${height}%` }]} />
                    <Text style={styles.trendMonth}>{month.monthName}</Text>
                    <Text style={styles.trendAmount}>{formatCurrency(month.total)}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {calculations.mostExpensiveDay && (
          <View style={styles.daySection}>
            <Text style={styles.sectionTitle}>📅 Día más costoso</Text>
            <View style={styles.dayContent}>
              <Text style={styles.dayName}>{calculations.mostExpensiveDay.dayName}</Text>
              <Text style={styles.dayAmount}>
                Promedio: {formatCurrency(calculations.mostExpensiveDay.average)}
              </Text>
            </View>
          </View>
        )}

        {insights.equivalencies.length > 0 ? (
          <View style={styles.equivalenciesSection}>
            <Text style={styles.sectionTitle}>
              🏆 Con {formatCurrency(calculations.totalAntExpenses)} podrías:
            </Text>
            {insights.equivalencies.map((equiv, index) => (
              <View key={index} style={styles.equivalencyItem}>
                <Text style={styles.equivalencyText}>• {equiv}</Text>
              </View>
            ))}
          </View>
        ) : isLimited && (
          <TouchableOpacity
            style={styles.lockedSection}
            onPress={() => setShowUpgradeModal(true)}
            activeOpacity={0.7}
          >
            <View style={styles.lockedSectionHeader}>
              <View style={styles.lockedIconContainer}>
                <Ionicons name="lock-closed" size={16} color="#9CA3AF" />
              </View>
              <Text style={styles.lockedSectionTitle}>🏆 Equivalencias de ahorro</Text>
              <View style={styles.plusBadgeSmall}>
                <Text style={styles.plusBadgeSmallText}>PLUS</Text>
              </View>
            </View>
            <Text style={styles.lockedSectionDescription}>
              Descubre qué podrías comprar con el dinero que gastas en hormiga
            </Text>
          </TouchableOpacity>
        )}

        <View style={styles.motivationalCard}>
          <Text style={styles.motivationalText}>{insights.motivationalMessage}</Text>
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.resetButton}
            onPress={resetAnalysis}
          >
            <Text style={styles.resetButtonText}>🔄 Analizar de nuevo</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.title}>🕵️ Detective de Gastos Hormiga</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {configLoading ? (
          renderLoadingState()
        ) : loading ? (
          renderLoadingState()
        ) : analysis ? (
          renderAnalysis()
        ) : (
          renderForm()
        )}
      </ScrollView>

      {renderConfigModal()}

      <UpgradeModal
        visible={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        limitType="antExpenseAnalysis"
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
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  zenioIcon: {
    width: 60,
    height: 60,
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 8,
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  cannotAnalyzeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  cannotAnalyzeIcon: {
    fontSize: 60,
    marginBottom: 16,
  },
  cannotAnalyzeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 12,
    textAlign: 'center',
  },
  cannotAnalyzeMessage: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  requirementsCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    width: '100%',
    alignSelf: 'center',
    maxWidth: 340,
  },
  requirementsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 16,
    textAlign: 'center',
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 4,
  },
  requirementText: {
    fontSize: 15,
    color: '#475569',
    marginLeft: 12,
    flex: 1,
  },
  backButtonLarge: {
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  backButtonLargeText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  form: {
    gap: 24,
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    textAlign: 'center',
  },
  welcomeSubtext: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginTop: -12,
    lineHeight: 20,
  },
  inputSection: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 16,
  },
  configPreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  configPreviewItem: {
    alignItems: 'center',
    flex: 1,
  },
  configPreviewLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  configPreviewValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  configEditButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    gap: 8,
  },
  configEditButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563EB',
  },
  infoCard: {
    backgroundColor: '#f0f9ff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  infoCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0c4a6e',
    marginBottom: 8,
  },
  infoCardText: {
    fontSize: 14,
    color: '#075985',
    lineHeight: 20,
  },
  analyzeButton: {
    marginTop: 8,
  },
  analyzeButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: 'center',
  },
  analyzeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  results: {
    gap: 20,
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 8,
  },
  warningsContainer: {
    gap: 8,
  },
  warningItem: {
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  warningError: {
    backgroundColor: '#fee2e2',
    borderLeftColor: '#ef4444',
  },
  warningInfo: {
    backgroundColor: '#dbeafe',
    borderLeftColor: '#3b82f6',
  },
  warningText: {
    fontSize: 14,
    color: '#374151',
  },
  impactCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  impactMessage: {
    fontSize: 16,
    color: '#374151',
    textAlign: 'center',
    lineHeight: 24,
  },
  mainResults: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  totalCard: {
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 8,
  },
  totalAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ef4444',
    marginBottom: 8,
  },
  totalPeriod: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 16,
  },
  opportunityBadge: {
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  opportunityText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#047857',
    textAlign: 'center',
  },
  criminalsSection: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 16,
  },
  criminalItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  criminalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  criminalRankContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fef2f2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  criminalRank: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ef4444',
  },
  criminalIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  criminalInfo: {
    flex: 1,
  },
  criminalCategory: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  criminalDetails: {
    fontSize: 12,
    color: '#64748b',
  },
  criminalStats: {
    alignItems: 'flex-end',
  },
  criminalAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ef4444',
  },
  criminalTrend: {
    fontSize: 12,
    color: '#64748b',
  },
  suggestionsSection: {
    backgroundColor: '#f0f9ff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  categorySuggestion: {
    marginBottom: 16,
  },
  categorySuggestionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#075985',
    marginBottom: 8,
  },
  suggestionItem: {
    fontSize: 14,
    color: '#0369a1',
    marginBottom: 4,
    paddingLeft: 8,
  },
  trendSection: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  trendChart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
    paddingTop: 20,
  },
  trendBar: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 2,
  },
  trendBarFill: {
    backgroundColor: '#2563EB',
    width: '80%',
    borderRadius: 4,
    marginBottom: 8,
  },
  trendMonth: {
    fontSize: 10,
    color: '#64748b',
    marginBottom: 2,
  },
  trendAmount: {
    fontSize: 9,
    color: '#374151',
    fontWeight: '500',
  },
  daySection: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  dayContent: {
    alignItems: 'center',
  },
  dayName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2563EB',
    marginBottom: 4,
  },
  dayAmount: {
    fontSize: 14,
    color: '#64748b',
  },
  equivalenciesSection: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  equivalencyItem: {
    marginBottom: 8,
  },
  equivalencyText: {
    fontSize: 14,
    color: '#1e293b',
    lineHeight: 20,
  },
  motivationalCard: {
    backgroundColor: '#f0fdf4',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  motivationalText: {
    fontSize: 16,
    color: '#047857',
    textAlign: 'center',
    fontWeight: '500',
  },
  actionButtons: {
    gap: 12,
    marginTop: 8,
  },
  resetButton: {
    backgroundColor: '#f1f5f9',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: 'center',
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  configSection: {
    marginBottom: 24,
  },
  configLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  sliderContainer: {
    alignItems: 'center',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2563EB',
    marginTop: 8,
  },
  configHint: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 8,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalButtonSecondary: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonSecondaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  modalButtonPrimary: {
    flex: 1,
  },
  modalButtonGradient: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonPrimaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  limitedBanner: {
    backgroundColor: '#FFFBEB',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3.84,
    elevation: 3,
  },
  limitedBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  limitedBannerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  limitedBannerText: {
    flex: 1,
  },
  limitedBannerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 2,
  },
  limitedBannerSubtitle: {
    fontSize: 12,
    color: '#B45309',
    lineHeight: 16,
  },
  limitedBannerBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  limitedBannerBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#D97706',
    letterSpacing: 0.5,
  },
  limitedBannerAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#FDE68A',
  },
  limitedBannerActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#D97706',
  },
  lockedSection: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  lockedSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  lockedIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  lockedSectionTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
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
  lockedSectionDescription: {
    fontSize: 13,
    color: '#9CA3AF',
    marginLeft: 38,
    lineHeight: 18,
  },
});
