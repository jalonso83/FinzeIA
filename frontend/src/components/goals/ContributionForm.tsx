import React, { useState } from 'react';
import api from '../../utils/api';

interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  category: {
    icon: string;
    name: string;
  };
}

interface ContributionFormProps {
  goal: Goal;
  onClose: () => void;
  onContributionAdded: () => void;
}

const ContributionForm: React.FC<ContributionFormProps> = ({ goal, onClose, onContributionAdded }) => {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: 'DOP',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const calculateRemaining = () => {
    return goal.targetAmount - goal.currentAmount;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const contributionAmount = parseFloat(amount);
      
      if (!contributionAmount || contributionAmount <= 0) {
        alert('El monto debe ser mayor a 0');
        return;
      }

      if (contributionAmount > calculateRemaining()) {
        alert('La contribución excedería el monto objetivo de la meta');
        return;
      }

      await api.post(`/goals/${goal.id}/contribute`, {
        amount: contributionAmount
      });
      
      onContributionAdded();
      onClose();
    } catch (error: any) {
      console.error('Error al añadir contribución:', error);
      alert(error.response?.data?.error || 'Error al añadir la contribución');
    } finally {
      setLoading(false);
    }
  };

  const remaining = calculateRemaining();
  const progress = ((goal.currentAmount / goal.targetAmount) * 100);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{goal.category.icon}</span>
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Añadir Contribución</h3>
              <p className="text-sm text-gray-500">{goal.name}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Progreso actual */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">Progreso actual</span>
              <span className="text-sm font-semibold text-gray-800">{progress.toFixed(1)}%</span>
            </div>
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-2 rounded-full transition-all duration-300"
                style={{ 
                  width: `${progress}%`, 
                  backgroundColor: progress >= 80 ? '#10B981' : progress >= 50 ? '#F59E0B' : '#3B82F6'
                }}
              ></div>
            </div>
            <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
              <span>{formatCurrency(goal.currentAmount)} ahorrado</span>
              <span>{formatCurrency(goal.targetAmount)} meta</span>
            </div>
          </div>

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Monto de contribución */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Monto de contribución *
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="0.00"
                  min="100"
                  step="100"
                  required
                />
                <span className="absolute right-3 top-2 text-gray-500">RD$</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Máximo disponible: {formatCurrency(remaining)}
              </p>
            </div>

            {/* Descripción opcional */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descripción (opcional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Ej: Pago de nómina, regalo de cumpleaños..."
                rows={2}
              />
            </div>

            {/* Información de la contribución */}
            {amount && parseFloat(amount) > 0 && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="text-sm text-blue-800">
                  <div className="flex justify-between mb-1">
                    <span>Nuevo progreso:</span>
                    <span className="font-semibold">
                      {((goal.currentAmount + parseFloat(amount)) / goal.targetAmount * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Restante después:</span>
                    <span className="font-semibold">
                      {formatCurrency(remaining - parseFloat(amount))}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Footer con botones */}
        <div className="flex gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-white transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !amount || parseFloat(amount) <= 0}
            className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Añadiendo...' : 'Añadir Contribución'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ContributionForm; 