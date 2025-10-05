// Dashboard store para manejar actualizaciones en tiempo real
// Similar al sistema de eventos que maneja Zenio en la web

import { create } from 'zustand';

interface DashboardStore {
  // Flag para forzar actualización del dashboard
  refreshTrigger: number;

  // Triggers específicos para cada módulo
  transactionChangeTrigger: number;
  budgetChangeTrigger: number;
  goalChangeTrigger: number;

  // Función para forzar actualización
  refreshDashboard: () => void;

  // Listeners para eventos específicos
  onTransactionChange: () => void;
  onBudgetChange: () => void;
  onGoalChange: () => void;
}

export const useDashboardStore = create<DashboardStore>((set) => ({
  refreshTrigger: 0,
  transactionChangeTrigger: 0,
  budgetChangeTrigger: 0,
  goalChangeTrigger: 0,

  refreshDashboard: () => {
    set((state) => ({ refreshTrigger: state.refreshTrigger + 1 }));
  },

  onTransactionChange: () => {
    set((state) => ({
      refreshTrigger: state.refreshTrigger + 1,
      transactionChangeTrigger: state.transactionChangeTrigger + 1
    }));
  },

  onBudgetChange: () => {
    set((state) => ({
      refreshTrigger: state.refreshTrigger + 1,
      budgetChangeTrigger: state.budgetChangeTrigger + 1
    }));
  },

  onGoalChange: () => {
    set((state) => ({
      refreshTrigger: state.refreshTrigger + 1,
      goalChangeTrigger: state.goalChangeTrigger + 1
    }));
  },
}));