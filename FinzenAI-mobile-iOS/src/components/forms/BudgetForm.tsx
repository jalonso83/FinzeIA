import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { categoriesAPI, budgetsAPI, Category, Budget } from '../../utils/api';
import { useDashboardStore } from '../../stores/dashboard';
import { useCurrency } from '../../hooks/useCurrency';
import CustomModal from '../modals/CustomModal';
import CategoryPicker, { CategorySelectSheet } from './CategoryPicker';

import { logger } from '../../utils/logger';
interface BudgetFormProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
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
    type: 'EXPENSE' as 'EXPENSE' | 'INCOME',
  });
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [showCategorySheet, setShowCategorySheet] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateInfo, setDuplicateInfo] = useState<any>(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [originalFormData, setOriginalFormData] = useState({
    amount: '',
    categoryId: '',
    period: 'monthly',
    type: 'EXPENSE' as 'EXPENSE' | 'INCOME',
  });

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
        const initialData = {
          amount: editBudget.amount.toString(),
          categoryId: editBudget.category?.id || editBudget.category_id || '',
          period: editBudget.period,
          type: (editBudget.type ?? 'EXPENSE') as 'EXPENSE' | 'INCOME',
        };
        setFormData(initialData);
        setOriginalFormData(initialData); // Guardar valores originales
      } else {
        resetForm();
        setOriginalFormData({
          amount: '',
          categoryId: '',
          period: 'monthly',
          type: 'EXPENSE',
        });
      }
    }
  }, [visible, editBudget]);

  // Al cambiar de tipo hay que traer el otro conjunto de categorías.
  useEffect(() => {
    if (visible) loadCategories();
  }, [formData.type]);

  const loadCategories = async () => {
    try {
      setLoadingCategories(true);
      const response = await categoriesAPI.getAll();
      // Las categorías ofrecidas dependen del TIPO de presupuesto. Antes esto
      // filtraba siempre a 'EXPENSE', y ese filtro era la única razón por la que
      // no existían presupuestos de ingreso: el backend ni siquiera lo validaba.
      const delTipo = response.data.filter(
        (cat: Category) => cat.type === formData.type
      );
      setCategories(delTipo);
    } catch (error) {
      logger.error('Error loading categories:', error);
      setErrorMessage('No se pudieron cargar las categorías');
      setShowErrorModal(true);
    } finally {
      setLoadingCategories(false);
    }
  };

  const resetForm = () => {
    setFormData({
      amount: '',
      type: 'EXPENSE',
      categoryId: '',
      period: 'monthly',
    });
  };

  // Verificar si hay cambios (solo para edición)
  const hasChanges = () => {
    if (!editBudget) return true; // Si es nuevo presupuesto, siempre habilitar
    return (
      formData.amount !== originalFormData.amount ||
      formData.categoryId !== originalFormData.categoryId ||
      formData.period !== originalFormData.period
    );
  };

  const handleSubmit = async () => {
    // Validaciones (replicando la web)
    if (!formData.categoryId) {
      setErrorMessage('Selecciona una categoría');
      setShowErrorModal(true);
      return;
    }

    if (!formData.amount || isNaN(Number(formData.amount)) || Number(formData.amount) <= 0) {
      setErrorMessage('Ingresa un monto válido');
      setShowErrorModal(true);
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
        type: formData.type,
        start_date: start,
        end_date: end,
        is_active: true,
      };

      let message = '';
      if (editBudget) {
        await budgetsAPI.update(editBudget.id, budgetData);
        message = 'Presupuesto actualizado correctamente';
      } else {
        await budgetsAPI.create(budgetData);
        message = 'Presupuesto creado correctamente';
      }

      logger.log('✅ Presupuesto guardado exitosamente');

      // Llamar callback con mensaje (Screen cerrará formulario y mostrará modal)
      onBudgetChange();
      onSuccess(message);
    } catch (error: any) {
      logger.error('Error saving budget:', error);

      // Detectar error de presupuesto duplicado (409)
      if (error.response?.status === 409 && error.response?.data?.existingBudget) {
        setDuplicateInfo(error.response.data);
        setShowDuplicateModal(true);
        setLoading(false);
        return;
      }

      const errMsg = error.response?.data?.message || 'Error al guardar el presupuesto';
      setErrorMessage(errMsg);
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateExisting = async () => {
    if (!duplicateInfo?.existingBudget) return;

    try {
      setLoading(true);
      setShowDuplicateModal(false);

      // Actualizar el presupuesto existente con el nuevo monto
      const newAmount = Number(formData.amount);
      await budgetsAPI.update(duplicateInfo.existingBudget.id, {
        amount: newAmount
      });

      logger.log('✅ Presupuesto duplicado actualizado exitosamente');

      const message = `Presupuesto de "${duplicateInfo.existingBudget.category.name}" actualizado a ${formatCurrency(newAmount)}`;

      // Llamar callback con mensaje (Screen cerrará formulario y mostrará modal)
      onBudgetChange();
      onSuccess(message);
      setDuplicateInfo(null);
    } catch (error: any) {
      logger.error('Error updating budget:', error);
      setErrorMessage('No se pudo actualizar el presupuesto');
      setShowErrorModal(true);
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
            {editBudget ? 'Editar Presupuesto' : 'Nuevo Presupuesto'}
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
          {/* Tipo de presupuesto. Va ARRIBA de la categoría a propósito: decide
              qué categorías se ofrecen, así que elegirlo después obligaría a
              descartar la categoría ya seleccionada. */}
          <View style={styles.section}>
            <Text style={styles.label}>Tipo</Text>
            <View style={styles.periodsContainer}>
              {([
                { value: 'EXPENSE', label: 'Gasto' },
                { value: 'INCOME', label: 'Ingreso' },
              ] as const).map((t) => (
                <TouchableOpacity
                  key={t.value}
                  style={[
                    styles.periodButton,
                    formData.type === t.value && styles.periodButtonActive,
                  ]}
                  disabled={!!editBudget}
                  onPress={() => {
                    if (formData.type === t.value) return;
                    // Cambiar de tipo invalida la categoría elegida: pertenece al
                    // otro conjunto. Se limpia para no mandar una combinación que
                    // el backend rechazaría.
                    setFormData({ ...formData, type: t.value, categoryId: '' });
                  }}
                >
                  <Text style={[
                    styles.periodButtonText,
                    formData.type === t.value && styles.periodButtonTextActive,
                  ]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {!!editBudget && (
              <Text style={styles.typeLockedHint}>
                El tipo no se puede cambiar en un presupuesto ya creado.
              </Text>
            )}
          </View>

          {/* Categoría — combobox: el botón abre una hoja de selección (overlay
              a pantalla completa que se renderiza en la raíz del modal, abajo). */}
          <View style={styles.section}>
            <Text style={styles.label}>Categoría</Text>
            <CategoryPicker
              categories={categories}
              value={formData.categoryId}
              onPress={() => setShowCategorySheet(true)}
              loading={loadingCategories}
            />
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
                  <Text style={styles.infoTitle}>
                    Presupuesto {formData.type === 'INCOME' ? 'de ingresos' : ''} {periods.find(p => p.value === formData.period)?.label}
                  </Text>
                  <Text style={styles.infoDescription}>
                    {formData.type === 'INCOME'
                      ? `Tu meta es recibir ${formatCurrency(Number(formData.amount))} ${periods.find(p => p.value === formData.period)?.label.toLowerCase()}`
                      : `Podrás gastar hasta ${formatCurrency(Number(formData.amount))} ${periods.find(p => p.value === formData.period)?.label.toLowerCase()}`}
                  </Text>
                </View>
              </View>
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
            style={[styles.saveButton, (loading || !hasChanges()) && styles.disabledButton]}
          >
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={loading || !hasChanges()}
              style={styles.saveButtonInner}
            >
              {loading ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <>
                  <Ionicons name="checkmark" size={20} color="white" />
                  <Text style={styles.saveButtonText}>
                    {editBudget ? 'Actualizar' : 'Crear'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </LinearGradient>
        </View>

        {/* Hoja de selección de categoría (overlay a pantalla completa, DENTRO del
            modal para superponerse al form; es un View, no un Modal → iOS-safe). */}
        <CategorySelectSheet
          visible={showCategorySheet}
          categories={categories}
          value={formData.categoryId}
          onSelect={(categoryId) => { setFormData({ ...formData, categoryId }); setShowCategorySheet(false); }}
          onClose={() => setShowCategorySheet(false)}
        />
      </SafeAreaView>
      </Modal>

      {/* Modal de error - FUERA del Modal pageSheet (iOS no soporta sibling/nested Modals).
         Antes estaba DENTRO del Modal pageSheet → riesgo de freeze al disparar errores. */}
      <CustomModal
        visible={showErrorModal}
        type="error"
        title="Error"
        message={errorMessage}
        buttonText="Entendido"
        onClose={() => setShowErrorModal(false)}
      />

      {/* Modal de presupuesto duplicado - FUERA del Modal pageSheet */}
      {duplicateInfo && (
        <CustomModal
          visible={showDuplicateModal}
          type="warning"
          title="Presupuesto ya existe"
          message={`Ya existe un presupuesto activo para "${duplicateInfo.existingBudget?.category?.name}" (${duplicateInfo.existingBudget?.period}).\n\nPresupuesto actual: ${formatCurrency(duplicateInfo.existingBudget?.amount || 0)}\nGastado: ${formatCurrency(duplicateInfo.existingBudget?.spent || 0)}\n\n¿Deseas actualizar el monto del presupuesto existente?`}
          buttonText="Actualizar monto"
          showSecondaryButton={true}
          secondaryButtonText="Cancelar"
          onSecondaryPress={() => {
            setShowDuplicateModal(false);
            setDuplicateInfo(null);
          }}
          onClose={handleUpdateExisting}
        />
      )}
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
  typeLockedHint: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 6,
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