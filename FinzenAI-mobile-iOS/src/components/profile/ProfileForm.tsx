import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, Switch, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import api, { authAPI } from '../../utils/api';
import CustomModal from '../modals/CustomModal';
import { useBiometric } from '../../hooks/useBiometric';
import { useAuthStore } from '../../stores/auth';

import { logger } from '../../utils/logger';
interface ProfileFormProps {
  visible: boolean;
  user: any;
  onClose: () => void;
  onProfileUpdated: (message: string) => void;
}

const occupationOptions = [
  'Estudiante',
  'Empleado/a',
  'Empresario/a',
  'Profesional independiente',
  'Funcionario público',
  'Jubilado/a',
  'Ama/o de casa',
  'Otra'
];

const latinAmericanCountries = [
  'Argentina', 'Bolivia', 'Brasil', 'Chile', 'Colombia', 'Costa Rica', 'Cuba', 'Ecuador', 'El Salvador',
  'Guatemala', 'Honduras', 'México', 'Nicaragua', 'Panamá', 'Paraguay', 'Perú', 'Puerto Rico',
  'República Dominicana', 'Uruguay', 'Venezuela', 'Estados Unidos', 'España'
];

const currencies = [
  { code: 'ARS', name: 'Peso Argentino', symbol: '$' },
  { code: 'BOB', name: 'Boliviano', symbol: 'Bs.' },
  { code: 'BRL', name: 'Real Brasileño', symbol: 'R$' },
  { code: 'CLP', name: 'Peso Chileno', symbol: '$' },
  { code: 'COP', name: 'Peso Colombiano', symbol: '$' },
  { code: 'CRC', name: 'Colón Costarricense', symbol: '₡' },
  { code: 'CUP', name: 'Peso Cubano', symbol: '$' },
  { code: 'DOP', name: 'Peso Dominicano', symbol: 'RD$' },
  { code: 'USD', name: 'Dólar Estadounidense', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GTQ', name: 'Quetzal Guatemalteco', symbol: 'Q' },
  { code: 'HNL', name: 'Lempira Hondureño', symbol: 'L' },
  { code: 'MXN', name: 'Peso Mexicano', symbol: '$' },
  { code: 'NIO', name: 'Córdoba Nicaragüense', symbol: 'C$' },
  { code: 'PAB', name: 'Balboa Panameño', symbol: 'B/.' },
  { code: 'PYG', name: 'Guaraní Paraguayo', symbol: '₲' },
  { code: 'PEN', name: 'Sol Peruano', symbol: 'S/' },
  { code: 'UYU', name: 'Peso Uruguayo', symbol: '$' },
  { code: 'VEF', name: 'Bolívar Venezolano', symbol: 'Bs.' },
  { code: 'VES', name: 'Bolívar Soberano', symbol: 'Bs.S' },
];

export default function ProfileForm({ visible, user, onClose, onProfileUpdated }: ProfileFormProps) {
  const [form, setForm] = useState({
    name: '',
    lastName: '',
    email: '',
    phone: '',
    birthDate: '',
    country: '',
    state: '',
    city: '',
    currency: '',
    preferredLanguage: 'es',
    occupation: '',
    company: ''
  });
  const [errors, setErrors] = useState<any>({});
  const [submitting, setSubmitting] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showBiometricInfoModal, setShowBiometricInfoModal] = useState(false);
  const [showBiometricConfirmModal, setShowBiometricConfirmModal] = useState(false);
  const [biometricMessage, setBiometricMessage] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [originalForm, setOriginalForm] = useState({
    name: '',
    lastName: '',
    email: '',
    phone: '',
    birthDate: '',
    country: '',
    state: '',
    city: '',
    currency: '',
    preferredLanguage: 'es',
    occupation: '',
    company: ''
  });

  // Hook de biometría
  const { isAvailable, isEnabled, biometricType, enable, disable } = useBiometric();
  const { clearBiometricCredentials, logout } = useAuthStore();

  // Función para formatear fecha automáticamente (visual: DD-MM-YYYY)
  const formatDateDisplay = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
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
    return displayDate;
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

  // Función para convertir fecha display (DD-MM-YYYY) a objeto Date
  const parseDisplayDateToDate = (displayDate: string): Date => {
    const parts = displayDate.split('-');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      return new Date(year, month, day);
    }
    return new Date();
  };

  // Restricciones de edad para fecha de nacimiento
  const maxBirthDate = new Date();
  maxBirthDate.setFullYear(maxBirthDate.getFullYear() - 13); // Mínimo 13 años

  const minBirthDate = new Date();
  minBirthDate.setFullYear(minBirthDate.getFullYear() - 100); // Máximo 100 años

  // Handler para cambio de fecha desde DatePicker
  const handleDatePickerChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const dd = String(selectedDate.getDate()).padStart(2, '0');
      const mm = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const yyyy = selectedDate.getFullYear();
      setForm({ ...form, birthDate: `${dd}-${mm}-${yyyy}` });
      // Limpiar error si existe
      if (errors.birthDate) {
        setErrors({ ...errors, birthDate: '' });
      }
    }
  };

  // Actualizar formulario cuando cambien los datos del usuario
  useEffect(() => {
    if (user) {
      logger.log('ProfileForm - Usuario recibido:', user);
      const backendDate = user?.birthDate ? user.birthDate.slice(0, 10) : ''; // YYYY-MM-DD
      const displayDate = convertToDisplayFormat(backendDate); // DD-MM-YYYY

      const initialData = {
        name: user?.name || '',
        lastName: user?.lastName || '',
        email: user?.email || '',
        phone: user?.phone || '',
        birthDate: displayDate,
        country: user?.country || '',
        state: user?.state || '',
        city: user?.city || '',
        currency: user?.currency || '',
        preferredLanguage: user?.preferredLanguage || 'es',
        occupation: user?.occupation || '',
        company: user?.company || ''
      };

      setForm(initialData);
      setOriginalForm(initialData); // Guardar datos originales
    }
  }, [user]);
  
  // Modal states for dropdowns
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [showOccupationModal, setShowOccupationModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);

  // Función para verificar si hay cambios
  const hasChanges = () => {
    return (
      form.name !== originalForm.name ||
      form.lastName !== originalForm.lastName ||
      form.email !== originalForm.email ||
      form.phone !== originalForm.phone ||
      form.birthDate !== originalForm.birthDate ||
      form.country !== originalForm.country ||
      form.state !== originalForm.state ||
      form.city !== originalForm.city ||
      form.currency !== originalForm.currency ||
      form.preferredLanguage !== originalForm.preferredLanguage ||
      form.occupation !== originalForm.occupation ||
      form.company !== originalForm.company
    );
  };

  const validate = () => {
    const newErrors: any = {};
    if (!form.name) newErrors.name = 'El nombre es obligatorio';
    if (!form.lastName) newErrors.lastName = 'Los apellidos son obligatorios';
    if (!form.email) newErrors.email = 'El email es obligatorio';
    else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) newErrors.email = 'Email inválido';
    if (!form.phone) newErrors.phone = 'El teléfono es obligatorio';
    if (!form.birthDate) newErrors.birthDate = 'La fecha de nacimiento es obligatoria';
    if (!form.country) newErrors.country = 'El país es obligatorio';
    if (!form.state) newErrors.state = 'El estado es obligatorio';
    if (!form.city) newErrors.city = 'La ciudad es obligatoria';
    if (!form.currency) newErrors.currency = 'La moneda es obligatoria';
    if (!form.preferredLanguage) newErrors.preferredLanguage = 'El idioma es obligatorio';
    if (!form.occupation) newErrors.occupation = 'La ocupación es obligatoria';
    return newErrors;
  };

  const handleChange = (field: string, value: string) => {
    let finalValue = value;

    // Aplicar formato especial para fecha de nacimiento (visual DD-MM-YYYY)
    if (field === 'birthDate') {
      finalValue = formatDateDisplay(value);
    }

    setForm({ ...form, [field]: finalValue });
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' });
    }
  };

  const handleBiometricToggle = async (value: boolean) => {
    try {
      if (value) {
        // Activar biometría
        await enable();
        setBiometricMessage(`${biometricType} activado exitosamente. Ahora podrás iniciar sesión más rápido.`);
        setShowBiometricInfoModal(true);
      } else {
        // Mostrar confirmación para desactivar
        setBiometricMessage(`¿Estás seguro que quieres desactivar ${biometricType}?`);
        setShowBiometricConfirmModal(true);
      }
    } catch (error) {
      logger.error('Error manejando biometría:', error);
      setErrorMessage('No se pudo cambiar la configuración de biometría. Intenta nuevamente.');
      setShowErrorModal(true);
    }
  };

  const confirmDisableBiometric = async () => {
    try {
      setShowBiometricConfirmModal(false);
      await disable();
      await clearBiometricCredentials();
      setBiometricMessage(`${biometricType} ha sido desactivado.`);
      setShowBiometricInfoModal(true);
    } catch (error) {
      logger.error('Error desactivando biometría:', error);
      setErrorMessage('No se pudo desactivar la biometría.');
      setShowErrorModal(true);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await authAPI.deleteAccount(deletePassword);
      setShowDeletePassword(false);
      setDeletePassword('');
      await clearBiometricCredentials();
      logout();
    } catch (error: any) {
      const msg = error?.response?.data?.error || error?.response?.data?.message || 'Error al eliminar la cuenta';
      if (error?.response?.status === 401) {
        setDeleteError('Contraseña incorrecta');
      } else {
        setDeleteError(msg);
      }
    } finally {
      setDeleting(false);
    }
  };

  const handleSubmit = async () => {
    const validation = validate();
    setErrors(validation);

    if (Object.keys(validation).length > 0) {
      return;
    }

    setSubmitting(true);

    try {
      // Convertir fecha de DD-MM-YYYY a YYYY-MM-DD para el backend
      const backendDate = convertToBackendFormat(form.birthDate);
      const profileData = {
        ...form,
        birthDate: backendDate
      };

      await api.put('/auth/profile', profileData);

      logger.log('✅ Perfil actualizado exitosamente');

      const message = 'Perfil actualizado correctamente';

      // Llamar callback con mensaje (el Screen cerrará el formulario y mostrará modal)
      onProfileUpdated(message);
      logger.log('🟢 onProfileUpdated llamado con mensaje:', message);
    } catch (error: any) {
      logger.error('Error al actualizar perfil:', error);
      const errMsg = error?.response?.data?.message || 'Error al actualizar perfil';
      setErrorMessage(errMsg);
      setShowErrorModal(true);
    } finally {
      setSubmitting(false);
    }
  };

  const DropdownModal = ({ 
    visible, 
    onClose, 
    options, 
    onSelect, 
    title,
    currentValue 
  }: {
    visible: boolean;
    onClose: () => void;
    options: { label: string; value: string }[];
    onSelect: (value: string) => void;
    title: string;
    currentValue: string;
  }) => (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#64748b" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.optionsList}>
            {options.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.optionItem,
                  currentValue === option.value && styles.selectedOption
                ]}
                onPress={() => {
                  onSelect(option.value);
                  onClose();
                }}
              >
                <Text style={[
                  styles.optionText,
                  currentValue === option.value && styles.selectedOptionText
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  return (
    <>
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Editar Perfil</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#64748b" />
            </TouchableOpacity>
          </View>

          <KeyboardAvoidingView
            style={styles.keyboardAvoidingView}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 140 : 20}
          >
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
            >
            {errors.general && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{errors.general}</Text>
              </View>
            )}

            {/* Información Personal */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Información Personal</Text>

              <View style={styles.row}>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Nombre *</Text>
                  <TextInput
                    style={[styles.input, errors.name && styles.inputError]}
                    value={form.name}
                    onChangeText={(text) => handleChange('name', text)}
                    placeholder="Tu nombre"
                  />
                  {errors.name && <Text style={styles.inputErrorText}>{errors.name}</Text>}
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Apellidos *</Text>
                  <TextInput
                    style={[styles.input, errors.lastName && styles.inputError]}
                    value={form.lastName}
                    onChangeText={(text) => handleChange('lastName', text)}
                    placeholder="Tus apellidos"
                  />
                  {errors.lastName && <Text style={styles.inputErrorText}>{errors.lastName}</Text>}
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Email *</Text>
                <TextInput
                  style={[styles.input, errors.email && styles.inputError]}
                  value={form.email}
                  onChangeText={(text) => handleChange('email', text)}
                  placeholder="tu@email.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                {errors.email && <Text style={styles.inputErrorText}>{errors.email}</Text>}
              </View>

              <View style={styles.row}>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Teléfono *</Text>
                  <TextInput
                    style={[styles.input, errors.phone && styles.inputError]}
                    value={form.phone}
                    onChangeText={(text) => handleChange('phone', text)}
                    placeholder="+52 123 456 7890"
                    keyboardType="phone-pad"
                  />
                  {errors.phone && <Text style={styles.inputErrorText}>{errors.phone}</Text>}
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Fecha de Nacimiento *</Text>
                  <TouchableOpacity
                    style={[styles.dateInput, errors.birthDate && styles.inputError]}
                    onPress={() => setShowDatePicker(true)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="calendar-outline" size={20} color="#2563EB" />
                    <Text style={[styles.dateText, !form.birthDate && styles.datePlaceholder]}>
                      {form.birthDate || 'Seleccionar fecha'}
                    </Text>
                  </TouchableOpacity>
                  {showDatePicker && (
                    <DateTimePicker
                      value={form.birthDate ? parseDisplayDateToDate(form.birthDate) : maxBirthDate}
                      mode="date"
                      display="default"
                      onChange={handleDatePickerChange}
                      maximumDate={maxBirthDate}
                      minimumDate={minBirthDate}
                    />
                  )}
                  {errors.birthDate && <Text style={styles.inputErrorText}>{errors.birthDate}</Text>}
                </View>
              </View>
            </View>

            {/* Información Básica */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Información Básica</Text>

              <View style={styles.row}>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>País *</Text>
                  <TouchableOpacity
                    style={[styles.dropdown, errors.country && styles.inputError]}
                    onPress={() => setShowCountryModal(true)}
                  >
                    <Text style={[styles.dropdownText, !form.country && styles.placeholderText]}>
                      {form.country || 'Selecciona tu país'}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color="#64748b" />
                  </TouchableOpacity>
                  {errors.country && <Text style={styles.inputErrorText}>{errors.country}</Text>}
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Estado *</Text>
                  <TextInput
                    style={[styles.input, errors.state && styles.inputError]}
                    value={form.state}
                    onChangeText={(text) => handleChange('state', text)}
                    placeholder="Tu estado"
                  />
                  {errors.state && <Text style={styles.inputErrorText}>{errors.state}</Text>}
                </View>
              </View>

              <View style={styles.row}>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Ciudad *</Text>
                  <TextInput
                    style={[styles.input, errors.city && styles.inputError]}
                    value={form.city}
                    onChangeText={(text) => handleChange('city', text)}
                    placeholder="Tu ciudad"
                  />
                  {errors.city && <Text style={styles.inputErrorText}>{errors.city}</Text>}
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Moneda *</Text>
                  <TouchableOpacity
                    style={[styles.dropdown, errors.currency && styles.inputError]}
                    onPress={() => setShowCurrencyModal(true)}
                  >
                    <Text style={[styles.dropdownText, !form.currency && styles.placeholderText]}>
                      {form.currency ? currencies.find(c => c.code === form.currency)?.name : 'Selecciona tu moneda'}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color="#64748b" />
                  </TouchableOpacity>
                  {errors.currency && <Text style={styles.inputErrorText}>{errors.currency}</Text>}
                </View>
              </View>

              <View style={styles.row}>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Idioma Preferido *</Text>
                  <TouchableOpacity
                    style={[styles.dropdown, errors.preferredLanguage && styles.inputError]}
                    onPress={() => setShowLanguageModal(true)}
                  >
                    <Text style={styles.dropdownText}>
                      {form.preferredLanguage === 'es' ? 'Español' : 'English'}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color="#64748b" />
                  </TouchableOpacity>
                  {errors.preferredLanguage && <Text style={styles.inputErrorText}>{errors.preferredLanguage}</Text>}
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Ocupación *</Text>
                  <TouchableOpacity
                    style={[styles.dropdown, errors.occupation && styles.inputError]}
                    onPress={() => setShowOccupationModal(true)}
                  >
                    <Text style={[styles.dropdownText, !form.occupation && styles.placeholderText]}>
                      {form.occupation || 'Selecciona tu ocupación'}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color="#64748b" />
                  </TouchableOpacity>
                  {errors.occupation && <Text style={styles.inputErrorText}>{errors.occupation}</Text>}
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Empresa (Opcional)</Text>
                <TextInput
                  style={styles.input}
                  value={form.company}
                  onChangeText={(text) => handleChange('company', text)}
                  placeholder="Nombre de tu empresa"
                />
              </View>
            </View>

            {/* Sección de Seguridad */}
            {isAvailable && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Seguridad</Text>

                <View style={styles.biometricContainer}>
                  <View style={styles.biometricInfo}>
                    <View style={styles.biometricHeader}>
                      <Ionicons
                        name={biometricType === 'Face ID' ? 'scan' : 'finger-print'}
                        size={24}
                        color="#2563EB"
                      />
                      <Text style={styles.biometricTitle}>
                        Usar {biometricType}
                      </Text>
                    </View>
                    <Text style={styles.biometricDescription}>
                      Inicia sesión más rápido usando {biometricType}
                    </Text>
                  </View>

                  <Switch
                    value={isEnabled}
                    onValueChange={handleBiometricToggle}
                    trackColor={{ false: '#d1d5db', true: '#2563EB' }}
                    thumbColor={isEnabled ? '#2563EB' : '#f3f4f6'}
                    ios_backgroundColor="#d1d5db"
                  />
                </View>
              </View>
            )}

            {/* Botones */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, (submitting || !hasChanges()) && styles.disabledButton]}
                onPress={handleSubmit}
                disabled={submitting || !hasChanges()}
              >
                <Text style={styles.saveButtonText}>
                  {submitting ? 'Guardando...' : 'Guardar Cambios'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Zona de Peligro */}
            <View style={styles.dangerSection}>
              <Text style={styles.dangerSectionTitle}>Zona de Peligro</Text>
              <View style={styles.dangerContent}>
                <Ionicons name="warning-outline" size={24} color="#dc2626" />
                <View style={styles.dangerTextContainer}>
                  <Text style={styles.dangerTitle}>Eliminar mi cuenta</Text>
                  <Text style={styles.dangerDescription}>
                    Esta acción eliminará permanentemente tu cuenta y todos tus datos. No se puede deshacer.
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => setShowDeleteConfirm(true)}
              >
                <Ionicons name="trash-outline" size={18} color="#ffffff" />
                <Text style={styles.deleteButtonText}>Eliminar mi cuenta</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
          </KeyboardAvoidingView>

          {/* Modals */}
          <DropdownModal
            visible={showCountryModal}
            onClose={() => setShowCountryModal(false)}
            options={latinAmericanCountries.map(country => ({ label: country, value: country }))}
            onSelect={(value) => handleChange('country', value)}
            title="Seleccionar País"
            currentValue={form.country}
          />

          <DropdownModal
            visible={showCurrencyModal}
            onClose={() => setShowCurrencyModal(false)}
            options={currencies.map(currency => ({
              label: `${currency.name} (${currency.code}) ${currency.symbol}`,
              value: currency.code
            }))}
            onSelect={(value) => handleChange('currency', value)}
            title="Seleccionar Moneda"
            currentValue={form.currency}
          />

          <DropdownModal
            visible={showOccupationModal}
            onClose={() => setShowOccupationModal(false)}
            options={occupationOptions.map(option => ({ label: option, value: option }))}
            onSelect={(value) => handleChange('occupation', value)}
            title="Seleccionar Ocupación"
            currentValue={form.occupation}
          />

          <DropdownModal
            visible={showLanguageModal}
            onClose={() => setShowLanguageModal(false)}
            options={[
              { label: 'Español', value: 'es' },
              { label: 'English', value: 'en' }
            ]}
            onSelect={(value) => handleChange('preferredLanguage', value)}
            title="Seleccionar Idioma"
            currentValue={form.preferredLanguage}
          />

          {/* Modal de información de biometría */}
          <CustomModal
            visible={showBiometricInfoModal}
            type="success"
            title="Biometría"
            message={biometricMessage}
            buttonText="Entendido"
            onClose={() => setShowBiometricInfoModal(false)}
          />

          {/* Modal de confirmación de desactivar biometría */}
          <CustomModal
            visible={showBiometricConfirmModal}
            type="warning"
            title="Desactivar Biometría"
            message={biometricMessage}
            buttonText="Desactivar"
            showSecondaryButton={true}
            secondaryButtonText="Cancelar"
            onSecondaryPress={() => setShowBiometricConfirmModal(false)}
            onClose={confirmDisableBiometric}
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

          {/* Modal de confirmación de eliminación - Paso 1 */}
          <CustomModal
            visible={showDeleteConfirm}
            type="warning"
            title="Eliminar cuenta"
            message={'¿Estás seguro que deseas eliminar tu cuenta permanentemente?\n\nSe borrarán todos tus datos, transacciones, presupuestos y metas. Esta acción no se puede deshacer.'}
            buttonText="Continuar"
            showSecondaryButton={true}
            secondaryButtonText="Cancelar"
            onSecondaryPress={() => setShowDeleteConfirm(false)}
            onClose={() => {
              setShowDeleteConfirm(false);
              setShowDeletePassword(true);
            }}
          />

          {/* Modal de contraseña para eliminación - Paso 2 */}
          <CustomModal
            visible={showDeletePassword}
            type="error"
            title="Confirmar eliminación"
            message="Ingresa tu contraseña para confirmar la eliminación de tu cuenta."
            hideDefaultButton={true}
            onClose={() => {
              setShowDeletePassword(false);
              setDeletePassword('');
              setDeleteError('');
            }}
            customContent={
              <View style={{ width: '100%' }}>
                <View style={styles.deletePasswordInputContainer}>
                  <Ionicons name="lock-closed-outline" size={20} color="#64748b" style={{ marginRight: 10 }} />
                  <TextInput
                    style={styles.deletePasswordInput}
                    placeholder="Tu contraseña"
                    placeholderTextColor="#9ca3af"
                    secureTextEntry
                    value={deletePassword}
                    onChangeText={(text) => { setDeletePassword(text); setDeleteError(''); }}
                    autoCapitalize="none"
                    editable={!deleting}
                  />
                </View>
                {deleteError ? (
                  <Text style={styles.deleteErrorText}>{deleteError}</Text>
                ) : null}
                <View style={styles.deleteModalButtons}>
                  <TouchableOpacity
                    style={styles.deleteModalCancelButton}
                    onPress={() => {
                      setShowDeletePassword(false);
                      setDeletePassword('');
                      setDeleteError('');
                    }}
                    disabled={deleting}
                  >
                    <Text style={styles.deleteModalCancelText}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.deleteModalConfirmButton, (deleting || !deletePassword) && { opacity: 0.5 }]}
                    onPress={handleDeleteAccount}
                    disabled={deleting || !deletePassword}
                  >
                    {deleting ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Text style={styles.deleteModalConfirmText}>Eliminar cuenta</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            }
          />
        </SafeAreaView>
      </Modal>
    </>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 200,
  },
  errorContainer: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: '#e5e7eb',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  inputContainer: {
    flex: 1,
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1e293b',
  },
  inputError: {
    borderColor: '#dc2626',
  },
  inputErrorText: {
    color: '#dc2626',
    fontSize: 12,
    marginTop: 4,
  },
  dropdown: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownText: {
    fontSize: 16,
    color: '#1e293b',
    flex: 1,
  },
  placeholderText: {
    color: '#9ca3af',
  },
  dateInput: {
    backgroundColor: 'white',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dateText: {
    fontSize: 16,
    color: '#1e293b',
    flex: 1,
  },
  datePlaceholder: {
    color: '#9ca3af',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 2,
    backgroundColor: '#2563EB',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  optionsList: {
    maxHeight: 400,
  },
  optionItem: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  selectedOption: {
    backgroundColor: '#eff6ff',
  },
  optionText: {
    fontSize: 16,
    color: '#374151',
  },
  selectedOptionText: {
    color: '#2563EB',
    fontWeight: '600',
  },
  // Estilos para biometría
  biometricContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  biometricInfo: {
    flex: 1,
    marginRight: 16,
  },
  biometricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  biometricTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginLeft: 8,
  },
  biometricDescription: {
    fontSize: 14,
    color: '#64748b',
    marginLeft: 32,
  },
  // Estilos para zona de peligro y eliminación de cuenta
  dangerSection: {
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    padding: 20,
    marginTop: 24,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  dangerSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#dc2626',
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: '#fecaca',
  },
  dangerContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  dangerTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  dangerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#991b1b',
    marginBottom: 4,
  },
  dangerDescription: {
    fontSize: 13,
    color: '#b91c1c',
    lineHeight: 18,
  },
  deleteButton: {
    backgroundColor: '#dc2626',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
  },
  deleteButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  deletePasswordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    width: '100%',
  },
  deletePasswordInput: {
    flex: 1,
    fontSize: 16,
    color: '#1e293b',
  },
  deleteErrorText: {
    color: '#dc2626',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 12,
  },
  deleteModalButtons: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  deleteModalCancelButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  deleteModalCancelText: {
    color: '#64748b',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteModalConfirmButton: {
    flex: 1,
    backgroundColor: '#dc2626',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteModalConfirmText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});