import React from 'react';
import ZenioChat from './ZenioChat';

interface ZenioModalProps {
  onClose: () => void;
  onTransactionCreated?: (transaction: any) => void;
  onBudgetCreated?: (budget: any) => void;
  onGoalCreated?: (goal: any) => void;
}

const ZenioModal: React.FC<ZenioModalProps> = ({ onClose, onTransactionCreated, onBudgetCreated, onGoalCreated }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <ZenioChat 
        onClose={onClose} 
        isOnboarding={false} 
        onTransactionCreated={onTransactionCreated}
        onBudgetCreated={onBudgetCreated}
        onGoalCreated={onGoalCreated}
      />
    </div>
  );
};

export default ZenioModal; 