import React, { useEffect, useState, useCallback } from 'react';
import { Toaster } from 'react-hot-toast';
import Navigation from '../components/Navigation';
import DebtCapacityIndicator from '../components/dashboard/DebtCapacityIndicator';
import ExpensesPieChart from '../components/dashboard/ExpensesPieChart';
import { FinScoreDisplay, StreakCounter, StreakCounterFinZen, ProgressRingFinScore, FinScoreProgressBar, RecentPointsCard, useGamificationStore } from '../components/gamification';
import { useGamificationEventListener, triggerGamificationEvent } from '../hooks/useGamificationToasts';
import { EventType } from '../types/gamification';
import './Dashboard.css';
import './Screens.css';
import { transactionsAPI, categoriesAPI, budgetsAPI } from '../utils/api';
import type { Transaction, Category, Budget } from '../utils/api';
import api from '../utils/api';

interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  isCompleted: boolean;
  category: {
    icon: string;
    name: string;
  };
}

const Dashboard = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Gamification store
  const { finScore, streak, fetchFinScore, fetchUserStreak } = useGamificationStore();
  const [recentPoints, setRecentPoints] = useState<number>(0);
  
  // Hook para escuchar eventos de gamificación y mostrar toasts
  useGamificationEventListener();

  // Fetch de datos
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const txRes = await transactionsAPI.getAll({ limit: 100 });
      const catRes = await categoriesAPI.getAll();
      const budgetRes = await budgetsAPI.getAll();
      const goalsRes = await api.get('/goals');
      setTransactions(txRes.transactions || []);
      setCategories(catRes);
      setBudgets(budgetRes.budgets || []);
      setGoals(goalsRes.data || []);
    } catch (error) {
      setTransactions([]);
      setCategories([]);
      setBudgets([]);
      setGoals([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Función para obtener puntos recientes REALES del backend
  const fetchRecentPoints = useCallback(async () => {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const response = await api.get(`/gamification/events/recent?since=${thirtyDaysAgo}&limit=1000`);
      
      if (response.data.success && response.data.data) {
        const totalPoints = response.data.data.reduce((sum: number, event: any) => sum + (event.pointsAwarded || 0), 0);
        setRecentPoints(totalPoints);
      }
    } catch (error) {
      console.error('Error obteniendo puntos recientes:', error);
      setRecentPoints(0);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Cargar datos de gamificación
    fetchFinScore();
    fetchUserStreak();
    fetchRecentPoints();
  }, [fetchData, fetchFinScore, fetchUserStreak, fetchRecentPoints]);

  // Escuchar eventos para refrescar datos
  useEffect(() => {
    const handleTransactionCreated = () => {
      console.log('[Dashboard] Evento zenio-transaction-created recibido, refrescando datos...');
      fetchData();
      // Trigger gamification toast for transaction created
      triggerGamificationEvent(EventType.ADD_TRANSACTION);
      // Refresh gamification data when new transaction is created
      setTimeout(() => {
        fetchFinScore();
        fetchUserStreak();
        fetchRecentPoints();
      }, 500); // Small delay to ensure backend has processed the gamification event
    };
    
    const handleTransactionUpdated = () => {
      fetchData();
    };
    
    const handleTransactionDeleted = () => {
      fetchData();
    };
    
    const handleBudgetCreated = () => {
      fetchData();
      // Trigger gamification toast for budget created
      triggerGamificationEvent(EventType.CREATE_BUDGET);
      setTimeout(() => {
        fetchFinScore();
      }, 500);
    };

    const handleBudgetUpdated = () => {
      fetchData();
    };

    const handleBudgetDeleted = () => {
      fetchData();
    };

    const handleGoalCreated = () => {
      fetchData();
      // Trigger gamification toast for goal created
      triggerGamificationEvent(EventType.CREATE_GOAL);
      setTimeout(() => {
        fetchFinScore();
      }, 500);
    };

    const handleGoalUpdated = () => {
      fetchData();
    };

    const handleGoalDeleted = () => {
      fetchData();
    };
    
    const handleBudgetsUpdated = () => {
      fetchData();
    };

    // Handler para transacciones manuales
    const handleManualTransactionCreated = () => {
      console.log('[Dashboard] Evento transaction-created recibido, refrescando datos...');
      fetchData();
      // Trigger gamification toast for manual transaction created
      triggerGamificationEvent(EventType.ADD_TRANSACTION);
      // Refresh gamification data when new transaction is created
      setTimeout(() => {
        fetchFinScore();
        fetchUserStreak();
        fetchRecentPoints();
      }, 500); // Small delay to ensure backend has processed the gamification event
    };

    window.addEventListener('zenio-transaction-created', handleTransactionCreated);
    window.addEventListener('zenio-transaction-updated', handleTransactionUpdated);
    window.addEventListener('zenio-transaction-deleted', handleTransactionDeleted);
    window.addEventListener('transaction-created', handleManualTransactionCreated);
    window.addEventListener('zenio-budget-created', handleBudgetCreated);
    window.addEventListener('zenio-budget-updated', handleBudgetUpdated);
    window.addEventListener('zenio-budget-deleted', handleBudgetDeleted);
    window.addEventListener('zenio-goal-created', handleGoalCreated);
    window.addEventListener('zenio-goal-updated', handleGoalUpdated);
    window.addEventListener('zenio-goal-deleted', handleGoalDeleted);
    window.addEventListener('budgets-updated', handleBudgetsUpdated);
    
    return () => {
      window.removeEventListener('zenio-transaction-created', handleTransactionCreated);
      window.removeEventListener('zenio-transaction-updated', handleTransactionUpdated);
      window.removeEventListener('zenio-transaction-deleted', handleTransactionDeleted);
      window.removeEventListener('transaction-created', handleManualTransactionCreated);
      window.removeEventListener('zenio-budget-created', handleBudgetCreated);
      window.removeEventListener('zenio-budget-updated', handleBudgetUpdated);
      window.removeEventListener('zenio-budget-deleted', handleBudgetDeleted);
      window.removeEventListener('zenio-goal-created', handleGoalCreated);
      window.removeEventListener('zenio-goal-updated', handleGoalUpdated);
      window.removeEventListener('zenio-goal-deleted', handleGoalDeleted);
      window.removeEventListener('budgets-updated', handleBudgetsUpdated);
    };
  }, [fetchData]);

  // Utilidades para mostrar nombre e icono de categoría
  const getCategoryById = (id: string) => categories.find(c => c.id === id);

  // Calcular totales
  const ingresos = transactions.filter(t => t.type === 'INCOME').reduce((acc, t) => acc + t.amount, 0);
  const gastos = transactions.filter(t => t.type === 'EXPENSE').reduce((acc, t) => acc + t.amount, 0);
  const saldoTotal = ingresos - gastos;

  // Calcular saldo mes anterior
  const now = new Date();
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
  const ingresosPrev = transactions.filter(t => {
    const d = new Date(t.date);
    return t.type === 'INCOME' && d >= prevMonth && d <= prevMonthEnd;
  }).reduce((acc, t) => acc + t.amount, 0);
  const gastosPrev = transactions.filter(t => {
    const d = new Date(t.date);
    return t.type === 'EXPENSE' && d >= prevMonth && d <= prevMonthEnd;
  }).reduce((acc, t) => acc + t.amount, 0);
  const saldoPrev = ingresosPrev - gastosPrev;

  // Transacciones recientes (últimas 10)
  const recientes = [...transactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10);

  // Presupuestos activos (sin filtrar por periodo)
  const activeBudgets = budgets.filter(b => b.is_active);

  // Calcular totales de presupuestos
  const totalBudget = activeBudgets.reduce((sum, b) => sum + (b.amount || 0), 0);
  const totalSpent = activeBudgets.reduce((sum, b) => sum + (b.spent || 0), 0);
  const remainingBudget = totalBudget - totalSpent;

  // Calcular totales de metas
  const activeGoals = goals.filter(g => !g.isCompleted);
  const totalGoalTarget = activeGoals.reduce((sum, g) => sum + g.targetAmount, 0);
  const totalGoalSaved = activeGoals.reduce((sum, g) => sum + g.currentAmount, 0);
  const totalGoalRemaining = totalGoalTarget - totalGoalSaved;

  return (
    <div className="min-h-screen bg-background px-4 md:px-8 py-6">
      <Navigation />
      {loading && <div className="text-center py-4">Cargando datos...</div>}
      <h2 className="section-title text-text mb-6 font-bold">Resumen Financiero</h2>

      {/* Balance General + Gamificación */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Balance Actual - Versión Compacta */}
        <div className="card bg-card border border-border rounded-xl">
          <h3 className="card-title text-text font-semibold mb-4 ml-5">Balance Actual: {new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</h3>
          <div className="balance-container flex flex-col gap-3">
            <div className="current-balance-section flex flex-col gap-2">
              <div className="balance-row flex gap-3">
                <div className="balance-box flex-1 bg-success-bg text-success-text rounded-lg p-3 ml-5">
                  <p className="balance-label text-xs font-medium mb-1">Ingresos</p>
                  <p className="balance-amount text-lg font-bold">RD${ingresos.toLocaleString('es-DO')}</p>
                </div>
                <div className="balance-box flex-1 bg-danger-bg text-danger-text rounded-lg p-3 mr-5">
                  <p className="balance-label text-xs font-medium mb-1">Gastos</p>
                  <p className="balance-amount text-lg font-bold">RD${gastos.toLocaleString('es-DO')}</p>
                </div>
              </div>
              <div className="balance-box bg-secondary text-white rounded-lg p-3 ml-5 mr-5">
                <p className="balance-label text-xs font-medium mb-1">Saldo Total</p>
                <p className="balance-amount text-xl font-bold">RD${saldoTotal.toLocaleString('es-DO')}</p>
              </div>
            </div>
          </div>
          
          {/* Tips Compactos */}
          <div className="mt-3 mx-5 mb-4">
            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-xs text-blue-700">
                💡 <strong>Tip:</strong> {
                  saldoTotal > 0 
                    ? 'Excelente gestión financiera este mes' 
                    : 'Revisa tus gastos para mejorar tu balance'
                }
              </p>
            </div>
            {saldoTotal > saldoPrev && (
              <div className="bg-green-50 rounded-lg p-2 mt-2">
                <p className="text-xs text-green-700">
                  📈 Mejoraste RD${(saldoTotal - saldoPrev).toLocaleString('es-DO')} vs mes anterior
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Card de Gamificación - 3 Columnas */}
        <div className="card bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200 rounded-xl">
          <h3 className="card-title text-text font-semibold mb-4 ml-5 flex items-center gap-2">
            <span className="text-blue-600">🏆</span>
            Tu Progreso FinZen
          </h3>
          
          <div className="px-5 pb-5">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Columna 1: FinScore Acumulativo */}
              <div className="flex justify-center lg:justify-start">
                {finScore ? (
                  <FinScoreProgressBar
                    currentScore={finScore.currentScore}
                    level={finScore.level}
                    levelName={finScore.levelName}
                    pointsToNextLevel={finScore.pointsToNextLevel}
                    animate={true}
                    className="w-full max-w-sm"
                  />
                ) : (
                  <div className="w-full max-w-sm bg-white rounded-lg p-4 animate-pulse">
                    <div className="text-center mb-4">
                      <div className="w-20 h-6 bg-gray-200 rounded mx-auto mb-2"></div>
                      <div className="w-24 h-4 bg-gray-200 rounded mx-auto"></div>
                    </div>
                    <div className="w-full h-3 bg-gray-200 rounded mb-4"></div>
                    <div className="space-y-2">
                      <div className="w-full h-4 bg-gray-200 rounded"></div>
                      <div className="w-full h-4 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Columna 2: Puntos Recientes */}
              <div className="flex justify-center">
                <RecentPointsCard
                  points={recentPoints}
                  animate={true}
                  className="w-full max-w-sm"
                />
              </div>
              
              {/* Columna 3: Racha de Días */}
              <div className="flex justify-center">
                <div className="bg-white rounded-lg p-4 w-full max-w-sm text-center">
                  {/* Header */}
                  <div className="mb-4">
                    <div className="text-2xl mb-2">🔥</div>
                    <div className="text-sm text-gray-600 font-medium">
                      Días de Racha
                    </div>
                  </div>

                  {/* Contenido principal */}
                  <div className="mb-3 flex justify-center">
                    <StreakCounterFinZen 
                      streak={streak || undefined}
                      size={100}
                      animate={true}
                    />
                  </div>

                  {/* Subtitle */}
                  <div className="text-sm text-gray-500 mb-4">
                    Días consecutivos
                  </div>

                  {/* Indicador de estado */}
                  <div className="flex justify-center">
                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                      (streak?.currentStreak || 0) >= 7 
                        ? 'bg-red-100 text-red-800' 
                        : (streak?.currentStreak || 0) >= 3 
                        ? 'bg-orange-100 text-orange-800'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      <span className="mr-1">
                        {(streak?.currentStreak || 0) >= 7 ? '🔥' : (streak?.currentStreak || 0) >= 3 ? '📈' : '📊'}
                      </span>
                      {(streak?.currentStreak || 0) >= 7 ? 'En racha' : (streak?.currentStreak || 0) >= 3 ? 'Progreso' : 'Estableciendo'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Quick Stats - Ahora en una sola fila */}
            <div className="bg-white/50 rounded-lg p-3 mt-4">
              <div className="grid grid-cols-2 gap-2 text-center">
                <div>
                  <p className="text-xs text-gray-600">Transacciones</p>
                  <p className="text-sm font-bold text-blue-600">{transactions.length}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Presupuestos</p>
                  <p className="text-sm font-bold text-purple-600">{activeBudgets.length}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Transacciones Recientes */}
      <div className="card bg-card border border-border rounded-xl mb-6">
        <h3 className="card-title text-text font-semibold mb-4 ml-5">Transacciones Recientes</h3>
        <div className="transactions-list flex flex-col gap-2">
          {loading ? (
            <div className="text-center py-8 text-gray-500">Cargando...</div>
          ) : recientes.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">📊</div>
              <p className="text-sm">No hay transacciones registradas</p>
              <p className="text-xs mt-1">Agrega tu primera transacción para comenzar</p>
            </div>
          ) : (
            recientes.map(tx => {
              const icon = typeof tx.category === 'object' && tx.category !== null ? tx.category.icon : '📊';
              const name = typeof tx.category === 'object' && tx.category !== null ? tx.category.name : '';
              return (
                <div key={tx.id} className="flex items-center gap-3 px-6 py-2 border-b border-border last:border-b-0">
                  <span className="text-2xl">{icon}</span>
                  <div className="flex-1">
                    <div className="font-medium text-text">{tx.description || name || 'Sin descripción'}</div>
                    <div className="text-xs text-gray-500">{new Date(tx.date).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                  </div>
                  <div className={`font-bold ${tx.type === 'INCOME' ? 'text-success-text' : 'text-danger-text'}`}>{tx.type === 'INCOME' ? '+' : '−'}RD${tx.amount.toLocaleString('es-DO')}</div>
                </div>
              );
            })
          )}
          {transactions.length > 10 && (
            <div className="text-center py-3 border-t border-border">
              <p className="text-xs text-gray-500">
                Mostrando 10 de {transactions.length} transacciones
              </p>
            </div>
          )}
          
          {/* Botón Ver + centrado */}
          {recientes.length > 0 && (
            <div className="text-center py-4 border-t border-border">
              <button 
                onClick={() => window.location.href = '/transactions'}
                className="bg-secondary text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-secondary/90 transition-colors duration-200 flex items-center gap-2 mx-auto shadow-sm hover:shadow-md"
              >
                Ver todas las transacciones
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Gráfico de Gastos por Categoría */}
      <div className="card bg-card border border-border rounded-xl mb-6">
        <h3 className="card-title text-text font-semibold mb-4 ml-5">Gastos por Categoría</h3>
        <div className="px-6 pb-6">
          <ExpensesPieChart transactions={transactions} categories={categories} />
        </div>
      </div>

      {/* Estado de Presupuestos */}
      <div className="card bg-card border border-border rounded-xl mb-6">
        <h3 className="card-title text-text font-semibold mb-4 ml-5">Estado de Presupuestos</h3>
        {loading ? (
          <div className="text-center py-8 text-gray-500">Cargando...</div>
        ) : activeBudgets.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">💰</div>
            <p className="text-sm">No tienes presupuestos configurados</p>
            <p className="text-xs mt-1">Crea tu primer presupuesto para controlar tus gastos</p>
            <button 
              onClick={() => window.location.href = '/budgets'}
              className="mt-4 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors duration-200"
            >
              Crear mi primer presupuesto
            </button>
          </div>
        ) : (
          <div className="px-6 pb-6">
            {/* Resumen general */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <p className="text-sm text-blue-600 mb-1">Presupuesto Total</p>
                <p className="text-xl font-bold text-blue-800">RD${totalBudget.toFixed(2)}</p>
              </div>
              <div className="bg-red-50 rounded-lg p-4 text-center">
                <p className="text-sm text-red-600 mb-1">Gastado</p>
                <p className="text-xl font-bold text-red-800">RD${totalSpent.toFixed(2)}</p>
              </div>
              <div className={`rounded-lg p-4 text-center ${remainingBudget >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                <p className={`text-sm mb-1 ${remainingBudget >= 0 ? 'text-green-600' : 'text-red-600'}`}>Restante</p>
                <p className={`text-xl font-bold ${remainingBudget >= 0 ? 'text-green-800' : 'text-red-800'}`}>RD${remainingBudget.toFixed(2)}</p>
              </div>
            </div>
            
            {/* Lista de presupuestos */}
            <div className="space-y-3">
              {activeBudgets.slice(0, 3).map(budget => {
                const spent = budget.spent || 0;
                const amount = budget.amount || 0;
                const percentage = amount > 0 ? Math.min((spent / amount) * 100, 100) : 0;
                const progressColor = percentage < 70 ? '#4CAF50' : percentage < 80 ? '#FFC107' : '#F44336';
                
                return (
                  <div key={budget.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <span className="text-2xl">{budget.category?.icon || '💰'}</span>
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-medium text-gray-800">{budget.category?.name || 'Sin categoría'}</span>
                        <span className="text-sm text-gray-600">{percentage.toFixed(0)}%</span>
                      </div>
                      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-2 rounded-full"
                          style={{ width: `${percentage}%`, backgroundColor: progressColor }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>RD${spent.toFixed(2)}</span>
                        <span>RD${amount.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Botón Ver todos los presupuestos */}
            {activeBudgets.length > 3 && (
              <div className="text-center py-4 border-t border-border mt-4">
                <p className="text-xs text-gray-500 mb-2">
                  Mostrando 3 de {activeBudgets.length} presupuestos activos
                </p>
                <button 
                  onClick={() => window.location.href = '/budgets'}
                  className="bg-secondary text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-secondary/90 transition-colors duration-200 flex items-center gap-2 mx-auto shadow-sm hover:shadow-md"
                >
                  Ver todos los presupuestos
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            )}

            {/* Botón para gestionar presupuestos si no hay muchos */}
            {activeBudgets.length <= 3 && (
              <div className="text-center py-4 border-t border-border mt-4">
                <button 
                  onClick={() => window.location.href = '/budgets'}
                  className="bg-primary text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors duration-200"
                >
                  Gestionar presupuestos
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Metas de Ahorro */}
      <div className="card bg-card border border-border rounded-xl mb-6">
        <h3 className="card-title text-text font-semibold mb-4 ml-5">Metas de Ahorro</h3>
        {loading ? (
          <div className="text-center py-8 text-gray-500">Cargando...</div>
        ) : goals.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">🎯</div>
            <p className="text-sm">No tienes metas configuradas</p>
            <p className="text-xs mt-1">Crea tu primera meta de ahorro para comenzar</p>
            <button 
              onClick={() => window.location.href = '/goals'}
              className="mt-4 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors duration-200"
            >
              Crear mi primera meta
            </button>
          </div>
        ) : (
          <div className="px-6 pb-6">
            {/* Resumen de metas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <p className="text-sm text-blue-600 mb-1">Meta total</p>
                <p className="text-xl font-bold text-blue-800">RD${totalGoalTarget.toLocaleString('es-DO')}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <p className="text-sm text-green-600 mb-1">Ahorrado</p>
                <p className="text-xl font-bold text-green-800">RD${totalGoalSaved.toLocaleString('es-DO')}</p>
              </div>
              <div className="bg-emerald-50 rounded-lg p-4 text-center">
                <p className="text-sm text-emerald-600 mb-1">Por ahorrar</p>
                <p className="text-xl font-bold text-emerald-800">RD${totalGoalRemaining.toLocaleString('es-DO')}</p>
              </div>
            </div>

            {/* Lista de metas activas (máximo 3) */}
            <div className="space-y-3">
              {activeGoals.slice(0, 3).map(goal => {
                const progress = ((goal.currentAmount / goal.targetAmount) * 100);
                const progressColor = progress >= 80 ? '#10B981' : progress >= 50 ? '#F59E0B' : '#3B82F6';
                
                return (
                  <div key={goal.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <span className="text-2xl">{goal.category.icon}</span>
                    <div className="flex-1">
                      <div className="font-medium text-gray-800">{goal.name}</div>
                      <div className="text-xs text-gray-500">{goal.category.name}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-2 rounded-full transition-all duration-300"
                          style={{ width: `${progress}%`, backgroundColor: progressColor }}
                        ></div>
                      </div>
                      <span className="text-xs font-medium text-gray-600">{progress.toFixed(0)}%</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-gray-800">
                        RD${goal.currentAmount.toLocaleString('es-DO')}
                      </div>
                      <div className="text-xs text-gray-500">
                        / RD${goal.targetAmount.toLocaleString('es-DO')}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Botón Ver todas las metas */}
            {activeGoals.length > 3 && (
              <div className="text-center py-4 border-t border-border mt-4">
                <p className="text-xs text-gray-500 mb-2">
                  Mostrando 3 de {activeGoals.length} metas activas
                </p>
                <button 
                  onClick={() => window.location.href = '/goals'}
                  className="bg-secondary text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-secondary/90 transition-colors duration-200 flex items-center gap-2 mx-auto shadow-sm hover:shadow-md"
                >
                  Ver todas las metas
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            )}

            {/* Botón para crear nueva meta si no hay muchas */}
            {activeGoals.length <= 3 && (
              <div className="text-center py-4 border-t border-border mt-4">
                <button 
                  onClick={() => window.location.href = '/goals'}
                  className="bg-primary text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors duration-200"
                >
                  Gestionar metas
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Capacidad de Endeudamiento */}
      <DebtCapacityIndicator />
      
      {/* Toast Notifications Container */}
      <Toaster 
        position="bottom-right"
        reverseOrder={false}
        gutter={8}
      />
    </div>
  );
};

export default Dashboard; 