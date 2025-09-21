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
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../utils/api';
import { useCurrency } from '../hooks/useCurrency';

const { width } = Dimensions.get('window');

// Tipos
interface GoalType {
  name: string;
  icon: string;
  percentageOptions: Array<{
    value: number;
    label: string;
    description: string;
  }>;
  suggestions: Array<{
    amount: number;
    description: string;
  }>;
}

interface GoalResult {
  goalAmount: number;
  totalValue: number;
  percentage: number;
  timeframe: number;
  monthlySavingsRequired: number;
  monthlyInvestmentRequired: number;
  investmentAdvantage: number;
  milestones: Array<{
    month: number;
    amount: number;
    percentage: number;
    description: string;
  }>;
  goalType: string;
  description: string;
}

const timeframeOptions = [
  { months: 12, label: '1 año' },
  { months: 24, label: '2 años' },
  { months: 36, label: '3 años' },
  { months: 60, label: '5 años' },
  { months: 120, label: '10 años' }
];

export default function GoalCalculatorScreen() {
  const navigation = useNavigation();
  const { formatCurrency } = useCurrency();
  const [step, setStep] = useState(1); // 1: Tipo, 2: Valor, 3: Porcentaje, 4: Tiempo, 5: Resultado
  const [goalTypes, setGoalTypes] = useState<Record<string, GoalType>>({});
  const [loading, setLoading] = useState(false);
  const [animatedValue] = useState(new Animated.Value(0));

  // Estados del formulario
  const [selectedGoalType, setSelectedGoalType] = useState('');
  const [totalValue, setTotalValue] = useState('');
  const [selectedPercentage, setSelectedPercentage] = useState(0);
  const [selectedTimeframe, setSelectedTimeframe] = useState(36);
  const [result, setResult] = useState<GoalResult | null>(null);
  const [showInfoModal, setShowInfoModal] = useState(false);

  useEffect(() => {
    loadGoalTypes();
  }, []);

  const loadGoalTypes = async () => {
    try {
      const response = await api.get('/investment/goal-types');
      setGoalTypes(response.data);
    } catch (error) {
      console.error('Error loading goal types:', error);
    }
  };

  const calculateGoal = async () => {
    try {
      setLoading(true);
      
      const response = await api.post('/investment/calculate-goal', {
        goalType: selectedGoalType,
        totalValue: parseInt(totalValue),
        percentage: selectedPercentage,
        timeframe: selectedTimeframe,
        investmentReturn: 8 // Retorno balanceado por defecto
      });

      setResult(response.data);
      setStep(5);
      
      // Animar la aparición de resultados
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start();

    } catch (error: any) {
      console.error('Error calculating goal:', error);
      Alert.alert(
        'Error',
        error.response?.data?.error || 'No se pudo calcular la meta'
      );
    } finally {
      setLoading(false);
    }
  };


  const resetCalculator = () => {
    setStep(1);
    setSelectedGoalType('');
    setTotalValue('');
    setSelectedPercentage(0);
    setSelectedTimeframe(36);
    setResult(null);
    animatedValue.setValue(0);
  };

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>🎯 ¿Cuál es tu meta?</Text>
      <Text style={styles.stepSubtitle}>Selecciona el tipo de meta que quieres alcanzar</Text>

      <View style={styles.goalTypesList}>
        {Object.entries(goalTypes).map(([key, goalType]) => (
          <TouchableOpacity
            key={key}
            style={[
              styles.goalTypeCard,
              selectedGoalType === key && styles.goalTypeCardSelected
            ]}
            onPress={() => {
              setSelectedGoalType(key);
              setSelectedPercentage(goalType.percentageOptions[1]?.value || 20);
            }}
          >
            <Text style={styles.goalTypeIcon}>{goalType.icon}</Text>
            <Text style={styles.goalTypeName}>{goalType.name}</Text>
            {selectedGoalType === key && (
              <Ionicons name="checkmark-circle" size={24} color="#8B5CF6" style={styles.checkIcon} />
            )}
          </TouchableOpacity>
        ))}
      </View>

      {selectedGoalType && (
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
      <Text style={styles.stepTitle}>💰 ¿Cuál es el valor total?</Text>
      <Text style={styles.stepSubtitle}>
        {goalTypes[selectedGoalType]?.icon} {goalTypes[selectedGoalType]?.name}
      </Text>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Valor total en RD$</Text>
        <TextInput
          style={styles.textInput}
          value={totalValue}
          onChangeText={setTotalValue}
          placeholder="Ejemplo: 1500000"
          keyboardType="numeric"
          placeholderTextColor="#9CA3AF"
        />
      </View>

      {/* Sugerencias */}
      <View style={styles.suggestionsContainer}>
        <Text style={styles.suggestionsTitle}>💡 Valores típicos:</Text>
        {goalTypes[selectedGoalType]?.suggestions.map((suggestion, index) => (
          <TouchableOpacity
            key={index}
            style={styles.suggestionItem}
            onPress={() => setTotalValue(suggestion.amount.toString())}
          >
            <Text style={styles.suggestionAmount}>{formatCurrency(suggestion.amount)}</Text>
            <Text style={styles.suggestionDescription}>{suggestion.description}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.backButton} onPress={() => setStep(1)}>
          <Ionicons name="chevron-back" size={20} color="#64748b" />
          <Text style={styles.backButtonText}>Atrás</Text>
        </TouchableOpacity>

        {totalValue && parseInt(totalValue) > 0 && (
          <TouchableOpacity
            style={styles.nextButton}
            onPress={() => setStep(3)}
          >
            <Text style={styles.nextButtonText}>Continuar</Text>
            <Ionicons name="chevron-forward" size={20} color="white" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>📊 ¿Qué porcentaje necesitas ahorrar?</Text>
      <Text style={styles.stepSubtitle}>
        Para alcanzar tu meta de {formatCurrency(parseInt(totalValue))} total
      </Text>

      <View style={styles.percentageOptions}>
        {goalTypes[selectedGoalType]?.percentageOptions.map((option, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.percentageOption,
              selectedPercentage === option.value && styles.percentageOptionSelected
            ]}
            onPress={() => setSelectedPercentage(option.value)}
          >
            <Text style={styles.percentageLabel}>{option.label}</Text>
            <Text style={styles.percentageDescription}>{option.description}</Text>
            <Text style={styles.percentageAmount}>
              {formatCurrency((parseInt(totalValue) * option.value) / 100)}
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
          style={styles.nextButton}
          onPress={() => setStep(4)}
        >
          <Text style={styles.nextButtonText}>Continuar</Text>
          <Ionicons name="chevron-forward" size={20} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStep4 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>⏰ ¿En cuánto tiempo?</Text>
      <Text style={styles.stepSubtitle}>
        Para ahorrar {formatCurrency((parseInt(totalValue) * selectedPercentage) / 100)}
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
            <Text style={styles.timeframeMonthly}>
              ~{formatCurrency(((parseInt(totalValue) * selectedPercentage) / 100) / option.months)}/mes
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.backButton} onPress={() => setStep(3)}>
          <Ionicons name="chevron-back" size={20} color="#64748b" />
          <Text style={styles.backButtonText}>Atrás</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.calculateButton}
          onPress={calculateGoal}
          disabled={loading}
        >
          <LinearGradient
            colors={['#8B5CF6', '#7C3AED']}
            style={styles.calculateButtonGradient}
          >
            {loading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <>
                <Text style={styles.calculateButtonText}>🎯 CALCULAR META</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStep5 = () => result && (
    <Animated.View style={[styles.resultContainer, { opacity: animatedValue }]}>
      <Text style={styles.resultTitle}>🎉 ¡Tu Plan de Meta Personal!</Text>

      {/* Resumen de la meta */}
      <View style={styles.goalSummaryCard}>
        <Text style={styles.goalSummaryTitle}>{result.description}</Text>
        <Text style={styles.goalAmount}>{formatCurrency(result.goalAmount)}</Text>
        <Text style={styles.goalTimeframe}>En {result.timeframe} meses</Text>
      </View>

      {/* Comparación de métodos */}
      <View style={styles.comparisonCard}>
        <View style={styles.comparisonTitleRow}>
          <Text style={styles.comparisonTitle}>💡 Ahorro vs Inversión</Text>
          <TouchableOpacity 
            style={styles.infoButton} 
            onPress={() => setShowInfoModal(true)}
          >
            <Ionicons name="information-circle-outline" size={16} color="#2563EB" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.comparisonRow}>
          <View style={styles.comparisonMethod}>
            <Text style={styles.comparisonLabel}>Solo ahorrando:</Text>
            <Text style={styles.comparisonAmount}>
              {formatCurrency(result.monthlySavingsRequired)}/mes
            </Text>
          </View>
          
          <View style={styles.comparisonMethod}>
            <Text style={styles.comparisonLabel}>Ahorro + inversión:</Text>
            <Text style={[styles.comparisonAmount, styles.investmentAmount]}>
              {formatCurrency(result.monthlyInvestmentRequired)}/mes
            </Text>
          </View>
        </View>

        {result.investmentAdvantage > 0 && (
          <Text style={styles.advantageText}>
            💰 Ahorras {formatCurrency(result.investmentAdvantage)}/mes invirtiendo
          </Text>
        )}
      </View>

      {/* Hitos */}
      <View style={styles.milestonesCard}>
        <Text style={styles.milestonesTitle}>🎯 Hitos en tu camino:</Text>
        {result.milestones.map((milestone, index) => (
          <View key={index} style={styles.milestoneItem}>
            <View style={styles.milestoneContent}>
              <Text style={styles.milestoneMonth}>Mes {milestone.month}</Text>
              <Text style={styles.milestoneAmount}>
                {formatCurrency(milestone.amount)}
              </Text>
            </View>
            <Text style={styles.milestoneDescription}>{milestone.description}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={styles.resetButton}
        onPress={resetCalculator}
      >
        <Text style={styles.resetButtonText}>🔄 Calcular otra meta</Text>
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
        <Text style={styles.title}>🎯 Calculadora de Metas</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Progress indicator */}
      {step < 5 && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${(step / 4) * 100}%` }
              ]} 
            />
          </View>
          <Text style={styles.progressText}>Paso {step} de 4</Text>
        </View>
      )}

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
        {step === 5 && renderStep5()}
      </ScrollView>

      {/* Modal de información */}
      <Modal
        visible={showInfoModal}
        transparent={true}
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
            
            <Text style={styles.modalTitle}>🎯 ¿Qué significa esto?</Text>
            
            <Text style={styles.modalText}>
              • Si solo ahorras (0% interés), necesitas guardar{' '}
              <Text style={styles.modalHighlight}>
                {result ? formatCurrency(result.monthlySavingsRequired) : 'X'}/mes
              </Text>{'\n\n'}
              • Si inviertes con rendimiento (5-8% anual aprox.), solo necesitas{' '}
              <Text style={styles.modalHighlight}>
                {result ? formatCurrency(result.monthlyInvestmentRequired) : 'Y'}/mes
              </Text>{'\n\n'}
              • La diferencia de{' '}
              <Text style={styles.modalHighlight}>
                {result ? formatCurrency(result.investmentAdvantage) : 'Z'}
              </Text>{' '}
              es lo que "ahorras" mensualmente al invertir vs solo guardar dinero.
            </Text>
          </View>
        </TouchableOpacity>
      </Modal>
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
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#8B5CF6',
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
  goalTypesList: {
    gap: 12,
  },
  goalTypeCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
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
  goalTypeCardSelected: {
    borderColor: '#8B5CF6',
    backgroundColor: '#f3f4f6',
  },
  goalTypeIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  goalTypeName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
  },
  checkIcon: {
    marginLeft: 12,
  },
  inputContainer: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  textInput: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  suggestionsContainer: {
    gap: 12,
  },
  suggestionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  suggestionItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  suggestionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#8B5CF6',
    marginBottom: 4,
  },
  suggestionDescription: {
    fontSize: 14,
    color: '#64748b',
  },
  percentageOptions: {
    gap: 12,
  },
  percentageOption: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  percentageOptionSelected: {
    borderColor: '#8B5CF6',
    backgroundColor: '#f3f4f6',
  },
  percentageLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  percentageDescription: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 8,
  },
  percentageAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#8B5CF6',
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
    borderColor: '#8B5CF6',
    backgroundColor: '#f3f4f6',
  },
  timeframeLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  timeframeMonthly: {
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
    backgroundColor: '#8B5CF6',
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
  goalSummaryCard: {
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
  goalSummaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
    textAlign: 'center',
  },
  goalAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#8B5CF6',
    marginBottom: 8,
  },
  goalTimeframe: {
    fontSize: 16,
    color: '#64748b',
  },
  comparisonCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  comparisonTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
  },
  comparisonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  comparisonMethod: {
    flex: 1,
    alignItems: 'center',
  },
  comparisonLabel: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 8,
  },
  comparisonAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  investmentAmount: {
    color: '#059669',
  },
  advantageText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#059669',
    textAlign: 'center',
    backgroundColor: '#f0fdf4',
    padding: 12,
    borderRadius: 8,
  },
  milestonesCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  milestonesTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 16,
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
    alignItems: 'flex-start',
  },
  milestoneMonth: {
    fontSize: 12,
    color: '#8B5CF6',
    fontWeight: '600',
    marginBottom: 2,
  },
  milestoneAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  milestoneDescription: {
    fontSize: 12,
    color: '#64748b',
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
  // Estilos para el header del card y modal de información
  comparisonTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  infoButton: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.2)',
  },
  // Estilos del modal de información
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  modalCloseButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 4,
    zIndex: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 16,
    textAlign: 'center',
    paddingRight: 32, // Espacio para el botón cerrar
  },
  modalText: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
  },
  modalBold: {
    fontWeight: '600',
    color: '#1e293b',
  },
  modalHighlight: {
    fontWeight: 'bold',
    color: '#2563EB',
  },
});