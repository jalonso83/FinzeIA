import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { saveToken, removeToken } from '../utils/api'
import * as SecureStore from 'expo-secure-store'

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
          console.log('🔐 Intentando login con biometría...');

          // Obtener credenciales guardadas
          const userDataStr = await SecureStore.getItemAsync('biometric_user');
          const token = await SecureStore.getItemAsync('biometric_token');

          if (!userDataStr || !token) {
            console.log('❌ No hay credenciales biométricas guardadas');
            return false;
          }

          const user: User = JSON.parse(userDataStr);

          // Iniciar sesión con las credenciales guardadas
          await saveToken(token);
          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
          });

          console.log('✅ Login biométrico exitoso');
          return true;
        } catch (error) {
          console.error('❌ Error en login biométrico:', error);
          return false;
        }
      },
      saveBiometricCredentials: async (user: User, token: string) => {
        try {
          console.log('💾 Guardando credenciales para biometría...');
          await SecureStore.setItemAsync('biometric_user', JSON.stringify(user));
          await SecureStore.setItemAsync('biometric_token', token);
          console.log('✅ Credenciales guardadas exitosamente');
        } catch (error) {
          console.error('❌ Error guardando credenciales:', error);
          throw error;
        }
      },
      clearBiometricCredentials: async () => {
        try {
          console.log('🗑️ Eliminando credenciales biométricas...');
          await SecureStore.deleteItemAsync('biometric_user');
          await SecureStore.deleteItemAsync('biometric_token');
          await SecureStore.deleteItemAsync('biometric_enabled');
          console.log('✅ Credenciales eliminadas exitosamente');
        } catch (error) {
          console.error('❌ Error eliminando credenciales:', error);
        }
      },
      logout: async () => {
        await removeToken();
        // No eliminamos credenciales biométricas en logout normal
        // El usuario debe deshabilitarlo manualmente desde settings
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
        });
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