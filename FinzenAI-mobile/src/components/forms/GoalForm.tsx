import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { categoriesAPI, goalsAPI, Category } from '../../utils/api';
import { useDashboardStore } from '../../stores/dashboard';
import { useCurrency } from '../../hooks/useCurrency';
import CustomModal from '../modals/CustomModal';

interface Goal {
  id: string;
  name: string;
  description?: string;
  targetAmount: number;
  currentAmount: number;
  targetDate?: string;
  categoryId: string;
  priority: string;
  isCompleted: boolean;
  isActive: boolean;
  monthlyTargetPercentage?: number;
  monthlyContributionAmount?: number;
  contributionsCount: number;
  lastContributionDate?: string;
  createdAt: string;
  updatedAt: string;
  category: {
    id: string;
    name: string;
    icon: string;
    type: string;
  };
}

interface GoalFormProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editGoal?: Goal | null;
}

interface FormData {
  name: string;
  description: string;
  targetAmount: string;
  targetDate: string;
  categoryId: string;
  priority: 'low' | 'medium' | 'high';
  monthlyTargetPercentage: string;
  monthlyContributionAmount: string;
}

const GoalForm: React.FC<GoalFormProps> = ({
  visible,
  onClose,
  onSuccess,
  editGoal,
}) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [goalType, setGoalType] = useState<'percentage' | 'amount'>('percentage');
  const [warnings, setWarnings] = useState<string[]>([]);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    targetAmount: '',
    targetDate: '',
    categoryId: '',
    priority: 'medium',
    monthlyTargetPercentage: '',
    monthlyContributionAmount: ''
  });
  
  // Ref para el ScrollView de categorías
  const categoriesScrollRef = useRef<ScrollView>(null);
  
  // Dashboard store para notificar cambios
  const { onGoalChange } = useDashboardStore();
  
  // Hook para moneda del usuario
  const { formatCurrency } = useCurrency();

  const priorities = [
    { value: 'high', label: 'Alta', color: '#dc2626', bgColor: '#fef2f2' },
    { value: 'medium', label: 'Media', color: '#d97706', bgColor: '#fffbeb' },
    { value: 'low', label: 'Baja', color: '#059669', bgColor: '#f0fdf4' },
  ];

  // Función para convertir YYYY-MM-DD (backend) a DD-MM-YYYY (display)
  const convertToDisplayFormat = (backendDate: string) => {
    if (!backendDate) return '';
    const parts = backendDate.split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts;
      return `${day}-${month}-${year}`;
    }
    return backendDate;
  };

  // Cargar datos de la meta a editar
  useEffect(() => {
    if (editGoal) {
      const backendDate = editGoal.targetDate ? new Date(editGoal.targetDate).toISOString().split('T')[0] : '';

      setFormData({
        name: editGoal.name,
        description: editGoal.description || '',
        targetAmount: editGoal.targetAmount.toString(),
        targetDate: convertToDisplayFormat(backendDate),
        categoryId: editGoal.category?.id || editGoal.categoryId || '',
        priority: editGoal.priority as 'low' | 'medium' | 'high',
        monthlyTargetPercentage: editGoal.monthlyTargetPercentage?.toString() || '',
        monthlyContributionAmount: editGoal.monthlyContributionAmount?.toString() || ''
      });

      // Determinar el tipo de meta
      if (editGoal.monthlyTargetPercentage) {
        setGoalType('percentage');
      } else if (editGoal.monthlyContributionAmount) {
        setGoalType('amount');
      }
    }
  }, [editGoal]);

  // Cargar categorías al montar el componente
  useEffect(() => {
    if (visible) {
      loadCategories();
      if (!editGoal) {
        resetForm();
      }
    }
  }, [visible, editGoal]);

  const loadCategories = async () => {
    try {
      setLoadingCategories(true);
      const response = await categoriesAPI.getAll();
      setCategories(response.data);
    } catch (error) {
      console.error('Error loading categories:', error);
      setErrorMessage('No se pudieron cargar las categorías');
      setShowErrorModal(true);
    } finally {
      setLoadingCategories(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      targetAmount: '',
      targetDate: '',
      categoryId: '',
      priority: 'medium',
      monthlyTargetPercentage: '',
      monthlyContributionAmount: ''
    });
  };

  // Validar y mostrar advertencias (replicando la web)
  const validateForm = () => {
    const newWarnings: string[] = [];

    // Validar porcentaje mensual
    if (goalType === 'percentage' && formData.monthlyTargetPercentage) {
      const percentage = parseFloat(formData.monthlyTargetPercentage);
      if (percentage > 30) {
        newWarnings.push('⚠️ Dedicar más del 30% de tus ingresos puede ser difícil de mantener. Considera un porcentaje más conservador.');
      }
      if (percentage > 50) {
        newWarnings.push('🚨 ¡Cuidado! Más del 50% de tus ingresos es muy agresivo y puede afectar tu calidad de vida.');
      }
    }

    // Validar monto fijo mensual (asumiendo ingreso estimado de 100,000 RD$)
    if (goalType === 'amount' && formData.monthlyContributionAmount) {
      const amount = parseFloat(formData.monthlyContributionAmount);
      const estimatedIncome = 100000; // Esto debería venir del perfil del usuario
      const percentageOfIncome = (amount / estimatedIncome) * 100;
      
      if (percentageOfIncome > 30) {
        newWarnings.push(`⚠️ Este monto representa el ${percentageOfIncome.toFixed(1)}% de tus ingresos estimados. Asegúrate de que sea sostenible.`);
      }
    }

    setWarnings(newWarnings);
    return newWarnings.length === 0;
  };

  // Validar cuando cambian los campos
  useEffect(() => {
    validateForm();
  }, [formData.monthlyTargetPercentage, formData.monthlyContributionAmount, goalType]);

  // Función para formatear fecha automáticamente (visual: DD-MM-YYYY)
  const formatDateDisplay = (value: string) => {
    // Remover todos los caracteres que no sean números
    const cleaned = value.replace(/\D/g, '');

    // Aplicar formato DD-MM-YYYY (visual para el usuario)
    if (cleaned.length >= 8) {
      return `${cleaned.substring(0, 2)}-${cleaned.substring(2, 4)}-${cleaned.substring(4, 8)}`;
    } else if (cleaned.length >= 4) {
      return `${cleaned.substring(0, 2)}-${cleaned.substring(2, 4)}-${cleaned.substring(4)}`;
    } else if (cleaned.length >= 2) {
      return `${cleaned.substring(0, 2)}-${cleaned.substring(2)}`;
    } else {
      return cleaned;
    }
  };

  // Función para convertir DD-MM-YYYY a YYYY-MM-DD (para backend)
  const convertToBackendFormat = (displayDate: string) => {
    const cleaned = displayDate.replace(/\D/g, '');
    if (cleaned.length === 8) {
      // DD MM YYYY -> YYYY-MM-DD
      const day = cleaned.substring(0, 2);
      const month = cleaned.substring(2, 4);
      const year = cleaned.substring(4, 8);
      return `${year}-${month}-${day}`;
    }
    return displayDate; // Si no está completo, devolver como está
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    let finalValue = value;

    // Aplicar formato especial para fecha (visual DD-MM-YYYY)
    if (field === 'targetDate') {
      finalValue = formatDateDisplay(value);
    }

    setFormData(prev => ({
      ...prev,
      [field]: finalValue
    }));
  };

  const handleSubmit = async () => {
    try {
      // Validaciones básicas (replicando la web)
      if (!formData.name || !formData.targetAmount || !formData.categoryId) {
        setErrorMessage('Por favor completa todos los campos requeridos');
        setShowErrorModal(true);
        return;
      }

      if (parseFloat(formData.targetAmount) <= 0) {
        setErrorMessage('El monto objetivo debe ser mayor a 0');
        setShowErrorModal(true);
        return;
      }

      setLoading(true);

      // Preparar datos para enviar (replicando la web)
      const goalData = {
        name: formData.name,
        description: formData.description || undefined,
        targetAmount: parseFloat(formData.targetAmount),
        targetDate: formData.targetDate ? convertToBackendFormat(formData.targetDate) : undefined,
        categoryId: formData.categoryId,
        priority: formData.priority,
        monthlyTargetPercentage: goalType === 'percentage' ? parseFloat(formData.monthlyTargetPercentage) : undefined,
        monthlyContributionAmount: goalType === 'amount' ? parseFloat(formData.monthlyContributionAmount) : undefined
      };

      let message = '';
      if (editGoal) {
        // Actualizar meta existente
        await goalsAPI.update(editGoal.id, goalData);
        message = 'Meta actualizada correctamente';
      } else {
        // Crear nueva meta
        await goalsAPI.create(goalData);
        message = 'Meta creada correctamente';
      }

      console.log('✅ Meta guardada exitosamente');
      console.log('📝 Mensaje de éxito:', message);

      // EJECUTAR CALLBACKS INMEDIATAMENTE - NO esperar al modal
      onGoalChange();
      onSuccess();

      // Configurar mensaje y mostrar modal de éxito
      setSuccessMessage(message);
      setShowSuccessModal(true);
      console.log('🟢 showSuccessModal activado');
    } catch (error: any) {
      console.error('Error al guardar meta:', error);
      const errMsg = error.response?.data?.message || 'Error al guardar la meta';
      setErrorMessage(errMsg);
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (value: string) => {
    const numericValue = value.replace(/[^0-9.]/g, '');
    return numericValue;
  };

  // Función para hacer scroll a la categoría seleccionada (replicando presupuestos)
  const scrollToSelectedCategory = () => {
    if (!formData.categoryId || categories.length === 0) return;
    
    const selectedIndex = categories.findIndex(cat => cat.id === formData.categoryId);
    if (selectedIndex === -1) return;
    
    // Calcular posición
    const estimatedButtonWidth = 90;
    const gap = 12;
    const scrollToX = Math.max(0, selectedIndex * (estimatedButtonWidth + gap) - 50);
    
    // Hacer scroll con animación suave
    setTimeout(() => {
      categoriesScrollRef.current?.scrollTo({
        x: scrollToX,
        animated: true,
      });
    }, 200);
  };

  // Effect para hacer scroll cuando se cargan las categorías y hay una seleccionada
  useEffect(() => {
    if (categories.length > 0 && formData.categoryId) {
      scrollToSelectedCategory();
    }
  }, [categories, formData.categoryId]);

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={onClose}
      >
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#64748b" />
            </TouchableOpacity>
            <Text style={styles.title}>
              {editGoal ? 'Editar Meta de Ahorro' : 'Nueva Meta de Ahorro'}
            </Text>
            <View style={styles.headerSpacer} />
          </View>

          <KeyboardAvoidingView
            style={styles.keyboardAvoidingView}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 140 : 20}
          >
            <ScrollView
              style={styles.content}
              contentContainerStyle={{ paddingBottom: 200 }}
              keyboardShouldPersistTaps="handled"
            >
              {/* Nombre de la meta */}
            <View style={styles.section}>
              <Text style={styles.label}>Nombre de la meta *</Text>
              <TextInput
                style={styles.input}
                value={formData.name}
                onChangeText={(text) => handleInputChange('name', text)}
                placeholder="Ej: La casa de mis sueños"
                placeholderTextColor="#9ca3af"
                maxLength={100}
              />
            </View>

            {/* Monto objetivo */}
            <View style={styles.section}>
              <Text style={styles.label}>Monto objetivo *</Text>
              <View style={styles.amountContainer}>
                <Text style={styles.currencySymbol}>{formatCurrency(0).replace(/[0.,]/g, '').trim()}</Text>
                <TextInput
                  style={styles.amountInput}
                  value={formData.targetAmount}
                  onChangeText={(text) => handleInputChange('targetAmount', formatAmount(text))}
                  placeholder="0.00"
                  placeholderTextColor="#9ca3af"
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* Categoría */}
            <View style={styles.section}>
              <Text style={styles.label}>Categoría *</Text>
              {loadingCategories ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#2563EB" />
                  <Text style={styles.loadingText}>Cargando categorías...</Text>
                </View>
              ) : (
                <ScrollView
                  ref={categoriesScrollRef}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                >
                  <View style={styles.categoriesContainer}>
                    {categories.map((category) => (
                      <TouchableOpacity
                        key={category.id}
                        style={[
                          styles.categoryButton,
                          formData.categoryId === category.id && styles.categoryButtonActive,
                        ]}
                        onPress={() => handleInputChange('categoryId', category.id)}
                      >
                        <Text style={styles.categoryIcon}>{category.icon}</Text>
                        <Text style={[
                          styles.categoryText,
                          formData.categoryId === category.id && styles.categoryTextActive,
                        ]}>
                          {category.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              )}
            </View>

            {/* Objetivo mensual */}
            <View style={styles.section}>
              <Text style={styles.label}>Objetivo mensual *</Text>
              <View style={styles.goalTypeContainer}>
                <TouchableOpacity
                  style={[
                    styles.goalTypeButton,
                    goalType === 'percentage' && styles.goalTypeButtonActive,
                  ]}
                  onPress={() => setGoalType('percentage')}
                >
                  <Text style={[
                    styles.goalTypeButtonText,
                    goalType === 'percentage' && styles.goalTypeButtonTextActive,
                  ]}>
                    Porcentaje de ingresos
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.goalTypeButton,
                    goalType === 'amount' && styles.goalTypeButtonActive,
                  ]}
                  onPress={() => setGoalType('amount')}
                >
                  <Text style={[
                    styles.goalTypeButtonText,
                    goalType === 'amount' && styles.goalTypeButtonTextActive,
                  ]}>
                    Monto fijo mensual
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Campo de porcentaje o monto */}
            {goalType === 'percentage' ? (
              <View style={styles.section}>
                <Text style={styles.label}>Porcentaje mensual *</Text>
                <View style={styles.amountContainer}>
                  <TextInput
                    style={styles.amountInput}
                    value={formData.monthlyTargetPercentage}
                    onChangeText={(text) => handleInputChange('monthlyTargetPercentage', formatAmount(text))}
                    placeholder="15"
                    placeholderTextColor="#9ca3af"
                    keyboardType="numeric"
                  />
                  <Text style={styles.currencySymbol}>%</Text>
                </View>
              </View>
            ) : (
              <View style={styles.section}>
                <Text style={styles.label}>Monto fijo mensual *</Text>
                <View style={styles.amountContainer}>
                  <Text style={styles.currencySymbol}>{formatCurrency(0).replace(/[0.,]/g, '').trim()}</Text>
                  <TextInput
                    style={styles.amountInput}
                    value={formData.monthlyContributionAmount}
                    onChangeText={(text) => handleInputChange('monthlyContributionAmount', formatAmount(text))}
                    placeholder="50000"
                    placeholderTextColor="#9ca3af"
                    keyboardType="numeric"
                  />
                </View>
              </View>
            )}

            {/* Fecha objetivo */}
            <View style={styles.section}>
              <Text style={styles.label}>Fecha objetivo (opcional)</Text>
              <View style={styles.dateContainer}>
                <Ionicons name="calendar-outline" size={20} color="#64748b" />
                <TextInput
                  style={styles.dateInput}
                  value={formData.targetDate}
                  onChangeText={(text) => handleInputChange('targetDate', text)}
                  placeholder="DD-MM-YYYY"
                  placeholderTextColor="#9ca3af"
                  keyboardType="numeric"
                  maxLength={10}
                />
              </View>
            </View>

            {/* Prioridad */}
            <View style={styles.section}>
              <Text style={styles.label}>Prioridad</Text>
              <View style={styles.prioritiesContainer}>
                {priorities.map((priority) => (
                  <TouchableOpacity
                    key={priority.value}
                    style={[
                      styles.priorityButton,
                      formData.priority === priority.value && {
                        backgroundColor: priority.bgColor,
                        borderColor: priority.color,
                      },
                    ]}
                    onPress={() => handleInputChange('priority', priority.value)}
                  >
                    <Text style={[
                      styles.priorityButtonText,
                      formData.priority === priority.value && { color: priority.color },
                    ]}>
                      {priority.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Descripción */}
            <View style={styles.section}>
              <Text style={styles.label}>Descripción (opcional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.description}
                onChangeText={(text) => handleInputChange('description', text)}
                placeholder="Describe tu meta..."
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={3}
                maxLength={200}
              />
            </View>

            {/* Advertencias */}
            {warnings.length > 0 && (
              <View style={styles.warningsSection}>
                <Text style={styles.warningsTitle}>Advertencias:</Text>
                {warnings.map((warning, index) => (
                  <View key={index} style={styles.warningCard}>
                    <Text style={styles.warningText}>{warning}</Text>
                  </View>
                ))}
              </View>
            )}
            </ScrollView>
          </KeyboardAvoidingView>

          {/* Botones de Acción */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>

            <LinearGradient
              colors={['#2563EB', '#1d4ed8']}
              style={[styles.saveButton, loading && styles.disabledButton]}
            >
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={loading}
                style={styles.saveButtonInner}
              >
                {loading ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={20} color="white" />
                    <Text style={styles.saveButtonText}>
                      {editGoal ? 'Actualizar Meta' : 'Crear Meta'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </LinearGradient>
          </View>

          {/* Modal de éxito */}
          <CustomModal
            visible={showSuccessModal}
            type="success"
            title="¡Meta guardada!"
            message={successMessage}
            buttonText="Continuar"
            onClose={() => {
              console.log('👆 Usuario presionó Continuar en modal de éxito');
              setShowSuccessModal(false);
              // Los callbacks ya se ejecutaron después de guardar
              // Solo cerrar el formulario
              onClose();
            }}
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
        </SafeAreaView>
      </Modal>
    </>
  );
};

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
    borderBottomColor: '#e5e7eb',
  },
  closeButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  headerSpacer: {
    width: 32,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1e293b',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#374151',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 16,
    color: '#1e293b',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748b',
  },
  categoriesContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 4,
  },
  categoryButton: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    minWidth: 80,
  },
  categoryButtonActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#2563EB',
  },
  categoryIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
    textAlign: 'center',
  },
  categoryTextActive: {
    color: '#2563EB',
    fontWeight: '600',
  },
  goalTypeContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  goalTypeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  goalTypeButtonActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#2563EB',
  },
  goalTypeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    textAlign: 'center',
  },
  goalTypeButtonTextActive: {
    color: '#2563EB',
    fontWeight: '600',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 12,
  },
  dateInput: {
    flex: 1,
    fontSize: 16,
    color: '#1e293b',
  },
  prioritiesContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  priorityButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  warningsSection: {
    marginTop: 20,
    marginBottom: 20,
  },
  warningsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  warningCard: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fbbf24',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  warningText: {
    fontSize: 12,
    color: '#92400e',
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  saveButton: {
    flex: 1,
    borderRadius: 12,
  },
  saveButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  disabledButton: {
    opacity: 0.7,
  },
});

export default GoalForm;