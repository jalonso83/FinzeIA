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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { categoriesAPI, budgetsAPI, Category, Budget } from '../../utils/api';
import { useDashboardStore } from '../../stores/dashboard';
import { useCurrency } from '../../hooks/useCurrency';

interface BudgetFormProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editBudget?: Budget | null;
}

const BudgetForm: React.FC<BudgetFormProps> = ({
  visible,
  onClose,
  onSuccess,
  editBudget,
}) => {
  const [formData, setFormData] = useState({
    amount: '',
    categoryId: '',
    period: 'monthly',
  });
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);
  
  // Ref para el ScrollView de categorías
  const categoriesScrollRef = useRef<ScrollView>(null);
  
  // Dashboard store para notificar cambios
  const { onBudgetChange } = useDashboardStore();
  
  // Hook para moneda del usuario
  const { formatCurrency } = useCurrency();

  const periods = [
    { value: 'weekly', label: 'Semanal' },
    { value: 'monthly', label: 'Mensual' },
    { value: 'yearly', label: 'Anual' },
  ];

  useEffect(() => {
    if (visible) {
      loadCategories();
      if (editBudget) {
        setFormData({
          amount: editBudget.amount.toString(),
          categoryId: editBudget.category?.id || editBudget.category_id || '',
          period: editBudget.period,
        });
      } else {
        resetForm();
      }
    }
  }, [visible, editBudget]);

  const loadCategories = async () => {
    try {
      setLoadingCategories(true);
      const response = await categoriesAPI.getAll();
      // Filtrar solo categorías de gastos para presupuestos (replicando la web)
      const expenseCategories = response.data.filter(
        (cat: Category) => cat.type === 'EXPENSE'
      );
      setCategories(expenseCategories);
    } catch (error) {
      console.error('Error loading categories:', error);
      Alert.alert('Error', 'No se pudieron cargar las categorías');
    } finally {
      setLoadingCategories(false);
    }
  };

  const resetForm = () => {
    setFormData({
      amount: '',
      categoryId: '',
      period: 'monthly',
    });
  };

  const handleSubmit = async () => {
    // Validaciones (replicando la web)
    if (!formData.categoryId) {
      Alert.alert('Error', 'Selecciona una categoría');
      return;
    }

    if (!formData.amount || isNaN(Number(formData.amount)) || Number(formData.amount) <= 0) {
      Alert.alert('Error', 'Ingresa un monto válido');
      return;
    }

    try {
      setLoading(true);
      
      // Calcular las fechas según el período (replicando la web)
      const { start, end } = getPeriodDates(formData.period);
      
      // Obtener el nombre de la categoría seleccionada (replicando la web)
      const selectedCategory = categories.find(c => c.id === formData.categoryId);
      const categoryName = selectedCategory ? selectedCategory.name : '';
      
      const budgetData = {
        name: categoryName,
        category_id: formData.categoryId,
        amount: Number(formData.amount),
        period: formData.period,
        start_date: start,
        end_date: end,
        is_active: true,
      };

      if (editBudget) {
        await budgetsAPI.update(editBudget.id, budgetData);
        Alert.alert('Éxito', 'Presupuesto actualizado correctamente');
      } else {
        await budgetsAPI.create(budgetData);
        Alert.alert('Éxito', 'Presupuesto creado correctamente');
      }

      // Notificar al dashboard que hubo cambios
      onBudgetChange();
      
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error saving budget:', error);
      const errorMessage = error.response?.data?.message || 'Error al guardar el presupuesto';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (value: string) => {
    const numericValue = value.replace(/[^0-9.]/g, '');
    return numericValue;
  };

  // Función para calcular fechas según el período (replicando la web)
  const getPeriodDates = (period: string): { start: string; end: string } => {
    const now = new Date();
    let start: Date, end: Date;
    if (period === 'weekly') {
      // Lunes de la semana actual
      const day = now.getDay();
      const diffToMonday = (day === 0 ? -6 : 1) - day;
      start = new Date(now);
      start.setDate(now.getDate() + diffToMonday);
      start.setHours(0, 0, 0, 0);
      // Domingo de la semana actual
      end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
    } else if (period === 'monthly') {
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    } else if (period === 'yearly') {
      start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    } else {
      start = now;
      end = now;
    }
    return {
      start: start.toISOString(),
      end: end.toISOString(),
    };
  };

  // Función para hacer scroll a la categoría seleccionada
  const scrollToSelectedCategory = () => {
    if (!formData.categoryId || categories.length === 0) return;
    
    const selectedIndex = categories.findIndex(cat => cat.id === formData.categoryId);
    if (selectedIndex === -1) return;
    
    // Calcular posición (los botones pueden ser más anchos por el texto)
    const estimatedButtonWidth = 90; // Un poco más que minWidth por el texto
    const gap = 12; // gap definido en estilos
    const padding = 16; // paddingHorizontal del botón
    
    // Posición aproximada centrada
    const scrollToX = Math.max(0, selectedIndex * (estimatedButtonWidth + gap) - 50);
    
    // Hacer scroll con animación suave
    setTimeout(() => {
      categoriesScrollRef.current?.scrollTo({
        x: scrollToX,
        animated: true,
      });
    }, 200); // Delay más largo para asegurar render completo
  };

  // Effect para hacer scroll cuando se cargan las categorías y hay una seleccionada
  useEffect(() => {
    if (categories.length > 0 && formData.categoryId) {
      scrollToSelectedCategory();
    }
  }, [categories, formData.categoryId]);

  return (
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
            {editBudget ? 'Editar Presupuesto' : 'Nuevo Presupuesto'}
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
          {/* Categoría */}
          <View style={styles.section}>
            <Text style={styles.label}>Categoría</Text>
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
                      onPress={() => setFormData({ ...formData, categoryId: category.id })}
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

          {/* Monto */}
          <View style={styles.section}>
            <Text style={styles.label}>Monto del Presupuesto</Text>
            <View style={styles.amountContainer}>
              <Text style={styles.currencySymbol}>{formatCurrency(0).replace(/[0.,]/g, '').trim()}</Text>
              <TextInput
                style={styles.amountInput}
                value={formData.amount}
                onChangeText={(text) => setFormData({ ...formData, amount: formatAmount(text) })}
                placeholder="0"
                placeholderTextColor="#9ca3af"
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* Período */}
          <View style={styles.section}>
            <Text style={styles.label}>Período</Text>
            <View style={styles.periodsContainer}>
              {periods.map((period) => (
                <TouchableOpacity
                  key={period.value}
                  style={[
                    styles.periodButton,
                    formData.period === period.value && styles.periodButtonActive,
                  ]}
                  onPress={() => setFormData({ ...formData, period: period.value })}
                >
                  <Text style={[
                    styles.periodButtonText,
                    formData.period === period.value && styles.periodButtonTextActive,
                  ]}>
                    {period.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>


          {/* Información del Presupuesto */}
          {formData.amount && (
            <View style={styles.infoSection}>
              <View style={styles.infoCard}>
                <Ionicons name="information-circle" size={20} color="#2563EB" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoTitle}>Presupuesto {periods.find(p => p.value === formData.period)?.label}</Text>
                  <Text style={styles.infoDescription}>
                    Podrás gastar hasta {formatCurrency(Number(formData.amount))} {periods.find(p => p.value === formData.period)?.label.toLowerCase()}
                  </Text>
                </View>
              </View>
            </View>
          )}
        </ScrollView>

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
                    {editBudget ? 'Actualizar' : 'Crear Presupuesto'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

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
  periodsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  periodButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    minWidth: 80,
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#2563EB',
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  periodButtonTextActive: {
    color: '#2563EB',
    fontWeight: '600',
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
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  switchInfo: {
    flex: 1,
    marginRight: 16,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  switchDescription: {
    fontSize: 12,
    color: '#64748b',
  },
  infoSection: {
    marginTop: 20,
    marginBottom: 20,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: 4,
  },
  infoDescription: {
    fontSize: 12,
    color: '#1e40af',
    lineHeight: 16,
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

export default BudgetForm;