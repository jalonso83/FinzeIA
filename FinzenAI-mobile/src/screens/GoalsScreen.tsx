import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import GoalForm from '../components/forms/GoalForm';
import ContributionForm from '../components/forms/ContributionForm';
import { goalsAPI } from '../utils/api';
import { useDashboardStore } from '../stores/dashboard';
import { useCurrency } from '../hooks/useCurrency';

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

export default function GoalsScreen() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [showContributionForm, setShowContributionForm] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  
  // Dashboard store para notificar cambios
  const { onGoalChange } = useDashboardStore();

  useEffect(() => {
    loadGoals();
  }, []);

  const loadGoals = async () => {
    try {
      setLoading(true);
      const response = await goalsAPI.getAll();
      // Obtener datos de la estructura correcta
      const goalsData = response.data.goals || response.data || [];
      console.log('Goals loaded:', goalsData);
      setGoals(goalsData);
    } catch (error) {
      console.error('Error loading goals:', error);
      Alert.alert('Error', 'No se pudieron cargar las metas');
    } finally {
      setLoading(false);
    }
  };

  const handleEditGoal = (goal: Goal) => {
    setEditingGoal(goal);
    setShowForm(true);
  };

  const handleAddContribution = (goal: Goal) => {
    setSelectedGoal(goal);
    setShowContributionForm(true);
  };

  const handleContributionAdded = () => {
    loadGoals(); // Recargar metas después de añadir contribución
    onGoalChange(); // Notificar al dashboard
  };

  const handleDeleteGoal = async (goal: Goal) => {
    Alert.alert(
      'Eliminar Meta',
      `¿Estás seguro de que quieres eliminar "${goal.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await goalsAPI.delete(goal.id);
              loadGoals();
              onGoalChange();
              Alert.alert('Éxito', 'Meta eliminada correctamente');
            } catch (error) {
              console.error('Error deleting goal:', error);
              Alert.alert('Error', 'No se pudo eliminar la meta');
            }
          },
        },
      ]
    );
  };

  // Calcular totales como en la web
  const totalTarget = goals.reduce((sum, goal) => sum + goal.targetAmount, 0);
  const totalSaved = goals.reduce((sum, goal) => sum + goal.currentAmount, 0);
  const totalToSave = totalTarget - totalSaved;

  // Usar hook global para formateo de moneda
  const { formatCurrency } = useCurrency();

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
      case 'high': return '#dc2626';
      case 'medium': return '#d97706';
      case 'low': return '#059669';
      default: return '#6b7280';
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
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Cargando metas...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Metas de Ahorro</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => {
            setEditingGoal(null);
            setShowForm(true);
          }}
        >
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Resumen de metas (replicando presupuestos) */}
        {goals.length > 0 && (
          <View style={styles.summaryContainer}>
            <Text style={styles.summaryTitle}>Resumen de Metas</Text>
            <View style={styles.summaryCards}>
              <View style={styles.summaryCard}>
                <View style={styles.summaryCardTop}>
                  <Text style={styles.summaryCardLabel} numberOfLines={2}>Meta total</Text>
                </View>
                <View style={styles.summaryCardMiddle}>
                  <Text 
                    style={[styles.summaryCardValue, { color: '#2563EB' }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit={true}
                    minimumFontScale={0.8}
                  >
                    {totalTarget.toFixed(2)}
                  </Text>
                </View>
                <View style={styles.summaryCardBottom}>
                  <Text style={styles.summaryCardCurrency}>{formatCurrency(0).replace('0', '').trim()}</Text>
                </View>
              </View>
              <View style={styles.summaryCard}>
                <View style={styles.summaryCardTop}>
                  <Text style={styles.summaryCardLabel} numberOfLines={2}>Ahorrado</Text>
                </View>
                <View style={styles.summaryCardMiddle}>
                  <Text 
                    style={[styles.summaryCardValue, { color: '#10B981' }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit={true}
                    minimumFontScale={0.8}
                  >
                    {totalSaved.toFixed(2)}
                  </Text>
                </View>
                <View style={styles.summaryCardBottom}>
                  <Text style={styles.summaryCardCurrency}>{formatCurrency(0).replace('0', '').trim()}</Text>
                </View>
              </View>
              <View style={styles.summaryCard}>
                <View style={styles.summaryCardTop}>
                  <Text style={styles.summaryCardLabel} numberOfLines={2}>Por ahorrar</Text>
                </View>
                <View style={styles.summaryCardMiddle}>
                  <Text 
                    style={[styles.summaryCardValue, { color: '#3B82F6' }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit={true}
                    minimumFontScale={0.8}
                  >
                    {totalToSave.toFixed(2)}
                  </Text>
                </View>
                <View style={styles.summaryCardBottom}>
                  <Text style={styles.summaryCardCurrency}>{formatCurrency(0).replace('0', '').trim()}</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Descripción */}
        {goals.length > 0 && (
          <View style={styles.descriptionContainer}>
            <Text style={styles.descriptionText}>
              Establece metas de ahorro y realiza un seguimiento de tu progreso.
            </Text>
          </View>
        )}

        {goals.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="trophy-outline" size={64} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>No hay metas</Text>
            <Text style={styles.emptySubtitle}>
              Establece metas de ahorro y realiza un seguimiento de tu progreso
            </Text>
          </View>
        ) : (
          <View style={styles.goalsList}>
            {goals.map((goal) => {
              const progress = calculateProgress(goal.currentAmount, goal.targetAmount);
              const progressColor = getProgressColor(progress);
              const remaining = goal.targetAmount - goal.currentAmount;
              const isCompleted = goal.isCompleted;

              return (
                <TouchableOpacity 
                  key={goal.id} 
                  style={[styles.goalCard, isCompleted && styles.goalCardCompleted]}
                  onPress={() => handleEditGoal(goal)}
                  activeOpacity={0.7}
                >
                  {/* Header */}
                  <View style={styles.goalHeader}>
                    <View style={styles.goalInfo}>
                      <View style={styles.goalTitleRow}>
                        <Text style={styles.categoryIcon}>{goal.category.icon}</Text>
                        <Text style={styles.goalName} numberOfLines={1}>{goal.name}</Text>
                      </View>
                    </View>
                    <TouchableOpacity 
                      style={styles.deleteButton}
                      onPress={() => handleDeleteGoal(goal)}
                    >
                      <Text style={styles.deleteButtonText}>×</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Prioridad y Estado */}
                  <View style={styles.badgesContainer}>
                    <Text style={[styles.priorityBadge, { color: getPriorityColor(goal.priority) }]}>
                      {getPriorityText(goal.priority)}
                    </Text>
                    {isCompleted && (
                      <View style={styles.completedBadge}>
                        <Text style={styles.completedBadgeText}>Completada</Text>
                      </View>
                    )}
                  </View>

                  {/* Progreso */}
                  <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                      <View
                        style={[
                          styles.progressFill,
                          { width: `${progress}%`, backgroundColor: progressColor },
                        ]}
                      />
                    </View>
                  </View>

                  {/* Información de progreso */}
                  <View style={styles.progressInfo}>
                    <Text style={styles.progressLabel}>Progreso</Text>
                    <Text style={styles.progressPercentage}>{progress.toFixed(1)}% completado</Text>
                  </View>

                  {/* Montos */}
                  <View style={styles.amountsContainer}>
                    <View style={styles.amountRow}>
                      <Text style={styles.amountLabel}>Ahorrado vs Meta</Text>
                      <Text 
                        style={styles.amountValue}
                        numberOfLines={1}
                        adjustsFontSizeToFit={true}
                        minimumFontScale={0.7}
                      >
                        {formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}
                      </Text>
                    </View>
                    <View style={styles.amountRow}>
                      <Text style={styles.amountLabel}>Por ahorrar</Text>
                      <Text 
                        style={[styles.amountValue, { color: '#10B981', fontWeight: 'bold' }]}
                        numberOfLines={1}
                        adjustsFontSizeToFit={true}
                        minimumFontScale={0.7}
                      >
                        {formatCurrency(remaining)}
                      </Text>
                    </View>
                  </View>

                  {/* Contribuciones */}
                  <View style={styles.contributionsInfo}>
                    <Text style={styles.contributionsText}>{goal.contributionsCount} Contribuciones</Text>
                  </View>

                  {/* Botón de añadir contribución */}
                  <TouchableOpacity
                    style={styles.contributeButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleAddContribution(goal);
                    }}
                  >
                    <Text style={styles.contributeButtonText}>Añadir Contribución</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Formulario de Meta */}
      <GoalForm
        visible={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingGoal(null);
        }}
        onSuccess={() => {
          loadGoals();
          onGoalChange();
          setEditingGoal(null);
        }}
        editGoal={editingGoal}
      />

      {/* Formulario de Contribución */}
      {showContributionForm && selectedGoal && (
        <ContributionForm
          visible={showContributionForm}
          goal={selectedGoal}
          onClose={() => {
            setShowContributionForm(false);
            setSelectedGoal(null);
          }}
          onSuccess={handleContributionAdded}
        />
      )}
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
    marginTop: 10,
    fontSize: 16,
    color: '#64748b',
  },
  summaryContainer: {
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
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 16,
  },
  summaryCards: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  summaryCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    minWidth: 0, // Permitir que el flex funcione correctamente
    height: 85, // Altura fija para todas las tarjetas
  },
  summaryCardTop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 28,
  },
  summaryCardMiddle: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 28,
  },
  summaryCardBottom: {
    flex: 0.5,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 16,
  },
  summaryCardLabel: {
    fontSize: 11,
    color: '#64748b',
    textAlign: 'center',
  },
  summaryCardValue: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  summaryCardCurrency: {
    fontSize: 10,
    color: '#64748b',
    textAlign: 'center',
    fontWeight: '500',
  },
  // Estilo para la descripción
  descriptionContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  descriptionText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
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
    paddingHorizontal: 40,
  },
  goalsList: {
    gap: 12,
  },
  goalCard: {
    width: '100%', // Una meta por fila
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  goalCardCompleted: {
    opacity: 0.75,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  goalInfo: {
    flex: 1,
  },
  goalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryIcon: {
    fontSize: 20,
  },
  goalName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
    flex: 1,
  },
  deleteButton: {
    padding: 4,
  },
  deleteButtonText: {
    fontSize: 18,
    color: '#dc2626',
    fontWeight: 'bold',
  },
  badgesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  priorityBadge: {
    fontSize: 12,
    fontWeight: '600',
  },
  completedBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  completedBadgeText: {
    fontSize: 10,
    color: '#16a34a',
    fontWeight: '600',
  },
  progressContainer: {
    marginBottom: 12,
  },
  progressBar: {
    width: '100%',
    height: 12,
    backgroundColor: '#e5e7eb',
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 6,
  },
  progressInfo: {
    alignItems: 'center',
    marginBottom: 12,
  },
  progressLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  progressPercentage: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  amountsContainer: {
    gap: 8,
    marginBottom: 12,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  amountLabel: {
    fontSize: 12,
    color: '#64748b',
    flex: 0.4,
    marginRight: 8,
  },
  amountValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1e293b',
    textAlign: 'right',
    flex: 0.6,
  },
  contributionsInfo: {
    alignItems: 'center',
    marginBottom: 12,
  },
  contributionsText: {
    fontSize: 11,
    color: '#64748b',
  },
  contributeButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  contributeButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
});