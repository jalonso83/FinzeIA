// Subscription Types for FinZen Mobile App
// Matching backend types from FinzenAI-backend-temp

export type SubscriptionPlan = 'FREE' | 'PREMIUM' | 'PRO';

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
  advancedReports: boolean;
  exportData: boolean;
  multipleWallets?: boolean;
  bankIntegration?: boolean;
  prioritySupport?: boolean;
}

export interface Plan {
  id: SubscriptionPlan;
  name: string;
  price: number;
  stripePriceId: string | null;
  limits: PlanLimits;
  features: string[];
}

export interface PlanDetails {
  name: string;
  price: number;
  stripePriceId: string | null;
  limits: PlanLimits;
  features: string[];
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
