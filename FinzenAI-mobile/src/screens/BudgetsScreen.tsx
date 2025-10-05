import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { budgetsAPI, Budget } from '../utils/api';
import BudgetForm from '../components/forms/BudgetForm';
import { useDashboardStore } from '../stores/dashboard';
import { useCurrency } from '../hooks/useCurrency';

const { width } = Dimensions.get('window');

export default function BudgetsScreen() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  
  // Dashboard store para notificar cambios
  const { onBudgetChange, budgetChangeTrigger } = useDashboardStore();
  
  // Hook para moneda del usuario
  const { formatCurrency } = useCurrency();

  // Calcular resumen dinámicamente con análisis de rendimiento y proyecciones
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

    // Análisis de rendimiento Gen Z
    let bestBudget = null;
    let controlStatus = "Sin presupuestos";
    let controlIcon = "📊";

    if (monthlyBudgets.length > 0) {
      // Encontrar el mejor presupuesto (alto uso pero sin exceder)
      const goodBudgets = monthlyBudgets
        .filter(b => b.amount > 0)
        .map(b => ({
          name: b.name,
          percentage: (b.spent / b.amount) * 100,
          isExceeded: b.spent > b.amount
        }))
        .filter(b => !b.isExceeded && b.percentage >= 50)
        .sort((a, b) => b.percentage - a.percentage);

      if (goodBudgets.length > 0) {
        bestBudget = goodBudgets[0];
      }

      // Control general (simplificado)
      const averageUsage = monthlyBudgets.reduce((sum, b) => {
        return sum + (b.amount > 0 ? Math.min(100, (b.spent / b.amount) * 100) : 0);
      }, 0) / monthlyBudgets.length;

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
    }

    // Alertas de proyección (presupuestos en riesgo de excederse)
    const projectionAlerts = monthlyBudgets
      .filter(b => b.amount > 0 && b.spent > b.amount * 0.9) // 90% o más usado
      .map(b => {
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const currentDay = now.getDate();
        const remainingDays = daysInMonth - currentDay;
        
        if (remainingDays > 0) {
          const dailyAverage = b.spent / currentDay;
          const projectedTotal = b.spent + (dailyAverage * remainingDays);
          const excess = Math.max(0, projectedTotal - b.amount);
          
          if (excess > 0) {
            return {
              name: b.name,
              excess: excess
            };
          }
        }
        return null;
      })
      .filter(alert => alert !== null);

    const result = {
      totalBudget,
      monthlyExpenses,
      remaining,
      currency: formatCurrency(0).replace('0', '').trim(), // Extraer símbolo dinámico
      bestBudget,
      controlStatus,
      controlIcon,
      projectionAlerts
    };

    console.log('[BudgetsScreen] Stats calculados:', result);
    return result;
  }, [budgets]);

  useEffect(() => {
    loadBudgets();
  }, []);

  // Listener para cambios de presupuestos desde Zenio
  useEffect(() => {
    if (budgetChangeTrigger > 0) {
      console.log('[BudgetsScreen] Budget change detected, reloading...');
      loadBudgets();
    }
  }, [budgetChangeTrigger]);

  const loadBudgets = async () => {
    try {
      setLoading(true);
      // Solo obtener presupuestos activos
      const response = await budgetsAPI.getAll({ is_active: true });
      
      // Usar la estructura correcta de la API
      setBudgets(response.data.budgets || response.data || []);
    } catch (error: any) {
      console.error('Error loading budgets:', error);
      
      // Si es error de autenticación, mostrar mensaje específico
      if (error.response?.status === 401) {
        Alert.alert('Sesión Expirada', 'Por favor inicia sesión nuevamente');
      } else {
        Alert.alert('Error', 'No se pudieron cargar los presupuestos');
      }
      
      // Mostrar lista vacía en caso de error
      setBudgets([]);
    } finally {
      setLoading(false);
    }
  };

  // Función para eliminar presupuesto (replicando la web)
  const handleDeleteBudget = async (budgetId: string, budgetName: string) => {
    Alert.alert(
      'Eliminar Presupuesto',
      `¿Estás seguro de que quieres eliminar el presupuesto "${budgetName}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Eliminar', 
          style: 'destructive',
          onPress: async () => {
            try {
              await budgetsAPI.delete(budgetId);
              loadBudgets();
              onBudgetChange(); // Notificar al dashboard
              Alert.alert('Éxito', 'Presupuesto eliminado correctamente');
            } catch (error) {
              console.error('Error deleting budget:', error);
              Alert.alert('Error', 'No se pudo eliminar el presupuesto');
            }
          }
        }
      ]
    );
  };

  // Función para formatear periodo (replicando la web)
  const formatPeriod = (period: string) => {
    switch (period) {
      case 'weekly': return 'semanal';
      case 'monthly': return 'mensual';
      case 'yearly': return 'anual';
      default: return period;
    }
  };

  // Funciones de utilidad (replicando la web)
  const calculateProgress = (spent: number, amount: number) => {
    return amount > 0 ? Math.min((spent / amount) * 100, 100) : 0;
  };

  const getProgressColor = (progress: number) => {
    if (progress < 70) return '#4CAF50';
    if (progress < 80) return '#FFC107';
    return '#F44336';
  };

  const getAlertClass = (progress: number) => {
    if (progress >= 100) return 'danger';
    if (progress >= 80) return 'warning';
    return 'normal';
  };

  // Función para formatear montos usando hook global
  const formatAmount = (amount: number) => {
    return formatCurrency(amount);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Cargando presupuestos...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Presupuestos</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => setShowForm(true)}
        >
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Resumen de presupuestos (patrón dashboard) */}
        <View style={styles.summaryContainer}>
          <Text style={styles.summaryTitle}>Resumen de Presupuestos</Text>
          
          {/* Fila superior: Presupuesto mensual */}
          <View style={styles.monthlyBudgetRow}>
            <Text style={styles.monthlyBudgetLabel}>Presupuesto mensual</Text>
            <Text style={styles.monthlyBudgetValue}>
              {formatCurrency(stats.totalBudget)}
            </Text>
          </View>
          
          {/* Fila inferior: Dos columnas */}
          <View style={styles.bottomRow}>
            <View style={styles.bottomColumn}>
              <Text style={styles.bottomLabel}>Gasto actual</Text>
              <Text style={[styles.bottomValue, { color: '#ef4444' }]}>
                {formatCurrency(stats.monthlyExpenses)}
              </Text>
            </View>
            <View style={styles.bottomColumn}>
              <Text style={styles.bottomLabel}>Restante</Text>
              <Text style={[
                styles.bottomValue, 
                { color: stats.remaining >= 0 ? '#059669' : '#dc2626' }
              ]}>
                {formatCurrency(Math.abs(stats.remaining))}
              </Text>
            </View>
          </View>
        </View>

        {/* Descripción */}
        <View style={styles.descriptionContainer}>
          <Text style={styles.descriptionText}>
            Establece límites de gasto para cada categoría y monitorea tu progreso.
          </Text>
        </View>

        {budgets.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="wallet-outline" size={64} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>No hay presupuestos</Text>
            <Text style={styles.emptySubtitle}>
              Crea tu primer presupuesto para controlar tus gastos
            </Text>
          </View>
        ) : (
          budgets.map((budget) => {
            const progress = calculateProgress(budget.spent, budget.amount);
            const progressColor = getProgressColor(progress);
            const remaining = budget.amount - budget.spent;

            return (
              <TouchableOpacity 
                key={budget.id} 
                style={styles.budgetCard}
                onPress={() => {
                  setEditingBudget(budget);
                  setShowForm(true);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.budgetHeader}>
                  <View style={styles.budgetInfo}>
                    <Text style={styles.budgetName}>
                      {budget.category?.icon || '💰'} {budget.name}
                    </Text>
                    <Text style={styles.budgetPeriod}>
                      Límite {formatPeriod(budget.period)}
                    </Text>
                    {budget.category && (
                      <Text style={styles.budgetCategory}>
                        {budget.category.name}
                      </Text>
                    )}
                  </View>
                  <View style={styles.budgetActions}>
                    <View style={styles.budgetStatus}>
                      <Text
                        style={[
                          styles.budgetStatusText,
                          budget.is_active ? styles.activeStatus : styles.inactiveStatus,
                        ]}
                      >
                        {budget.is_active ? 'Activo' : 'Inactivo'}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleDeleteBudget(budget.id, budget.name);
                      }}
                    >
                      <Ionicons name="trash-outline" size={20} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.progressContainer}>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${progress}%`, backgroundColor: progressColor },
                      ]}
                    />
                  </View>
                  <Text style={styles.progressText}>{progress.toFixed(1)}%</Text>
                </View>

                <View style={styles.amountContainer}>
                  <View style={styles.amountRow}>
                    <Text style={styles.amountLabel}>Gastado:</Text>
                    <Text style={[styles.amountValue, { color: progressColor }]}>
                      {formatAmount(budget.spent)}
                    </Text>
                  </View>
                  <View style={styles.amountRow}>
                    <Text style={styles.amountLabel}>Presupuesto:</Text>
                    <Text style={styles.amountValue}>
                      {formatAmount(budget.amount)}
                    </Text>
                  </View>
                  <View style={styles.amountRow}>
                    <Text style={styles.amountLabel}>
                      {remaining >= 0 ? 'Disponible:' : 'Excedido:'}
                    </Text>
                    <Text
                      style={[
                        styles.amountValue,
                        { color: remaining >= 0 ? '#059669' : '#dc2626' },
                      ]}
                    >
                      {formatAmount(Math.abs(remaining))}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Formulario de Presupuesto */}
      <BudgetForm
        visible={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingBudget(null);
        }}
        onSuccess={() => {
          loadBudgets();
          // Notificar al dashboard que hubo cambios
          onBudgetChange();
          setEditingBudget(null);
        }}
        editBudget={editingBudget}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  addButton: {
    backgroundColor: '#2563EB',
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#64748b',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 8,
  },
  budgetCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  budgetInfo: {
    flex: 1,
  },
  budgetName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  budgetPeriod: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  budgetCategory: {
    fontSize: 12,
    color: '#7c3aed',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  budgetActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  budgetStatus: {
    marginLeft: 12,
  },
  deleteButton: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#fef2f2',
  },
  budgetStatusText: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  activeStatus: {
    color: '#059669',
    backgroundColor: '#d1fae5',
  },
  inactiveStatus: {
    color: '#9CA3AF',
    backgroundColor: '#f3f4f6',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    marginRight: 12,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  amountContainer: {
    gap: 8,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  amountLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  amountValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  // Estilos para el resumen de presupuestos (patrón dashboard)
  summaryContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 16,
  },
  // Fila superior: Presupuesto mensual
  monthlyBudgetRow: {
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  monthlyBudgetLabel: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 4,
  },
  monthlyBudgetValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2563EB',
    textAlign: 'center',
  },
  // Fila inferior: Dos columnas
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  bottomColumn: {
    flex: 1,
    alignItems: 'center',
  },
  bottomLabel: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
    textAlign: 'center',
  },
  bottomValue: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  // Estilo para la descripción
  descriptionContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  descriptionText: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  
  // Nuevos estilos para análisis de rendimiento
  performanceSection: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  performanceCards: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  performanceCard: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginHorizontal: 6,
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
  
  // Estilos para alertas de proyección
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