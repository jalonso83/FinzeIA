import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { reportsAPI } from '../../utils/api';
import { useCurrency } from '../../hooks/useCurrency';
import { useDashboardStore } from '../../stores/dashboard';

import { logger } from '../../utils/logger';
interface VibeData {
  volatilityLevel: 'zen' | 'chill' | 'wild' | 'caos';
  burnRateLevel: 'ahorro' | 'normal' | 'fast' | 'millionaire';
  runwayLevel: 'danger' | 'tight' | 'getting-by' | 'stable';
  volatilityEmoji: string;
  volatilityText: string;
  volatilityValue: number;
  burnRateEmoji: string;
  burnRateText: string;
  burnRateValue: number;
  runwayEmoji: string;
  runwayText: string;
  runwayValue: number | null;
  adviceText: string;
  progressPercentage: number;
}

const VibeCard: React.FC = () => {
  const [vibeData, setVibeData] = useState<VibeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasData, setHasData] = useState(true);
  const [showInfoModal, setShowInfoModal] = useState(false);
  
  // Hook para moneda del usuario
  const { formatCurrency } = useCurrency();

  // Escuchar cambios del dashboard para refrescar (incluye el cambio de mes, que
  // dispara refreshDashboard() en el DashboardScreen). Sin esto, la tarjeta se
  // quedaba con los datos del mes anterior porque calcula su rango con new Date().
  const { refreshTrigger } = useDashboardStore();

  useEffect(() => {
    loadVibeData();
  }, [refreshTrigger]);


  const calculateVibeData = (volatility: number, burnRate: number, runway: number | null): VibeData => {
    // Calcular nivel de volatilidad
    let volatilityLevel: VibeData['volatilityLevel'] = 'zen';
    let volatilityEmoji = '🧘';
    let volatilityText = 'Maestro Zen';
    
    if (volatility > 3000) {
      volatilityLevel = 'caos';
      volatilityEmoji = '🎢';
      volatilityText = 'Montaña Rusa';
    } else if (volatility > 1500) {
      volatilityLevel = 'wild';
      volatilityEmoji = '🌊';
      volatilityText = 'Un poco Loco';
    } else if (volatility > 500) {
      volatilityLevel = 'chill';
      volatilityEmoji = '😌';
      volatilityText = 'Relajado';
    }

    // Calcular nivel de burn rate
    let burnRateLevel: VibeData['burnRateLevel'] = 'ahorro';
    let burnRateEmoji = '🐌';
    let burnRateText = 'Modo Ahorro';
    
    if (burnRate > 800) {
      burnRateLevel = 'millionaire';
      burnRateEmoji = '💸';
      burnRateText = 'Millonario';
    } else if (burnRate > 600) {
      burnRateLevel = 'fast';
      burnRateEmoji = '🏃';
      burnRateText = 'Vida Rápida';
    } else if (burnRate > 300) {
      burnRateLevel = 'normal';
      burnRateEmoji = '🚶';
      burnRateText = 'Normal';
    }

    // Calcular nivel de runway
    const runwayDays = runway || 0;
    let runwayLevel: VibeData['runwayLevel'] = 'stable';
    let runwayEmoji = '✅';
    let runwayText = 'Estable';
    
    if (runwayDays <= 7) {
      runwayLevel = 'danger';
      runwayEmoji = '🚨';
      runwayText = 'Zona Peligrosa';
    } else if (runwayDays <= 15) {
      runwayLevel = 'tight';
      runwayEmoji = '⚠️';
      runwayText = 'Presupuesto Ajustado';
    } else if (runwayDays <= 30) {
      runwayLevel = 'getting-by';
      runwayEmoji = '💛';
      runwayText = 'Saliendo Adelante';
    }

    // Generar consejo dinámico
    let adviceText = 'Sigue así!';
    if (runwayLevel === 'danger') {
      if (burnRateLevel === 'millionaire') {
        adviceText = 'Frena ya!';
      } else {
        adviceText = 'Necesitas más ingresos';
      }
    } else if (volatilityLevel === 'caos') {
      adviceText = 'Controla tus gastos';
    } else if (burnRateLevel === 'millionaire') {
      adviceText = 'Reduce gastos diarios';
    } else if (runwayLevel === 'tight') {
      adviceText = 'Ahorra un poco más';
    }

    // Calcular porcentaje de progreso (invertido para que más alto = peor)
    let progressPercentage = 0;
    
    // Volatilidad (0-100, más alto = peor)
    const volatilityScore = Math.min(100, (volatility / 5000) * 100);
    
    // Burn rate (0-100, más alto = peor)  
    const burnRateScore = Math.min(100, (burnRate / 1200) * 100);
    
    // Runway (0-100, más bajo = peor)
    const runwayScore = Math.max(0, 100 - Math.min(100, (runwayDays / 30) * 100));
    
    // Promedio ponderado (runway tiene más peso)
    progressPercentage = Math.round((volatilityScore * 0.3 + burnRateScore * 0.3 + runwayScore * 0.4));

    return {
      volatilityLevel,
      burnRateLevel,
      runwayLevel,
      volatilityEmoji,
      volatilityText,
      volatilityValue: volatility,
      burnRateEmoji,
      burnRateText,
      burnRateValue: burnRate,
      runwayEmoji,
      runwayText,
      runwayValue: runway,
      adviceText,
      progressPercentage
    };
  };

  const loadVibeData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Calcular fecha inicio y fin del mes actual
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      
      const response = await reportsAPI.getDateReport({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        granularity: 'daily',
        transactionType: 'both'
      });

      const data = response.data;

      if (data.metrics) {
        if (data.metrics.totalTransactions === 0) {
          setHasData(false);
          setVibeData(null);
          return;
        }

        setHasData(true);
        const volatility = data.metrics.volatility || 0;
        const burnRate = data.metrics.burnRate || 0;
        const runway = data.metrics.runway;

        const calculatedVibeData = calculateVibeData(volatility, burnRate, runway);
        setVibeData(calculatedVibeData);
      }
    } catch (error: any) {
      logger.error('Error loading vibe data:', error);
      setError('No se pudieron cargar los datos del vibe');
    } finally {
      setLoading(false);
    }
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return '#ef4444'; // Rojo
    if (percentage >= 60) return '#f97316'; // Naranja
    if (percentage >= 40) return '#eab308'; // Amarillo
    return '#22c55e'; // Verde
  };


  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Tu Vibe Financiero</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#2563EB" />
          <Text style={styles.loadingText}>Analizando tu vibe...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Tu Vibe Financiero</Text>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={24} color="#dc2626" />
          <Text style={styles.errorText}>No se pudieron cargar los datos</Text>
        </View>
      </View>
    );
  }

  if (!hasData || !vibeData) {
    return (
      <TouchableOpacity style={styles.container} onPress={loadVibeData}>
        <View style={styles.header}>
          <Text style={styles.title}>Tu Vibe Financiero</Text>
        </View>
        <View style={styles.neutralContent}>
          <Text style={styles.neutralEmoji}>🚀</Text>
          <Text style={styles.neutralTitle}>Tu vibe está por descubrirse</Text>
          <Text style={styles.neutralText}>
            Registra tu primer ingreso o gasto para conocer tu Vibe Financiero
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={styles.container} onPress={loadVibeData}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Tu Vibe Financiero</Text>
          <TouchableOpacity
            onPress={() => setShowInfoModal(true)}
            style={styles.infoButton}
          >
            <Ionicons name="information-circle-outline" size={16} color="#2563EB" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.content}>
        {/* Volatilidad principal */}
        <View style={styles.mainVibe}>
          <Text style={styles.vibeEmoji}>{vibeData.volatilityEmoji}</Text>
          <Text style={styles.vibeText}>{vibeData.volatilityText}</Text>
        </View>

        {/* Barra de progreso */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${vibeData.progressPercentage}%`,
                  backgroundColor: getProgressColor(vibeData.progressPercentage)
                },
              ]}
            />
          </View>
          <Text style={styles.progressText}>{vibeData.progressPercentage}%</Text>
        </View>

        {/* Métricas secundarias */}
        <View style={styles.metricsRow}>
          <View style={styles.metric}>
            <Text style={styles.metricEmoji}>{vibeData.burnRateEmoji}</Text>
            <Text style={styles.metricText}>Ritmo: {vibeData.burnRateText}</Text>
            <Text style={styles.metricValue}>{formatCurrency(vibeData.burnRateValue)}/día</Text>
          </View>
          
          <View style={styles.metric}>
            <Text style={styles.metricEmoji}>{vibeData.runwayEmoji}</Text>
            <Text style={styles.metricText}>Estado: {vibeData.runwayText}</Text>
            <Text style={styles.metricValue}>
              {vibeData.runwayValue ? `${vibeData.runwayValue} días` : 'N/A'}
            </Text>
          </View>
        </View>

        {/* Volatilidad adicional */}
        <View style={styles.volatilityContainer}>
          <Text style={styles.volatilityLabel}>Variación: {formatCurrency(vibeData.volatilityValue)}</Text>
        </View>

        {/* Consejo */}
        <View style={styles.advice}>
          <Text style={styles.adviceIcon}>🎯</Text>
          <Text style={styles.adviceText}>{vibeData.adviceText}</Text>
        </View>
      </View>

      {/* Modal de información */}
      <Modal
        visible={showInfoModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowInfoModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowInfoModal(false)}
        >
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowInfoModal(false)}
            >
              <Ionicons name="close" size={24} color="#64748b" />
            </TouchableOpacity>
            
            <Text style={styles.modalTitle}>¿Cómo interpretar tu Vibe Financiero?</Text>
            
            <View style={styles.metricExplanation}>
              <Text style={styles.metricName}>🎯 Porcentaje General</Text>
              <Text style={styles.metricDescription}>
                Es tu "temperatura financiera" del 0% al 100%. Números más altos indican que necesitas 
                más atención en tus finanzas. Se calcula combinando tu variación, ritmo y estado actual.
              </Text>
            </View>

            <View style={styles.metricExplanation}>
              <Text style={styles.metricName}>📊 Variación</Text>
              <Text style={styles.metricDescription}>
                Mide qué tan irregulares son tus gastos día a día. Si gastas muy diferente cada día, 
                tu variación será alta. Si mantienes gastos similares, será baja y más predecible.
              </Text>
            </View>

            <View style={styles.metricExplanation}>
              <Text style={styles.metricName}>⚡ Ritmo</Text>
              <Text style={styles.metricDescription}>
                Es tu promedio diario de gastos. Te muestra cuánto dinero gastas en promedio cada día 
                durante el período analizado. Útil para planificar tu presupuesto diario.
              </Text>
            </View>

            <View style={styles.metricExplanation}>
              <Text style={styles.metricName}>⏳ Estado</Text>
              <Text style={styles.metricDescription}>
                Indica cuántos días podrías mantener tu ritmo actual de gastos con el dinero que tienes 
                disponible. Te ayuda a saber si necesitas ajustar tus gastos o aumentar tus ingresos.
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    marginBottom: 20,
  },
  header: {
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  infoButton: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.2)',
  },
  content: {
    alignItems: 'center',
  },
  mainVibe: {
    alignItems: 'center',
    marginBottom: 16,
  },
  vibeEmoji: {
    fontSize: 32,
    marginBottom: 4,
  },
  vibeText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
  },
  progressContainer: {
    alignItems: 'center',
    marginBottom: 16,
    width: '100%',
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 12,
  },
  metric: {
    alignItems: 'center',
    flex: 1,
  },
  metricEmoji: {
    fontSize: 20,
    marginBottom: 2,
  },
  metricText: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    fontWeight: '500',
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 12,
    color: '#374151',
    textAlign: 'center',
    fontWeight: '600',
  },
  volatilityContainer: {
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  volatilityLabel: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    fontWeight: '500',
  },
  advice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  adviceIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  adviceText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#64748b',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  errorText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#dc2626',
  },
  // Estado neutro (sin transacciones)
  neutralContent: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  neutralEmoji: {
    fontSize: 40,
    marginBottom: 8,
  },
  neutralTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 6,
    textAlign: 'center',
  },
  neutralText: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 12,
  },
  // Estilos del modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '85%',
    position: 'relative',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 16,
    paddingRight: 40,
    flexShrink: 0,
  },
  metricExplanation: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  metricName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  metricDescription: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
  },
});

export default VibeCard;