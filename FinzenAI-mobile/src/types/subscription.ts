// Subscription Types for FinZen Mobile App
// Matching backend types from FinzenAI-backend-temp

export type SubscriptionPlan = 'FREE' | 'PREMIUM' | 'PRO';

export type BillingPeriod = 'monthly' | 'yearly';

export type SubscriptionStatus =
  | 'ACTIVE'
  | 'CANCELED'
  | 'PAST_DUE'
  | 'TRIALING'
  | 'INCOMPLETE'
  | 'INCOMPLETE_EXPIRED'
  | 'UNPAID';

export type PaymentStatus = 'SUCCEEDED' | 'FAILED' | 'PENDING' | 'REFUNDED';

export interface PlanLimits {
  budgets: number; // -1 = unlimited
  goals: number; // -1 = unlimited
  zenioQueries: number; // -1 = unlimited
  reminders: number; // -1 = unlimited (recordatorios de pago)
  budgetAlerts: boolean; // Alertas de umbral de presupuesto
  textToSpeech: boolean; // TTS para respuestas de Zenio
  advancedReports: boolean;
  exportData: boolean;
  bankIntegration: boolean; // Email Sync (PRO only)
  antExpenseAnalysis: 'basic' | 'full'; // Detector de gastos hormiga
  advancedCalculators: boolean; // Skip vs Save Challenge
  multipleWallets?: boolean;
  prioritySupport?: boolean;
}

export interface PlanPrice {
  monthly: number;
  yearly: number;
}

export interface PlanSavings {
  yearly: number;
  percentage: number;
}

export interface Plan {
  id: SubscriptionPlan;
  name: string;
  price: PlanPrice;
  savings?: PlanSavings | null;
  limits: PlanLimits;
  features: string[];
}

export interface PlanDetails {
  name: string;
  price: PlanPrice;
  savings?: PlanSavings | null;
  limits: PlanLimits;
  features: string[];
}

export interface ZenioUsage {
  used: number;
  limit: number; // -1 = unlimited
  remaining: number; // -1 = unlimited
}

export interface Subscription {
  id: string;
  userId: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripePriceId: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  trialEndsAt: string | null;
  createdAt: string;
  updatedAt: string;
  limits: PlanLimits;
  features: string[];
  planDetails: PlanDetails;
  zenioUsage: ZenioUsage;
}

export interface Payment {
  id: string;
  userId: string;
  subscriptionId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  stripePaymentIntentId: string | null;
  stripeInvoiceId: string | null;
  description: string | null;
  createdAt: string;
}

export interface CheckoutSessionResponse {
  url: string;
  sessionId: string;
}

export interface PlansResponse {
  plans: Plan[];
}

export interface PaymentHistoryResponse {
  payments: Payment[];
}

export interface CheckoutSessionStatusResponse {
  status: string;
  paymentStatus: string;
  subscription: string | null;
}

export interface CancelSubscriptionResponse {
  message: string;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
}

export interface ReactivateSubscriptionResponse {
  message: string;
  cancelAtPeriodEnd: boolean;
}

export interface ChangePlanResponse {
  message: string;
  newPlan: SubscriptionPlan;
}

export interface CustomerPortalResponse {
  url: string;
}
