import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  Modal,
  FlatList,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { authAPI, referralsAPI } from '../utils/api';

import { logger } from '../utils/logger';
// Datos constantes como en el web
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
  { code: 'PR', name: 'Dólar Estadounidense', symbol: '$' }, // Puerto Rico
];

export default function RegisterScreen() {
  const [form, setForm] = useState({
    name: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    birthDate: '',
    country: '',
    state: '',
    city: '',
    currency: '',
    preferredLanguage: 'es',
    occupation: '',
    company: '',
    referralCode: '',
  });
  const [referralValidation, setReferralValidation] = useState<{
    valid: boolean;
    message: string;
    checking: boolean;
  }>({ valid: false, message: '', checking: false });
  const [errors, setErrors] = useState<any>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [showOccupationModal, setShowOccupationModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const navigation = useNavigation<any>();

  // Validar código de referido
  const validateReferralCode = async (code: string) => {
    if (!code || code.length < 5) {
      setReferralValidation({ valid: false, message: '', checking: false });
      return;
    }

    setReferralValidation({ valid: false, message: '', checking: true });

    try {
      const response = await referralsAPI.validateCode(code);
      if (response.data.valid) {
        setReferralValidation({
          valid: true,
          message: response.data.discountMessage || `${response.data.discount} de descuento`,
          checking: false,
        });
      } else {
        setReferralValidation({
          valid: false,
          message: response.data.message || 'Código inválido',
          checking: false,
        });
      }
    } catch (error: any) {
      setReferralValidation({
        valid: false,
        message: error.response?.data?.message || 'Código inválido',
        checking: false,
      });
    }
  };

  const validate = () => {
    const newErrors: any = {};
    if (!form.name) newErrors.name = 'El nombre es obligatorio';
    if (!form.lastName) newErrors.lastName = 'Los apellidos son obligatorios';
    if (!form.email) newErrors.email = 'El email es obligatorio';
    else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) newErrors.email = 'Email inválido';
    if (!form.password) newErrors.password = 'La contraseña es obligatoria';
    else if (form.password.length < 6) newErrors.password = 'Mínimo 6 caracteres';
    if (!form.confirmPassword) newErrors.confirmPassword = 'Confirma tu contraseña';
    else if (form.password !== form.confirmPassword) newErrors.confirmPassword = 'Las contraseñas no coinciden';
    if (!form.phone) newErrors.phone = 'El teléfono es obligatorio';
    if (!form.birthDate) newErrors.birthDate = 'La fecha de nacimiento es obligatoria';
    if (!form.country) newErrors.country = 'El país es obligatorio';
    if (!form.state) newErrors.state = 'El estado es obligatorio';
    if (!form.city) newErrors.city = 'La ciudad es obligatoria';
    if (!form.occupation) newErrors.occupation = 'La ocupación es obligatoria';
    return newErrors;
  };

  const handleSubmit = async () => {
    const validation = validate();
    setErrors(validation);
    
    if (Object.keys(validation).length > 0) {
      return;
    }

    setSubmitting(true);
    
    try {
      // Preparar datos para el backend
      const registerData = {
        name: form.name,
        lastName: form.lastName,
        email: form.email,
        password: form.password,
        phone: form.phone,
        birthDate: convertToBackendFormat(form.birthDate), // Convertir DD-MM-YYYY a YYYY-MM-DD
        country: form.country,
        state: form.state,
        city: form.city,
        currency: form.currency,
        preferredLanguage: form.preferredLanguage,
        occupation: form.occupation,
        company: form.company || undefined,
        referralCode: form.referralCode && referralValidation.valid ? form.referralCode : undefined,
      };

      await authAPI.register(registerData);

      // Mostrar modal de éxito moderno
      setShowSuccessModal(true);
      
    } catch (error: any) {
      logger.error('Error al registrar:', error);
      
      let errorMessage = 'Error al registrar usuario';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Función para formatear fecha automáticamente (visual: DD-MM-YYYY)
  const formatBirthDateDisplay = (value: string) => {
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

  const handleChange = (field: string, value: string) => {
    let finalValue = value;

    // Aplicar formato especial para fecha de nacimiento (visual DD-MM-YYYY)
    if (field === 'birthDate') {
      finalValue = formatBirthDateDisplay(value);
    }

    // Convertir código de referido a mayúsculas
    if (field === 'referralCode') {
      finalValue = value.toUpperCase();
      // Validar código cuando tenga suficiente longitud
      if (finalValue.length >= 5) {
        validateReferralCode(finalValue);
      } else {
        setReferralValidation({ valid: false, message: '', checking: false });
      }
    }

    setForm({ ...form, [field]: finalValue });
    // Limpiar error cuando el usuario empiece a escribir
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' });
    }
  };

  const navigateToLogin = () => {
    navigation.navigate('Login');
  };

  // Componente de Modal de Éxito
  const SuccessModal = () => (
    <Modal visible={showSuccessModal} transparent animationType="fade">
      <View style={styles.successModalOverlay}>
        <View style={styles.successModalContainer}>
          {/* Icono de éxito con círculo verde */}
          <View style={styles.successIconContainer}>
            <View style={styles.successIconCircle}>
              <Ionicons name="checkmark" size={60} color="#FFFFFF" />
            </View>
          </View>

          {/* Título */}
          <Text style={styles.successTitle}>¡Bienvenido/a a FinZen AI!</Text>

          {/* Mensaje */}
          <Text style={styles.successMessage}>
            Tu cuenta ha sido creada exitosamente.{'\n'}
            Te hemos enviado un email de verificación.
          </Text>

          {/* Botón de continuar */}
          <TouchableOpacity
            style={styles.successButton}
            onPress={() => {
              setShowSuccessModal(false);
              navigation.navigate('Login');
            }}
          >
            <Text style={styles.successButtonText}>Continuar</Text>
            <Ionicons name="arrow-forward" size={20} color="#FFFFFF" style={{ marginLeft: 8 }} />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // Componente de Modal Picker
  const ModalPicker = ({ visible, onClose, title, data, onSelect, selectedValue, displayKey }: any) => (
    <Modal visible={visible} transparent animationType="slide">
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={styles.modalContainer} activeOpacity={1} onPress={() => {}}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#64748b" />
            </TouchableOpacity>
          </View>
          <FlatList
            data={data}
            keyExtractor={(item, index) => index.toString()}
            renderItem={({ item }) => {
              const itemValue = typeof item === 'string' ? item : item.value;
              const itemDisplay = displayKey ? item[displayKey] : (typeof item === 'string' ? item : item.displayText);
              const isSelected = selectedValue === itemValue;
              
              return (
                <TouchableOpacity
                  style={[styles.modalItem, isSelected && styles.selectedItem]}
                  onPress={() => {
                    onSelect(itemValue);
                    onClose();
                  }}
                >
                  <Text style={styles.modalItemText}>{itemDisplay}</Text>
                  {isSelected && (
                    <Ionicons name="checkmark" size={20} color="#2563EB" />
                  )}
                </TouchableOpacity>
              );
            }}
            showsVerticalScrollIndicator={true}
          />
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 140 : 20}
        style={styles.keyboardContainer}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo y título como en web */}
          <View style={styles.header}>
            <Image 
              source={require('../assets/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.subtitle}>Tu copiloto financiero</Text>
          </View>

          {/* Card de registro como en web */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Crea tu cuenta</Text>
            
            {/* Mensaje de bienvenida */}
            <View style={styles.welcomeMessage}>
              <Text style={styles.welcomeTitle}>¡Bienvenido/a a FinZen AI!</Text>
              <Text style={styles.welcomeText}>Para empezar, necesitamos conocer un poco sobre ti. Esta información nos ayudará a personalizar tu experiencia.</Text>
            </View>

            {/* Información Personal */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Información Personal</Text>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Nombre *</Text>
                <TextInput
                  style={[styles.textInput, errors.name && styles.inputError]}
                  value={form.name}
                  onChangeText={(value) => handleChange('name', value)}
                  placeholder="Tu nombre"
                  placeholderTextColor="#9ca3af"
                />
                {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Apellidos *</Text>
                <TextInput
                  style={[styles.textInput, errors.lastName && styles.inputError]}
                  value={form.lastName}
                  onChangeText={(value) => handleChange('lastName', value)}
                  placeholder="Tus apellidos"
                  placeholderTextColor="#9ca3af"
                />
                {errors.lastName && <Text style={styles.errorText}>{errors.lastName}</Text>}
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Email *</Text>
                <TextInput
                  style={[styles.textInput, errors.email && styles.inputError]}
                  value={form.email}
                  onChangeText={(value) => handleChange('email', value)}
                  placeholder="tu@email.com"
                  placeholderTextColor="#9ca3af"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Contraseña *</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={[styles.textInput, { flex: 1, height: undefined, paddingVertical: 12 }, errors.password && styles.inputError]}
                    value={form.password}
                    onChangeText={(value) => handleChange('password', value)}
                    placeholder="••••••••"
                    placeholderTextColor="#9ca3af"
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.passwordToggle}
                  >
                    <Ionicons
                      name={showPassword ? "eye-off-outline" : "eye-outline"}
                      size={20}
                      color="#64748b"
                    />
                  </TouchableOpacity>
                </View>
                {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Confirmar Contraseña *</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={[styles.textInput, { flex: 1, height: undefined, paddingVertical: 12 }, errors.confirmPassword && styles.inputError]}
                    value={form.confirmPassword}
                    onChangeText={(value) => handleChange('confirmPassword', value)}
                    placeholder="••••••••"
                    placeholderTextColor="#9ca3af"
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={styles.passwordToggle}
                  >
                    <Ionicons
                      name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                      size={20}
                      color="#64748b"
                    />
                  </TouchableOpacity>
                </View>
                {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Teléfono *</Text>
                <TextInput
                  style={[styles.textInput, errors.phone && styles.inputError]}
                  value={form.phone}
                  onChangeText={(value) => handleChange('phone', value)}
                  placeholder="+52 123 456 7890"
                  placeholderTextColor="#9ca3af"
                  keyboardType="phone-pad"
                />
                {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Fecha de Nacimiento *</Text>
                <TextInput
                  style={[styles.textInput, errors.birthDate && styles.inputError]}
                  value={form.birthDate}
                  onChangeText={(value) => handleChange('birthDate', value)}
                  placeholder="DD-MM-YYYY"
                  placeholderTextColor="#9ca3af"
                  keyboardType="numeric"
                  maxLength={10}
                />
                {errors.birthDate && <Text style={styles.errorText}>{errors.birthDate}</Text>}
              </View>
            </View>

            {/* Información Básica */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Información Básica</Text>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>País *</Text>
                <TouchableOpacity
                  style={[styles.selectorButton, errors.country && styles.inputError]}
                  onPress={() => setShowCountryModal(true)}
                >
                  <Text style={[styles.selectorText, !form.country && styles.placeholderText]}>
                    {form.country || 'Selecciona tu país'}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color="#64748b" />
                </TouchableOpacity>
                {errors.country && <Text style={styles.errorText}>{errors.country}</Text>}
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Estado / Provincia *</Text>
                <TextInput
                  style={[styles.textInput, errors.state && styles.inputError]}
                  value={form.state}
                  onChangeText={(value) => handleChange('state', value)}
                  placeholder="Tu estado o provincia"
                  placeholderTextColor="#9ca3af"
                />
                {errors.state && <Text style={styles.errorText}>{errors.state}</Text>}
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Ciudad *</Text>
                <TextInput
                  style={[styles.textInput, errors.city && styles.inputError]}
                  value={form.city}
                  onChangeText={(value) => handleChange('city', value)}
                  placeholder="Tu ciudad"
                  placeholderTextColor="#9ca3af"
                />
                {errors.city && <Text style={styles.errorText}>{errors.city}</Text>}
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Moneda</Text>
                <TouchableOpacity
                  style={styles.selectorButton}
                  onPress={() => setShowCurrencyModal(true)}
                >
                  <Text style={[styles.selectorText, !form.currency && styles.placeholderText]} numberOfLines={1}>
                    {form.currency ?
                      `${form.currency} - ${currencies.find(c => c.code === form.currency)?.symbol}` :
                      'Selecciona tu moneda'
                    }
                  </Text>
                  <Ionicons name="chevron-down" size={20} color="#64748b" />
                </TouchableOpacity>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Idioma Preferido</Text>
                <TouchableOpacity
                  style={styles.selectorButton}
                  onPress={() => setShowLanguageModal(true)}
                >
                  <Text style={styles.selectorText}>
                    {form.preferredLanguage === 'es' ? 'Español' : 'English'}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color="#64748b" />
                </TouchableOpacity>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Ocupación *</Text>
                <TouchableOpacity
                  style={[styles.selectorButton, errors.occupation && styles.inputError]}
                  onPress={() => setShowOccupationModal(true)}
                >
                  <Text style={[styles.selectorText, !form.occupation && styles.placeholderText]} numberOfLines={1}>
                    {form.occupation || 'Selecciona tu ocupación'}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color="#64748b" />
                </TouchableOpacity>
                {errors.occupation && <Text style={styles.errorText}>{errors.occupation}</Text>}
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Empresa (Opcional)</Text>
                <TextInput
                  style={styles.textInput}
                  value={form.company}
                  onChangeText={(value) => handleChange('company', value)}
                  placeholder="Nombre de tu empresa"
                  placeholderTextColor="#9ca3af"
                />
              </View>
            </View>

            {/* Código de Referido */}
            <View style={styles.referralSection}>
              <View style={styles.referralHeader}>
                <Ionicons name="gift-outline" size={20} color="#2563EB" />
                <Text style={styles.referralTitle}>¿Tienes un código de referido?</Text>
              </View>
              <View style={styles.inputContainer}>
                <View style={styles.referralInputContainer}>
                  <TextInput
                    style={[styles.textInput, styles.referralInput]}
                    value={form.referralCode}
                    onChangeText={(value) => handleChange('referralCode', value)}
                    placeholder="Ingresa tu código"
                    placeholderTextColor="#9ca3af"
                    autoCapitalize="characters"
                    maxLength={20}
                  />
                  {referralValidation.checking && (
                    <ActivityIndicator size="small" color="#2563EB" style={styles.referralLoader} />
                  )}
                  {!referralValidation.checking && referralValidation.valid && (
                    <Ionicons name="checkmark-circle" size={24} color="#10b981" style={styles.referralIcon} />
                  )}
                  {!referralValidation.checking && form.referralCode.length >= 5 && !referralValidation.valid && (
                    <Ionicons name="close-circle" size={24} color="#ef4444" style={styles.referralIcon} />
                  )}
                </View>
                {referralValidation.message && (
                  <View style={[
                    styles.referralMessage,
                    referralValidation.valid ? styles.referralMessageSuccess : styles.referralMessageError
                  ]}>
                    <Ionicons
                      name={referralValidation.valid ? "pricetag" : "alert-circle"}
                      size={16}
                      color={referralValidation.valid ? "#10b981" : "#ef4444"}
                    />
                    <Text style={[
                      styles.referralMessageText,
                      referralValidation.valid ? styles.referralMessageTextSuccess : styles.referralMessageTextError
                    ]}>
                      {referralValidation.message}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            <TouchableOpacity 
              style={[styles.registerButton, submitting && styles.disabledButton]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text style={styles.registerButtonText}>Registrar</Text>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={navigateToLogin} style={styles.loginLink}>
            <Text style={styles.loginLinkText}>¿Ya tienes cuenta? Iniciar sesión</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modal de éxito */}
      <SuccessModal />

      {/* Modales de selección */}
      <ModalPicker
        visible={showCountryModal}
        onClose={() => setShowCountryModal(false)}
        title="Selecciona tu país"
        data={latinAmericanCountries}
        onSelect={(value: string) => handleChange('country', value)}
        selectedValue={form.country}
      />

      <ModalPicker
        visible={showCurrencyModal}
        onClose={() => setShowCurrencyModal(false)}
        title="Selecciona tu moneda"
        data={currencies.map(c => ({ displayText: `${c.name} (${c.code}) ${c.symbol}`, value: c.code }))}
        onSelect={(value: string) => handleChange('currency', value)}
        selectedValue={form.currency}
        displayKey="displayText"
      />

      <ModalPicker
        visible={showOccupationModal}
        onClose={() => setShowOccupationModal(false)}
        title="Selecciona tu ocupación"
        data={occupationOptions}
        onSelect={(value: string) => handleChange('occupation', value)}
        selectedValue={form.occupation}
      />

      <ModalPicker
        visible={showLanguageModal}
        onClose={() => setShowLanguageModal(false)}
        title="Selecciona tu idioma"
        data={[
          { displayText: 'Español', value: 'es' },
          { displayText: 'English', value: 'en' }
        ]}
        onSelect={(value: string) => handleChange('preferredLanguage', value)}
        selectedValue={form.preferredLanguage}
        displayKey="displayText"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 300,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logo: {
    width: 112,
    height: 112,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 32,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 8,
  },
  welcomeMessage: {
    marginBottom: 32,
    padding: 16,
    borderWidth: 2,
    borderColor: '#2563EB',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    alignItems: 'center',
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2563EB',
    marginBottom: 8,
    textAlign: 'center',
  },
  welcomeText: {
    fontSize: 16,
    color: '#1e293b',
    textAlign: 'center',
    lineHeight: 22,
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    borderBottomWidth: 2,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 8,
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: 'white',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#d1d5db',
    color: '#1e293b',
    height: 48, // Altura fija igual que selectores
  },
  inputError: {
    borderColor: '#ef4444',
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 4,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    paddingRight: 12,
    height: 48, // Altura fija igual que otros campos
  },
  passwordToggle: {
    padding: 8,
  },
  selectorButton: {
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 48, // Altura fija en lugar de minHeight
  },
  selectorText: {
    fontSize: 16,
    color: '#1e293b',
    flex: 1,
  },
  placeholderText: {
    color: '#9ca3af',
  },
  registerButton: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
  },
  disabledButton: {
    opacity: 0.7,
  },
  registerButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  loginLink: {
    alignItems: 'center',
    marginTop: 16,
  },
  loginLinkText: {
    fontSize: 14,
    color: '#64748b',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
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
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  selectedItem: {
    backgroundColor: '#eff6ff',
  },
  modalItemText: {
    fontSize: 16,
    color: '#1e293b',
    flex: 1,
  },
  // Estilos del modal de éxito
  successModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  successModalContainer: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 32,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  successIconContainer: {
    marginBottom: 24,
  },
  successIconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10b981',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 16,
  },
  successMessage: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  successButton: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    shadowColor: '#2563EB',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  successButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  // Estilos para código de referido
  referralSection: {
    marginTop: 8,
    marginBottom: 8,
    padding: 16,
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  referralHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  referralTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e40af',
    marginLeft: 8,
  },
  referralInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  referralInput: {
    flex: 1,
    paddingRight: 40,
  },
  referralLoader: {
    position: 'absolute',
    right: 12,
  },
  referralIcon: {
    position: 'absolute',
    right: 12,
  },
  referralMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  referralMessageSuccess: {
    backgroundColor: '#ecfdf5',
  },
  referralMessageError: {
    backgroundColor: '#fef2f2',
  },
  referralMessageText: {
    fontSize: 13,
    marginLeft: 6,
    flex: 1,
  },
  referralMessageTextSuccess: {
    color: '#059669',
  },
  referralMessageTextError: {
    color: '#dc2626',
  },
});