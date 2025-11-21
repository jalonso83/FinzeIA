import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import api from '../utils/api';
import CustomModal from '../components/modals/CustomModal';

export default function ForgotPasswordScreen() {
  const navigation = useNavigation();
  const [step, setStep] = useState(1); // 1: Email, 2: Code & Password
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [showCodeSentModal, setShowCodeSentModal] = useState(false);
  const [showPasswordUpdatedModal, setShowPasswordUpdatedModal] = useState(false);

  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const sendResetCode = async () => {
    if (!email.trim()) {
      setErrors({ email: 'El email es requerido' });
      return;
    }

    if (!isValidEmail(email)) {
      setErrors({ email: 'Ingresa un email válido' });
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      await api.post('/auth/forgot-password', { email: email.toLowerCase().trim() });

      setShowCodeSentModal(true);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Error al enviar código de recuperación';
      setErrors({ api: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async () => {
    const newErrors: {[key: string]: string} = {};

    if (!resetCode.trim()) {
      newErrors.resetCode = 'El código es requerido';
    } else if (resetCode.length !== 6) {
      newErrors.resetCode = 'El código debe tener 6 dígitos';
    }

    if (!newPassword) {
      newErrors.newPassword = 'La nueva contraseña es requerida';
    } else if (newPassword.length < 6) {
      newErrors.newPassword = 'La contraseña debe tener al menos 6 caracteres';
    }

    if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      await api.post('/auth/reset-password', {
        email: email.toLowerCase().trim(),
        resetCode: resetCode.trim(),
        newPassword
      });

      setShowPasswordUpdatedModal(true);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Error al restablecer la contraseña';
      setErrors({ api: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>🔐 Recupera tu contraseña</Text>
      <Text style={styles.stepSubtitle}>
        Ingresa tu email y te enviaremos un código de 6 dígitos para restablecer tu contraseña
      </Text>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={[styles.input, errors.email && styles.inputError]}
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            if (errors.email) setErrors({ ...errors, email: '' });
          }}
          placeholder="tu@email.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          placeholderTextColor="#9CA3AF"
        />
        {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
      </View>

      {errors.api && (
        <View style={styles.apiErrorContainer}>
          <Text style={styles.apiErrorText}>{errors.api}</Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.primaryButton, loading && styles.buttonDisabled]}
        onPress={sendResetCode}
        disabled={loading}
      >
        <Text style={styles.primaryButtonText}>
          {loading ? 'Enviando...' : '📧 Enviar código'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>📱 Ingresa el código</Text>
      <Text style={styles.stepSubtitle}>
        Revisa tu email {email} y ingresa el código de 6 dígitos junto con tu nueva contraseña
      </Text>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Código de verificación</Text>
        <TextInput
          style={[styles.input, styles.codeInput, errors.resetCode && styles.inputError]}
          value={resetCode}
          onChangeText={(text) => {
            const numericText = text.replace(/[^0-9]/g, '').slice(0, 6);
            setResetCode(numericText);
            if (errors.resetCode) setErrors({ ...errors, resetCode: '' });
          }}
          placeholder="123456"
          keyboardType="numeric"
          maxLength={6}
          placeholderTextColor="#9CA3AF"
        />
        {errors.resetCode && <Text style={styles.errorText}>{errors.resetCode}</Text>}
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Nueva contraseña</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            style={[styles.passwordInput, errors.newPassword && styles.inputError]}
            value={newPassword}
            onChangeText={(text) => {
              setNewPassword(text);
              if (errors.newPassword) setErrors({ ...errors, newPassword: '' });
            }}
            placeholder="Mínimo 6 caracteres"
            secureTextEntry={!showPassword}
            placeholderTextColor="#9CA3AF"
          />
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => setShowPassword(!showPassword)}
          >
            <Ionicons
              name={showPassword ? 'eye-off' : 'eye'}
              size={20}
              color="#9CA3AF"
            />
          </TouchableOpacity>
        </View>
        {errors.newPassword && <Text style={styles.errorText}>{errors.newPassword}</Text>}
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Confirmar contraseña</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            style={[styles.passwordInput, errors.confirmPassword && styles.inputError]}
            value={confirmPassword}
            onChangeText={(text) => {
              setConfirmPassword(text);
              if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: '' });
            }}
            placeholder="Repite la contraseña"
            secureTextEntry={!showConfirmPassword}
            placeholderTextColor="#9CA3AF"
          />
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => setShowConfirmPassword(!showConfirmPassword)}
          >
            <Ionicons
              name={showConfirmPassword ? 'eye-off' : 'eye'}
              size={20}
              color="#9CA3AF"
            />
          </TouchableOpacity>
        </View>
        {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
      </View>

      {errors.api && (
        <View style={styles.apiErrorContainer}>
          <Text style={styles.apiErrorText}>{errors.api}</Text>
        </View>
      )}

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => setStep(1)}
        >
          <Ionicons name="chevron-back" size={20} color="#64748b" />
          <Text style={styles.secondaryButtonText}>Volver</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.primaryButton, styles.flexButton, loading && styles.buttonDisabled]}
          onPress={resetPassword}
          disabled={loading}
        >
          <Text style={styles.primaryButtonText}>
            {loading ? 'Actualizando...' : '🔑 Cambiar contraseña'}
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.resendButton}
        onPress={() => setStep(1)}
      >
        <Text style={styles.resendButtonText}>¿No recibiste el código? Enviar otro</Text>
      </TouchableOpacity>
    </View>
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
        <Text style={styles.headerTitle}>Recuperar contraseña</Text>
        <View style={styles.placeholder} />
      </View>

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
          {/* Logo */}
          <View style={styles.logoContainer}>
            <Image
              source={require('../assets/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          {/* Steps */}
          <View style={styles.card}>
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modales */}
      <CustomModal
        visible={showCodeSentModal}
        type="success"
        title="📧 Código enviado"
        message="Si existe una cuenta con ese email, recibirás un código de 6 dígitos en unos minutos."
        buttonText="Continuar"
        onClose={() => {
          setShowCodeSentModal(false);
          setStep(2);
        }}
      />

      <CustomModal
        visible={showPasswordUpdatedModal}
        type="success"
        title="¡Contraseña actualizada!"
        message="Tu contraseña ha sido actualizada exitosamente. Ya puedes iniciar sesión."
        buttonText="Ir al Login"
        onClose={() => {
          setShowPasswordUpdatedModal(false);
          navigation.goBack();
        }}
      />
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
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  placeholder: {
    width: 40,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 200,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logo: {
    width: 120,
    height: 40,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  stepContainer: {
    gap: 20,
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
    lineHeight: 22,
  },
  inputContainer: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1e293b',
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  codeInput: {
    textAlign: 'center',
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 4,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  passwordInput: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: '#1e293b',
  },
  eyeButton: {
    padding: 16,
  },
  inputError: {
    borderColor: '#ef4444',
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 4,
  },
  apiErrorContainer: {
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
  },
  apiErrorText: {
    fontSize: 14,
    color: '#dc2626',
    textAlign: 'center',
  },
  primaryButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  flexButton: {
    flex: 1,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  resendButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  resendButtonText: {
    fontSize: 14,
    color: '#2563EB',
    fontWeight: '500',
  },
});