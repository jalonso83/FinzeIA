import React, { useState, useEffect, useRef } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../utils/api';
import { useCurrency } from '../hooks/useCurrency';

const { width } = Dimensions.get('window');

// Tipos
interface CommonExpense {
  amount: number;
  name: string;
  icon: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  alternatives: string[];
}

interface SkipVsSaveResult {
  dailyAmount: number;
  frequency: string;
  timeframe: number;
  totalSpent: number;
  totalSaved: number;
  totalInvested: number;
  savingsAdvantage: number;
  investmentAdvantage: number;
  equivalencies: string[];
  monthlyBreakdown: Array<{
    month: number;
    spent: number;
    saved: number;
    invested: number;
  }>;
  challenge: {
    title: string;
    description: string;
    icon: string;
  };
}

const timeframeOptions = [
  { months: 6, label: '6 meses' },
  { months: 12, label: '1 año' },
  { months: 24, label: '2 años' },
  { months: 36, label: '3 años' },
  { months: 60, label: '5 años' }
];

export default function SkipVsSaveScreen() {
  const navigation = useNavigation();
  const { formatCurrency } = useCurrency();
  const [step, setStep] = useState(1); // 1: Gasto, 2: Frecuencia, 3: Tiempo, 4: Resultado
  const [commonExpenses, setCommonExpenses] = useState<CommonExpense[]>([]);
  const [loading, setLoading] = useState(false);
  const [animatedValue] = useState(new Animated.Value(0));

  // Refs para auto-focus y scroll
  const customInputRef = useRef<TextInput>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  // Estados del formulario
  const [customAmount, setCustomAmount] = useState('');
  const [selectedExpense, setSelectedExpense] = useState<CommonExpense | null>(null);
  const [selectedFrequency, setSelectedFrequency] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [selectedTimeframe, setSelectedTimeframe] = useState(12);
  const [result, setResult] = useState<SkipVsSaveResult | null>(null);

  useEffect(() => {
    loadCommonExpenses();
  }, []);

  const loadCommonExpenses = async () => {
    try {
      const response = await api.get('/investment/common-expenses');
      setCommonExpenses(response.data);
    } catch (error) {
      console.error('Error loading common expenses:', error);
    }
  };

  const calculateChallenge = async () => {
    try {
      setLoading(true);
      
      const amount = selectedExpense ? selectedExpense.amount : parseInt(customAmount);
      const frequency = selectedExpense ? selectedExpense.frequency : selectedFrequency;

      const response = await api.post('/investment/skip-vs-save', {
        dailyExpense: amount,
        frequency: frequency,
        timeframe: selectedTimeframe,
        investmentReturn: 8 // Retorno balanceado por defecto
      });

      setResult(response.data);
      setStep(4);
      
      // Animar la aparición de resultados
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start();

    } catch (error: any) {
      console.error('Error calculating challenge:', error);
      Alert.alert(
        'Error',
        error.response?.data?.error || 'No se pudo calcular el reto'
      );
    } finally {
      setLoading(false);
    }
  };


  const resetChallenge = () => {
    setStep(1);
    setSelectedExpense(null);
    setCustomAmount('');
    setSelectedFrequency('daily');
    setSelectedTimeframe(12);
    setResult(null);
    animatedValue.setValue(0);
  };

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>🤔 ¿En qué gastas tu dinero?</Text>
      <Text style={styles.stepSubtitle}>Selecciona un gasto común o ingresa uno personalizado</Text>

      {/* Gastos comunes */}
      <View style={styles.commonExpensesList}>
        {commonExpenses.map((expense, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.expenseCard,
              selectedExpense === expense && styles.expenseCardSelected
            ]}
            onPress={() => {
              setSelectedExpense(expense);
              setSelectedFrequency(expense.frequency);
              setCustomAmount('');
            }}
          >
            <Text style={styles.expenseIcon}>{expense.icon}</Text>
            <View style={styles.expenseContent}>
              <Text style={styles.expenseName}>{expense.name}</Text>
              <Text style={styles.expenseAmount}>
                {formatCurrency(expense.amount)}/{expense.frequency === 'daily' ? 'día' : expense.frequency === 'weekly' ? 'semana' : 'mes'}
              </Text>
              <Text style={styles.expenseAlternative}>
                Alt: {expense.alternatives[0]}
              </Text>
            </View>
            {selectedExpense === expense && (
              <Ionicons name="checkmark-circle" size={24} color="#059669" style={styles.checkIcon} />
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Opción personalizada */}
      <TouchableOpacity
        style={styles.customSection}
        activeOpacity={0.7}
        onPress={() => {
          customInputRef.current?.focus();
        }}
      >
        <Text style={styles.customTitle}>💡 O ingresa tu propio gasto:</Text>
        <View style={styles.customInputContainer}>
          <TextInput
            ref={customInputRef}
            style={styles.customInput}
            value={customAmount}
            onChangeText={(value) => {
              setCustomAmount(value);
              setSelectedExpense(null);
            }}
            onFocus={() => {
              // Scroll to make the input visible when focused
              setTimeout(() => {
                scrollViewRef.current?.scrollTo({
                  y: 400, // Scroll down to make custom input section visible
                  animated: true,
                });
              }, 200);
            }}
            placeholder="Ejemplo: 250"
            keyboardType="numeric"
            placeholderTextColor="#9CA3AF"
          />
          <Text style={styles.customLabel}>{formatCurrency(0).replace(/[0.,]/g, '').trim()} por día</Text>
        </View>
      </TouchableOpacity>

      {(selectedExpense || (customAmount && parseInt(customAmount) > 0)) && (
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

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>📅 ¿Con qué frecuencia?</Text>
      <Text style={styles.stepSubtitle}>
        {selectedExpense ? selectedExpense.name : `Gasto de ${formatCurrency(parseInt(customAmount))}`}
      </Text>

      <View style={styles.frequencyOptions}>
        {['daily', 'weekly', 'monthly'].map((freq) => (
          <TouchableOpacity
            key={freq}
            style={[
              styles.frequencyOption,
              selectedFrequency === freq && styles.frequencyOptionSelected
            ]}
            onPress={() => setSelectedFrequency(freq as 'daily' | 'weekly' | 'monthly')}
          >
            <Text style={styles.frequencyLabel}>
              {freq === 'daily' ? '📅 Diario' : freq === 'weekly' ? '🗓️ Semanal' : '📆 Mensual'}
            </Text>
            <Text style={styles.frequencyDescription}>
              {freq === 'daily' && 'Todos los días'}
              {freq === 'weekly' && 'Una vez por semana'}
              {freq === 'monthly' && 'Una vez al mes'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.backButton} onPress={() => setStep(1)}>
          <Ionicons name="chevron-back" size={20} color="#64748b" />
          <Text style={styles.backButtonText}>Atrás</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.nextButton}
          onPress={() => setStep(3)}
        >
          <Text style={styles.nextButtonText}>Continuar</Text>
          <Ionicons name="chevron-forward" size={20} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStep3 = () => {
    const amount = selectedExpense ? selectedExpense.amount : parseInt(customAmount);
    const frequencyText = selectedFrequency === 'daily' ? 'diario' : selectedFrequency === 'weekly' ? 'semanal' : 'mensual';
    
    return (
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>⏰ ¿Por cuánto tiempo?</Text>
        <Text style={styles.stepSubtitle}>
          Gasto {frequencyText} de {formatCurrency(amount)}
        </Text>

        <View style={styles.timeframeOptions}>
          {timeframeOptions.map((option, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.timeframeOption,
                selectedTimeframe === option.months && styles.timeframeOptionSelected
              ]}
              onPress={() => setSelectedTimeframe(option.months)}
            >
              <Text style={styles.timeframeLabel}>{option.label}</Text>
              <Text style={styles.timeframePreview}>
                Total: ~{formatCurrency(
                  selectedFrequency === 'daily' ? amount * 30 * option.months :
                  selectedFrequency === 'weekly' ? amount * 4.33 * option.months :
                  amount * option.months
                )}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => setStep(2)}>
            <Ionicons name="chevron-back" size={20} color="#64748b" />
            <Text style={styles.backButtonText}>Atrás</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.calculateButton}
            onPress={calculateChallenge}
            disabled={loading}
          >
            <LinearGradient
              colors={['#059669', '#047857']}
              style={styles.calculateButtonGradient}
            >
              {loading ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <>
                  <Text style={styles.calculateButtonText}>🎯 VER MI RETO</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderStep4 = () => result && (
    <Animated.View style={[styles.resultContainer, { opacity: animatedValue }]}>
      <Text style={styles.resultTitle}>🤯 ¡WOW! Mira esto...</Text>

      {/* Challenge Header */}
      <View style={styles.challengeCard}>
        <Text style={styles.challengeIcon}>{result.challenge.icon}</Text>
        <Text style={styles.challengeTitle}>{result.challenge.title}</Text>
        <Text style={styles.challengeDescription}>{result.challenge.description}</Text>
      </View>

      {/* Comparación principal */}
      <View style={styles.comparisonMainCard}>
        <Text style={styles.comparisonMainTitle}>💸 vs 💰 vs 📈</Text>
        
        <View style={styles.comparisonGrid}>
          <View style={styles.comparisonItem}>
            <Text style={styles.comparisonEmoji}>💸</Text>
            <Text style={styles.comparisonLabel}>Gastando</Text>
            <Text style={[styles.comparisonAmount, styles.spentAmount]}>
              {formatCurrency(result.totalSpent)}
            </Text>
            <Text style={styles.comparisonSubtext}>Se va todo</Text>
          </View>
          
          <View style={styles.comparisonItem}>
            <Text style={styles.comparisonEmoji}>💰</Text>
            <Text style={styles.comparisonLabel}>Ahorrando</Text>
            <Text style={[styles.comparisonAmount, styles.savedAmount]}>
              {formatCurrency(result.totalSaved)}
            </Text>
            <Text style={styles.comparisonSubtext}>En tu cuenta</Text>
          </View>
          
          <View style={styles.comparisonItem}>
            <Text style={styles.comparisonEmoji}>📈</Text>
            <Text style={styles.comparisonLabel}>Invirtiendo</Text>
            <Text style={[styles.comparisonAmount, styles.investedAmount]}>
              {formatCurrency(result.totalInvested)}
            </Text>
            <Text style={styles.comparisonSubtext}>¡Creciendo!</Text>
          </View>
        </View>

        {result.investmentAdvantage > 0 && (
          <View style={styles.advantageCard}>
            <Text style={styles.advantageText}>
              🚀 Ganancia extra invirtiendo: {formatCurrency(result.investmentAdvantage)}
            </Text>
          </View>
        )}
      </View>

      {/* Equivalencias */}
      {result.equivalencies.length > 0 && (
        <View style={styles.equivalenciesCard}>
          <Text style={styles.equivalenciesTitle}>🎁 Con todo lo que ahorraste podrías comprarte:</Text>
          {result.equivalencies.map((equiv, index) => (
            <Text key={index} style={styles.equivalencyItem}>• {equiv}</Text>
          ))}
        </View>
      )}

      {/* Progress visual simple */}
      <View style={styles.progressCard}>
        <Text style={styles.progressTitle}>📊 Tu progreso en {result.timeframe} meses:</Text>
        <View style={styles.progressBars}>
          <View style={styles.progressBarContainer}>
            <Text style={styles.progressBarLabel}>💸 Gastado</Text>
            <View style={styles.resultProgressBar}>
              <View style={[styles.progressBarFill, styles.spentBar, { width: '100%' }]} />
            </View>
          </View>
          <View style={styles.progressBarContainer}>
            <Text style={styles.progressBarLabel}>📈 Invertido</Text>
            <View style={styles.resultProgressBar}>
              <View style={[styles.progressBarFill, styles.investedBar, { width: `${Math.min((result.totalInvested / result.totalSpent) * 100, 100)}%` }]} />
            </View>
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={styles.resetButton}
        onPress={resetChallenge}
      >
        <Text style={styles.resetButtonText}>🔄 Probar otro reto</Text>
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
        <Text style={styles.title}>💫 Reto: ¿Gastar o Ahorrar?</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Progress indicator */}
      {step < 4 && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${(step / 3) * 100}%` }
              ]} 
            />
          </View>
          <Text style={styles.progressText}>Paso {step} de 3</Text>
        </View>
      )}

      <ScrollView
        ref={scrollViewRef}
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
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
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#059669',
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
  commonExpensesList: {
    gap: 12,
  },
  expenseCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  expenseCardSelected: {
    borderColor: '#059669',
    backgroundColor: '#f0fdf4',
  },
  expenseIcon: {
    fontSize: 28,
    marginRight: 16,
  },
  expenseContent: {
    flex: 1,
  },
  expenseName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  expenseAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#059669',
    marginBottom: 2,
  },
  expenseAlternative: {
    fontSize: 12,
    color: '#64748b',
  },
  checkIcon: {
    marginLeft: 12,
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
    gap: 12,
  },
  customInput: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  customLabel: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
  },
  frequencyOptions: {
    gap: 12,
  },
  frequencyOption: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  frequencyOptionSelected: {
    borderColor: '#059669',
    backgroundColor: '#f0fdf4',
  },
  frequencyLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  frequencyDescription: {
    fontSize: 14,
    color: '#64748b',
  },
  timeframeOptions: {
    gap: 12,
  },
  timeframeOption: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeframeOptionSelected: {
    borderColor: '#059669',
    backgroundColor: '#f0fdf4',
  },
  timeframeLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  timeframePreview: {
    fontSize: 14,
    color: '#64748b',
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
    backgroundColor: '#059669',
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
  challengeCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  challengeIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  challengeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
    textAlign: 'center',
  },
  challengeDescription: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  comparisonMainCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  comparisonMainTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 20,
  },
  comparisonGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  comparisonItem: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  comparisonEmoji: {
    fontSize: 24,
    marginBottom: 8,
  },
  comparisonLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 6,
    textAlign: 'center',
  },
  comparisonAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  spentAmount: {
    color: '#dc2626',
  },
  savedAmount: {
    color: '#0ea5e9',
  },
  investedAmount: {
    color: '#059669',
  },
  comparisonSubtext: {
    fontSize: 10,
    color: '#9ca3af',
    textAlign: 'center',
  },
  advantageCard: {
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  advantageText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#047857',
    textAlign: 'center',
  },
  equivalenciesCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  equivalenciesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 12,
  },
  equivalencyItem: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 6,
    paddingLeft: 8,
  },
  progressCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 16,
  },
  progressBars: {
    gap: 12,
  },
  progressBarContainer: {
    gap: 6,
  },
  progressBarLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  resultProgressBar: {
    height: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
    overflow: 'hidden',
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  spentBar: {
    backgroundColor: '#ef4444',
  },
  investedBar: {
    backgroundColor: '#10b981',
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