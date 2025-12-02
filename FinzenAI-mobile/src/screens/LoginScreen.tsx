import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI } from '../utils/api';
import { useAuthStore } from '../stores/auth';
import { saveToken } from '../utils/api';
import { useBiometric } from '../hooks/useBiometric';
import CustomModal from '../components/modals/CustomModal';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingBiometric, setLoadingBiometric] = useState(false);
  const [errors, setErrors] = useState<any>({});
  const [rememberEmail, setRememberEmail] = useState(false);
  const [showBiometricPrompt, setShowBiometricPrompt] = useState(false);

  // Estados para modales
  const [biometricModalConfig, setBiometricModalConfig] = useState<{
    visible: boolean;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
    buttonText?: string;
    showSecondaryButton?: boolean;
    secondaryButtonText?: string;
    onClose?: () => void;
    onSecondaryPress?: () => void;
  }>({
    visible: false,
    type: 'info',
    title: '',
    message: '',
  });

  const [pendingBiometricSetup, setPendingBiometricSetup] = useState<{user: any, token: string} | null>(null);

  const navigation = useNavigation<any>();
  const { login, loginWithBiometric, saveBiometricCredentials } = useAuthStore();
  const { isAvailable, isEnabled, biometricType, authenticate, enable, refresh } = useBiometric();

  // Cargar email recordado al montar el componente
  useEffect(() => {
    const loadRememberedEmail = async () => {
      try {
        const rememberedEmail = await AsyncStorage.getItem('rememberedEmail');

        if (rememberedEmail) {
          setEmail(rememberedEmail);
          setRememberEmail(true);
          console.log('📧 Email recordado cargado:', rememberedEmail);
        } else {
          // Si no hay email recordado, limpiar el valor de prueba
          setEmail('');
          setPassword('');
        }

        // IMPORTANTE: Eliminar contraseñas guardadas previamente (migración)
        const oldPassword = await AsyncStorage.getItem('rememberedPassword');
        if (oldPassword) {
          console.log('🗑️ Eliminando contraseña guardada previamente por seguridad');
          await AsyncStorage.removeItem('rememberedPassword');
        }
      } catch (error) {
        console.error('Error loading remembered email:', error);
      }
    };

    loadRememberedEmail();
  }, []);

  const handleBiometricLogin = async () => {
    try {
      setLoadingBiometric(true);
      console.log('🔐 Iniciando login biométrico...');

      // Autenticar con biometría
      const authenticated = await authenticate();

      if (authenticated) {
        console.log('✅ Biometría autenticada, iniciando sesión...');
        // Login con credenciales guardadas
        const success = await loginWithBiometric();

        if (!success) {
          setBiometricModalConfig({
            visible: true,
            type: 'warning',
            title: 'Sesión expirada',
            message: 'Tu sesión ha expirado. Por favor, inicia sesión con tu contraseña.',
            buttonText: 'Entendido',
            onClose: () => setBiometricModalConfig(prev => ({ ...prev, visible: false })),
          });
        }
      } else {
        console.log('❌ Autenticación biométrica cancelada o fallida');
      }
    } catch (error) {
      console.error('❌ Error en login biométrico:', error);
      setBiometricModalConfig({
        visible: true,
        type: 'error',
        title: 'Error',
        message: 'No se pudo iniciar sesión con biometría. Intenta con tu contraseña.',
        buttonText: 'Entendido',
        onClose: () => setBiometricModalConfig(prev => ({ ...prev, visible: false })),
      });
    } finally {
      setLoadingBiometric(false);
    }
  };

  const promptBiometricSetup = (user: any, token: string) => {
    console.log('📱 Mostrando modal de configuración biométrica');
    const setupData = {user, token};
    setPendingBiometricSetup(setupData);

    setBiometricModalConfig({
      visible: true,
      type: 'info',
      title: `¿Usar ${biometricType}?`,
      message: `¿Quieres usar ${biometricType} para iniciar sesión más rápido en el futuro?`,
      buttonText: 'Sí, activar',
      showSecondaryButton: true,
      secondaryButtonText: 'No, gracias',
      onSecondaryPress: () => {
        console.log('❌ Usuario rechazó configurar biometría');
        setBiometricModalConfig(prev => ({ ...prev, visible: false }));
        setPendingBiometricSetup(null);
      },
      onClose: async () => {
        console.log('✅ Usuario aceptó configurar biometría');
        setBiometricModalConfig(prev => ({ ...prev, visible: false }));

        try {
          await enable();
          console.log('✅ Biometría habilitada exitosamente');

          await saveBiometricCredentials(setupData.user, setupData.token);
          console.log('🔐 Credenciales guardadas en SecureStore para biometría');

          await refresh();
          console.log('✅ Estado de biometría actualizado');

          setPendingBiometricSetup(null);

          // Mostrar modal de éxito
          setTimeout(() => {
            setBiometricModalConfig({
              visible: true,
              type: 'success',
              title: '¡Listo!',
              message: `${biometricType} configurado exitosamente. La próxima vez podrás iniciar sesión más rápido.`,
              buttonText: 'Entendido',
              onClose: () => setBiometricModalConfig(prev => ({ ...prev, visible: false })),
            });
          }, 300);
        } catch (error) {
          console.error('❌ Error configurando biometría:', error);
          setPendingBiometricSetup(null);

          setTimeout(() => {
            setBiometricModalConfig({
              visible: true,
              type: 'error',
              title: 'Error',
              message: 'No se pudo configurar la biometría. Intenta desde tu perfil.',
              buttonText: 'Entendido',
              onClose: () => setBiometricModalConfig(prev => ({ ...prev, visible: false })),
            });
          }, 300);
        }
      },
    });
  };

  const handleLogin = async () => {
    // Validaciones
    const newErrors: any = {};
    if (!email) newErrors.email = 'El email es obligatorio';
    else if (!isValidEmail(email)) newErrors.email = 'Email inválido';
    if (!password) newErrors.password = 'La contraseña es obligatoria';

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      return;
    }

    try {
      setLoading(true);
      const response = await authAPI.login(email, password);

      // Guardar o remover SOLO email según la preferencia del usuario
      if (rememberEmail) {
        await AsyncStorage.setItem('rememberedEmail', email);
        console.log('📧 Email guardado para autocompletar');
      } else {
        await AsyncStorage.removeItem('rememberedEmail');
        console.log('📧 Email eliminado de autocompletar');
      }

      // IMPORTANTE: Siempre eliminar contraseña guardada (por seguridad)
      await AsyncStorage.removeItem('rememberedPassword');

      // Guardar token y datos del usuario
      await saveToken(response.data.token);
      await login(response.data.user, response.data.token);

      // Solo guardar credenciales para biometría si YA está habilitada
      if (isEnabled) {
        await saveBiometricCredentials(response.data.user, response.data.token);
        console.log('🔐 Credenciales actualizadas en SecureStore para biometría');
      }

      // Si tiene biometría disponible pero no habilitada, preguntar
      console.log('🔍 Verificando biometría - isAvailable:', isAvailable, 'isEnabled:', isEnabled);
      if (isAvailable && !isEnabled) {
        console.log('✅ Condición cumplida, guardando flag para prompt biométrico');
        // Guardar flag para que AppNavigator muestre el modal después de la navegación
        await AsyncStorage.setItem('pendingBiometricSetup', 'true');
        await AsyncStorage.setItem('biometricType', biometricType);
      } else {
        console.log('❌ No se mostrará prompt - Razón:', !isAvailable ? 'No disponible' : 'Ya habilitado');
      }

      // El useAuthStore se encargará de la navegación automática
      // Si no completó onboarding, se manejará en AppNavigator

    } catch (error: any) {
      console.error('Login error:', error);
      let errorMessage = 'Error inesperado. Intenta nuevamente.';

      if (error.response?.status === 401) {
        errorMessage = 'Email o contraseña incorrectos';
      } else if (error.response?.status === 403) {
        errorMessage = 'Por favor verifica tu email antes de iniciar sesión';
      } else if (error.response?.status === 400) {
        errorMessage = error.response.data.message || 'Datos inválidos';
      } else if (error.response?.status === 500) {
        errorMessage = 'Error del servidor. Intenta nuevamente.';
      } else if (error.message === 'Network Error') {
        errorMessage = 'Error de conexión. Verifica tu internet.';
      }
      
      setErrors({ api: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const navigateToRegister = () => {
    navigation.navigate('Register');
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
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

          {/* Card de login como en web */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Iniciar Sesión</Text>
              <Text style={styles.cardDescription}>Ingresa tu email y contraseña para acceder a tu cuenta</Text>
            </View>

            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Email</Text>
                <View style={[styles.inputWrapper, errors.email && styles.inputError]}>
                  <Ionicons name="mail-outline" size={20} color="#64748b" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    value={email}
                    onChangeText={(text) => {
                      setEmail(text);
                      if (errors.email) {
                        setErrors({ ...errors, email: '' });
                      }
                    }}
                    placeholder="tu@email.com"
                    placeholderTextColor="#9ca3af"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
                {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Contraseña</Text>
                <View style={[styles.inputWrapper, errors.password && styles.inputError]}>
                  <Ionicons name="lock-closed-outline" size={20} color="#64748b" style={styles.inputIcon} />
                  <TextInput
                    style={[styles.textInput, { flex: 1 }]}
                    value={password}
                    onChangeText={(text) => {
                      setPassword(text);
                      if (errors.password) {
                        setErrors({ ...errors, password: '' });
                      }
                    }}
                    placeholder="••••••••"
                    placeholderTextColor="#9ca3af"
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
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
                <TouchableOpacity
                  style={styles.forgotPasswordRight}
                  onPress={() => navigation.navigate('ForgotPassword' as never)}
                >
                  <Text style={styles.forgotPasswordText}>¿Olvidaste tu contraseña?</Text>
                </TouchableOpacity>
              </View>

              {/* Checkbox para recordar email */}
              <TouchableOpacity
                style={styles.rememberContainer}
                onPress={() => setRememberEmail(!rememberEmail)}
              >
                <View style={[styles.checkbox, rememberEmail && styles.checkboxSelected]}>
                  {rememberEmail && (
                    <Ionicons name="checkmark" size={16} color="white" />
                  )}
                </View>
                <Text style={styles.rememberText}>Recordar email</Text>
              </TouchableOpacity>

              {errors.api && <Text style={styles.apiErrorText}>{errors.api}</Text>}

              <TouchableOpacity
                style={[styles.loginButton, loading && styles.disabledButton]}
                onPress={handleLogin}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <>
                    <Text style={styles.loginButtonText}>Iniciar Sesión</Text>
                    <Ionicons name="arrow-forward" size={20} color="white" />
                  </>
                )}
              </TouchableOpacity>

              {/* Botón de login biométrico */}
              {isAvailable && isEnabled && (
                <>
                  <View style={styles.divider}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>o</Text>
                    <View style={styles.dividerLine} />
                  </View>

                  <TouchableOpacity
                    style={[styles.biometricButton, loadingBiometric && styles.disabledButton]}
                    onPress={handleBiometricLogin}
                    disabled={loadingBiometric}
                  >
                    {loadingBiometric ? (
                      <ActivityIndicator color="#2563EB" size="small" />
                    ) : (
                      <>
                        <Ionicons
                          name={biometricType === 'Face ID' ? 'scan' : 'finger-print'}
                          size={24}
                          color="#2563EB"
                        />
                        <Text style={styles.biometricButtonText}>
                          Usar {biometricType}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>

          {/* Botón grande de registro como en web */}
          <TouchableOpacity style={styles.registerButton} onPress={navigateToRegister}>
            <Text style={styles.registerButtonText}>Crear Nueva Cuenta</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Custom Modal para biometría */}
      <CustomModal
        visible={biometricModalConfig.visible}
        type={biometricModalConfig.type}
        title={biometricModalConfig.title}
        message={biometricModalConfig.message}
        buttonText={biometricModalConfig.buttonText}
        showSecondaryButton={biometricModalConfig.showSecondaryButton}
        secondaryButtonText={biometricModalConfig.secondaryButtonText}
        onSecondaryPress={biometricModalConfig.onSecondaryPress}
        onClose={biometricModalConfig.onClose || (() => setBiometricModalConfig({ ...biometricModalConfig, visible: false }))}
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
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logo: {
    width: 128,
    height: 128,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 18,
    color: '#64748b',
    textAlign: 'center',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 32,
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
  cardHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  form: {
    gap: 16,
  },
  inputContainer: {
    marginBottom: 4,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  inputError: {
    borderColor: '#ef4444',
  },
  inputIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#1e293b',
  },
  passwordToggle: {
    padding: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 4,
  },
  apiErrorText: {
    fontSize: 14,
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 8,
  },
  forgotPasswordRight: {
    alignItems: 'flex-end',
    marginTop: 4,
  },
  forgotPasswordText: {
    fontSize: 12,
    color: '#2563EB',
    fontWeight: '500',
  },
  loginButton: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  disabledButton: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  registerButton: {
    backgroundColor: '#16a34a',
    borderRadius: 8,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  registerButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  // Estilos para recordar credenciales
  rememberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#d1d5db',
    backgroundColor: 'white',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  rememberText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  // Estilos para biometría
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e5e7eb',
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: '#9ca3af',
    fontWeight: '500',
  },
  biometricButton: {
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2563EB',
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  biometricButtonText: {
    color: '#2563EB',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});