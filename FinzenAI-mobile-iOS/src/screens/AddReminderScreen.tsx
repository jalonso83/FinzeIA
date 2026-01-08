import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { remindersAPI, PaymentReminder, PaymentType } from '../utils/api';
import CustomModal from '../components/modals/CustomModal';
import UpgradeModal from '../components/subscriptions/UpgradeModal';

import { logger } from '../utils/logger';
// Tipos de pago con información
const PAYMENT_TYPES: { value: PaymentType; label: string; icon: keyof typeof Ionicons.glyphMap; color: string }[] = [
  { value: 'CREDIT_CARD', label: 'Tarjeta de Crédito', icon: 'card', color: '#2563EB' },
  { value: 'LOAN', label: 'Préstamo', icon: 'cash', color: '#F59E0B' },
  { value: 'UTILITY', label: 'Servicios', icon: 'flash', color: '#3B82F6' },
  { value: 'INSURANCE', label: 'Seguro', icon: 'shield-checkmark', color: '#EC4899' },
  { value: 'OTHER', label: 'Otro', icon: 'ellipsis-horizontal', color: '#6B7280' },
];

// Opciones de días de recordatorio
const REMINDER_DAY_OPTIONS = [
  { value: 7, label: '7 días antes' },
  { value: 5, label: '5 días antes' },
  { value: 3, label: '3 días antes' },
  { value: 2, label: '2 días antes' },
  { value: 1, label: '1 día antes' },
  { value: 0, label: 'El mismo día' },
];

