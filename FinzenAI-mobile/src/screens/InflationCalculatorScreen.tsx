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
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../utils/api';
import { useCurrency } from '../hooks/useCurrency';

const { width } = Dimensions.get('window');

// Tipos
interface InflationResult {
  currentAmount: number;
  futureAmount: number;
  realValue: number;
  lostValue: number;
  inflationRate: number;
  years: number;
  examples: Array<{
    item: string;
    currentPrice: number;
    futurePrice: number;
    icon: string;
  }>;
  impactMessage: string;
}

const commonAmounts = [
  { amount: 25000, label: 'Salario mínimo', description: '1 mes de salario mínimo' },
  { amount: 50000, label: 'Salario promedio', description: '1 mes salario clase media' },
  { amount: 100000, label: 'Ahorro pequeño', description: 'Lo que muchos tienen ahorrado' },
  { amount: 500000, label: 'Ahorro considerable', description: 'Meta de ahorro anual' },
  { amount: 1000000, label: 'Ahorro grande', description: 'Lo que cuesta un carro usado' }
];

const timeOptions = [
  { years: 5, label: '5 años', description: 'Cuando te gradúes' },
  { years: 10, label: '10 años', description: 'Cuando tengas 30+ años' },
  { years: 20, label: '20 años', description: 'Cuando seas adulto pleno' },
  { years: 30, label: '30 años', description: 'Cuando tengas familia' }
];

