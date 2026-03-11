import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { saveToken, removeToken, setForceLogoutCallback, authAPI } from '../utils/api'
import * as SecureStore from 'expo-secure-store'

import { logger } from '../utils/logger';
interface User {
  id: string
  name: string
  lastName?: string
  email: string
  verified: boolean
  onboardingCompleted?: boolean
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (user: User, token: string) => Promise<void>
  loginWithBiometric: () => Promise<boolean>
  logout: () => Promise<void>
  setLoading: (loading: boolean) => void
  updateUser: (user: User) => void
  saveBiometricCredentials: (user: User, token: string) => Promise<void>
  clearBiometricCredentials: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      login: async (user: User, token: string) => {
        await saveToken(token);
        set({
          user,
          token,
          isAuthenticated: true,
          isLoading: false,
        });
      },
      loginWithBiometric: async () => {
        try {
          logger.log('🔐 Intentando login con biometría...');

          // Obtener credenciales guardadas
          const userDataStr = await SecureStore.getItemAsync('biometric_user');
          const token = await SecureStore.getItemAsync('biometric_token');

          if (!userDataStr || !token) {
            logger.log('❌ No hay credenciales biométricas guardadas');
            return false;
          }

          const cachedUser: User = JSON.parse(userDataStr);

          // Iniciar sesión con las credenciales guardadas
          await saveToken(token);
          set({
            user: cachedUser,
            token,
            isAuthenticated: true,
            isLoading: false,
          });

          // Refrescar datos del usuario desde el servidor (onboardingCompleted, etc.)
          try {
            const profileResponse = await authAPI.getProfile();
            const freshUser = profileResponse.data;
            set({ user: freshUser });
            // Actualizar credenciales biométricas con datos frescos
            await SecureStore.setItemAsync('biometric_user', JSON.stringify(freshUser));
            logger.log('✅ Datos de usuario actualizados desde servidor');
          } catch (profileError: any) {
            const status = profileError?.response?.status;
            if (status === 401 || status === 403) {
              logger.log('Token biometrico expirado, forzando login limpio');
              await removeToken();
              await SecureStore.deleteItemAsync('biometric_user').catch(() => {});
              await SecureStore.deleteItemAsync('biometric_token').catch(() => {});
              await SecureStore.deleteItemAsync('biometric_enabled').catch(() => {});
              set({ user: null, token: null, isAuthenticated: false, isLoading: false });
              return false;
            }
            logger.log('Error de red, usando datos en cache');
          }

          logger.log('✅ Login biométrico exitoso');
          return true;
        } catch (error) {
          logger.error('❌ Error en login biométrico:', error);
          return false;
        }
      },
      saveBiometricCredentials: async (user: User, token: string) => {
        try {
          logger.log('💾 Guardando credenciales para biometría...');
          await SecureStore.setItemAsync('biometric_user', JSON.stringify(user));
          await SecureStore.setItemAsync('biometric_token', token);
          logger.log('✅ Credenciales guardadas exitosamente');
        } catch (error) {
          logger.error('❌ Error guardando credenciales:', error);
          throw error;
        }
      },
      clearBiometricCredentials: async () => {
        try {
          logger.log('🗑️ Eliminando credenciales biométricas...');
          await SecureStore.deleteItemAsync('biometric_user');
          await SecureStore.deleteItemAsync('biometric_token');
          await SecureStore.deleteItemAsync('biometric_enabled');
          logger.log('✅ Credenciales eliminadas exitosamente');
        } catch (error) {
          logger.error('❌ Error eliminando credenciales:', error);
        }
      },
      logout: async () => {
        logger.log('Ejecutando logout...');
        await removeToken();
        // Limpiar credenciales biométricas para evitar re-login con token expirado
        await SecureStore.deleteItemAsync('biometric_user').catch(() => {});
        await SecureStore.deleteItemAsync('biometric_token').catch(() => {});
        await SecureStore.deleteItemAsync('biometric_enabled').catch(() => {});
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
        });
        logger.log('Logout completado');
      },
      setLoading: (loading: boolean) =>
        set({
          isLoading: loading,
        }),
      updateUser: (user: User) =>
        set({
          user,
        }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)

// Configurar el callback de logout forzado cuando el token es inválido
// Esto se ejecuta automáticamente cuando el archivo se importa
setForceLogoutCallback(() => {
  logger.log('🔒 Force logout triggered from API interceptor');
  useAuthStore.getState().logout();
});