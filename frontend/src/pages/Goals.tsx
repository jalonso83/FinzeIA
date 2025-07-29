import React, { useState, useEffect } from 'react';
import Navigation from '../components/Navigation';
import GoalForm from '../components/goals/GoalForm';
import GoalList from '../components/goals/GoalList';
import ContributionForm from '../components/goals/ContributionForm';
import api from '../utils/api';
import './Screens.css';

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

const Goals = () => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewGoalForm, setShowNewGoalForm] = useState(false);
  const [editGoal, setEditGoal] = useState<Goal | null>(null);
  const [showContributionForm, setShowContributionForm] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);

  const fetchGoals = async () => {
    try {
      setLoading(true);
      const response = await api.get('/goals');
      setGoals(response.data);
    } catch (error) {
      console.error('Error al cargar metas:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, []);

  // Escuchar eventos para refrescar datos desde Zenio
  useEffect(() => {
    const handleGoalCreated = () => {
      fetchGoals();
    };

    window.addEventListener('zenio-goal-created', handleGoalCreated);
    
    return () => {
      window.removeEventListener('zenio-goal-created', handleGoalCreated);
    };
  }, []);

  const handleEditGoal = (goal: Goal) => {
    setEditGoal(goal);
    setShowNewGoalForm(true);
  };

  const handleAddContribution = (goal: Goal) => {
    setSelectedGoal(goal);
    setShowContributionForm(true);
  };

  const handleContributionAdded = () => {
    fetchGoals(); // Recargar metas después de añadir contribución
  };

  // Calcular totales
  const totalTarget = goals.reduce((sum, goal) => sum + goal.targetAmount, 0);
  const totalSaved = goals.reduce((sum, goal) => sum + goal.currentAmount, 0);
  const totalToSave = totalTarget - totalSaved;

  // Formatear moneda
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: 'DOP',
      minimumFractionDigits: 2
    }).format(amount);
  };

  // Calcular porcentaje de progreso
  const calculateProgress = (saved: number, target: number): number => {
    if (target === 0) return 0;
    return Math.min((saved / target) * 100, 100);
  };

  // Obtener color de la barra de progreso
  const getProgressColor = (percentage: number): string => {
    if (percentage >= 80) return '#10B981'; // Verde
    if (percentage >= 50) return '#F59E0B'; // Amarillo
    return '#3B82F6'; // Azul
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background px-4 md:px-8 py-6">
        <Navigation />
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-gray-500 mt-2">Cargando metas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 md:px-8 py-6">
      <Navigation />
      
      <div className="screen-container">
        <div className="screen-header">
          <h2 className="section-title text-text mb-6 font-bold">Metas de Ahorro</h2>
          <button 
            className="primary-button" 
            onClick={() => { setEditGoal(null); setShowNewGoalForm(true); }}
          >
            + Nueva
          </button>
        </div>

        {/* Resumen de metas */}
        <div className="bg-white rounded-xl shadow p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Resumen de Metas</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col items-center p-4 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-500">Meta total</span>
              <span className="text-xl font-bold text-primary">{formatCurrency(totalTarget)}</span>
            </div>
            <div className="flex flex-col items-center p-4 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-500">Ahorrado</span>
              <span className="text-xl font-bold text-green-600">{formatCurrency(totalSaved)}</span>
            </div>
            <div className="flex flex-col items-center p-4 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-500">Por ahorrar</span>
              <span className="text-xl font-bold text-blue-600">{formatCurrency(totalToSave)}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-6 mb-8">
          <p className="text-gray-600 mb-4">
            Establece metas de ahorro y realiza un seguimiento de tu progreso.
          </p>
          <GoalList 
            goals={goals} 
            loading={loading} 
            onReload={fetchGoals}
            onEditGoal={handleEditGoal}
            onAddContribution={handleAddContribution}
          />
        </div>

        {/* Modal para nueva meta */}
        {showNewGoalForm && (
          <GoalForm 
            onClose={() => { setShowNewGoalForm(false); setEditGoal(null); }}
            onGoalCreated={fetchGoals}
            editGoal={editGoal}
          />
        )}

        {/* Modal para añadir contribución */}
        {showContributionForm && selectedGoal && (
          <ContributionForm
            goal={selectedGoal}
            onClose={() => { setShowContributionForm(false); setSelectedGoal(null); }}
            onContributionAdded={handleContributionAdded}
          />
        )}
      </div>
    </div>
  );
};

export default Goals; 