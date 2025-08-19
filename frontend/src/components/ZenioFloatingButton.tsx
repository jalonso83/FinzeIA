import React, { useState } from 'react';
import { useAuthStore } from '../stores/auth';
import isotipo from '../assets/isotipo.png';
import ZenioModal from './ZenioModal';

const ZenioFloatingButton = () => {
  const [open, setOpen] = useState(false);
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated || !user?.onboardingCompleted) return null;

  const handleTransactionCreated = (transaction: any) => {
    console.log('[ZenioFloatingButton] handleTransactionCreated llamado con:', transaction);
    // Emitir evento para que la página de transacciones se actualice
    window.dispatchEvent(new CustomEvent('zenio-transaction-created', { 
      detail: { transaction } 
    }));
    console.log('[ZenioFloatingButton] Evento zenio-transaction-created disparado');
  };

  const handleTransactionUpdated = (transaction: any) => {
    // Emitir evento para que la página de transacciones se actualice
    window.dispatchEvent(new CustomEvent('zenio-transaction-updated', { 
      detail: { transaction } 
    }));
  };

  const handleTransactionDeleted = (transaction: any) => {
    // Emitir evento para que la página de transacciones se actualice
    window.dispatchEvent(new CustomEvent('zenio-transaction-deleted', { 
      detail: { transaction } 
    }));
  };

  const handleBudgetCreated = (budget: any) => {
    // Emitir evento para que la página de presupuestos se actualice
    window.dispatchEvent(new CustomEvent('zenio-budget-created', { 
      detail: { budget } 
    }));
  };

  const handleBudgetUpdated = (budget: any) => {
    // Emitir evento para que la página de presupuestos se actualice
    window.dispatchEvent(new CustomEvent('zenio-budget-updated', { 
      detail: { budget } 
    }));
  };

  const handleBudgetDeleted = (budget: any) => {
    // Emitir evento para que la página de presupuestos se actualice
    window.dispatchEvent(new CustomEvent('zenio-budget-deleted', { 
      detail: { budget } 
    }));
  };

  const handleGoalCreated = (goal: any) => {
    // Emitir evento para que la página de metas se actualice
    window.dispatchEvent(new CustomEvent('zenio-goal-created', { 
      detail: { goal } 
    }));
  };

  const handleGoalUpdated = (goal: any) => {
    // Emitir evento para que la página de metas se actualice
    window.dispatchEvent(new CustomEvent('zenio-goal-updated', { 
      detail: { goal } 
    }));
  };

  const handleGoalDeleted = (goal: any) => {
    // Emitir evento para que la página de metas se actualice
    window.dispatchEvent(new CustomEvent('zenio-goal-deleted', { 
      detail: { goal } 
    }));
  };

  return (
    <>
      <button
        className="fixed z-50 bottom-8 right-8 bg-white border-4 border-primary shadow-lg rounded-full w-20 h-20 flex items-center justify-center hover:shadow-xl transition-all focus:outline-none"
        onClick={() => setOpen(true)}
        aria-label="Abrir chat con Zenio"
        style={{ boxShadow: '0 4px 24px 0 rgba(32,66,122,0.18)' }}
      >
        <img src={isotipo} alt="Zenio" className="w-14 h-14" />
      </button>
      {open && <ZenioModal 
        onClose={() => setOpen(false)} 
        user={user}
        onTransactionCreated={handleTransactionCreated}
        onTransactionUpdated={handleTransactionUpdated}
        onTransactionDeleted={handleTransactionDeleted}
        onBudgetCreated={handleBudgetCreated}
        onBudgetUpdated={handleBudgetUpdated}
        onBudgetDeleted={handleBudgetDeleted}
        onGoalCreated={handleGoalCreated}
        onGoalUpdated={handleGoalUpdated}
        onGoalDeleted={handleGoalDeleted}
      />}
    </>
  );
};

export default ZenioFloatingButton; 