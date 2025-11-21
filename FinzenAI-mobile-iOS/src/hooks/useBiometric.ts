import { useState, useEffect } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

interface BiometricResult {
  isAvailable: boolean;
  isEnabled: boolean;
  biometricType: string;
  loading: boolean;
  authenticate: () => Promise<boolean>;
  enable: () => Promise<void>;
  disable: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useBiometric(): BiometricResult {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [biometricType, setBiometricType] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkBiometric();
  }, []);

  const checkBiometric = async () => {
    try {
      setLoading(true);

      // Verificar si el dispositivo tiene hardware biométrico
      const hasHardware = await LocalAuthentication.hasHardwareAsync();

      if (!hasHardware) {
        console.log('🔒 Dispositivo no tiene hardware biométrico');
        setIsAvailable(false);
        setLoading(false);
        return;
      }

      // Verificar si hay datos biométricos registrados
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!isEnrolled) {
        console.log('🔒 No hay datos biométricos registrados en el dispositivo');
        setIsAvailable(false);
        setLoading(false);
        return;
      }

      // Obtener tipos de autenticación soportados
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();

      // Determinar tipo de biometría disponible
      if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        setBiometricType('Face ID');
        console.log('✅ Face ID disponible');
      } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        setBiometricType('Huella Digital');
        console.log('✅ Huella Digital disponible');
      } else if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
        setBiometricType('Iris');
        console.log('✅ Iris disponible');
      } else {
        setBiometricType('Biometría');
      }

      setIsAvailable(true);

      // Verificar si el usuario tiene habilitada la biometría en la app
      const enabled = await SecureStore.getItemAsync('biometric_enabled');
      setIsEnabled(enabled === 'true');
      console.log(`🔐 Biometría ${enabled === 'true' ? 'habilitada' : 'deshabilitada'} en la app`);

    } catch (error) {
      console.error('❌ Error verificando biometría:', error);
      setIsAvailable(false);
    } finally {
      setLoading(false);
    }
  };

  const authenticate = async (): Promise<boolean> => {
    try {
      console.log('🔐 Iniciando autenticación biométrica...');

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: `Desbloquea FinZen AI`,
        fallbackLabel: 'Usar contraseña',
        cancelLabel: 'Cancelar',
        disableDeviceFallback: false,
      });

      if (result.success) {
        console.log('✅ Autenticación biométrica exitosa');
        return true;
      } else {
        console.log('❌ Autenticación biométrica fallida:', result.error);
        return false;
      }
    } catch (error) {
      console.error('❌ Error en autenticación biométrica:', error);
      return false;
    }
  };

  const enable = async (): Promise<void> => {
    try {
      console.log('🔐 Habilitando biometría...');

      // Primero autenticar para confirmar que funciona
      const authenticated = await authenticate();

      if (authenticated) {
        await SecureStore.setItemAsync('biometric_enabled', 'true');
        setIsEnabled(true);
        console.log('✅ Biometría habilitada exitosamente');
      } else {
        throw new Error('Autenticación biométrica fallida');
      }
    } catch (error) {
      console.error('❌ Error habilitando biometría:', error);
      throw error;
    }
  };

  const disable = async (): Promise<void> => {
    try {
      console.log('🔓 Deshabilitando biometría...');
      await SecureStore.deleteItemAsync('biometric_enabled');
      setIsEnabled(false);
      console.log('✅ Biometría deshabilitada exitosamente');
    } catch (error) {
      console.error('❌ Error deshabilitando biometría:', error);
      throw error;
    }
  };

  const refresh = async (): Promise<void> => {
    await checkBiometric();
  };

  return {
    isAvailable,
    isEnabled,
    biometricType,
    loading,
    authenticate,
    enable,
    disable,
    refresh,
  };
}