export default function AddReminderScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const editingReminder: PaymentReminder | undefined = route.params?.reminder;

  const [loading, setLoading] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Form state
  const [name, setName] = useState('');
  const [type, setType] = useState<PaymentType>('CREDIT_CARD');
  const [dueDay, setDueDay] = useState('');
  const [cutoffDay, setCutoffDay] = useState('');
  const [amount, setAmount] = useState('');
  const [creditLimit, setCreditLimit] = useState('');
  const [isDualCurrency, setIsDualCurrency] = useState(false);
  const [creditLimitUSD, setCreditLimitUSD] = useState('');
  const [reminderDays, setReminderDays] = useState<number[]>([3, 1, 0]);
  const [notifyOnCutoff, setNotifyOnCutoff] = useState(false);
  const [notes, setNotes] = useState('');

  // Obtener el tipo seleccionado
  const selectedType = PAYMENT_TYPES.find(t => t.value === type) || PAYMENT_TYPES[0];

  // Cargar datos si es edición
  useEffect(() => {
    if (editingReminder) {
      setName(editingReminder.name);
      setType(editingReminder.type);
      setDueDay(editingReminder.dueDay.toString());
      setCutoffDay(editingReminder.cutoffDay?.toString() || '');
      setAmount(editingReminder.amount?.toString() || '');
      setCreditLimit(editingReminder.creditLimit?.toString() || '');
      setIsDualCurrency(editingReminder.isDualCurrency || false);
      setCreditLimitUSD(editingReminder.creditLimitUSD?.toString() || '');
      setReminderDays(editingReminder.reminderDays);
      setNotifyOnCutoff(editingReminder.notifyOnCutoff);
      setNotes(editingReminder.notes || '');
    }
  }, [editingReminder]);

  const handleToggleReminderDay = (day: number) => {
    setReminderDays(prev => {
      if (prev.includes(day)) {
        return prev.filter(d => d !== day);
      } else {
        return [...prev, day].sort((a, b) => b - a);
      }
    });
  };

  const handleSelectType = (selectedType: PaymentType) => {
    setType(selectedType);
    setShowTypeDropdown(false);
  };

  const validateForm = (): boolean => {
    if (!name.trim()) {
      setErrorMessage('El nombre es requerido');
      setShowErrorModal(true);
      return false;
    }

    const dueDayNum = parseInt(dueDay);
    if (!dueDay || isNaN(dueDayNum) || dueDayNum < 1 || dueDayNum > 31) {
      setErrorMessage('El día de pago debe ser entre 1 y 31');
      setShowErrorModal(true);
      return false;
    }

    if (cutoffDay) {
      const cutoffDayNum = parseInt(cutoffDay);
      if (isNaN(cutoffDayNum) || cutoffDayNum < 1 || cutoffDayNum > 31) {
        setErrorMessage('El día de corte debe ser entre 1 y 31');
        setShowErrorModal(true);
        return false;
      }
    }

    if (amount) {
      const amountNum = parseFloat(amount);
      if (isNaN(amountNum) || amountNum < 0) {
        setErrorMessage('El monto debe ser un número válido');
        setShowErrorModal(true);
        return false;
      }
    }

    if (reminderDays.length === 0) {
      setErrorMessage('Selecciona al menos un día de recordatorio');
      setShowErrorModal(true);
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const data: any = {
        name: name.trim(),
        type,
        dueDay: parseInt(dueDay),
        cutoffDay: cutoffDay ? parseInt(cutoffDay) : undefined,
        amount: amount ? parseFloat(amount) : undefined,
        reminderDays,
        notifyOnCutoff,
        notes: notes.trim() || undefined,
      };

      // Agregar campos de tarjeta de crédito si aplica
      if (type === 'CREDIT_CARD') {
        data.creditLimit = creditLimit ? parseFloat(creditLimit) : undefined;
        data.isDualCurrency = isDualCurrency;
        if (isDualCurrency && creditLimitUSD) {
          data.creditLimitUSD = parseFloat(creditLimitUSD);
        }
      }

      if (editingReminder) {
        await remindersAPI.update(editingReminder.id, data);
        setSuccessMessage('Recordatorio actualizado correctamente');
      } else {
        await remindersAPI.create(data);
        setSuccessMessage('Recordatorio creado correctamente');
      }

      setShowSuccessModal(true);
    } catch (error: any) {
      logger.error('Error saving reminder:', error);
      // Si es error 403 (límite de plan), mostrar modal de upgrade
      if (error.response?.status === 403) {
        setShowUpgradeModal(true);
      } else {
        setErrorMessage(error.response?.data?.message || 'Error al guardar el recordatorio');
        setShowErrorModal(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSuccessClose = () => {
    // 1. Cerrar el modal primero
    setShowSuccessModal(false);

    // 2. Navegar después de que el modal se cierre completamente (iOS requiere delay)
    setTimeout(() => {
      navigation.goBack();
    }, 300);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              // No navegar si hay modales visibles (prevenir conflictos en iOS)
              if (!showErrorModal && !showSuccessModal && !showUpgradeModal) {
                navigation.goBack();
              }
            }}
          >
            <Ionicons name="close" size={24} color="#1e293b" />
          </TouchableOpacity>
          <Text style={styles.title}>
            {editingReminder ? 'Editar Recordatorio' : 'Nuevo Recordatorio'}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Nombre */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nombre *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Ej: Visa Banco Popular"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          {/* Tipo de pago - Dropdown */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Tipo de Pago</Text>
            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={() => setShowTypeDropdown(true)}
            >
              <View style={[styles.dropdownIcon, { backgroundColor: selectedType.color }]}>
                <Ionicons name={selectedType.icon} size={18} color="white" />
              </View>
              <Text style={styles.dropdownText}>{selectedType.label}</Text>
              <Ionicons name="chevron-down" size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* Día de pago */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Día de Pago *</Text>
            <TextInput
              style={styles.input}
              value={dueDay}
              onChangeText={setDueDay}
              placeholder="1-31"
              placeholderTextColor="#9CA3AF"
              keyboardType="number-pad"
              maxLength={2}
            />
            <Text style={styles.hint}>El día del mes en que vence el pago</Text>
          </View>

          {/* Día de corte (solo para tarjetas de crédito) */}
          {type === 'CREDIT_CARD' && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Día de Corte (Opcional)</Text>
              <TextInput
                style={styles.input}
                value={cutoffDay}
                onChangeText={setCutoffDay}
                placeholder="1-31"
                placeholderTextColor="#9CA3AF"
                keyboardType="number-pad"
                maxLength={2}
              />
              <Text style={styles.hint}>Día de cierre del estado de cuenta</Text>
            </View>
          )}

          {/* Monto (opcional) */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Monto Aproximado (Opcional)</Text>
            <TextInput
              style={styles.input}
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              placeholderTextColor="#9CA3AF"
              keyboardType="decimal-pad"
            />
            <Text style={styles.hint}>Monto promedio del pago mensual</Text>
          </View>

          {/* Límites de Tarjeta de Crédito (solo para CREDIT_CARD) */}
          {type === 'CREDIT_CARD' && (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Límite de Crédito (Opcional)</Text>
                <TextInput
                  style={styles.input}
                  value={creditLimit}
                  onChangeText={setCreditLimit}
                  placeholder="0.00"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="decimal-pad"
                />
                <Text style={styles.hint}>Límite de crédito en moneda local</Text>
              </View>

              {/* Tarjeta de doble saldo */}
              <TouchableOpacity
                style={styles.switchRow}
                onPress={() => setIsDualCurrency(!isDualCurrency)}
              >
                <View style={styles.switchInfo}>
                  <Ionicons name="swap-horizontal" size={20} color="#64748b" />
                  <View style={styles.switchTextContainer}>
                    <Text style={styles.switchLabel}>Tarjeta de Doble Saldo</Text>
                    <Text style={styles.switchHint}>
                      La tarjeta tiene límite en USD además de moneda local
                    </Text>
                  </View>
                </View>
                <View
                  style={[
                    styles.checkbox,
                    isDualCurrency && styles.checkboxChecked,
                  ]}
                >
                  {isDualCurrency && (
                    <Ionicons name="checkmark" size={16} color="white" />
                  )}
                </View>
              </TouchableOpacity>

              {/* Límite en USD (si es doble saldo) */}
              {isDualCurrency && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Límite en USD (Opcional)</Text>
                  <TextInput
                    style={styles.input}
                    value={creditLimitUSD}
                    onChangeText={setCreditLimitUSD}
                    placeholder="0.00"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="decimal-pad"
                  />
                  <Text style={styles.hint}>Límite de crédito en dólares estadounidenses</Text>
                </View>
              )}
            </>
          )}

          {/* Días de recordatorio */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Recordarme *</Text>
            <View style={styles.reminderDaysGrid}>
              {REMINDER_DAY_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.reminderDayChip,
                    reminderDays.includes(option.value) && styles.reminderDayChipSelected,
                  ]}
                  onPress={() => handleToggleReminderDay(option.value)}
                >
                  <Text
                    style={[
                      styles.reminderDayText,
                      reminderDays.includes(option.value) && styles.reminderDayTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.hint}>Selecciona cuándo quieres recibir notificaciones</Text>
          </View>

          {/* Notificar en día de corte */}
          {type === 'CREDIT_CARD' && cutoffDay && (
            <TouchableOpacity
              style={styles.switchRow}
              onPress={() => setNotifyOnCutoff(!notifyOnCutoff)}
            >
              <View style={styles.switchInfo}>
                <Ionicons name="cut" size={20} color="#64748b" />
                <View style={styles.switchTextContainer}>
                  <Text style={styles.switchLabel}>Notificar en día de corte</Text>
                  <Text style={styles.switchHint}>
                    Recibe un recordatorio el día de cierre
                  </Text>
                </View>
              </View>
              <View
                style={[
                  styles.checkbox,
                  notifyOnCutoff && styles.checkboxChecked,
                ]}
              >
                {notifyOnCutoff && (
                  <Ionicons name="checkmark" size={16} color="white" />
                )}
              </View>
            </TouchableOpacity>
          )}

          {/* Notas */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Notas (Opcional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Información adicional..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* Botón de guardar */}
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="white" />
                <Text style={styles.submitButtonText}>
                  {editingReminder ? 'Guardar Cambios' : 'Crear Recordatorio'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modal de selección de tipo */}
      <Modal
        visible={showTypeDropdown}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTypeDropdown(false)}
      >
        <TouchableOpacity
          style={styles.dropdownOverlay}
          activeOpacity={1}
          onPress={() => setShowTypeDropdown(false)}
        >
          <View style={styles.dropdownModal}>
            <View style={styles.dropdownHeader}>
              <Text style={styles.dropdownTitle}>Tipo de Pago</Text>
              <TouchableOpacity onPress={() => setShowTypeDropdown(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.dropdownList}>
              {PAYMENT_TYPES.map((paymentType) => (
                <TouchableOpacity
                  key={paymentType.value}
                  style={[
                    styles.dropdownItem,
                    type === paymentType.value && styles.dropdownItemSelected,
                  ]}
                  onPress={() => handleSelectType(paymentType.value)}
                >
                  <View style={[styles.dropdownItemIcon, { backgroundColor: paymentType.color }]}>
                    <Ionicons name={paymentType.icon} size={20} color="white" />
                  </View>
                  <Text
                    style={[
                      styles.dropdownItemText,
                      type === paymentType.value && styles.dropdownItemTextSelected,
                    ]}
                  >
                    {paymentType.label}
                  </Text>
                  {type === paymentType.value && (
                    <Ionicons name="checkmark-circle" size={22} color="#2563EB" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal de éxito */}
      <CustomModal
        visible={showSuccessModal}
        type="success"
        title="¡Éxito!"
        message={successMessage}
        buttonText="Continuar"
        onClose={handleSuccessClose}
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

      {/* Modal de upgrade */}
      <UpgradeModal
        visible={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        limitType="reminders"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  inputGroup: {
    marginBottom: 20,
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
    paddingVertical: 14,
    fontSize: 16,
    color: '#1e293b',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  textArea: {
    minHeight: 80,
    paddingTop: 14,
  },
  hint: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 6,
  },
  // Dropdown button
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 12,
  },
  dropdownIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownText: {
    flex: 1,
    fontSize: 16,
    color: '#1e293b',
    fontWeight: '500',
  },
  // Dropdown modal
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dropdownModal: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: '100%',
    maxHeight: '70%',
    overflow: 'hidden',
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  dropdownTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  dropdownList: {
    paddingVertical: 8,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 14,
  },
  dropdownItemSelected: {
    backgroundColor: '#f0f9ff',
  },
  dropdownItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownItemText: {
    flex: 1,
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  dropdownItemTextSelected: {
    color: '#2563EB',
    fontWeight: '600',
  },
  // Reminder days
  reminderDaysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  reminderDayChip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: 'white',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  reminderDayChipSelected: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  reminderDayText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  reminderDayTextSelected: {
    color: 'white',
  },
  // Switch row
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  switchInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  switchTextContainer: {
    flex: 1,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  switchHint: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  checkboxChecked: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  // Submit button
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
    marginTop: 10,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
