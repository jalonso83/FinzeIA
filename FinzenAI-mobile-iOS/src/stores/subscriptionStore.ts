// Subscription Store - Zustand
// Manejo global del estado de suscripciones y límites

import { create } from 'zustand';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { subscriptionsAPI } from '../utils/api';
import { logger } from '../utils/logger';
import {
  Subscription,
  Plan,
  Payment,
  SubscriptionPlan,
  BillingPeriod,
  CheckoutSessionResponse,
  CancelSubscriptionResponse,
  ZenioUsage,
} from '../types/subscription';

// Helper para obtener o generar un ID único del dispositivo
const getDeviceId = async (): Promise<string> => {
  const DEVICE_ID_KEY = '@finzen_device_id';
  try {
    let deviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (!deviceId) {
      // Generar un ID único basado en timestamp + random
      deviceId = `${Platform.OS}_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      await AsyncStorage.setItem(DEVICE_ID_KEY, deviceId);
    }
    return deviceId;
  } catch (error) {
    // Fallback si AsyncStorage falla
    return `${Platform.OS}_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }
};

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
  createCheckout: (plan: 'PREMIUM' | 'PRO', billingPeriod?: BillingPeriod) => Promise<CheckoutSessionResponse>;
  syncCheckoutSession: (sessionId: string) => Promise<void>;
  cancelSubscription: () => Promise<CancelSubscriptionResponse>;
  reactivateSubscription: () => Promise<void>;
  changePlan: (newPlan: 'PREMIUM' | 'PRO', billingPeriod?: BillingPeriod) => Promise<void>;

  // Validadores de límites
  canCreateBudget: (currentCount: number) => boolean;
  canCreateGoal: (currentCount: number) => boolean;
  canCreateReminder: (currentCount: number) => boolean;
  canAskZenio: (currentCount: number) => boolean;
  hasAdvancedReports: () => boolean;
  canExportData: () => boolean;
  canExportPdf: () => boolean;
  canUseTextToSpeech: () => boolean;
  hasBudgetAlerts: () => boolean;
  getRemindersLimit: () => number;
  hasAdvancedCalculators: () => boolean;

  // Helpers
  getCurrentPlan: () => SubscriptionPlan;
  isFreePlan: () => boolean;
  isPremiumPlan: () => boolean;
  isProPlan: () => boolean;
  isTrialing: () => boolean;
  getTrialDaysRemaining: () => number;
  getTrialEndsAt: () => Date | null;
  getPlanLimits: () => Subscription['limits'] | null;
  getZenioUsage: () => ZenioUsage;
  updateZenioUsage: (usage: ZenioUsage) => void;

  // Modal de planes global
  showPlansModal: boolean;
  openPlansModal: () => void;
  closePlansModal: () => void;

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
  showPlansModal: false,

  // Obtener suscripción actual del usuario
  fetchSubscription: async () => {
    set({ loading: true, error: null });
    try {
      const response = await subscriptionsAPI.getCurrent();
      set({ subscription: response.data, loading: false });
    } catch (error: any) {
      logger.error('Error fetching subscription:', error);
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
      logger.error('Error fetching plans:', error);
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
      logger.error('Error fetching payments:', error);
      set({
        error: error.response?.data?.message || 'Error al obtener pagos',
        loading: false
      });
    }
  },

  // Crear sesión de checkout para upgrade (solo después del trial)
  createCheckout: async (plan: 'PREMIUM' | 'PRO', billingPeriod: BillingPeriod = 'monthly'): Promise<CheckoutSessionResponse> => {
    set({ loading: true, error: null });
    try {
      const response = await subscriptionsAPI.createCheckout(plan, billingPeriod);
      set({ loading: false });
      return response.data;
    } catch (error: any) {
      logger.error('Error creating checkout:', error);
      const errorMessage = error.response?.data?.message || 'Error al crear sesión de pago';
      set({ error: errorMessage, loading: false });
      throw new Error(errorMessage);
    }
  },

  // Iniciar período de prueba de 7 días (sin tarjeta)
  startTrial: async (plan: 'PREMIUM' | 'PRO'): Promise<void> => {
    set({ loading: true, error: null });
    try {
      // Obtener información del dispositivo
      const deviceId = await getDeviceId();
      const platform = Platform.OS as 'ios' | 'android';
      const deviceName = Device.modelName || Device.deviceName || undefined;

      const response = await subscriptionsAPI.startTrial(plan, {
        deviceId,
        platform,
        deviceName,
      });
      logger.log('✅ Trial iniciado:', response.data);
      // Refrescar suscripción para obtener el nuevo estado
      await get().fetchSubscription();
      set({ loading: false });
    } catch (error: any) {
      logger.error('Error starting trial:', error);
      const errorMessage = error.response?.data?.message || 'Error al iniciar período de prueba';
      set({ error: errorMessage, loading: false });
      throw new Error(errorMessage);
    }
  },

  // Sincronizar estado de checkout después del pago (Universal Links)
  syncCheckoutSession: async (sessionId: string): Promise<void> => {
    try {
      logger.log('🔄 Sincronizando sesión de checkout:', sessionId);
      const response = await subscriptionsAPI.checkCheckoutSession(sessionId);
      logger.log('✅ Sesión sincronizada:', response.data);

      // Si el pago fue exitoso, actualizar la suscripción
      if (response.data.status === 'complete' && response.data.paymentStatus === 'paid') {
        await get().fetchSubscription();
      }
    } catch (error: any) {
      logger.error('Error sincronizando sesión de checkout:', error);
      // No lanzamos error, solo logueamos - el pago puede haber funcionado aunque falle la sync
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
      logger.error('Error canceling subscription:', error);
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
      logger.error('Error reactivating subscription:', error);
      set({
        error: error.response?.data?.message || 'Error al reactivar suscripción',
        loading: false
      });
      throw error;
    }
  },

  // Cambiar de plan
  changePlan: async (newPlan: 'PREMIUM' | 'PRO', billingPeriod: BillingPeriod = 'monthly') => {
    set({ loading: true, error: null });
    try {
      await subscriptionsAPI.changePlan(newPlan, billingPeriod);

      // Refrescar suscripción
      await get().fetchSubscription();
    } catch (error: any) {
      logger.error('Error changing plan:', error);
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
    if (!subscription) return currentCount < 2; // Default FREE limits

    const limit = subscription.limits.budgets;
    if (limit === -1) return true; // Unlimited
    return currentCount < limit;
  },

  // Validar si puede crear meta
  canCreateGoal: (currentCount: number): boolean => {
    const subscription = get().subscription;
    if (!subscription) return currentCount < 1; // Default FREE limits

    const limit = subscription.limits.goals;
    if (limit === -1) return true; // Unlimited
    return currentCount < limit;
  },

  // Validar si puede crear recordatorio de pago
  canCreateReminder: (currentCount: number): boolean => {
    const subscription = get().subscription;
    if (!subscription) return currentCount < 2; // Default FREE limits

    const limit = subscription.limits.reminders;
    if (limit === -1) return true; // Unlimited
    return currentCount < limit;
  },

  // Obtener límite de recordatorios
  getRemindersLimit: (): number => {
    const subscription = get().subscription;
    if (!subscription) return 2; // Default FREE limits
    return subscription.limits.reminders;
  },

  // Validar si puede hacer consulta a Zenio
  canAskZenio: (currentCount: number): boolean => {
    const subscription = get().subscription;
    if (!subscription) return currentCount < 15; // Default FREE limits

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

  // Validar si puede exportar datos (CSV - PLUS y PRO)
  canExportData: (): boolean => {
    const subscription = get().subscription;
    if (!subscription) return false;
    return subscription.limits.exportData === true;
  },

  // Validar si puede exportar PDF (solo PRO)
  canExportPdf: (): boolean => {
    const subscription = get().subscription;
    if (!subscription) return false;
    // Solo PRO puede exportar PDF
    return subscription.plan === 'PRO';
  },

  // Validar si puede usar Text-to-Speech (Zenio con voz) - Solo PRO
  canUseTextToSpeech: (): boolean => {
    const subscription = get().subscription;
    if (!subscription) return false;
    // Solo PRO puede usar Text-to-Speech
    return subscription.plan === 'PRO';
  },

  // Validar si tiene alertas de umbral de presupuesto
  hasBudgetAlerts: (): boolean => {
    const subscription = get().subscription;
    if (!subscription) return false; // FREE por defecto no tiene alertas
    return subscription.limits.budgetAlerts === true;
  },

  // Validar si puede usar notificaciones PRO (email sync, gastos hormiga, reporte quincenal, tips)
  canUseProNotifications: (): boolean => {
    const subscription = get().subscription;
    if (!subscription) return false;
    return subscription.plan === 'PRO';
  },

  // Validar si tiene acceso a calculadoras avanzadas (Skip vs Save)
  hasAdvancedCalculators: (): boolean => {
    const subscription = get().subscription;
    if (!subscription) return false; // FREE por defecto no tiene calculadoras avanzadas
    return subscription.plan === 'PREMIUM' || subscription.plan === 'PRO';
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

  // Verificar si está en periodo de prueba
  isTrialing: (): boolean => {
    const subscription = get().subscription;
    return subscription?.status === 'TRIALING';
  },

  // Obtener días restantes del trial
  getTrialDaysRemaining: (): number => {
    const subscription = get().subscription;
    if (!subscription?.trialEndsAt) return 0;

    const now = new Date();
    const trialEnd = new Date(subscription.trialEndsAt);
    const diffTime = trialEnd.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return Math.max(0, diffDays);
  },

  // Obtener fecha de fin del trial
  getTrialEndsAt: (): Date | null => {
    const subscription = get().subscription;
    if (!subscription?.trialEndsAt) return null;
    return new Date(subscription.trialEndsAt);
  },

  // Obtener límites del plan
  getPlanLimits: () => {
    const subscription = get().subscription;
    return subscription?.limits || null;
  },

  // Obtener uso actual de Zenio
  getZenioUsage: (): ZenioUsage => {
    const subscription = get().subscription;
    return subscription?.zenioUsage || { used: 0, limit: 15, remaining: 15 };
  },

  // Actualizar uso de Zenio (después de cada consulta)
  updateZenioUsage: (usage: ZenioUsage) => {
    const subscription = get().subscription;
    if (subscription) {
      set({
        subscription: {
          ...subscription,
          zenioUsage: usage,
        },
      });
    }
  },

  // Modal de planes global
  openPlansModal: () => {
    set({ showPlansModal: true });
  },

  closePlansModal: () => {
    set({ showPlansModal: false });
  },

  // Reset del store
  reset: () => {
    set({
      subscription: null,
      plans: [],
      payments: [],
      loading: false,
      error: null,
      showPlansModal: false,
    });
  },
}));