export default function InflationCalculatorScreen() {
  const navigation = useNavigation();
  const { formatCurrency } = useCurrency();
  const [step, setStep] = useState(1); // 1: Monto, 2: Tiempo, 3: Resultado
  const [loading, setLoading] = useState(false);
  const [animatedValue] = useState(new Animated.Value(0));

  // Estados del formulario
  const [customAmount, setCustomAmount] = useState('');
  const [selectedAmount, setSelectedAmount] = useState(0);
  const [selectedYears, setSelectedYears] = useState(10);
  const [result, setResult] = useState<InflationResult | null>(null);

  const calculateInflation = async () => {
    try {
      setLoading(true);
      
      const amount = selectedAmount || parseInt(customAmount);

      const response = await api.post('/investment/calculate-inflation', {
        currentAmount: amount,
        years: selectedYears,
        inflationRate: 7 // Promedio histórico RD
      });

      setResult(response.data);
      setStep(3);
      
      // Animar la aparición de resultados
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start();

    } catch (error: any) {
      console.error('Error calculating inflation:', error);
      Alert.alert(
        'Error',
        error.response?.data?.error || 'No se pudo calcular la inflación'
      );
    } finally {
      setLoading(false);
    }
  };


  const resetCalculator = () => {
    setStep(1);
    setSelectedAmount(0);
    setCustomAmount('');
    setSelectedYears(10);
    setResult(null);
    animatedValue.setValue(0);
  };

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>💰 ¿Cuánto dinero tienes?</Text>
      <Text style={styles.stepSubtitle}>Vamos a ver cómo la inflación destruye tu dinero</Text>

      {/* Montos comunes */}
      <View style={styles.amountsList}>
        {commonAmounts.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.amountCard,
              selectedAmount === item.amount && styles.amountCardSelected
            ]}
            onPress={() => {
              setSelectedAmount(item.amount);
              setCustomAmount('');
            }}
          >
            <Text style={styles.amountValue}>{formatCurrency(item.amount)}</Text>
            <Text style={styles.amountLabel}>{item.label}</Text>
            <Text style={styles.amountDescription}>{item.description}</Text>
            {selectedAmount === item.amount && (
              <Ionicons name="checkmark-circle" size={24} color="#ef4444" style={styles.checkIcon} />
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Opción personalizada */}
      <View style={styles.customSection}>
        <Text style={styles.customTitle}>💡 O ingresa tu monto:</Text>
        <View style={styles.customInputContainer}>
          <Text style={styles.currencyPrefix}>{formatCurrency(0).replace(/[0.,]/g, '').trim()}</Text>
          <TextInput
            style={styles.customInput}
            value={customAmount}
            onChangeText={(value) => {
              setCustomAmount(value);
              setSelectedAmount(0);
            }}
            placeholder="100000"
            keyboardType="numeric"
            placeholderTextColor="#9CA3AF"
          />
        </View>
      </View>

      {(selectedAmount > 0 || (customAmount && parseInt(customAmount) > 0)) && (
        <TouchableOpacity
          style={styles.nextButton}
          onPress={() => setStep(2)}
        >
          <Text style={styles.nextButtonText}>Continuar</Text>
          <Ionicons name="chevron-forward" size={20} color="white" />
        </TouchableOpacity>
      )}
    </View>
  );

  const renderStep2 = () => {
    const amount = selectedAmount || parseInt(customAmount);
    
    return (
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>⏰ ¿En cuántos años?</Text>
        <Text style={styles.stepSubtitle}>
          Tienes {formatCurrency(amount)} hoy
        </Text>

        <View style={styles.timeOptions}>
          {timeOptions.map((option, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.timeOption,
                selectedYears === option.years && styles.timeOptionSelected
              ]}
              onPress={() => setSelectedYears(option.years)}
            >
              <View style={styles.timeContent}>
                <Text style={styles.timeLabel}>{option.label}</Text>
                <Text style={styles.timeDescription}>{option.description}</Text>
              </View>
              <View style={styles.previewContainer}>
                <Text style={styles.previewLabel}>Valdrá solo:</Text>
                <Text style={styles.previewAmount}>
                  ~{formatCurrency(Math.round(amount / Math.pow(1.07, option.years)))}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => setStep(1)}>
            <Ionicons name="chevron-back" size={20} color="#64748b" />
            <Text style={styles.backButtonText}>Atrás</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.calculateButton}
            onPress={calculateInflation}
            disabled={loading}
          >
            <LinearGradient
              colors={['#ef4444', '#dc2626']}
              style={styles.calculateButtonGradient}
            >
              {loading ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <>
                  <Text style={styles.calculateButtonText}>😱 VER EL DAÑO</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderStep3 = () => result && (
    <Animated.View style={[styles.resultContainer, { opacity: animatedValue }]}>
      <Text style={styles.resultTitle}>😱 ¡ESTO ES BRUTAL!</Text>

      {/* Mensaje de impacto principal */}
      <View style={styles.impactCard}>
        <Text style={styles.impactMessage}>{result.impactMessage}</Text>
        <View style={styles.impactNumbers}>
          <View style={styles.impactItem}>
            <Text style={styles.impactLabel}>Tienes hoy:</Text>
            <Text style={[styles.impactValue, styles.currentValue]}>
              {formatCurrency(result.currentAmount)}
            </Text>
          </View>
          <Text style={styles.arrow}>→</Text>
          <View style={styles.impactItem}>
            <Text style={styles.impactLabel}>Valdrá solo:</Text>
            <Text style={[styles.impactValue, styles.futureValue]}>
              {formatCurrency(result.realValue)}
            </Text>
          </View>
        </View>
        <Text style={styles.lossMessage}>
          💸 ¡Pierdes {formatCurrency(result.lostValue)} de poder de compra!
        </Text>
      </View>

      {/* Comparación de precios */}
      <View style={styles.pricesCard}>
        <Text style={styles.pricesTitle}>📈 Cómo subirán los precios:</Text>
        {result.examples.map((example, index) => (
          <View key={index} style={styles.priceItem}>
            <Text style={styles.priceIcon}>{example.icon}</Text>
            <View style={styles.priceContent}>
              <Text style={styles.priceName}>{example.item}</Text>
              <View style={styles.priceComparison}>
                <Text style={styles.currentPrice}>
                  Hoy: {formatCurrency(example.currentPrice)}
                </Text>
                <Text style={styles.futurePrice}>
                  En {result.years} años: {formatCurrency(example.futurePrice)}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </View>

      {/* Call to action */}
      <View style={styles.ctaCard}>
        <Text style={styles.ctaTitle}>🚨 ¿Qué puedes hacer?</Text>
        <Text style={styles.ctaText}>
          • Invierte tu dinero para ganarle a la inflación{'\n'}
          • Usa nuestras otras calculadoras para planificar{'\n'}
          • NO dejes tu dinero "guardado" sin crecer
        </Text>
      </View>

      <TouchableOpacity
        style={styles.resetButton}
        onPress={resetCalculator}
      >
        <Text style={styles.resetButtonText}>🔄 Calcular otra cantidad</Text>
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerBackButton}
        >
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.title}>📈 Calculadora de Inflación</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Progress indicator */}
      {step < 3 && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${(step / 2) * 100}%` }
              ]}
            />
          </View>
          <Text style={styles.progressText}>Paso {step} de 2</Text>
        </View>
      )}

      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 140 : 20}
      >
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  keyboardAvoidingView: {
    flex: 1,
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
  headerBackButton: {
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
  progressContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e2e8f0',
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#ef4444',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  stepContainer: {
    gap: 24,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    textAlign: 'center',
  },
  stepSubtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginTop: -8,
  },
  amountsList: {
    gap: 12,
  },
  amountCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  amountCardSelected: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  amountValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ef4444',
    marginBottom: 4,
  },
  amountLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  amountDescription: {
    fontSize: 14,
    color: '#64748b',
  },
  checkIcon: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  customSection: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  customTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  customInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    paddingHorizontal: 16,
  },
  currencyPrefix: {
    fontSize: 18,
    fontWeight: '600',
    color: '#64748b',
    marginRight: 8,
  },
  customInput: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  timeOptions: {
    gap: 12,
  },
  timeOption: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeOptionSelected: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  timeContent: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  timeDescription: {
    fontSize: 14,
    color: '#64748b',
  },
  previewContainer: {
    alignItems: 'flex-end',
  },
  previewLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 2,
  },
  previewAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ef4444',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    gap: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '600',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#ef4444',
    borderRadius: 12,
    gap: 8,
  },
  nextButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: 'bold',
  },
  calculateButton: {
    flex: 1,
    marginLeft: 12,
  },
  calculateButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  calculateButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resultContainer: {
    gap: 24,
  },
  resultTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    textAlign: 'center',
  },
  impactCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    borderWidth: 2,
    borderColor: '#ef4444',
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
    marginBottom: 20,
    lineHeight: 22,
  },
  impactNumbers: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 16,
  },
  impactItem: {
    alignItems: 'center',
  },
  impactLabel: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  impactValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  currentValue: {
    color: '#059669',
  },
  futureValue: {
    color: '#ef4444',
  },
  arrow: {
    fontSize: 24,
    color: '#64748b',
  },
  lossMessage: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ef4444',
    textAlign: 'center',
    backgroundColor: '#fef2f2',
    padding: 12,
    borderRadius: 8,
  },
  pricesCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  pricesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 16,
  },
  priceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  priceIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  priceContent: {
    flex: 1,
  },
  priceName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  priceComparison: {
    gap: 4,
  },
  currentPrice: {
    fontSize: 13,
    color: '#059669',
    fontWeight: '600',
  },
  futurePrice: {
    fontSize: 13,
    color: '#ef4444',
    fontWeight: '600',
  },
  ctaCard: {
    backgroundColor: '#fef2f2',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  ctaTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#991b1b',
    marginBottom: 12,
  },
  ctaText: {
    fontSize: 14,
    color: '#7f1d1d',
    lineHeight: 20,
  },
  resetButton: {
    backgroundColor: '#f1f5f9',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
});