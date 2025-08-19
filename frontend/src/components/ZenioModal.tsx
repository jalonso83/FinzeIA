import React from 'react';
import ZenioChat from './ZenioChat';

interface ZenioModalProps {
  onClose: () => void;
  user?: any;
  onTransactionCreated?: (transaction: any) => void;
  onTransactionUpdated?: (transaction: any) => void;
  onTransactionDeleted?: (transaction: any) => void;
  onBudgetCreated?: (budget: any) => void;
  onBudgetUpdated?: (budget: any) => void;
  onBudgetDeleted?: (budget: any) => void;
  onGoalCreated?: (goal: any) => void;
  onGoalUpdated?: (goal: any) => void;
  onGoalDeleted?: (goal: any) => void;
}

const ZenioModal: React.FC<ZenioModalProps> = ({ 
  onClose, 
  user,
  onTransactionCreated, 
  onTransactionUpdated,
  onTransactionDeleted,
  onBudgetCreated, 
  onBudgetUpdated,
  onBudgetDeleted,
  onGoalCreated,
  onGoalUpdated,
  onGoalDeleted
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <ZenioChat 
        onClose={onClose} 
        isOnboarding={false} 
        user={user}
        onTransactionCreated={onTransactionCreated}
        onTransactionUpdated={onTransactionUpdated}
        onTransactionDeleted={onTransactionDeleted}
        onBudgetCreated={onBudgetCreated}
        onBudgetUpdated={onBudgetUpdated}
        onBudgetDeleted={onBudgetDeleted}
        onGoalCreated={onGoalCreated}
        onGoalUpdated={onGoalUpdated}
        onGoalDeleted={onGoalDeleted}
      />
    </div>
  );
};

export default ZenioModal; 