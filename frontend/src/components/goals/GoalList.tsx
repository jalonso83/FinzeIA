import React from 'react';
import '../../pages/Screens.css';

interface Goal {
  id: string;
  name: string;
  description?: string;
  targetAmount: number;
  currentAmount: number;
  targetDate?: string;
  categoryId: string;
  priority: string;
  isCompleted: boolean;
  isActive: boolean;
  monthlyTargetPercentage?: number;
  monthlyContributionAmount?: number;
  contributionsCount: number;
  lastContributionDate?: string;
  createdAt: string;
  updatedAt: string;
  category: {
    id: string;
    name: string;
    icon: string;
    type: string;
  };
}

interface GoalListProps {
  goals: Goal[];
  loading: boolean;
  onReload: () => void;
  onEditGoal: (goal: Goal) => void;
  onAddContribution: (goal: Goal) => void;
}

const GoalList: React.FC<GoalListProps> = ({ goals, loading, onReload, onEditGoal, onAddContribution }) => {
  const handleDeleteGoal = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm('¿Estás seguro de que quieres eliminar esta meta?')) {
      try {
        // Aquí iría la llamada a la API para eliminar la meta
        onReload();
      } catch (error) {
        console.error('Error al eliminar meta:', error);
      }
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: 'DOP',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const calculateProgress = (saved: number, target: number): number => {
    if (target === 0) return 0;
    return Math.min((saved / target) * 100, 100);
  };

  const getProgressColor = (percentage: number): string => {
    if (percentage >= 80) return '#10B981'; // Verde
    if (percentage >= 50) return '#F59E0B'; // Amarillo
    return '#3B82F6'; // Azul
  };

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const getPriorityText = (priority: string): string => {
    switch (priority) {
      case 'high': return 'Alta';
      case 'medium': return 'Media';
      case 'low': return 'Baja';
      default: return priority;
    }
  };

  if (loading) {
    return <div className="text-center text-gray-400 py-8">Cargando metas...</div>;
  }

  if (!goals.length) {
    return (
      <div className="empty-budget-state">
        <p>No has creado ninguna meta de ahorro.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {goals.map(goal => {
        const progress = calculateProgress(goal.currentAmount, goal.targetAmount);
        const progressColor = getProgressColor(progress);
        const remaining = goal.targetAmount - goal.currentAmount;
        const isCompleted = goal.isCompleted;

        return (
          <div
            key={goal.id}
            className={`bg-white rounded-xl shadow p-6 flex flex-col gap-3 border border-gray-200 cursor-pointer transition hover:shadow-lg ${isCompleted ? 'opacity-75' : ''}`}
            onClick={() => onEditGoal(goal)}
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{goal.category.icon}</span>
                <h3 className="text-lg font-semibold text-gray-800">{goal.name}</h3>
              </div>
              <button 
                className="delete-button" 
                onClick={e => handleDeleteGoal(e, goal.id)}
              >
                ×
              </button>
            </div>

            {/* Prioridad */}
            <div className="flex items-center gap-2">
              <span className={`text-xs font-medium ${getPriorityColor(goal.priority)}`}>
                {getPriorityText(goal.priority)}
              </span>
              {isCompleted && (
                <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded-full">
                  Completada
                </span>
              )}
            </div>

            {/* Progreso */}
            <div className="w-full h-3 bg-gray-100 rounded-lg overflow-hidden">
              <div
                className="h-3 rounded-lg transition-all duration-300"
                style={{ 
                  width: `${progress}%`, 
                  backgroundColor: progressColor 
                }}
              ></div>
            </div>

            {/* Información de progreso */}
            <div className="text-center">
              <div className="text-sm text-gray-500 mb-1">Progreso</div>
              <div className="text-lg font-bold text-gray-800">{progress.toFixed(1)}% completado</div>
            </div>

            {/* Montos */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Ahorrado vs Meta</span>
                <span className="text-sm font-semibold text-gray-700">
                  {formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Por ahorrar</span>
                <span className="text-sm font-bold text-green-600">
                  {formatCurrency(remaining)}
                </span>
              </div>
            </div>

            {/* Contribuciones */}
            <div className="text-center text-xs text-gray-500">
              {goal.contributionsCount} Contribuciones
            </div>

            {/* Botón de añadir contribución */}
            <button
              className="w-full bg-primary text-white py-2 px-4 rounded-lg font-medium hover:bg-primary/90 transition-colors duration-200 text-sm"
              onClick={(e) => {
                e.stopPropagation();
                onAddContribution(goal);
              }}
            >
              Añadir Contribución
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default GoalList; 