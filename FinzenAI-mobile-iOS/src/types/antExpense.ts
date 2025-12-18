/**
 * Tipos para el Detective de Gastos Hormiga
 * FinZen AI Mobile
 */

// =============================================
// CONFIGURACIÓN
// =============================================

export interface AntExpenseConfig {
  antThreshold: number;
  minFrequency: number;
  monthsToAnalyze: number;
}

export const DEFAULT_ANT_EXPENSE_CONFIG: AntExpenseConfig = {
  antThreshold: 500,
  minFrequency: 3,
  monthsToAnalyze: 3,
};

export interface ConfigOption {
  min: number;
  max: number;
  options: number[];
}

export interface ConfigLimits {
  antThreshold: ConfigOption;
  minFrequency: ConfigOption;
  monthsToAnalyze: ConfigOption;
}

// =============================================
// ESTADÍSTICAS
// =============================================

export type TrendDirection = 'up' | 'down' | 'stable';

export interface CategoryStats {
  category: string;
  icon: string;
  total: number;
  count: number;
  average: number;
  frequency: string;
  frequencyPerMonth: number;
  percentageOfAntTotal: number;
  trend: TrendDirection;
  trendPercentage: number;
}

export interface MonthlyData {
  monthKey: string;
  monthName: string;
  total: number;
  count: number;
  average: number;
}

export interface DayOfWeekData {
  dayNumber: number;
  dayName: string;
  total: number;
  count: number;
  average: number;
}

// =============================================
// METADATA
// =============================================

export interface UserHistoryInfo {
  firstTransactionDate: string | null;
  monthsWithData: number;
  hasEnoughData: boolean;
  totalTransactionsInPeriod: number;
  totalExpensesInPeriod: number;
}

export interface AnalysisMetadata {
  configUsed: AntExpenseConfig;
  periodStart: string;
  periodEnd: string;
  actualMonthsAnalyzed: number;
  userHistory: UserHistoryInfo;
  antTransactionsCount: number;
  antPercentageOfExpenses: number;
  analyzedAt: string;
}

// =============================================
// CÁLCULOS
// =============================================

export interface AntExpenseCalculations {
  totalAntExpenses: number;
  totalAllExpenses: number;
  percentageOfTotal: number;
  topCriminals: CategoryStats[];
  monthlyTrend: MonthlyData[];
  byDayOfWeek: DayOfWeekData[];
  mostExpensiveDay: DayOfWeekData | null;
  savingsOpportunityPerMonth: number;
  averagePerDay: number;
  metadata: AnalysisMetadata;
}

// =============================================
// INSIGHTS DE IA
// =============================================

export interface CategorySuggestions {
  category: string;
  suggestions: string[];
}

export interface ZenioInsights {
  impactMessage: string;
  equivalencies: string[];
  categorySuggestions: CategorySuggestions[];
  motivationalMessage: string;
  severityLevel: number;
  summary: string;
}

// =============================================
// RESPUESTAS API
// =============================================

export interface AnalysisWarning {
  type: 'info' | 'warning' | 'error';
  message: string;
}

export interface AntExpenseAnalysisResponse {
  success: boolean;
  canAnalyze: boolean;
  cannotAnalyzeReason?: string;
  calculations: AntExpenseCalculations | null;
  insights: ZenioInsights | null;
  warnings: AnalysisWarning[];
  recommendedConfig: AntExpenseConfig;
  configOptions: ConfigLimits;
}

export interface ConfigRecommendation {
  value: number;
  reason: string;
  maxAvailable?: number;
}

export interface AntExpenseConfigResponse {
  success: boolean;
  defaultConfig: AntExpenseConfig;
  configOptions: ConfigLimits;
  userHistory: {
    monthsWithData: number;
    hasEnoughData: boolean;
    totalExpenses: number;
  };
  recommendations: {
    antThreshold: ConfigRecommendation;
    minFrequency: ConfigRecommendation;
    monthsToAnalyze: ConfigRecommendation;
  };
}
