import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { saveToken, removeToken } from '../utils/api'

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
  logout: () => Promise<void>
  setLoading: (loading: boolean) => void
  updateUser: (user: User) => void
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
      logout: async () => {
        await removeToken();
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