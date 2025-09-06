import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import Slider from '@react-native-community/slider';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../utils/api';
import { useCurrency } from '../hooks/useCurrency';

const { width } = Dimensions.get('window');

interface InvestmentResult {
  totalContributed: number;
  totalInterest: number;
  finalAmount: number;
  equivalencies: string[];
  milestones: Array<{
    amount: number;
    month: number;
    description: string;
  }>;
  riskProfile: {
    level: string;
    description: string;
    minReturn: number;
    maxReturn: number;
  };
}

interface RiskLevel {
  key: 'conservative' | 'balanced' | 'aggressive';
  name: string;
  emoji: string;
  description: string;
  minReturn: number;
  maxReturn: number;
  color: string;
}

const riskLevels: RiskLevel[] = [
  {
    key: 'conservative',
    name: 'Conservador',
    emoji: '🛡️',
    description: 'Como el banco, pero mejor',
    minReturn: 5,
    maxReturn: 7,
    color: '#059669'
  },
  {
    key: 'balanced',
    name: 'Balanceado',
    emoji: '⚖️',
    description: 'Balance perfecto riesgo/ganancia',
    minReturn: 7,
    maxReturn: 10,
    color: '#d97706'
  },
  {
    key: 'aggressive',
    name: 'Agresivo',
    emoji: '🚀',
    description: 'Para crecer rápido',
    minReturn: 10,
    maxReturn: 15,
    color: '#dc2626'
  }
];

const yearOptions = [5, 10, 15, 20, 25];

