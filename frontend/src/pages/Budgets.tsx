import React, { useState, useEffect, useMemo } from 'react';
import Navigation from '../components/Navigation';
import BudgetForm from '../components/budget/BudgetForm';
import BudgetList from '../components/budget/BudgetList';
import { budgetsAPI, type Budget } from '../utils/api';

const Budgets = () => {
  const [showForm, setShowForm] = useState(false);
  const [editBudget, setEditBudget] = useState<Budget | null>(null);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);

  // Calcular resumen dinámicamente
  const stats = useMemo(() => {
    // Filtrar presupuestos activos y del mes actual
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const monthlyBudgets = budgets.filter(b =>
      b.is_active &&
      b.period === 'monthly' &&
      new Date(b.start_date) <= monthEnd &&
      new Date(b.end_date) >= monthStart
    );
    const totalBudget = monthlyBudgets.reduce((sum, b) => sum + (b.amount || 0), 0);
    const monthlyExpenses = monthlyBudgets.reduce((sum, b) => sum + (b.spent || 0), 0);
    const remaining = totalBudget - monthlyExpenses;
    return {
      totalBudget,
      monthlyExpenses,
      remaining,
      currency: 'RD$'
    };
  }, [budgets]);

  // Cargar presupuestos desde el backend
  const loadBudgets = async () => {
    setLoading(true);
    try {
      const res = await budgetsAPI.getAll();
      setBudgets(res.budgets || []);
    } catch {
      setBudgets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBudgets();
  }, []);

  // Escuchar evento global para recargar presupuestos
  useEffect(() => {
    const handler = () => loadBudgets();
    window.addEventListener('budgets-updated', handler);
    return () => window.removeEventListener('budgets-updated', handler);
  }, []);

  // Escuchar eventos para refrescar datos desde Zenio
  useEffect(() => {
    const handleBudgetCreated = () => {
      loadBudgets();
    };

    window.addEventListener('zenio-budget-created', handleBudgetCreated);
    
    return () => {
      window.removeEventListener('zenio-budget-created', handleBudgetCreated);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background px-4 md:px-8 py-6">
      <Navigation />
      
      <div className="screen-container">
        <div className="screen-header">
          <h2 className="section-title text-text mb-6 font-bold">Presupuestos</h2>
          <button 
            className="primary-button" 
            onClick={() => { setEditBudget(null); setShowForm(true); }}
          >
            + Nuevo
          </button>
        </div>

        {/* Resumen de presupuestos */}
        <div className="bg-white rounded-xl shadow p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Resumen de Presupuestos</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col items-center p-4 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-500">Presupuesto mensual</span>
              <span className="text-xl font-bold text-primary">{stats.currency}{stats.totalBudget.toFixed(2)}</span>
            </div>
            <div className="flex flex-col items-center p-4 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-500">Gasto actual</span>
              <span className="text-xl font-bold text-red-500">{stats.currency}{stats.monthlyExpenses.toFixed(2)}</span>
            </div>
            <div className="flex flex-col items-center p-4 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-500">Restante</span>
              <span className={`text-xl font-bold ${stats.remaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>{stats.currency}{stats.remaining.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-6 mb-8">
          <p className="text-gray-600 mb-4">
            Establece límites de gasto para cada categoría y monitorea tu progreso.
          </p>
          <BudgetList budgets={budgets} loading={loading} onReload={loadBudgets} onEditBudget={(budget) => { setEditBudget(budget); setShowForm(true); }} />
        </div>

        {/* Modal o Drawer para el formulario de presupuesto */}
        {showForm && (
          <BudgetForm
            onClose={() => { setShowForm(false); setEditBudget(null); }}
            onSaved={loadBudgets}
            editBudget={editBudget}
          />
        )}
      </div>
    </div>
  );
};

export default Budgets; 