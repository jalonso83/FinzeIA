import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../utils/api';

interface ProfileFormProps {
  visible: boolean;
  user: any;
  onClose: () => void;
  onProfileUpdated: () => void;
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
  { code: 'PR', name: 'Dólar Estadounidense', symbol: '$' },
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
  
  // Actualizar formulario cuando cambien los datos del usuario
  useEffect(() => {
    if (user) {
      console.log('ProfileForm - Usuario recibido:', user);
      setForm({
        name: user?.name || '',
        lastName: user?.lastName || '',
        email: user?.email || '',
        phone: user?.phone || '',
        birthDate: user?.birthDate ? user.birthDate.slice(0, 10) : '',
        country: user?.country || '',
        state: user?.state || '',
        city: user?.city || '',
        currency: user?.currency || '',
        preferredLanguage: user?.preferredLanguage || 'es',
        occupation: user?.occupation || '',
        company: user?.company || ''
      });
    }
  }, [user]);
  
  // Modal states for dropdowns
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [showOccupationModal, setShowOccupationModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);

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
    if (!form.occupation) newErrors.occupation = 'La ocupación es obligatoria';
    return newErrors;
  };

  const handleChange = (field: string, value: string) => {
    setForm({ ...form, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' });
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
      await api.put('/auth/profile', form);
      onProfileUpdated();
      onClose();
      Alert.alert('Éxito', 'Perfil actualizado correctamente');
    } catch (error: any) {
      console.error('Error al actualizar perfil:', error);
      const errorMessage = error?.response?.data?.message || 'Error al actualizar perfil';
      Alert.alert('Error', errorMessage);
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
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Editar Perfil</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#64748b" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
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
                <TextInput
                  style={[styles.input, errors.birthDate && styles.inputError]}
                  value={form.birthDate}
                  onChangeText={(text) => handleChange('birthDate', text)}
                  placeholder="YYYY-MM-DD"
                />
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
                <Text style={styles.label}>Moneda</Text>
                <TouchableOpacity
                  style={styles.dropdown}
                  onPress={() => setShowCurrencyModal(true)}
                >
                  <Text style={[styles.dropdownText, !form.currency && styles.placeholderText]}>
                    {form.currency ? currencies.find(c => c.code === form.currency)?.name : 'Selecciona tu moneda'}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color="#64748b" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Idioma Preferido</Text>
                <TouchableOpacity
                  style={styles.dropdown}
                  onPress={() => setShowLanguageModal(true)}
                >
                  <Text style={styles.dropdownText}>
                    {form.preferredLanguage === 'es' ? 'Español' : 'English'}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color="#64748b" />
                </TouchableOpacity>
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

          {/* Botones */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.saveButton, submitting && styles.disabledButton]} 
              onPress={handleSubmit}
              disabled={submitting}
            >
              <Text style={styles.saveButtonText}>
                {submitting ? 'Guardando...' : 'Guardar Cambios'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

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
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
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
    paddingBottom: 40,
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
});