export default function InvestmentSimulatorScreen() {
  const navigation = useNavigation();
  const { formatCurrency } = useCurrency();
  const [monthlyAmount, setMonthlyAmount] = useState(2500);
  const [tempAmount, setTempAmount] = useState(2500);
  const [selectedYears, setSelectedYears] = useState(10);
  const [selectedRisk, setSelectedRisk] = useState<RiskLevel>(riskLevels[1]);
  const [result, setResult] = useState<InvestmentResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [animatedValue] = useState(new Animated.Value(0));

  // Debounce para el slider para evitar vibraciones
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setMonthlyAmount(tempAmount);
    }, 150); // Esperar 150ms después de que pare el slider

    return () => clearTimeout(timeoutId);
  }, [tempAmount]);

  const calculateInvestment = async () => {
    try {
      setLoading(true);
      
      // Usar el promedio de la tasa de retorno del nivel de riesgo seleccionado
      const annualInterestRate = (selectedRisk.minReturn + selectedRisk.maxReturn) / 2;
      
      console.log('Calculating investment with:', {
        monthlyAmount,
        years: selectedYears,
        annualInterestRate,
        riskLevel: selectedRisk.key
      });

      const response = await api.post('/investment/calculate', {
        monthlyAmount,
        years: selectedYears,
        annualInterestRate,
        riskLevel: selectedRisk.key
      });

      console.log('Investment calculation result:', response.data);
      setResult(response.data);
      
      // Animar la aparición de resultados
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start();

    } catch (error: any) {
      console.error('Error calculating investment:', error);
      Alert.alert(
        'Error',
        error.response?.data?.error || 'No se pudo calcular la inversión'
      );
    } finally {
      setLoading(false);
    }
  };


  const resetSimulation = () => {
    setResult(null);
    animatedValue.setValue(0);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.title}>💰 Calculadora del Futuro</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {!result ? (
          // Formulario de configuración
          <View style={styles.form}>
            <Text style={styles.welcomeText}>
              🚀 ¡Descubre cuánto tendrás en el futuro!
            </Text>

            {/* Cantidad Mensual */}
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>
                💵 ¿Cuánto puedes invertir al mes?
              </Text>
              <View style={styles.sliderContainer}>
                <Slider
                  style={styles.slider}
                  minimumValue={500}
                  maximumValue={50000}
                  step={250}
                  value={tempAmount}
                  onValueChange={setTempAmount}
                  minimumTrackTintColor="#8B5CF6"
                  maximumTrackTintColor="#e2e8f0"
                  thumbStyle={styles.sliderThumb}
                />
                <Text style={styles.sliderValue}>
                  {formatCurrency(tempAmount)}
                </Text>
              </View>
            </View>

            {/* Años */}
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>
                📅 ¿En cuántos años quieres verlo?
              </Text>
              <View style={styles.buttonGroup}>
                {yearOptions.map((years) => (
                  <TouchableOpacity
                    key={years}
                    style={[
                      styles.yearButton,
                      selectedYears === years && styles.yearButtonActive
                    ]}
                    onPress={() => setSelectedYears(years)}
                  >
                    <Text style={[
                      styles.yearButtonText,
                      selectedYears === years && styles.yearButtonTextActive
                    ]}>
                      {years} años
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Nivel de Riesgo */}
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>
                📊 ¿Cuánto riesgo toleras?
              </Text>
              {riskLevels.map((risk) => (
                <TouchableOpacity
                  key={risk.key}
                  style={[
                    styles.riskOption,
                    selectedRisk.key === risk.key && styles.riskOptionActive
                  ]}
                  onPress={() => setSelectedRisk(risk)}
                >
                  <View style={styles.riskContent}>
                    <Text style={styles.riskEmoji}>{risk.emoji}</Text>
                    <View style={styles.riskInfo}>
                      <Text style={styles.riskName}>{risk.name}</Text>
                      <Text style={styles.riskDescription}>{risk.description}</Text>
                      <Text style={styles.riskReturn}>
                        {risk.minReturn}% - {risk.maxReturn}% anual
                      </Text>
                    </View>
                    {selectedRisk.key === risk.key && (
                      <Ionicons name="checkmark-circle" size={24} color={risk.color} />
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {/* Botón de Simular */}
            <TouchableOpacity
              style={styles.simulateButton}
              onPress={calculateInvestment}
              disabled={loading}
            >
              <LinearGradient
                colors={['#8B5CF6', '#7C3AED']}
                style={styles.simulateButtonGradient}
              >
                {loading ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <>
                    <Text style={styles.simulateButtonText}>🚀 SIMULAR AHORA</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          // Resultados
          <Animated.View style={[styles.results, { opacity: animatedValue }]}>
            <Text style={styles.resultTitle}>🎉 ¡Tu Future Self te agradece!</Text>

            {/* Números principales */}
            <View style={styles.mainResults}>
              <View style={styles.totalCard}>
                <Text style={styles.totalLabel}>Tendrás en total</Text>
                <Text style={styles.totalAmount}>
                  {formatCurrency(result.finalAmount)}
                </Text>
                <View style={styles.breakdown}>
                  <View style={styles.breakdownItem}>
                    <Text style={styles.breakdownLabel}>Tu dinero:</Text>
                    <Text style={styles.breakdownAmount}>
                      {formatCurrency(result.totalContributed)}
                    </Text>
                  </View>
                  <View style={styles.breakdownItem}>
                    <Text style={styles.breakdownLabel}>Interés generado:</Text>
                    <Text style={[styles.breakdownAmount, styles.interestAmount]}>
                      {formatCurrency(result.totalInterest)}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Equivalencias Gen Z */}
            {result.equivalencies.length > 0 && (
              <View style={styles.equivalenciesSection}>
                <Text style={styles.sectionTitle}>
                  🏆 Con {formatCurrency(result.finalAmount)} podrías:
                </Text>
                {result.equivalencies.map((equiv, index) => (
                  <View key={index} style={styles.equivalencyItem}>
                    <Text style={styles.equivalencyText}>• {equiv}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Hitos */}
            {result.milestones.length > 0 && (
              <View style={styles.milestonesSection}>
                <Text style={styles.sectionTitle}>🎯 Hitos en tu camino:</Text>
                {result.milestones.slice(0, 3).map((milestone, index) => (
                  <View key={index} style={styles.milestoneItem}>
                    <View style={styles.milestoneContent}>
                      <Text style={styles.milestoneAmount}>
                        {formatCurrency(milestone.amount)}
                      </Text>
                      <Text style={styles.milestoneDescription}>
                        {milestone.description}
                      </Text>
                    </View>
                    <Text style={styles.milestoneTime}>
                      Mes {milestone.month}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Botones de acción */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.resetButton}
                onPress={resetSimulation}
              >
                <Text style={styles.resetButtonText}>🔄 Simular de nuevo</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}
      </ScrollView>
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
  form: {
    gap: 24,
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 8,
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
  sliderContainer: {
    alignItems: 'center',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderThumb: {
    backgroundColor: '#8B5CF6',
    width: 20,
    height: 20,
  },
  sliderValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#8B5CF6',
    marginTop: 8,
  },
  buttonGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  yearButton: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  yearButtonActive: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  yearButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  yearButtonTextActive: {
    color: 'white',
  },
  riskOption: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  riskOptionActive: {
    borderColor: '#8B5CF6',
    backgroundColor: '#f3f4f6',
  },
  riskContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  riskEmoji: {
    fontSize: 24,
  },
  riskInfo: {
    flex: 1,
  },
  riskName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  riskDescription: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  riskReturn: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '600',
  },
  simulateButton: {
    marginTop: 20,
  },
  simulateButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: 'center',
  },
  simulateButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  results: {
    gap: 24,
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 8,
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
    color: '#8B5CF6',
    marginBottom: 16,
  },
  breakdown: {
    width: '100%',
    gap: 8,
  },
  breakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  breakdownAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  interestAmount: {
    color: '#059669',
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 16,
  },
  equivalencyItem: {
    marginBottom: 8,
  },
  equivalencyText: {
    fontSize: 14,
    color: '#1e293b',
    lineHeight: 20,
  },
  milestonesSection: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  milestoneItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  milestoneContent: {
    flex: 1,
  },
  milestoneAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  milestoneDescription: {
    fontSize: 12,
    color: '#64748b',
  },
  milestoneTime: {
    fontSize: 12,
    color: '#8B5CF6',
    fontWeight: '600',
  },
  actionButtons: {
    gap: 12,
    marginTop: 20,
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
});