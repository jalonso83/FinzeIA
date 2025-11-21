// Dashboard Screen - Pantalla principal móvil
// Reutilizará la lógica del Dashboard web adaptada para móvil

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert, TouchableOpacity, AppState } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import FinScoreProgressBar from '../components/gamification/FinScoreProgressBar';
import StreakCounterFinZen, { StreakCompact } from '../components/gamification/StreakCounter';
import PatternsAndTrends from '../components/reports/PatternsAndTrends';
import VibeCard from '../components/dashboard/VibeCard';
import ExpensesPieChart from '../components/dashboard/ExpensesPieChart';
import { transactionsAPI, budgetsAPI, gamificationAPI, goalsAPI, categoriesAPI } from '../utils/api';
import api from '../utils/api';
import { useDashboardStore } from '../stores/dashboard';
import { useCurrency } from '../hooks/useCurrency';

interface DashboardData {
  totalBalance: number;
  monthlyBalance: number;
  cumulativeBalance: number;
  previousMonthsBalance: number;
  previousMonthsIncome: number;
  previousMonthsExpenses: number;
  allIncome: number;
  allExpenses: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlyTransactions: number;
  activeBudgets: number;
  activeGoals: number;
  finScore: number;
  level: number;
  levelName: string;
  pointsToNextLevel: number;
  streak: {
    currentStreak: number;
    longestStreak: number;
    isActive: boolean;
    lastActivityDate?: string;
  } | null;
  transactions: any[];
  recentTransactions: any[];
  categories: any[];
  budgets: any[];
  totalBudget: number;
  totalSpent: number;
  remainingBudget: number;
  goals: any[];
  totalGoalTarget: number;
  totalGoalSaved: number;
  totalGoalRemaining: number;
}

