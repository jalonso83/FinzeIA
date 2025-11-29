// Subscription Store - Zustand
// Manejo global del estado de suscripciones y límites

import { create } from 'zustand';
import { subscriptionsAPI } from '../utils/api';
import {
  Subscription,
  Plan,
  Payment,
  SubscriptionPlan,
  CheckoutSessionResponse,
  CancelSubscriptionResponse,
} from '../types/subscription';

interface SubscriptionState {
  // Estado
  subscription: Subscription | null;
  plans: Plan[];
  payments: Payment[];
  loading: boolean;
  error: string | null;

  // Acciones
  fetchSubscription: () => Promise<void>;
  fetchPlans: () => Promise<void>;
  fetchPayments: (limit?: number) => Promise<void>;
  createCheckout: (plan: 'PREMIUM' | 'PRO') => Promise<CheckoutSessionResponse>;
  cancelSubscription: () => Promise<CancelSubscriptionResponse>;
  reactivateSubscription: () => Promise<void>;
  changePlan: (newPlan: 'PREMIUM' | 'PRO') => Promise<void>;

  // Validadores de límites
  canCreateBudget: (currentCount: number) => boolean;
  canCreateGoal: (currentCount: number) => boolean;
  canAskZenio: (currentCount: number) => boolean;
  hasAdvancedReports: () => boolean;
  canExportData: () => boolean;

  // Helpers
  getCurrentPlan: () => SubscriptionPlan;
  isFreePlan: () => boolean;
  isPremiumPlan: () => boolean;
  isProPlan: () => boolean;
  getPlanLimits: () => Subscription['limits'] | null;

  // Reset
  reset: () => void;
}

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
  // Estado inicial
  subscription: null,
  plans: [],
  payments: [],
  loading: false,
  error: null,

  // Obtener suscripción actual del usuario
  fetchSubscription: async () => {
    set({ loading: true, error: null });
    try {
      const response = await subscriptionsAPI.getCurrent();
      set({ subscription: response.data, loading: false });
    } catch (error: any) {
      console.error('Error fetching subscription:', error);
      set({
        error: error.response?.data?.message || 'Error al obtener suscripción',
        loading: false
      });
    }
  },

  // Obtener todos los planes disponibles
  fetchPlans: async () => {
    set({ loading: true, error: null });
    try {
      const response = await subscriptionsAPI.getPlans();
      set({ plans: response.data.plans, loading: false });
    } catch (error: any) {
      console.error('Error fetching plans:', error);
      set({
        error: error.response?.data?.message || 'Error al obtener planes',
        loading: false
      });
    }
  },

  // Obtener historial de pagos
  fetchPayments: async (limit = 10) => {
    set({ loading: true, error: null });
    try {
      const response = await subscriptionsAPI.getPayments(limit);
      set({ payments: response.data.payments, loading: false });
    } catch (error: any) {
      console.error('Error fetching payments:', error);
      set({
        error: error.response?.data?.message || 'Error al obtener pagos',
        loading: false
      });
    }
  },

  // Crear sesión de checkout para upgrade
  createCheckout: async (plan: 'PREMIUM' | 'PRO'): Promise<CheckoutSessionResponse> => {
    set({ loading: true, error: null });
    try {
      const response = await subscriptionsAPI.createCheckout(plan);
      set({ loading: false });
      return response.data;
    } catch (error: any) {
      console.error('Error creating checkout:', error);
      const errorMessage = error.response?.data?.message || 'Error al crear sesión de pago';
      set({ error: errorMessage, loading: false });
      throw new Error(errorMessage);
    }
  },

  // Cancelar suscripción
  cancelSubscription: async (): Promise<CancelSubscriptionResponse> => {
    set({ loading: true, error: null });
    try {
      const response = await subscriptionsAPI.cancel();

      // Actualizar estado local
      const currentSub = get().subscription;
      if (currentSub) {
        set({
          subscription: {
            ...currentSub,
            cancelAtPeriodEnd: true,
          },
          loading: false,
        });
      }

      return response.data;
    } catch (error: any) {
      console.error('Error canceling subscription:', error);
      const errorMessage = error.response?.data?.message || 'Error al cancelar suscripción';
      set({ error: errorMessage, loading: false });
      throw new Error(errorMessage);
    }
  },

  // Reactivar suscripción cancelada
  reactivateSubscription: async () => {
    set({ loading: true, error: null });
    try {
      await subscriptionsAPI.reactivate();

      // Actualizar estado local
      const currentSub = get().subscription;
      if (currentSub) {
        set({
          subscription: {
            ...currentSub,
            cancelAtPeriodEnd: false,
          },
          loading: false,
        });
      }
    } catch (error: any) {
      console.error('Error reactivating subscription:', error);
      set({
        error: error.response?.data?.message || 'Error al reactivar suscripción',
        loading: false
      });
      throw error;
    }
  },

  // Cambiar de plan
  changePlan: async (newPlan: 'PREMIUM' | 'PRO') => {
    set({ loading: true, error: null });
    try {
      await subscriptionsAPI.changePlan(newPlan);

      // Refrescar suscripción
      await get().fetchSubscription();
    } catch (error: any) {
      console.error('Error changing plan:', error);
      set({
        error: error.response?.data?.message || 'Error al cambiar de plan',
        loading: false
      });
      throw error;
    }
  },

  // Validar si puede crear presupuesto
  canCreateBudget: (currentCount: number): boolean => {
    const subscription = get().subscription;
    if (!subscription) return currentCount < 3; // Default FREE limits

    const limit = subscription.limits.budgets;
    if (limit === -1) return true; // Unlimited
    return currentCount < limit;
  },

  // Validar si puede crear meta
  canCreateGoal: (currentCount: number): boolean => {
    const subscription = get().subscription;
    if (!subscription) return currentCount < 2; // Default FREE limits

    const limit = subscription.limits.goals;
    if (limit === -1) return true; // Unlimited
    return currentCount < limit;
  },

  // Validar si puede hacer consulta a Zenio
  canAskZenio: (currentCount: number): boolean => {
    const subscription = get().subscription;
    if (!subscription) return currentCount < 10; // Default FREE limits

    const limit = subscription.limits.zenioQueries;
    if (limit === -1) return true; // Unlimited
    return currentCount < limit;
  },

  // Validar si tiene acceso a reportes avanzados
  hasAdvancedReports: (): boolean => {
    const subscription = get().subscription;
    if (!subscription) return false;
    return subscription.limits.advancedReports === true;
  },

  // Validar si puede exportar datos
  canExportData: (): boolean => {
    const subscription = get().subscription;
    if (!subscription) return false;
    return subscription.limits.exportData === true;
  },

  // Obtener plan actual
  getCurrentPlan: (): SubscriptionPlan => {
    const subscription = get().subscription;
    return subscription?.plan || 'FREE';
  },

  // Verificar si es plan FREE
  isFreePlan: (): boolean => {
    return get().getCurrentPlan() === 'FREE';
  },

  // Verificar si es plan PREMIUM
  isPremiumPlan: (): boolean => {
    return get().getCurrentPlan() === 'PREMIUM';
  },

  // Verificar si es plan PRO
  isProPlan: (): boolean => {
    return get().getCurrentPlan() === 'PRO';
  },

  // Obtener límites del plan
  getPlanLimits: () => {
    const subscription = get().subscription;
    return subscription?.limits || null;
  },

  // Reset del store
  reset: () => {
    set({
      subscription: null,
      plans: [],
      payments: [],
      loading: false,
      error: null,
    });
  },
}));
