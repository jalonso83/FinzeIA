import React from 'react';
import '../../pages/Screens.css';
import { budgetsAPI, type Budget } from '../../utils/api';

interface BudgetListProps {
  budgets: Budget[];
  loading: boolean;
  onReload: () => void;
  onEditBudget: (budget: Budget) => void;
}

const formatPeriod = (period: string) => {
  switch (period) {
    case 'weekly': return 'semanal';
    case 'monthly': return 'mensual';
    case 'yearly': return 'anual';
    default: return period;
  }
};

const BudgetList: React.FC<BudgetListProps> = ({ budgets, loading, onReload, onEditBudget }) => {
  const handleDeleteBudget = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm('¿Estás seguro de que quieres eliminar este presupuesto?')) {
      await budgetsAPI.delete(id);
      onReload();
    }
  };

  if (loading) {
    return <div className="text-center text-gray-400 py-8">Cargando presupuestos...</div>;
  }

  if (!budgets.length) {
    return (
      <div className="empty-budget-state">
        <p>No has creado ningún presupuesto.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {budgets.map(budget => {
        const spent = budget.spent || 0;
        const amount = budget.amount || 0;
        const percentage = amount > 0 ? Math.min((spent / amount) * 100, 100) : 0;
        const progressColor = percentage < 70 ? '#4CAF50' : percentage < 80 ? '#FFC107' : '#F44336';
        const alertClass = percentage >= 100 ? 'budget-alert-danger' : percentage >= 80 ? 'budget-alert-warning' : '';
        return (
          <div
            key={budget.id}
            className={`bg-white rounded-xl shadow p-6 flex flex-col gap-2 border border-gray-200 ${alertClass} cursor-pointer transition hover:shadow-lg`}
            onClick={() => onEditBudget(budget)}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{budget.category?.icon || '💰'}</span>
                <h3 className="text-lg font-semibold text-gray-800">{budget.category?.name || 'Sin categoría'}</h3>
              </div>
              <button className="delete-button" onClick={e => handleDeleteBudget(e, budget.id)}>
                ×
              </button>
            </div>
            <div className="text-sm text-gray-500 mb-1">Límite {formatPeriod(budget.period)}</div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-gray-700">RD${spent.toFixed(2)}</span>
              <span className="text-gray-400">/</span>
              <span className="font-bold text-primary">RD${amount.toFixed(2)}</span>
            </div>
            <div className="w-full h-3 bg-gray-100 rounded-lg overflow-hidden mb-1">
              <div
                className="h-3 rounded-lg"
                style={{ width: `${percentage}%`, backgroundColor: progressColor }}
              ></div>
            </div>
            <div className="text-xs text-gray-500 text-right">{percentage.toFixed(0)}% usado</div>
          </div>
        );
      })}
    </div>
  );
};

export default BudgetList; 