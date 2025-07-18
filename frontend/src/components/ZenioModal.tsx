import React from 'react';
import ZenioChat from './ZenioChat';

interface ZenioModalProps {
  onClose: () => void;
  onTransactionCreated?: (transaction: any) => void;
}

const ZenioModal: React.FC<ZenioModalProps> = ({ onClose, onTransactionCreated }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <ZenioChat 
        onClose={onClose} 
        isOnboarding={false} 
        onTransactionCreated={onTransactionCreated}
      />
    </div>
  );
};

export default ZenioModal; 