export default function DashboardScreen() {
  const navigation = useNavigation<any>();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const lastDateRef = useRef<string>(new Date().toDateString());
  
  // Suscribirse a cambios del dashboard
  const { refreshTrigger } = useDashboardStore();
  
  // Hook para moneda del usuario
  const { formatCurrency } = useCurrency();

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Recargar dashboard cuando hay cambios en transacciones, presupuestos o metas
  useEffect(() => {
    if (refreshTrigger > 0) {
      console.log('Dashboard: Recargando datos debido a cambios...');
      loadDashboardData();
    }
  }, [refreshTrigger]);

  // Recargar dashboard automáticamente al cambiar de día/mes
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active') {
        const currentDate = new Date().toDateString();
        
        // Verificar si cambió el día/mes desde la última vez
        if (lastDateRef.current !== currentDate) {
          console.log('Dashboard: Fecha cambió mientras la app estaba en background, recargando datos...', { 
            from: lastDateRef.current, 
            to: currentDate 
          });
          lastDateRef.current = currentDate;
          loadDashboardData();
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    // También verificar cada 4 horas si la app está activa
    const interval = setInterval(() => {
      if (AppState.currentState === 'active') {
        const currentDate = new Date().toDateString();
        if (lastDateRef.current !== currentDate) {
          console.log('Dashboard: Fecha cambió, recargando datos por intervalo...', {
            from: lastDateRef.current,
            to: currentDate
          });
          lastDateRef.current = currentDate;
          loadDashboardData();
        }
      }
    }, 4 * 60 * 60 * 1000); // 4 horas

    return () => {
      subscription?.remove();
      clearInterval(interval);
    };
  }, []);

  const loadDashboardData = async () => {
    let gamificationResponse: any, streakResponse: any, transactionsResponse: any, budgetsResponse: any, goalsResponse: any, categoriesResponse: any;
    
    try {
      setLoading(true);
      
      // Cargar datos paralelos para mejor rendimiento
      [
        gamificationResponse,
        streakResponse,
        transactionsResponse,
        budgetsResponse,
        goalsResponse,
        categoriesResponse
      ] = await Promise.allSettled([
        api.get('/gamification/finscore'),  // Usar endpoint correcto que SÍ existe
        api.get('/gamification/streak'),    // Usar endpoint correcto que SÍ existe
        transactionsAPI.getAll({ limit: 5000 }), // Cargar TODAS las transacciones como la web
        budgetsAPI.getAll(),
        api.get('/goals'),
        categoriesAPI.getAll()
      ]);

      // Procesar datos de gamificación - SOLO datos reales
      let gamificationData = {
        finScore: 0,
        level: 1,
        levelName: 'Principiante',
        pointsToNextLevel: 0,
      };

      if (gamificationResponse.status === 'fulfilled') {
        const response = gamificationResponse.value.data;
        console.log('Gamification response:', response);
        
        // El endpoint /gamification/finscore devuelve { success: true, data: {...} }
        if (response.success && response.data) {
          const data = response.data;
          console.log('Gamification data extracted:', data);
          gamificationData = {
            finScore: data.currentScore || 0,
            level: data.level || 1,
            levelName: data.levelName || 'Principiante',
            pointsToNextLevel: data.pointsToNextLevel || 0,
          };
        }
      }

      // Procesar datos de streak
      let streakData = {
        currentStreak: 0,
        longestStreak: 0,
        isActive: false,
        lastActivityDate: new Date().toISOString(),
      };

      if (streakResponse.status === 'fulfilled') {
        const response = streakResponse.value.data;
        console.log('Streak response:', response);
        
        // Verificar si viene en formato { success: true, data: {...} } o directo
        if (response.success && response.data) {
          const data = response.data;
          console.log('Streak data (from wrapper):', data);
          streakData = {
            currentStreak: data.currentStreak || 0,
            longestStreak: data.longestStreak || 0,
            isActive: data.isActive || false,
            lastActivityDate: data.lastActivityDate || new Date().toISOString(),
          };
        } else if (response.currentStreak !== undefined) {
          // Los datos vienen directos sin wrapper
          console.log('Streak data (direct):', response);
          streakData = {
            currentStreak: response.currentStreak || 0,
            longestStreak: response.longestStreak || 0,
            isActive: response.isActive || false,
            lastActivityDate: response.lastActivityDate || new Date().toISOString(),
          };
        }
      }

      // Procesar transacciones para calcular balance - IGUAL QUE LA WEB
      let totalBalance = 0;
      let monthlyIncome = 0;
      let monthlyExpenses = 0;
      let monthlyTransactions = 0;
      let allIncome = 0;
      let allExpenses = 0;

      if (transactionsResponse.status === 'fulfilled') {
        const transactions = transactionsResponse.value.data.transactions || transactionsResponse.value.data || [];
        console.log('Transactions data:', transactions);
        
        // Calcular totales GENERALES (como en la web)
        transactions.forEach((transaction: any) => {
          if (transaction.type === 'INCOME') {
            allIncome += transaction.amount;
          } else {
            allExpenses += transaction.amount;
          }
        });
        
        // Calcular totales del mes actual para mostrar desglose
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        
        transactions.forEach((transaction: any) => {
          // Crear fecha segura para evitar problemas de zona horaria
          const transactionDate = transaction.date.includes('T') 
            ? new Date(transaction.date) 
            : new Date(transaction.date + 'T12:00:00');
          if (transactionDate.getMonth() === currentMonth && transactionDate.getFullYear() === currentYear) {
            monthlyTransactions++; // Contar transacciones del mes actual
            if (transaction.type === 'INCOME') {
              monthlyIncome += transaction.amount;
            } else {
              monthlyExpenses += transaction.amount;
            }
          }
        });
        
        // BALANCE TOTAL = TODOS LOS INGRESOS - TODOS LOS GASTOS (como en la web)
        totalBalance = allIncome - allExpenses;
      }

      // Calcular balance mensual
      const monthlyBalance = monthlyIncome - monthlyExpenses;

      // Calcular balance acumulado (mes actual + todos los meses anteriores)
      let cumulativeBalance = 0;
      let previousMonthsIncome = 0;
      let previousMonthsExpenses = 0;
      
      if (transactionsResponse.status === 'fulfilled') {
        const transactions = transactionsResponse.value.data.transactions || transactionsResponse.value.data || [];
        
        // Calcular el balance acumulado hasta el mes actual
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        
        transactions.forEach((transaction: any) => {
          // Crear fecha segura para evitar problemas de zona horaria
          const transactionDate = transaction.date.includes('T') 
            ? new Date(transaction.date) 
            : new Date(transaction.date + 'T12:00:00');
          const transactionMonth = transactionDate.getMonth();
          const transactionYear = transactionDate.getFullYear();
          
          // Solo incluir transacciones hasta el mes actual (incluyendo meses anteriores)
          if (transactionYear < currentYear || (transactionYear === currentYear && transactionMonth <= currentMonth)) {
            if (transaction.type === 'INCOME') {
              cumulativeBalance += transaction.amount;
              if (transactionYear < currentYear || (transactionYear === currentYear && transactionMonth < currentMonth)) {
                previousMonthsIncome += transaction.amount;
              }
            } else {
              cumulativeBalance -= transaction.amount;
              if (transactionYear < currentYear || (transactionYear === currentYear && transactionMonth < currentMonth)) {
                previousMonthsExpenses += transaction.amount;
              }
            }
          }
        });
      }
      
      const previousMonthsBalance = previousMonthsIncome - previousMonthsExpenses;

      // Procesar presupuestos activos
      let activeBudgets = 0;
      let budgets: any[] = [];
      let totalBudget = 0;
      let totalSpent = 0;
      let remainingBudget = 0;
      
      if (budgetsResponse.status === 'fulfilled') {
        budgets = budgetsResponse.value.data.budgets || budgetsResponse.value.data || [];
        console.log('Budgets data:', budgets);
        
        // Filtrar presupuestos activos (como en la web)
        const activeBudgetsList = budgets.filter((budget: any) => budget.is_active);
        activeBudgets = activeBudgetsList.length;
        
        // Calcular totales (como en la web)
        totalBudget = activeBudgetsList.reduce((sum, b) => sum + (b.amount || 0), 0);
        totalSpent = activeBudgetsList.reduce((sum, b) => sum + (b.spent || 0), 0);
        remainingBudget = totalBudget - totalSpent;
      }

      // Procesar metas activas - FILTRAR POR !isCompleted COMO EN LA WEB
      let activeGoals = 0;
      let goals: any[] = [];
      let totalGoalTarget = 0;
      let totalGoalSaved = 0;
      let totalGoalRemaining = 0;
      
      if (goalsResponse.status === 'fulfilled') {
        // Usar la misma extracción que la web: goalsRes.data || []
        goals = goalsResponse.value.data || [];
        console.log('Goals response status:', goalsResponse.status);
        console.log('Goals response data:', goalsResponse.value.data);
        console.log('Goals data extracted:', goals);
        // Filtrar metas que NO están completadas (como en la web línea 225)
        const activeGoalsList = goals.filter((goal: any) => !goal.isCompleted);
        activeGoals = activeGoalsList.length;
        console.log('Active goals:', activeGoalsList);
        
        // Calcular totales como en la web (usando los mismos campos que la web)
        totalGoalTarget = activeGoalsList.reduce((sum, g) => sum + (g.targetAmount || g.target_amount || 0), 0);
        totalGoalSaved = activeGoalsList.reduce((sum, g) => sum + (g.currentAmount || g.current_amount || 0), 0);
        totalGoalRemaining = totalGoalTarget - totalGoalSaved;
        console.log('Goals totals:', { totalGoalTarget, totalGoalSaved, totalGoalRemaining });
      } else {
        console.log('Goals response failed:', goalsResponse.status, goalsResponse.reason);
      }

      // Procesar categorías
      let categories: any[] = [];
      if (categoriesResponse.status === 'fulfilled') {
        categories = categoriesResponse.value.data || [];
        console.log('Categories data:', categories);
      }

      // Obtener transacciones para el gráfico
      const transactions = transactionsResponse.status === 'fulfilled' 
        ? (transactionsResponse.value.data.transactions || transactionsResponse.value.data || [])
        : [];

      // Calcular transacciones recientes (últimas 10) igual que en la web
      const recentTransactions = [...transactions]
        .sort((a, b) => {
          // Crear fechas seguras para comparar
          const dateA = a.date.includes('T') ? new Date(a.date) : new Date(a.date + 'T12:00:00');
          const dateB = b.date.includes('T') ? new Date(b.date) : new Date(b.date + 'T12:00:00');
          return dateB.getTime() - dateA.getTime();
        })
        .slice(0, 10);

      const dashboardData: DashboardData = {
        totalBalance,
        monthlyBalance,
        cumulativeBalance,
        previousMonthsBalance,
        previousMonthsIncome,
        previousMonthsExpenses,
        allIncome,
        allExpenses,
        monthlyIncome,
        monthlyExpenses,
        monthlyTransactions,
        activeBudgets,
        activeGoals,
        finScore: gamificationData.finScore,
        level: gamificationData.level,
        levelName: gamificationData.levelName,
        pointsToNextLevel: gamificationData.pointsToNextLevel,
        streak: streakData,
        transactions,
        recentTransactions,
        categories,
        budgets,
        totalBudget,
        totalSpent,
        remainingBudget,
        goals,
        totalGoalTarget,
        totalGoalSaved,
        totalGoalRemaining,
      };

      setDashboardData(dashboardData);
    } catch (error: any) {
      console.error('Error loading dashboard:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        url: error.config?.url
      });
      
      // Mostrar errores específicos por endpoint
      console.log('Response statuses:', {
        gamification: gamificationResponse?.status,
        streak: streakResponse?.status, 
        transactions: transactionsResponse?.status,
        budgets: budgetsResponse?.status,
        goals: goalsResponse?.status
      });
      
      // En caso de error, usar datos por defecto
      const fallbackData: DashboardData = {
        totalBalance: 0,
        monthlyBalance: 0,
        cumulativeBalance: 0,
        previousMonthsBalance: 0,
        previousMonthsIncome: 0,
        previousMonthsExpenses: 0,
        allIncome: 0,
        allExpenses: 0,
        monthlyIncome: 0,
        monthlyExpenses: 0,
        monthlyTransactions: 0,
        activeBudgets: 0,
        activeGoals: 0,
        finScore: 0,
        level: 1,
        levelName: 'Principiante',
        pointsToNextLevel: 0,
        streak: null,
        transactions: [],
        recentTransactions: [],
        categories: [],
        budgets: [],
        totalBudget: 0,
        totalSpent: 0,
        remainingBudget: 0,
        goals: [],
        totalGoalTarget: 0,
        totalGoalSaved: 0,
        totalGoalRemaining: 0,
      };
      
      setDashboardData(fallbackData);
      
      if (error.response?.status === 401) {
        Alert.alert('Sesión Expirada', 'Por favor inicia sesión nuevamente');
      } else {
        Alert.alert('Error', 'No se pudieron cargar todos los datos del dashboard');
      }
    } finally {
      setLoading(false);
    }
  };


  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Cargando dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!dashboardData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="warning-outline" size={48} color="#dc2626" />
          <Text style={styles.errorText}>Error al cargar los datos</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header - removido porque ya está en la navegación */}

        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>
            Balance Actual: {new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
          </Text>
          
          <View style={styles.balanceDetail}>
            <View style={styles.balanceItem}>
              <View style={styles.balanceItemHeader}>
                <Ionicons name="trending-up" size={16} color="#059669" />
                <Text style={styles.balanceItemLabel}>Ingresos</Text>
              </View>
              <Text style={[styles.balanceItemText, { color: '#059669' }]}>
                {formatCurrency(dashboardData.monthlyIncome)}
              </Text>
            </View>
            <View style={styles.balanceItem}>
              <View style={styles.balanceItemHeader}>
                <Ionicons name="trending-down" size={16} color="#dc2626" />
                <Text style={styles.balanceItemLabel}>Gastos</Text>
              </View>
              <Text style={[styles.balanceItemText, { color: '#dc2626' }]}>
                {formatCurrency(dashboardData.monthlyExpenses)}
              </Text>
            </View>
          </View>
          
          <View style={styles.saldoTotalContainer}>
            <Text style={styles.saldoTotalLabel}>Saldo Total</Text>
            <Text style={styles.saldoTotalAmount}>
              {formatCurrency(dashboardData.monthlyBalance)}
            </Text>
          </View>
        </View>

        {/* Comprehensive Balance Card */}
        <View style={styles.comprehensiveBalanceCard}>
          <Text style={styles.comprehensiveBalanceTitle}>Balance Mensual + Saldo Anterior</Text>
          
          <View style={styles.comprehensiveBalanceDetail}>
            <View style={styles.comprehensiveBalanceItem}>
              <View style={styles.comprehensiveBalanceItemHeader}>
                <Ionicons name="trending-up" size={16} color="#059669" />
                <Text style={styles.comprehensiveBalanceItemLabel}>Ingresos</Text>
              </View>
              <Text style={[styles.comprehensiveBalanceItemText, { color: '#059669' }]}>
                {formatCurrency(dashboardData.monthlyIncome + dashboardData.previousMonthsIncome)}
              </Text>
            </View>
            <View style={styles.comprehensiveBalanceItem}>
              <View style={styles.comprehensiveBalanceItemHeader}>
                <Ionicons name="trending-down" size={16} color="#dc2626" />
                <Text style={styles.comprehensiveBalanceItemLabel}>Gastos</Text>
              </View>
              <Text style={[styles.comprehensiveBalanceItemText, { color: '#dc2626' }]}>
                {formatCurrency(dashboardData.monthlyExpenses + dashboardData.previousMonthsExpenses)}
              </Text>
            </View>
          </View>
          
          <View style={styles.comprehensiveSaldoContainer}>
            <Text style={styles.comprehensiveSaldoLabel}>Saldo Total</Text>
            <Text style={styles.comprehensiveSaldoAmount}>
              {formatCurrency(dashboardData.cumulativeBalance)}
            </Text>
          </View>
        </View>

        {/* Gamification Section - Card expandido con streak integrado */}
        <View style={styles.gamificationSection}>
          <FinScoreProgressBar
            currentScore={dashboardData.finScore}
            level={dashboardData.level}
            levelName={dashboardData.levelName}
            pointsToNextLevel={dashboardData.pointsToNextLevel}
            streak={dashboardData.streak}
          />
        </View>

        {/* Quick Stats */}
        <View style={styles.quickStats}>
          <TouchableOpacity 
            style={styles.statCard}
            onPress={() => navigation.navigate('Transactions')}
            activeOpacity={0.7}
          >
            <Ionicons name="bar-chart-outline" size={24} color="#2563EB" />
            <Text style={styles.statNumber}>{dashboardData.monthlyTransactions}</Text>
            <Text style={styles.statLabel}>Transacciones del Mes</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.statCard}
            onPress={() => navigation.navigate('Budgets')}
            activeOpacity={0.7}
          >
            <Ionicons name="wallet-outline" size={24} color="#2563EB" />
            <Text style={styles.statNumber}>{dashboardData.activeBudgets}</Text>
            <Text style={styles.statLabel}>Presupuestos Activos</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.statCard}
            onPress={() => navigation.navigate('Goals')}
            activeOpacity={0.7}
          >
            <Ionicons name="trophy-outline" size={24} color="#d97706" />
            <Text style={styles.statNumber}>{dashboardData.activeGoals}</Text>
            <Text style={styles.statLabel}>Metas Activas</Text>
          </TouchableOpacity>
        </View>

        {/* Transacciones Recientes */}
        <View style={styles.recentTransactionsCard}>
          <Text style={styles.cardTitle}>Transacciones Recientes</Text>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#4f46e5" />
              <Text style={styles.loadingText}>Cargando...</Text>
            </View>
          ) : dashboardData?.recentTransactions.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📊</Text>
              <Text style={styles.emptyTitle}>No hay transacciones registradas</Text>
              <Text style={styles.emptySubtitle}>Agrega tu primera transacción para comenzar</Text>
            </View>
          ) : (
            <View style={styles.transactionsList}>
              {dashboardData?.recentTransactions.map((transaction, index) => {
                const icon = transaction.category?.icon || '📊';
                const name = transaction.category?.name || '';
                const isIncome = transaction.type === 'INCOME';
                
                return (
                  <View key={transaction.id} style={[
                    styles.transactionItem,
                    index === dashboardData.recentTransactions.length - 1 && styles.lastTransactionItem
                  ]}>
                    <Text style={styles.transactionIcon}>{icon}</Text>
                    <View style={styles.transactionInfo}>
                      <Text style={styles.transactionDescription}>
                        {transaction.description || name || 'Sin descripción'}
                      </Text>
                      <Text style={styles.transactionDate}>
                        {(() => {
                          // Crear fecha segura para mostrar
                          const date = transaction.date.includes('T') 
                            ? new Date(transaction.date) 
                            : new Date(transaction.date + 'T12:00:00');
                          return date.toLocaleDateString('es-ES', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          });
                        })()}
                      </Text>
                    </View>
                    <Text style={[
                      styles.transactionAmount,
                      isIncome ? styles.incomeAmount : styles.expenseAmount
                    ]}>
                      {isIncome ? '+' : '−'}{formatCurrency(transaction.amount)}
                    </Text>
                  </View>
                );
              })}
              
              {/* Botón para ver todas las transacciones */}
              {dashboardData?.recentTransactions.length > 0 && (
                <TouchableOpacity 
                  style={styles.viewAllButton}
                  onPress={() => navigation.navigate('Transactions')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.viewAllText}>Ver todas las transacciones</Text>
                  <Ionicons name="chevron-forward" size={16} color="#4f46e5" />
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Gráfico de Transacciones por Categoría */}
        {!loading && (
          <View style={styles.expensesChartCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Transacciones por Categoría</Text>
              <Text style={styles.cardSubtitle}>{new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</Text>
            </View>
            <ExpensesPieChart 
              transactions={dashboardData.transactions?.filter(transaction => {
                // Crear fecha segura para evitar problemas de zona horaria
                const transactionDate = transaction.date.includes('T') 
                  ? new Date(transaction.date) 
                  : new Date(transaction.date + 'T12:00:00');
                const currentDate = new Date();
                return transactionDate.getMonth() === currentDate.getMonth() && 
                       transactionDate.getFullYear() === currentDate.getFullYear();
              }) || []} 
              categories={dashboardData.categories || []} 
            />
          </View>
        )}

        {/* Estado de Presupuestos */}
        <View style={styles.budgetStatusCard}>
          <Text style={styles.cardTitle}>Estado de Presupuestos</Text>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#4f46e5" />
              <Text style={styles.loadingText}>Cargando...</Text>
            </View>
          ) : dashboardData?.budgets.filter(b => b.is_active).length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>💰</Text>
              <Text style={styles.emptyTitle}>No tienes presupuestos configurados</Text>
              <Text style={styles.emptySubtitle}>Crea tu primer presupuesto para controlar tus gastos</Text>
              <TouchableOpacity
                style={styles.createBudgetButton}
                onPress={() => navigation.navigate('Budgets')}
                activeOpacity={0.7}
              >
                <Text style={styles.createBudgetText}>Crear mi primer presupuesto</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.budgetContent}>
              {/* Resumen general - Layout mejorado */}
              <View style={styles.budgetSummaryContainer}>
                {/* Presupuesto Total - Fila completa */}
                <View style={styles.budgetTotalRow}>
                  <Text style={styles.budgetSummaryLabel}>Presupuesto Total</Text>
                  <Text style={[styles.budgetSummaryAmount, styles.totalAmount]}>
                    {formatCurrency(dashboardData?.totalBudget || 0)}
                  </Text>
                </View>
                
                {/* Gastado y Restante - Dos columnas */}
                <View style={styles.budgetBottomRow}>
                  <View style={styles.budgetBottomItem}>
                    <Text style={styles.budgetSummaryLabel}>Gastado</Text>
                    <Text style={[styles.budgetSummaryAmount, styles.spentAmount]}>
                      {formatCurrency(dashboardData?.totalSpent || 0)}
                    </Text>
                  </View>
                  <View style={styles.budgetBottomItem}>
                    <Text style={styles.budgetSummaryLabel}>Restante</Text>
                    <Text style={[
                      styles.budgetSummaryAmount,
                      (dashboardData?.remainingBudget >= 0) ? styles.remainingPositive : styles.remainingNegative
                    ]}>
                      {formatCurrency(dashboardData?.remainingBudget || 0)}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Análisis de rendimiento Gen Z */}
              {dashboardData?.budgets.filter(b => b.is_active).length > 0 && (
                <View style={styles.performanceSection}>
                  <Text style={styles.performanceTitle}>🏆 Tu Rendimiento</Text>
                  <View style={styles.performanceCards}>
                    {(() => {
                      const activeBudgets = dashboardData?.budgets.filter(b => b.is_active) || [];
                      
                      // Encontrar mejor presupuesto con nueva lógica
                      const budgetAnalysis = activeBudgets
                        .filter(b => b.amount > 0)
                        .map(b => ({
                          name: b.category?.name || b.name,
                          percentage: (b.spent / b.amount) * 100,
                          isExceeded: b.spent > b.amount,
                          spent: b.spent,
                          amount: b.amount
                        }));
                      
                      // Prioridades de control (lógica corregida):
                      // 1. Excelente control: 0-25% (sin usar o muy poco usado)
                      // 2. Uso balanceado: 25-50% (zona ideal saludable)
                      // 3. Control moderado: 50-75% (más de la mitad gastado, requiere atención)
                      // 4. Uso alto: 75-100% (requiere mucha atención)
                      
                      const excellentControl = budgetAnalysis.filter(b => !b.isExceeded && b.percentage >= 0 && b.percentage <= 25);
                      const balancedUse = budgetAnalysis.filter(b => !b.isExceeded && b.percentage > 25 && b.percentage <= 50);
                      const moderateControl = budgetAnalysis.filter(b => !b.isExceeded && b.percentage > 50 && b.percentage <= 75);
                      
                      let bestBudget = null;
                      let controlType = "";
                      
                      if (excellentControl.length > 0) {
                        // Mostrar el que menos ha gastado (mejor control)
                        bestBudget = excellentControl.sort((a, b) => a.percentage - b.percentage)[0];
                        controlType = "excelente";
                      } else if (balancedUse.length > 0) {
                        // Mostrar el más cercano al 37.5% (centro de la nueva zona ideal 25-50%)
                        bestBudget = balancedUse.sort((a, b) => Math.abs(a.percentage - 37.5) - Math.abs(b.percentage - 37.5))[0];
                        controlType = "balanceado";
                      } else if (moderateControl.length > 0) {
                        // Mostrar el que mejor control tiene (menor porcentaje en esta zona)
                        bestBudget = moderateControl.sort((a, b) => a.percentage - b.percentage)[0];
                        controlType = "moderado";
                      }

                      // Control general
                      const averageUsage = activeBudgets.reduce((sum, b) => {
                        return sum + (b.amount > 0 ? Math.min(100, (b.spent / b.amount) * 100) : 0);
                      }, 0) / activeBudgets.length;

                      let controlStatus = "Sin presupuestos";
                      let controlIcon = "📊";
                      
                      if (averageUsage < 60) {
                        controlStatus = `${(100 - averageUsage).toFixed(0)}% bajo control`;
                        controlIcon = "✅";
                      } else if (averageUsage < 80) {
                        controlStatus = "Control normal";
                        controlIcon = "🟡";
                      } else {
                        controlStatus = "Control ajustado";
                        controlIcon = "⚠️";
                      }

                      return (
                        <>
                          {bestBudget ? (
                            <View style={styles.performanceCard}>
                              <Text style={styles.performanceLabel}>
                                {controlType === "excelente" ? "Control Excelente" : 
                                 controlType === "balanceado" ? "Uso Balanceado" : 
                                 "Control Moderado"}
                              </Text>
                              <Text style={styles.performanceBudget}>{bestBudget.name}</Text>
                              <Text style={styles.performanceValue}>
                                {bestBudget.percentage.toFixed(1)}% utilizado {
                                  controlType === "excelente" ? "🏆" : 
                                  controlType === "balanceado" ? "✅" : "👍"
                                }
                              </Text>
                            </View>
                          ) : (
                            <View style={styles.performanceCard}>
                              <Text style={styles.performanceLabel}>Control de Gastos</Text>
                              <Text style={styles.performanceBudget}>Revisa tus presupuestos</Text>
                              <Text style={styles.performanceValue}>Todos excedidos ⚠️</Text>
                            </View>
                          )}
                          <View style={styles.performanceCard}>
                            <Text style={styles.performanceLabel}>Control General</Text>
                            <Text style={styles.performanceValue}>
                              {controlStatus} {controlIcon}
                            </Text>
                          </View>
                        </>
                      );
                    })()}
                  </View>
                </View>
              )}

              {/* Alertas de proyección */}
              {(() => {
                const activeBudgets = dashboardData?.budgets.filter(b => b.is_active) || [];
                const now = new Date();
                const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
                const currentDay = now.getDate();
                const remainingDays = daysInMonth - currentDay;

                const projectionAlerts = activeBudgets
                  .filter(b => b.amount > 0 && b.spent > b.amount * 0.9) // 90% o más usado
                  .map(b => {
                    if (remainingDays > 0) {
                      const dailyAverage = b.spent / currentDay;
                      const projectedTotal = b.spent + (dailyAverage * remainingDays);
                      const excess = Math.max(0, projectedTotal - b.amount);
                      
                      if (excess > 0) {
                        return {
                          name: b.category?.name || b.name,
                          excess: excess
                        };
                      }
                    }
                    return null;
                  })
                  .filter(alert => alert !== null);

                return projectionAlerts.length > 0 ? (
                  <View style={styles.alertsSection}>
                    <Text style={styles.performanceTitle}>⚠️ Alertas</Text>
                    {projectionAlerts.map((alert, index) => (
                      <View key={index} style={styles.alertCard}>
                        <Text style={styles.alertBudget}>{alert.name}</Text>
                        <Text style={styles.alertMessage}>Puede excederse: +{formatCurrency(alert.excess)} 📈</Text>
                      </View>
                    ))}
                  </View>
                ) : null;
              })()}

              {/* Lista de presupuestos */}
              <View style={styles.budgetList}>
                {dashboardData?.budgets
                  .filter(b => b.is_active)
                  .sort((a, b) => {
                    // Ordenar por nivel de gasto: más crítico primero
                    const percentageA = a.amount > 0 ? ((a.spent || 0) / a.amount) * 100 : 0;
                    const percentageB = b.amount > 0 ? ((b.spent || 0) / b.amount) * 100 : 0;
                    return percentageB - percentageA; // Mayor porcentaje primero (más crítico)
                  })
                  .slice(0, 3)
                  .map((budget, index) => {
                    const spent = budget.spent || 0;
                    const amount = budget.amount || 0;
                    const percentage = amount > 0 ? Math.min((spent / amount) * 100, 100) : 0;
                    const progressColor = percentage < 70 ? '#4CAF50' : percentage < 80 ? '#FFC107' : '#F44336';

                    return (
                      <View key={budget.id} style={styles.budgetItem}>
                        <Text style={styles.budgetIcon}>{budget.category?.icon || '💰'}</Text>
                        <View style={styles.budgetItemContent}>
                          <View style={styles.budgetItemHeader}>
                            <Text style={styles.budgetItemName}>
                              {budget.category?.name || 'Sin categoría'}
                            </Text>
                            <Text style={styles.budgetItemPercentage}>
                              {percentage.toFixed(0)}%
                            </Text>
                          </View>
                          <View style={styles.progressBarContainer}>
                            <View style={[styles.progressBarFill, { 
                              width: `${percentage}%`, 
                              backgroundColor: progressColor 
                            }]} />
                          </View>
                          <View style={styles.budgetItemAmounts}>
                            <Text style={styles.budgetItemSpent}>
                              {formatCurrency(spent)}
                            </Text>
                            <Text style={styles.budgetItemTotal}>
                              {formatCurrency(amount)}
                            </Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}
              </View>

              {/* Botón para ver todos los presupuestos */}
              <TouchableOpacity
                style={styles.viewAllBudgetsButton}
                onPress={() => navigation.navigate('Budgets')}
                activeOpacity={0.7}
              >
                <Text style={styles.viewAllBudgetsText}>
                  {(dashboardData?.budgets.filter(b => b.is_active).length > 3) 
                    ? `Ver todos los presupuestos (${dashboardData?.activeBudgets})`
                    : 'Gestionar presupuestos'
                  }
                </Text>
                <Ionicons name="chevron-forward" size={16} color="#4f46e5" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Metas de Ahorro */}
        <View style={styles.goalsCard}>
          <Text style={styles.cardTitle}>Metas de Ahorro</Text>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#4f46e5" />
              <Text style={styles.loadingText}>Cargando...</Text>
            </View>
          ) : !dashboardData?.goals || dashboardData.goals.filter(g => !g.isCompleted).length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🎯</Text>
              <Text style={styles.emptyTitle}>No tienes metas de ahorro configuradas</Text>
              <Text style={styles.emptySubtitle}>Establece tus primeras metas para alcanzar tus sueños financieros</Text>
              <TouchableOpacity
                style={styles.createGoalButton}
                onPress={() => navigation.navigate('Goals')}
                activeOpacity={0.7}
              >
                <Text style={styles.createGoalText}>Crear mi primera meta</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.goalsContent}>
              {/* Resumen general - Layout mejorado */}
              <View style={styles.goalsSummaryContainer}>
                {/* Meta Total - Fila completa */}
                <View style={styles.goalsTotalRow}>
                  <Text style={styles.goalsSummaryLabel}>Meta Total</Text>
                  <Text style={[styles.goalsSummaryAmount, styles.goalTotalAmount]}>
                    {formatCurrency(dashboardData?.totalGoalTarget || 0)}
                  </Text>
                </View>
                
                {/* Ahorrado y Por Ahorrar - Dos columnas */}
                <View style={styles.goalsBottomRow}>
                  <View style={styles.goalsBottomItem}>
                    <Text style={styles.goalsSummaryLabel}>Ahorrado</Text>
                    <Text style={[styles.goalsSummaryAmount, styles.goalSavedAmount]}>
                      {formatCurrency(dashboardData?.totalGoalSaved || 0)}
                    </Text>
                  </View>
                  <View style={styles.goalsBottomItem}>
                    <Text style={styles.goalsSummaryLabel}>Por Ahorrar</Text>
                    <Text style={[styles.goalsSummaryAmount, styles.goalRemainingAmount]}>
                      {formatCurrency(dashboardData?.totalGoalRemaining || 0)}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Lista de metas */}
              <View style={styles.goalsList}>
                {(dashboardData?.goals || [])
                  .filter(g => !g.isCompleted)
                  .slice(0, 3)
                  .map((goal, index) => {
                    const current = goal.currentAmount || goal.current_amount || 0;
                    const target = goal.targetAmount || goal.target_amount || 0;
                    const percentage = target > 0 ? Math.min((current / target) * 100, 100) : 0;
                    const progressColor = percentage < 30 ? '#F44336' : percentage < 70 ? '#FFC107' : '#4CAF50';

                    return (
                      <View key={goal.id} style={styles.goalItem}>
                        <Text style={styles.goalIcon}>🎯</Text>
                        <View style={styles.goalItemContent}>
                          <View style={styles.goalItemHeader}>
                            <Text style={styles.goalItemName}>
                              {goal.name || 'Meta sin nombre'}
                            </Text>
                            <Text style={styles.goalItemPercentage}>
                              {percentage.toFixed(0)}%
                            </Text>
                          </View>
                          <View style={styles.progressBarContainer}>
                            <View style={[styles.progressBarFill, { 
                              width: `${percentage}%`, 
                              backgroundColor: progressColor 
                            }]} />
                          </View>
                          <View style={styles.goalItemAmounts}>
                            <Text style={styles.goalItemCurrent}>
                              {formatCurrency(current)}
                            </Text>
                            <Text style={styles.goalItemTarget}>
                              {formatCurrency(target)}
                            </Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}
              </View>

              {/* Botón para ver todas las metas */}
              <TouchableOpacity
                style={styles.viewAllGoalsButton}
                onPress={() => navigation.navigate('Goals')}
                activeOpacity={0.7}
              >
                <Text style={styles.viewAllGoalsText}>
                  {((dashboardData?.goals || []).filter(g => !g.isCompleted).length > 3) 
                    ? `Ver todas las metas (${dashboardData?.activeGoals})`
                    : 'Gestionar metas'
                  }
                </Text>
                <Ionicons name="chevron-forward" size={16} color="#4f46e5" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Tu Vibe Financiero - Gen Z friendly */}
        <VibeCard />

        {/* Patrones y Tendencias del mes actual */}
        <PatternsAndTrends />

        {/* Mensaje de bienvenida para usuarios nuevos */}
        {dashboardData.totalBalance === 0 && dashboardData.monthlyIncome === 0 && dashboardData.monthlyExpenses === 0 && (
          <View style={styles.welcomeMessage}>
            <Ionicons name="rocket-outline" size={48} color="#2563EB" />
            <Text style={styles.welcomeTitle}>¡Bienvenido a FinZen!</Text>
            <Text style={styles.welcomeText}>
              Estás listo para comenzar tu viaje financiero. Agrega tu primera transacción o crea un presupuesto para empezar.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748b',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    color: '#dc2626',
    textAlign: 'center',
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
  },
  balanceCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  balanceLabel: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 16,
  },
  balanceDetail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  balanceItem: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  balanceItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    justifyContent: 'center',
  },
  balanceItemText: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  balanceItemLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  saldoTotalContainer: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    alignItems: 'center',
  },
  saldoTotalLabel: {
    fontSize: 12,
    color: 'white',
    fontWeight: '500',
    marginBottom: 4,
  },
  saldoTotalAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  // Estilos para Comprehensive Balance Card
  comprehensiveBalanceCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  comprehensiveBalanceTitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 16,
    fontWeight: '500',
  },
  comprehensiveBalanceDetail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  comprehensiveBalanceItem: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  comprehensiveBalanceItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    justifyContent: 'center',
  },
  comprehensiveBalanceItemText: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  comprehensiveBalanceItemLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  comprehensiveSaldoContainer: {
    backgroundColor: '#10B981',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  comprehensiveSaldoLabel: {
    fontSize: 12,
    color: 'white',
    fontWeight: '500',
    marginBottom: 4,
  },
  comprehensiveSaldoAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  gamificationSection: {
    marginBottom: 20,
  },
  quickStats: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
  recentActivity: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 16,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  activityContent: {
    flex: 1,
    marginLeft: 12,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  activityDescription: {
    fontSize: 12,
    color: '#64748b',
  },
  activityAmount: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  welcomeMessage: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginTop: 16,
    marginBottom: 12,
  },
  welcomeText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
  },
  expensesChartCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardHeader: {
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: 'normal',
  },
  // Estilos para Transacciones Recientes
  recentTransactionsCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  transactionsList: {
    gap: 0,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  lastTransactionItem: {
    borderBottomWidth: 0,
  },
  transactionIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
    marginRight: 12,
  },
  transactionDescription: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 12,
    color: '#64748b',
  },
  transactionAmount: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  incomeAmount: {
    color: '#059669',
  },
  expenseAmount: {
    color: '#dc2626',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#94a3b8',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    marginTop: 8,
    gap: 8,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4f46e5',
  },
  // Estilos para Estado de Presupuestos
  budgetStatusCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  budgetContent: {
    gap: 0,
  },
  budgetSummaryContainer: {
    marginBottom: 20,
    gap: 12,
  },
  budgetTotalRow: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  budgetBottomRow: {
    flexDirection: 'row',
    gap: 12,
  },
  budgetBottomItem: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  budgetSummaryLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
    textAlign: 'center',
  },
  budgetSummaryAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  totalAmount: {
    color: '#2563eb',
  },
  spentAmount: {
    color: '#dc2626',
  },
  remainingPositive: {
    color: '#059669',
  },
  remainingNegative: {
    color: '#dc2626',
  },
  budgetList: {
    gap: 12,
    marginBottom: 20,
  },
  budgetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  budgetIcon: {
    fontSize: 24,
  },
  budgetItemContent: {
    flex: 1,
  },
  budgetItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  budgetItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  budgetItemPercentage: {
    fontSize: 12,
    color: '#64748b',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  budgetItemAmounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  budgetItemSpent: {
    fontSize: 12,
    color: '#64748b',
  },
  budgetItemTotal: {
    fontSize: 12,
    color: '#64748b',
  },
  createBudgetButton: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  createBudgetText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  viewAllBudgetsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    gap: 8,
  },
  viewAllBudgetsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4f46e5',
  },
  // Estilos para Metas de Ahorro
  goalsCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  goalsContent: {
    gap: 0,
  },
  goalsSummaryContainer: {
    marginBottom: 20,
    gap: 12,
  },
  goalsTotalRow: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  goalsBottomRow: {
    flexDirection: 'row',
    gap: 12,
  },
  goalsBottomItem: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  goalsSummaryLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
    textAlign: 'center',
  },
  goalsSummaryAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  goalTotalAmount: {
    color: '#2563eb',
  },
  goalSavedAmount: {
    color: '#059669',
  },
  goalRemainingAmount: {
    color: '#d97706',
  },
  goalsList: {
    gap: 12,
    marginBottom: 20,
  },
  goalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  goalIcon: {
    fontSize: 24,
  },
  goalItemContent: {
    flex: 1,
  },
  goalItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  goalItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  goalItemPercentage: {
    fontSize: 12,
    color: '#64748b',
  },
  goalItemAmounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  goalItemCurrent: {
    fontSize: 12,
    color: '#64748b',
  },
  goalItemTarget: {
    fontSize: 12,
    color: '#64748b',
  },
  createGoalButton: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  createGoalText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  viewAllGoalsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    gap: 8,
  },
  viewAllGoalsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4f46e5',
  },
  // Estilos para Análisis de Rendimiento en Presupuestos
  performanceSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  performanceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  performanceCards: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  performanceCard: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  performanceLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
    marginBottom: 4,
  },
  performanceBudget: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  performanceValue: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '600',
  },
  // Estilos para Alertas de Proyección
  alertsSection: {
    marginTop: 16,
  },
  alertCard: {
    backgroundColor: '#fef3cd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  alertBudget: {
    fontSize: 13,
    fontWeight: '600',
    color: '#92400e',
    marginBottom: 4,
  },
  alertMessage: {
    fontSize: 12,
    color: '#d97706',
    fontWeight: '500',
  },
});