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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { categoriesAPI, transactionsAPI, exchangeRatesAPI, Category, Transaction } from '../../utils/api';
import { useDashboardStore } from '../../stores/dashboard';
import { useCurrency } from '../../hooks/useCurrency';
import CustomModal from '../modals/CustomModal';

import { logger } from '../../utils/logger';
interface TransactionFormProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
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
    type: 'INCOME' as 'INCOME' | 'EXPENSE',
    categoryId: '',
    date: (() => {
      const today = new Date();
      const dd = String(today.getDate()).padStart(2, '0');
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const yyyy = today.getFullYear();
      return `${dd}-${mm}-${yyyy}`; // Formato DD-MM-YYYY visual
    })(),
  });
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  // Nota: el success modal se removió del Form en favor del patrón Screen-level
  // (alineado con iOS y BudgetsScreen). El Screen recibe el mensaje en onSuccess
  // y maneja el modal de éxito ahí.

  // Currency converter state
  const [showConverter, setShowConverter] = useState(false);
  const [conversionDirection, setConversionDirection] = useState<'foreignToBase' | 'baseToForeign'>('foreignToBase');
  const [foreignAmount, setForeignAmount] = useState('');
  const [foreignCurrency, setForeignCurrency] = useState('USD');
  const [exchangeRate, setExchangeRate] = useState('');
  const [converterErrors, setConverterErrors] = useState<Record<string, string>>({});
  const [convertedAmount, setConvertedAmount] = useState<number | null>(null);
  const [lastExchangeRates, setLastExchangeRates] = useState<Record<string, number>>({});
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [loadingRate, setLoadingRate] = useState(false);
  const [backendRates, setBackendRates] = useState<Record<string, { rateToDop: number; rateToUsd: number }>>({});
  const [rateSource, setRateSource] = useState<'auto' | 'manual'>('auto');

  // Monedas disponibles (las más comunes para RD)
  const AVAILABLE_CURRENCIES = [
    { code: 'USD', name: 'Dólar USA', flag: '🇺🇸' },
    { code: 'EUR', name: 'Euro', flag: '🇪🇺' },
    { code: 'GBP', name: 'Libra Esterlina', flag: '🇬🇧' },
    { code: 'CAD', name: 'Dólar Canadiense', flag: '🇨🇦' },
    { code: 'MXN', name: 'Peso Mexicano', flag: '🇲🇽' },
    { code: 'COP', name: 'Peso Colombiano', flag: '🇨🇴' },
    { code: 'BRL', name: 'Real Brasileño', flag: '🇧🇷' },
    { code: 'CHF', name: 'Franco Suizo', flag: '🇨🇭' },
    { code: 'JPY', name: 'Yen Japonés', flag: '🇯🇵' },
    { code: 'CNY', name: 'Yuan Chino', flag: '🇨🇳' },
  ];

  // Estado para el DatePicker
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Dashboard store para notificar cambios
  const { onTransactionChange } = useDashboardStore();
  
  // Hook para moneda del usuario
  const { userCurrencyInfo } = useCurrency();
  const currency = userCurrencyInfo;


  // Función para formatear fecha automáticamente (visual: DD-MM-YYYY)
  const formatDateDisplay = (value: string) => {
    // Remover todos los caracteres que no sean números
    const cleaned = value.replace(/\D/g, '');

    // Aplicar formato DD-MM-YYYY (visual para el usuario)
    if (cleaned.length >= 8) {
      return `${cleaned.substring(0, 2)}-${cleaned.substring(2, 4)}-${cleaned.substring(4, 8)}`;
    } else if (cleaned.length >= 4) {
      return `${cleaned.substring(0, 2)}-${cleaned.substring(2, 4)}`;
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
      const day = cleaned.substring(0, 2);
      const month = cleaned.substring(2, 4);
      const year = cleaned.substring(4, 8);
      return `${year}-${month}-${day}`;
    }
    return displayDate; // Si no tiene el formato correcto, devolver como está
  };

  // Función para convertir YYYY-MM-DD (backend) a DD-MM-YYYY (display)
  const convertToDisplayFormat = (backendDate: string) => {
    if (!backendDate) return '';
    const parts = backendDate.split('-');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`; // DD-MM-YYYY
    }
    return backendDate;
  };

  // Función para convertir DD-MM-YYYY a objeto Date
  const parseDisplayDateToDate = (displayDate: string): Date => {
    const parts = displayDate.split('-');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // Los meses en JS son 0-indexed
      const year = parseInt(parts[2], 10);
      return new Date(year, month, day);
    }
    return new Date();
  };

  // Manejador del DatePicker
  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const dd = String(selectedDate.getDate()).padStart(2, '0');
      const mm = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const yyyy = selectedDate.getFullYear();
      setFormData({ ...formData, date: `${dd}-${mm}-${yyyy}` });
    }
  };

  useEffect(() => {
    if (visible) {
      loadCategories();
      loadLastExchangeRates();
      if (editTransaction) {
        const categoryId = editTransaction.category?.id || editTransaction.category_id || '';

        const backendDate = editTransaction.date.split('T')[0]; // YYYY-MM-DD
        const displayDate = convertToDisplayFormat(backendDate); // DD-MM-YYYY

        setFormData({
          description: editTransaction.description,
          amount: editTransaction.amount.toString(),
          type: editTransaction.type,
          categoryId: categoryId,
          date: displayDate,
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
  
  // Effect to auto-fill exchange rate when foreign currency changes
  useEffect(() => {
    if (showConverter) {
      autoFillRate(foreignCurrency, conversionDirection);
    }
  }, [foreignCurrency, conversionDirection, backendRates]);
  
  // Effect para validar categoría después de cargar las categorías (similar a la web)
  useEffect(() => {
    if (editTransaction && categories.length > 0 && formData.categoryId) {
      const selectedCategory = categories.find(cat => cat.id === formData.categoryId);
      const isCompatible = selectedCategory && (selectedCategory.type === formData.type || selectedCategory.type === 'BOTH');

      // Si la categoría no es compatible, limpiar
      if (!isCompatible) {
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
      logger.error('Error loading categories:', error);
      setErrorMessage('No se pudieron cargar las categorías');
      setShowErrorModal(true);
    } finally {
      setLoadingCategories(false);
    }
  };

  // Fetch exchange rates from backend and cache in AsyncStorage
  const loadLastExchangeRates = async () => {
    try {
      // First load cached rates from AsyncStorage (instant)
      const savedRates = await AsyncStorage.getItem('lastExchangeRates');
      if (savedRates) {
        setLastExchangeRates(JSON.parse(savedRates));
      }

      // Then fetch fresh rates from backend
      const response = await exchangeRatesAPI.getAll();
      if (response.data.success && response.data.rates.length > 0) {
        const ratesMap: Record<string, { rateToDop: number; rateToUsd: number }> = {};
        response.data.rates.forEach((r) => {
          ratesMap[r.currency] = { rateToDop: r.rateToDop, rateToUsd: r.rateToUsd };
        });
        setBackendRates(ratesMap);

        // Also update lastExchangeRates format for backward compatibility
        const legacyRates: Record<string, number> = {};
        response.data.rates.forEach((r) => {
          legacyRates[`${currency.code}_${r.currency}`] = r.rateToDop;
        });
        setLastExchangeRates(legacyRates);
        await AsyncStorage.setItem('lastExchangeRates', JSON.stringify(legacyRates));
        await AsyncStorage.setItem('backendRates', JSON.stringify(ratesMap));
      }
    } catch (error) {
      logger.error('Error loading exchange rates:', error);
      // Fallback: load cached backend rates
      try {
        const cachedBackend = await AsyncStorage.getItem('backendRates');
        if (cachedBackend) {
          setBackendRates(JSON.parse(cachedBackend));
        }
      } catch (e) {
        // Silent fail
      }
    }
  };

  // Auto-fill exchange rate from backend rates
  const autoFillRate = (currencyCode: string, direction: 'foreignToBase' | 'baseToForeign') => {
    const rateData = backendRates[currencyCode];
    if (rateData && currency.code === 'DOP') {
      // foreignToBase: 1 USD = X DOP (rateToDop)
      // baseToForeign: 1 USD = X DOP (same, used inversely in calculation)
      setExchangeRate(rateData.rateToDop.toFixed(4));
      setRateSource('auto');
      return;
    }
    // Fallback to legacy cached rates
    const legacyKey = direction === 'foreignToBase'
      ? `${currency.code}_${currencyCode}`
      : `${currencyCode}_${currency.code}`;
    if (lastExchangeRates[legacyKey]) {
      setExchangeRate(lastExchangeRates[legacyKey].toString());
      setRateSource('auto');
    } else {
      setExchangeRate('');
      setRateSource('manual');
    }
  };

  // Open currency converter
  const openConverter = () => {
    setShowConverter(true);
    setForeignAmount('');
    setConvertedAmount(null);
    setConverterErrors({});
    setShowCurrencyPicker(false);

    // Auto-fill rate for current currency
    autoFillRate(foreignCurrency, conversionDirection);

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
        logger.error('Error saving exchange rates:', error);
      }
      
      closeConverter();
    }
  };

  const resetForm = () => {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();

    setFormData({
      description: '',
      amount: '',
      type: 'INCOME',
      categoryId: '',
      date: `${dd}-${mm}-${yyyy}`, // Formato DD-MM-YYYY visual
    });
  };

  const handleSubmit = async () => {
    // Validaciones
    if (!formData.description.trim()) {
      setErrorMessage('La descripción es requerida');
      setShowErrorModal(true);
      return;
    }

    if (!formData.amount || isNaN(Number(formData.amount)) || Number(formData.amount) <= 0) {
      setErrorMessage('Ingresa un monto válido');
      setShowErrorModal(true);
      return;
    }

    if (!formData.categoryId) {
      setErrorMessage('Selecciona una categoría');
      setShowErrorModal(true);
      return;
    }

    try {
      setLoading(true);
      
      // Convertir fecha de DD-MM-YYYY a YYYY-MM-DD para el backend
      const backendDate = convertToBackendFormat(formData.date);

      const transactionData = {
        description: formData.description.trim(),
        amount: Number(formData.amount),
        type: formData.type,
        category_id: formData.categoryId,
        date: backendDate + 'T12:00:00.000Z', // Enviar como mediodía UTC para evitar problemas de zona horaria
      };

      let message = '';
      if (editTransaction) {
        await transactionsAPI.update(editTransaction.id, transactionData);
        message = 'Transacción actualizada correctamente';
      } else {
        await transactionsAPI.create(transactionData);
        message = 'Transacción creada correctamente';
      }

      // Ejecutar callbacks. El Screen recibe el mensaje y maneja el modal de éxito
      // (patrón unificado iOS/Android — Screen-level success modal).
      onTransactionChange();
      // Cheap insurance: limpiar form state antes de notificar al Screen.
      // Garantiza que si el form se reabre rápido (antes del unmount), no muestre stale data.
      resetForm();
      onSuccess(message);
    } catch (error: any) {
      logger.error('Error saving transaction:', error);
      const errMsg = error.response?.data?.message || 'Error al guardar la transacción';
      setErrorMessage(errMsg);
      setShowErrorModal(true);
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
              {editTransaction ? 'Editar Transacción' : 'Nueva Transacción'}
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
          {/* Tipo de Transacción */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tipo de Transacción</Text>
            <View style={styles.typeSelector}>
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
            <TouchableOpacity
              style={styles.dateContainer}
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="calendar-outline" size={20} color="#2563EB" />
              <Text style={styles.dateText}>{formData.date}</Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={parseDisplayDateToDate(formData.date)}
                mode="date"
                display="default"
                onChange={handleDateChange}
                maximumDate={new Date()}
              />
            )}
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
              <View style={styles.categoriesGrid}>
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
            )}
          </View>
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
                    {editTransaction ? 'Actualizar' : 'Guardar'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </LinearGradient>
        </View>

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

      {/* Currency Converter Modal */}
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

              <ScrollView style={styles.converterContent} keyboardShouldPersistTaps="handled">
                {/* Currency Picker */}
                <View style={styles.converterFormGroup}>
                  <Text style={styles.converterLabel}>Moneda</Text>
                  <TouchableOpacity
                    style={styles.currencyPickerButton}
                    onPress={() => setShowCurrencyPicker(!showCurrencyPicker)}
                  >
                    <Text style={styles.currencyPickerFlag}>
                      {AVAILABLE_CURRENCIES.find(c => c.code === foreignCurrency)?.flag || '💱'}
                    </Text>
                    <Text style={styles.currencyPickerText}>
                      {foreignCurrency} - {AVAILABLE_CURRENCIES.find(c => c.code === foreignCurrency)?.name || foreignCurrency}
                    </Text>
                    <Ionicons
                      name={showCurrencyPicker ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      color="#64748b"
                    />
                  </TouchableOpacity>

                  {showCurrencyPicker && (
                    <View style={styles.currencyPickerDropdown}>
                      {AVAILABLE_CURRENCIES.filter(c => c.code !== currency.code).map((curr) => (
                        <TouchableOpacity
                          key={curr.code}
                          style={[
                            styles.currencyPickerOption,
                            foreignCurrency === curr.code && styles.currencyPickerOptionActive
                          ]}
                          onPress={() => {
                            setForeignCurrency(curr.code);
                            setShowCurrencyPicker(false);
                          }}
                        >
                          <Text style={styles.currencyPickerOptionFlag}>{curr.flag}</Text>
                          <Text style={[
                            styles.currencyPickerOptionText,
                            foreignCurrency === curr.code && styles.currencyPickerOptionTextActive
                          ]}>
                            {curr.code} - {curr.name}
                          </Text>
                          {foreignCurrency === curr.code && (
                            <Ionicons name="checkmark" size={18} color="#2563EB" />
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>

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
                  <Text style={styles.converterLabel}>
                    Monto en {conversionDirection === 'foreignToBase' ? foreignCurrency : currency.code}
                  </Text>
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
                  <View style={styles.rateLabelRow}>
                    <Text style={[styles.converterLabel, { marginBottom: 0 }]}>
                      Tasa de Cambio (1 {foreignCurrency} = ? {currency.code})
                    </Text>
                    {rateSource === 'auto' && exchangeRate ? (
                      <View style={styles.autoRateBadge}>
                        <Ionicons name="cloud-done-outline" size={12} color="#059669" />
                        <Text style={styles.autoRateBadgeText}>Auto</Text>
                      </View>
                    ) : null}
                  </View>
                  <View style={styles.rateInputContainer}>
                    <TextInput
                      style={[
                        styles.converterInput,
                        { flex: 1 },
                        converterErrors.exchangeRate && styles.converterInputError
                      ]}
                      value={exchangeRate}
                      onChangeText={(text) => {
                        setExchangeRate(text);
                        setRateSource('manual');
                      }}
                      placeholder="0.0000"
                      placeholderTextColor="#9ca3af"
                      keyboardType="numeric"
                    />
                    {loadingRate && (
                      <ActivityIndicator size="small" color="#2563EB" style={styles.rateLoadingIndicator} />
                    )}
                  </View>
                  {converterErrors.exchangeRate && (
                    <Text style={styles.converterErrorText}>{converterErrors.exchangeRate}</Text>
                  )}
                  {rateSource === 'auto' && exchangeRate ? (
                    <Text style={styles.rateHintText}>
                      Tasa del día. Puedes editarla si lo deseas.
                    </Text>
                  ) : !exchangeRate ? (
                    <Text style={styles.rateHintTextWarning}>
                      No hay tasa disponible. Ingresa la tasa manualmente.
                    </Text>
                  ) : null}
                </View>

                {/* Converted Amount Display */}
                {convertedAmount !== null && (
                  <View style={styles.convertedAmountContainer}>
                    <Text style={styles.convertedAmountLabel}>Resultado:</Text>
                    <Text style={styles.convertedAmountValue}>
                      {conversionDirection === 'foreignToBase'
                        ? `${currency.symbol}${convertedAmount.toFixed(currency.decimalPlaces)}`
                        : `${convertedAmount.toFixed(2)} ${foreignCurrency}`
                      }
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
  dateText: {
    flex: 1,
    fontSize: 16,
    color: '#1e293b',
    fontWeight: '500',
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
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryButton: {
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    minWidth: 75,
    width: '30%',
    maxWidth: 110,
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
  
  // Currency Picker
  currencyPickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  currencyPickerFlag: {
    fontSize: 20,
  },
  currencyPickerText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#1e293b',
  },
  currencyPickerDropdown: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    marginTop: 4,
    maxHeight: 200,
    overflow: 'hidden',
  },
  currencyPickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  currencyPickerOptionActive: {
    backgroundColor: '#eff6ff',
  },
  currencyPickerOptionFlag: {
    fontSize: 18,
  },
  currencyPickerOptionText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
  },
  currencyPickerOptionTextActive: {
    color: '#2563EB',
    fontWeight: '600',
  },

  // Rate label and badges
  rateLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  autoRateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  autoRateBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#059669',
  },
  rateInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rateLoadingIndicator: {
    marginLeft: 8,
  },
  rateHintText: {
    fontSize: 12,
    color: '#059669',
    marginTop: 4,
  },
  rateHintTextWarning: {
    fontSize: 12,
    color: '#f59e0b',
    marginTop: 4,
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