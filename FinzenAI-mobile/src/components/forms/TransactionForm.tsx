import React, { useState, useEffect } from 'react';
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
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { categoriesAPI, transactionsAPI, Category, Transaction } from '../../utils/api';
import { useDashboardStore } from '../../stores/dashboard';

interface TransactionFormProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editTransaction?: Transaction | null;
}

const TransactionForm: React.FC<TransactionFormProps> = ({
  visible,
  onClose,
  onSuccess,
  editTransaction,
}) => {
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    type: 'EXPENSE' as 'INCOME' | 'EXPENSE',
    categoryId: '',
    date: new Date().toISOString().split('T')[0],
  });
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);
  
  // Currency converter state (replicando exactamente la web)
  const [showConverter, setShowConverter] = useState(false);
  const [conversionDirection, setConversionDirection] = useState<'foreignToBase' | 'baseToForeign'>('foreignToBase');
  const [foreignAmount, setForeignAmount] = useState('');
  const [foreignCurrency, setForeignCurrency] = useState('USD');
  const [exchangeRate, setExchangeRate] = useState('');
  const [converterErrors, setConverterErrors] = useState<Record<string, string>>({});
  const [convertedAmount, setConvertedAmount] = useState<number | null>(null);
  const [lastExchangeRates, setLastExchangeRates] = useState<Record<string, number>>({});
  
  // Currency info (replicando la web - aquí deberías usar la moneda del usuario)
  const currency = { code: 'DOP', symbol: 'RD$', decimalPlaces: 2 };
  
  // Dashboard store para notificar cambios
  const { onTransactionChange } = useDashboardStore();

  useEffect(() => {
    if (visible) {
      loadCategories();
      loadLastExchangeRates();
      if (editTransaction) {
        console.log('Editando transacción:', editTransaction);
        console.log('Category data:', editTransaction.category);
        console.log('Category ID directo:', editTransaction.categoryId);
        
        const categoryId = editTransaction.category?.id || editTransaction.categoryId || '';
        console.log('Category ID final:', categoryId);
        
        setFormData({
          description: editTransaction.description,
          amount: editTransaction.amount.toString(),
          type: editTransaction.type,
          categoryId: categoryId,
          date: editTransaction.date.split('T')[0],
        });
      } else {
        resetForm();
      }
    }
  }, [visible, editTransaction]);

  // Effect to calculate conversion when values change (replicando la web)
  useEffect(() => {
    if (foreignAmount && exchangeRate && parseFloat(foreignAmount) > 0 && parseFloat(exchangeRate) > 0) {
      calculateConversion();
    } else {
      setConvertedAmount(null);
    }
  }, [foreignAmount, exchangeRate, foreignCurrency, conversionDirection]);
  
  // Effect to set exchange rate when foreign currency changes (replicando la web)
  useEffect(() => {
    if (lastExchangeRates[`${currency.code}_${foreignCurrency}`] && conversionDirection === 'foreignToBase') {
      setExchangeRate(lastExchangeRates[`${currency.code}_${foreignCurrency}`].toString());
    } else if (lastExchangeRates[`${foreignCurrency}_${currency.code}`] && conversionDirection === 'baseToForeign') {
      setExchangeRate(lastExchangeRates[`${foreignCurrency}_${currency.code}`].toString());
    } else {
      setExchangeRate('');
    }
  }, [foreignCurrency, conversionDirection, lastExchangeRates]);
  
  // Effect para validar categoría después de cargar las categorías (similar a la web)
  useEffect(() => {
    if (editTransaction && categories.length > 0 && formData.categoryId) {
      const selectedCategory = categories.find(cat => cat.id === formData.categoryId);
      const isCompatible = selectedCategory && (selectedCategory.type === formData.type || selectedCategory.type === 'BOTH');
      
      console.log('Validando categoría después de cargar:', {
        selectedCategory: selectedCategory?.name,
        categoryType: selectedCategory?.type,
        transactionType: formData.type,
        isCompatible
      });
      
      // Si la categoría no es compatible, buscar una por defecto o limpiar
      if (!isCompatible) {
        console.log('Categoría no compatible, limpiando...');
        setFormData(prev => ({ ...prev, categoryId: '' }));
      }
    }
  }, [categories, editTransaction]);

  const loadCategories = async () => {
    try {
      setLoadingCategories(true);
      const response = await categoriesAPI.getAll();
      setCategories(response.data);
    } catch (error) {
      console.error('Error loading categories:', error);
      Alert.alert('Error', 'No se pudieron cargar las categorías');
    } finally {
      setLoadingCategories(false);
    }
  };

  // Load last exchange rates from AsyncStorage (equivalente a localStorage en web)
  const loadLastExchangeRates = async () => {
    try {
      const savedRates = await AsyncStorage.getItem('lastExchangeRates');
      if (savedRates) {
        setLastExchangeRates(JSON.parse(savedRates));
      }
    } catch (error) {
      console.error('Error loading saved exchange rates:', error);
    }
  };

  // Open currency converter (replicando la web)
  const openConverter = () => {
    setShowConverter(true);
    setForeignAmount('');
    setConvertedAmount(null);
    setConverterErrors({});
    
    if (formData.amount && !isNaN(parseFloat(formData.amount)) && parseFloat(formData.amount) > 0 && conversionDirection === 'baseToForeign') {
      setForeignAmount(formData.amount);
    }
  };
  
  // Close currency converter (replicando la web)
  const closeConverter = () => {
    setShowConverter(false);
  };
  
  // Toggle conversion direction (replicando la web)
  const toggleConversionDirection = (direction: 'foreignToBase' | 'baseToForeign') => {
    setConversionDirection(direction);
    setForeignAmount('');
    setConvertedAmount(null);
  };
  
  // Calculate conversion (replicando la web)
  const calculateConversion = () => {
    const foreignAmountValue = parseFloat(foreignAmount);
    const exchangeRateValue = parseFloat(exchangeRate);
    
    if (!isNaN(foreignAmountValue) && !isNaN(exchangeRateValue) && foreignAmountValue > 0 && exchangeRateValue > 0) {
      let result;
      
      if (conversionDirection === 'foreignToBase') {
        result = foreignAmountValue * exchangeRateValue;
      } else {
        result = foreignAmountValue / exchangeRateValue;
      }
      
      setConvertedAmount(result);
    } else {
      setConvertedAmount(null);
    }
  };
  
  // Apply converted amount to transaction (replicando la web)
  const applyConversion = async () => {
    const newErrors: Record<string, string> = {};
    let hasErrors = false;
    
    if (!foreignAmount.trim()) {
      newErrors.foreignAmount = 'Campo requerido';
      hasErrors = true;
    } else if (isNaN(parseFloat(foreignAmount)) || parseFloat(foreignAmount) <= 0) {
      newErrors.foreignAmount = 'Monto inválido';
      hasErrors = true;
    }
    
    if (!exchangeRate.trim()) {
      newErrors.exchangeRate = 'Campo requerido';
      hasErrors = true;
    } else if (isNaN(parseFloat(exchangeRate)) || parseFloat(exchangeRate) <= 0) {
      newErrors.exchangeRate = 'Tasa inválida';
      hasErrors = true;
    }
    
    if (hasErrors) {
      setConverterErrors(newErrors);
      return;
    }

    if (convertedAmount !== null) {
      setFormData({ ...formData, amount: convertedAmount.toFixed(currency.decimalPlaces) });
      
      // Save exchange rate to AsyncStorage
      const rateKey = conversionDirection === 'foreignToBase' 
        ? `${currency.code}_${foreignCurrency}`
        : `${foreignCurrency}_${currency.code}`;
      
      const newRates = { ...lastExchangeRates, [rateKey]: parseFloat(exchangeRate) };
      setLastExchangeRates(newRates);
      
      try {
        await AsyncStorage.setItem('lastExchangeRates', JSON.stringify(newRates));
      } catch (error) {
        console.error('Error saving exchange rates:', error);
      }
      
      closeConverter();
    }
  };

  const resetForm = () => {
    setFormData({
      description: '',
      amount: '',
      type: 'EXPENSE',
      categoryId: '',
      date: new Date().toISOString().split('T')[0],
    });
  };

  const handleSubmit = async () => {
    // Validaciones
    if (!formData.description.trim()) {
      Alert.alert('Error', 'La descripción es requerida');
      return;
    }

    if (!formData.amount || isNaN(Number(formData.amount)) || Number(formData.amount) <= 0) {
      Alert.alert('Error', 'Ingresa un monto válido');
      return;
    }

    if (!formData.categoryId) {
      Alert.alert('Error', 'Selecciona una categoría');
      return;
    }

    try {
      setLoading(true);
      
      const transactionData = {
        description: formData.description.trim(),
        amount: Number(formData.amount),
        type: formData.type,
        category_id: formData.categoryId,
        date: new Date(formData.date).toISOString(),
      };

      if (editTransaction) {
        await transactionsAPI.update(editTransaction.id, transactionData);
        Alert.alert('Éxito', 'Transacción actualizada correctamente');
      } else {
        await transactionsAPI.create(transactionData);
        Alert.alert('Éxito', 'Transacción creada correctamente');
      }

      // Notificar al dashboard que hubo cambios
      onTransactionChange();
      
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error saving transaction:', error);
      const errorMessage = error.response?.data?.message || 'Error al guardar la transacción';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const filteredCategories = categories.filter(
    cat => cat.type === formData.type || cat.type === 'BOTH'
  );

  const formatAmount = (value: string) => {
    // Remover caracteres no numéricos excepto punto
    const numericValue = value.replace(/[^0-9.]/g, '');
    return numericValue;
  };

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
            {editTransaction ? 'Editar Transacción' : 'Nueva Transacción'}
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
          {/* Tipo de Transacción */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tipo de Transacción</Text>
            <View style={styles.typeSelector}>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  formData.type === 'EXPENSE' && styles.typeButtonActive,
                ]}
                onPress={() => {
                  const newType = 'EXPENSE';
                  // Solo resetear categoryId si la categoría actual no es compatible con el nuevo tipo
                  const currentCategory = categories.find(cat => cat.id === formData.categoryId);
                  const shouldKeepCategory = currentCategory && (currentCategory.type === newType || currentCategory.type === 'BOTH');
                  
                  setFormData({ 
                    ...formData, 
                    type: newType, 
                    categoryId: shouldKeepCategory ? formData.categoryId : '' 
                  });
                }}
              >
                <Ionicons 
                  name="remove-circle" 
                  size={20} 
                  color={formData.type === 'EXPENSE' ? 'white' : '#dc2626'} 
                />
                <Text style={[
                  styles.typeButtonText,
                  formData.type === 'EXPENSE' && styles.typeButtonTextActive,
                ]}>
                  Gasto
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.typeButton,
                  formData.type === 'INCOME' && styles.typeButtonActive,
                ]}
                onPress={() => {
                  const newType = 'INCOME';
                  // Solo resetear categoryId si la categoría actual no es compatible con el nuevo tipo
                  const currentCategory = categories.find(cat => cat.id === formData.categoryId);
                  const shouldKeepCategory = currentCategory && (currentCategory.type === newType || currentCategory.type === 'BOTH');
                  
                  setFormData({ 
                    ...formData, 
                    type: newType, 
                    categoryId: shouldKeepCategory ? formData.categoryId : '' 
                  });
                }}
              >
                <Ionicons 
                  name="add-circle" 
                  size={20} 
                  color={formData.type === 'INCOME' ? 'white' : '#059669'} 
                />
                <Text style={[
                  styles.typeButtonText,
                  formData.type === 'INCOME' && styles.typeButtonTextActive,
                ]}>
                  Ingreso
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Descripción */}
          <View style={styles.section}>
            <Text style={styles.label}>Descripción</Text>
            <TextInput
              style={styles.input}
              value={formData.description}
              onChangeText={(text) => setFormData({ ...formData, description: text })}
              placeholder="Ej: Compra en supermercado"
              placeholderTextColor="#9ca3af"
              maxLength={100}
            />
          </View>

          {/* Monto */}
          <View style={styles.section}>
            <Text style={styles.label}>Monto</Text>
            <View style={styles.amountContainer}>
              <Text style={styles.currencySymbol}>{currency.symbol}</Text>
              <TextInput
                style={styles.amountInput}
                value={formData.amount}
                onChangeText={(text) => setFormData({ ...formData, amount: formatAmount(text) })}
                placeholder="0.00"
                placeholderTextColor="#9ca3af"
                keyboardType="numeric"
              />
            </View>
            
            {/* Currency Converter Button (replicando exactamente la web) */}
            <TouchableOpacity
              style={styles.converterButton}
              onPress={openConverter}
            >
              <Text style={styles.converterButtonIcon}>💱</Text>
              <Text style={styles.converterButtonText}>Convertir Moneda</Text>
            </TouchableOpacity>
          </View>

          {/* Fecha */}
          <View style={styles.section}>
            <Text style={styles.label}>Fecha</Text>
            <View style={styles.dateContainer}>
              <Ionicons name="calendar-outline" size={20} color="#64748b" />
              <TextInput
                style={styles.dateInput}
                value={formData.date}
                onChangeText={(text) => setFormData({ ...formData, date: text })}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#9ca3af"
              />
            </View>
          </View>

          {/* Categoría */}
          <View style={styles.section}>
            <Text style={styles.label}>Categoría</Text>
            {loadingCategories ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#2563EB" />
                <Text style={styles.loadingText}>Cargando categorías...</Text>
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.categoriesContainer}>
                  {filteredCategories.map((category) => (
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
                    {editTransaction ? 'Actualizar' : 'Guardar'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </SafeAreaView>
      
      {/* Currency Converter Modal (replicando exactamente la web) */}
      {showConverter && (
        <Modal
          visible={showConverter}
          transparent
          animationType="slide"
          onRequestClose={closeConverter}
        >
          <View style={styles.converterModalOverlay}>
            <SafeAreaView style={styles.converterModalContainer}>
              {/* Header */}
              <View style={styles.converterHeader}>
                <Text style={styles.converterTitle}>Convertir Moneda</Text>
                <TouchableOpacity onPress={closeConverter}>
                  <Ionicons name="close" size={24} color="#64748b" />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.converterContent}>
                {/* Conversion Direction Toggle */}
                <View style={styles.conversionDirectionToggle}>
                  <TouchableOpacity
                    style={[
                      styles.directionButton,
                      conversionDirection === 'foreignToBase' && styles.directionButtonActive
                    ]}
                    onPress={() => toggleConversionDirection('foreignToBase')}
                  >
                    <Text style={[
                      styles.directionButtonText,
                      conversionDirection === 'foreignToBase' && styles.directionButtonTextActive
                    ]}>
                      {foreignCurrency} → {currency.code}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.directionButton,
                      conversionDirection === 'baseToForeign' && styles.directionButtonActive
                    ]}
                    onPress={() => toggleConversionDirection('baseToForeign')}
                  >
                    <Text style={[
                      styles.directionButtonText,
                      conversionDirection === 'baseToForeign' && styles.directionButtonTextActive
                    ]}>
                      {currency.code} → {foreignCurrency}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Foreign Amount */}
                <View style={styles.converterFormGroup}>
                  <Text style={styles.converterLabel}>Monto en {foreignCurrency}</Text>
                  <TextInput
                    style={[
                      styles.converterInput,
                      converterErrors.foreignAmount && styles.converterInputError
                    ]}
                    value={foreignAmount}
                    onChangeText={setForeignAmount}
                    placeholder="0.00"
                    placeholderTextColor="#9ca3af"
                    keyboardType="numeric"
                  />
                  {converterErrors.foreignAmount && (
                    <Text style={styles.converterErrorText}>{converterErrors.foreignAmount}</Text>
                  )}
                </View>

                {/* Exchange Rate */}
                <View style={styles.converterFormGroup}>
                  <Text style={styles.converterLabel}>Tasa de Cambio</Text>
                  <TextInput
                    style={[
                      styles.converterInput,
                      converterErrors.exchangeRate && styles.converterInputError
                    ]}
                    value={exchangeRate}
                    onChangeText={setExchangeRate}
                    placeholder="0.0000"
                    placeholderTextColor="#9ca3af"
                    keyboardType="numeric"
                  />
                  {converterErrors.exchangeRate && (
                    <Text style={styles.converterErrorText}>{converterErrors.exchangeRate}</Text>
                  )}
                </View>

                {/* Converted Amount Display */}
                {convertedAmount !== null && (
                  <View style={styles.convertedAmountContainer}>
                    <Text style={styles.convertedAmountLabel}>Resultado:</Text>
                    <Text style={styles.convertedAmountValue}>
                      {currency.symbol}{convertedAmount.toFixed(currency.decimalPlaces)}
                    </Text>
                  </View>
                )}
              </ScrollView>

              {/* Converter Actions */}
              <View style={styles.converterFooter}>
                <TouchableOpacity
                  style={styles.converterCancelButton}
                  onPress={closeConverter}
                >
                  <Text style={styles.converterCancelButtonText}>Cancelar</Text>
                </TouchableOpacity>
                
                <LinearGradient
                  colors={['#2563EB', '#1d4ed8']}
                  style={[styles.converterApplyButton, convertedAmount === null && styles.disabledButton]}
                >
                  <TouchableOpacity
                    onPress={applyConversion}
                    disabled={convertedAmount === null}
                    style={styles.converterApplyButtonInner}
                  >
                    <Text style={styles.converterApplyButtonText}>Aplicar Conversión</Text>
                  </TouchableOpacity>
                </LinearGradient>
              </View>
            </SafeAreaView>
          </View>
        </Modal>
      )}
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 12,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    gap: 8,
  },
  typeButtonActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  typeButtonTextActive: {
    color: 'white',
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
  
  // Currency Converter Button Styles
  converterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginTop: 8,
    gap: 8,
  },
  converterButtonIcon: {
    fontSize: 16,
  },
  converterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  
  // Currency Converter Modal Styles
  converterModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  converterModalContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    minHeight: '60%',
  },
  converterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  converterTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  converterContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  
  // Conversion Direction Toggle
  conversionDirectionToggle: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    gap: 4,
  },
  directionButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  directionButtonActive: {
    backgroundColor: '#2563EB',
  },
  directionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  directionButtonTextActive: {
    color: 'white',
  },
  
  // Converter Form
  converterFormGroup: {
    marginBottom: 20,
  },
  converterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  converterInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1e293b',
  },
  converterInputError: {
    borderColor: '#dc2626',
  },
  converterErrorText: {
    color: '#dc2626',
    fontSize: 12,
    marginTop: 4,
  },
  
  // Converted Amount Display
  convertedAmountContainer: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#2563EB',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  convertedAmountLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 4,
  },
  convertedAmountValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2563EB',
  },
  
  // Converter Footer
  converterFooter: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 12,
  },
  converterCancelButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
  },
  converterCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  converterApplyButton: {
    flex: 1,
    borderRadius: 12,
  },
  converterApplyButtonInner: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  converterApplyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});

export default TransactionForm;