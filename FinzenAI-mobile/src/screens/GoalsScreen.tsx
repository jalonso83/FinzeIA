import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
import { useSubscriptionStore } from '../stores/subscriptionStore';
import { useCurrency } from '../hooks/useCurrency';
import CustomModal from '../components/modals/CustomModal';
import UpgradeModal from '../components/subscriptions/UpgradeModal';
import ExportService, { ExportFormat, TableColumn } from '../services/exportService';

import { logger } from '../utils/logger';
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
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [goalToDelete, setGoalToDelete] = useState<Goal | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Export states
  const [isExporting, setIsExporting] = useState(false);
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [showExportUpgradeModal, setShowExportUpgradeModal] = useState(false);

  // Dashboard store para notificar cambios
  const { onGoalChange, goalChangeTrigger} = useDashboardStore();

  // Subscription store para validar límites
  const { canCreateGoal, canExportData, fetchSubscription, currentPlan } = useSubscriptionStore();

  // Memoizado: Carga de metas
  const loadGoals = useCallback(async () => {
    try {
      setLoading(true);
      const response = await goalsAPI.getAll();
      const goalsData = response.data.goals || response.data || [];
      logger.log('Goals loaded:', goalsData);
      setGoals(goalsData);
    } catch (error) {
      logger.error('Error loading goals:', error);
      setErrorMessage('No se pudieron cargar las metas');
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGoals();
    fetchSubscription();
  }, [loadGoals, fetchSubscription]);

  // Listener para cambios de metas desde Zenio
  useEffect(() => {
    if (goalChangeTrigger > 0) {
      logger.log('[GoalsScreen] Goal change detected, reloading...');
      loadGoals();
    }
  }, [goalChangeTrigger, loadGoals]);

  // Memoizado: Función para validar límites antes de crear meta
  const handleCreateGoal = useCallback(() => {
    if (!canCreateGoal(goals.length)) {
      setShowUpgradeModal(true);
      return;
    }
    setShowForm(true);
  }, [canCreateGoal, goals.length]);

  // Memoizado: Editar meta
  const handleEditGoal = useCallback((goal: Goal) => {
    setEditingGoal(goal);
    setShowForm(true);
  }, []);

  // Memoizado: Añadir contribución
  const handleAddContribution = useCallback((goal: Goal) => {
    setSelectedGoal(goal);
    setShowContributionForm(true);
  }, []);

  // Memoizado: Callback cuando se añade contribución
  const handleContributionAdded = useCallback(() => {
    loadGoals();
    onGoalChange();
  }, [loadGoals, onGoalChange]);

  // Memoizado: Handler para iniciar eliminación
  const handleDeleteGoal = useCallback((goal: Goal) => {
    setGoalToDelete(goal);
    setShowDeleteConfirmModal(true);
  }, []);

  // Memoizado: Confirmar eliminación
  const confirmDeleteGoal = useCallback(async () => {
    if (!goalToDelete) return;

    try {
      await goalsAPI.delete(goalToDelete.id);
      setShowDeleteConfirmModal(false);
      setGoalToDelete(null);
      loadGoals();
      onGoalChange();
      setSuccessMessage('Meta eliminada correctamente');
      setShowSuccessModal(true);
    } catch (error) {
      logger.error('Error deleting goal:', error);
      setShowDeleteConfirmModal(false);
      setGoalToDelete(null);
      setErrorMessage('No se pudo eliminar la meta');
      setShowErrorModal(true);
    }
  }, [goalToDelete, loadGoals, onGoalChange]);

  // Memoizado: Calcular totales (operación costosa con muchas metas)
  const { totalTarget, totalSaved, totalToSave } = useMemo(() => {
    const target = goals.reduce((sum, goal) => sum + goal.targetAmount, 0);
    const saved = goals.reduce((sum, goal) => sum + goal.currentAmount, 0);
    return {
      totalTarget: target,
      totalSaved: saved,
      totalToSave: target - saved
    };
  }, [goals]);

  // Memoizado: Filtrar metas activas (evita doble filtrado en render)
  const activeGoals = useMemo(() => {
    return goals.filter(goal => !goal.isCompleted);
  }, [goals]);

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

  // Export functions
  const getCurrentDate = (): string => {
    return new Date().toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Memoizado: Mostrar opciones de exportación
  const handleExportPress = useCallback(() => {
    if (!canExportData()) {
      setShowExportUpgradeModal(true);
      return;
    }
    setShowExportOptions(true);
  }, [canExportData]);

  // Memoizado: Función de exportación
  const handleExport = useCallback(async (format: ExportFormat) => {
    setShowExportOptions(false);
    setIsExporting(true);

    try {
      // Define columns for export
      const columns: TableColumn[] = [
        { header: 'Meta', key: 'name' },
        { header: 'Categoría', key: 'category' },
        { header: 'Prioridad', key: 'priority' },
        { header: 'Meta ($)', key: 'targetAmount' },
        { header: 'Ahorrado ($)', key: 'currentAmount' },
        { header: 'Por Ahorrar ($)', key: 'remaining' },
        { header: 'Progreso (%)', key: 'progress' },
        { header: 'Estado', key: 'status' },
        { header: 'Contribuciones', key: 'contributions' },
      ];

      // Prepare data for export
      const exportData = goals.map(goal => {
        const progress = calculateProgress(goal.currentAmount, goal.targetAmount);
        const remaining = goal.targetAmount - goal.currentAmount;
        return {
          name: goal.name,
          category: `${goal.category.icon} ${goal.category.name}`,
          priority: getPriorityText(goal.priority),
          targetAmount: goal.targetAmount.toFixed(2),
          currentAmount: goal.currentAmount.toFixed(2),
          remaining: remaining.toFixed(2),
          progress: progress.toFixed(1),
          status: goal.isCompleted ? 'Completada' : 'En progreso',
          contributions: goal.contributionsCount.toString(),
        };
      });

      // Calculate summary
      const completedGoals = goals.filter(g => g.isCompleted).length;
      const overallProgress = totalTarget > 0 ? (totalSaved / totalTarget * 100).toFixed(1) : '0';

      const summary = `
        <div style="display: flex; justify-content: space-between; flex-wrap: wrap; gap: 15px; margin-bottom: 20px;">
          <div style="flex: 1; min-width: 120px; text-align: center; padding: 10px; background-color: #f8fafc; border-radius: 8px;">
            <div style="font-size: 11px; color: #64748b;">Total Metas</div>
            <div style="font-size: 18px; font-weight: bold; color: #2563EB;">${goals.length}</div>
          </div>
          <div style="flex: 1; min-width: 120px; text-align: center; padding: 10px; background-color: #f8fafc; border-radius: 8px;">
            <div style="font-size: 11px; color: #64748b;">Completadas</div>
            <div style="font-size: 18px; font-weight: bold; color: #10B981;">${completedGoals}</div>
          </div>
          <div style="flex: 1; min-width: 120px; text-align: center; padding: 10px; background-color: #f8fafc; border-radius: 8px;">
            <div style="font-size: 11px; color: #64748b;">Progreso Total</div>
            <div style="font-size: 18px; font-weight: bold; color: #F59E0B;">${overallProgress}%</div>
          </div>
        </div>
        <div style="display: flex; justify-content: space-between; flex-wrap: wrap; gap: 15px; margin-bottom: 20px;">
          <div style="flex: 1; min-width: 120px; text-align: center; padding: 10px; background-color: #f8fafc; border-radius: 8px;">
            <div style="font-size: 11px; color: #64748b;">Meta Total</div>
            <div style="font-size: 16px; font-weight: bold; color: #2563EB;">${formatCurrency(totalTarget)}</div>
          </div>
          <div style="flex: 1; min-width: 120px; text-align: center; padding: 10px; background-color: #f8fafc; border-radius: 8px;">
            <div style="font-size: 11px; color: #64748b;">Total Ahorrado</div>
            <div style="font-size: 16px; font-weight: bold; color: #10B981;">${formatCurrency(totalSaved)}</div>
          </div>
          <div style="flex: 1; min-width: 120px; text-align: center; padding: 10px; background-color: #f8fafc; border-radius: 8px;">
            <div style="font-size: 11px; color: #64748b;">Por Ahorrar</div>
            <div style="font-size: 16px; font-weight: bold; color: #3B82F6;">${formatCurrency(totalToSave)}</div>
          </div>
        </div>
      `;

      if (format === 'PDF') {
        await ExportService.exportToPDF({
          title: 'Metas de Ahorro',
          subtitle: `Reporte generado el ${getCurrentDate()}`,
          columns,
          data: exportData,
          summary,
          fileName: `metas_ahorro_${new Date().toISOString().split('T')[0]}`,
        });
      } else {
        await ExportService.exportToCSV({
          columns,
          data: exportData,
          fileName: `metas_ahorro_${new Date().toISOString().split('T')[0]}`,
        });
      }

      setSuccessMessage(`Metas exportadas correctamente en formato ${format}`);
      setShowSuccessModal(true);
    } catch (error) {
      logger.error('Error exporting goals:', error);
      setErrorMessage('Error al exportar las metas');
      setShowErrorModal(true);
    } finally {
      setIsExporting(false);
    }
  }, [goals, totalTarget, totalSaved, totalToSave, formatCurrency]);

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
        <View style={styles.headerButtons}>
          {/* Export Button */}
          <TouchableOpacity
            style={styles.exportButton}
            onPress={handleExportPress}
            disabled={isExporting || goals.length === 0}
          >
            {isExporting ? (
              <ActivityIndicator size="small" color="#2563EB" />
            ) : (
              <>
                <Ionicons name="download-outline" size={20} color="#2563EB" />
                {currentPlan === 'FREE' && (
                  <View style={styles.plusBadge}>
                    <Text style={styles.plusBadgeText}>PLUS</Text>
                  </View>
                )}
              </>
            )}
          </TouchableOpacity>
          {/* Add Button */}
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => {
              setEditingGoal(null);
              handleCreateGoal();
            }}
          >
            <Ionicons name="add" size={24} color="white" />
          </TouchableOpacity>
        </View>
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

        {activeGoals.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="trophy-outline" size={64} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>No hay metas activas</Text>
            <Text style={styles.emptySubtitle}>
              Establece metas de ahorro y realiza un seguimiento de tu progreso
            </Text>
          </View>
        ) : (
          <View style={styles.goalsList}>
            {activeGoals.map((goal) => {
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

      {/* Modal de confirmación de eliminación */}
      <CustomModal
        visible={showDeleteConfirmModal}
        type="warning"
        title="Eliminar Meta"
        message={`¿Estás seguro de que quieres eliminar "${goalToDelete?.name}"?`}
        buttonText="Eliminar"
        showSecondaryButton={true}
        secondaryButtonText="Cancelar"
        onSecondaryPress={() => {
          setShowDeleteConfirmModal(false);
          setGoalToDelete(null);
        }}
        onClose={confirmDeleteGoal}
      />

      {/* Modal de éxito */}
      <CustomModal
        visible={showSuccessModal}
        type="success"
        title="¡Éxito!"
        message={successMessage}
        buttonText="Continuar"
        onClose={() => setShowSuccessModal(false)}
      />

      {/* Modal de error */}
      <CustomModal
        visible={showErrorModal}
        type="error"
        title="Error"
        message={errorMessage}
        buttonText="Entendido"
        onClose={() => setShowErrorModal(false)}
      />

      {/* Upgrade Modal */}
      <UpgradeModal
        visible={showUpgradeModal}
        onClose={() => {
          setShowUpgradeModal(false);
          // Refrescar suscripción después de cerrar
          fetchSubscription();
        }}
        limitType="goals"
      />

      {/* Export Upgrade Modal */}
      <UpgradeModal
        visible={showExportUpgradeModal}
        onClose={() => {
          setShowExportUpgradeModal(false);
          fetchSubscription();
        }}
        limitType="export"
      />

      {/* Export Options Modal */}
      <CustomModal
        visible={showExportOptions}
        type="info"
        title="Exportar Metas"
        message="Selecciona el formato de exportación"
        buttonText=""
        hideDefaultButton={true}
        onClose={() => setShowExportOptions(false)}
        customContent={
          <View style={styles.exportOptionsContainer}>
            <TouchableOpacity
              style={styles.exportOptionButton}
              onPress={() => handleExport('PDF')}
            >
              <Ionicons name="document-text" size={24} color="#dc2626" />
              <Text style={styles.exportOptionText}>PDF</Text>
              <Text style={styles.exportOptionSubtext}>Documento formateado</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.exportOptionButton}
              onPress={() => handleExport('CSV')}
            >
              <Ionicons name="grid" size={24} color="#16a34a" />
              <Text style={styles.exportOptionText}>CSV</Text>
              <Text style={styles.exportOptionSubtext}>Hoja de cálculo</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelExportButton}
              onPress={() => setShowExportOptions(false)}
            >
              <Text style={styles.cancelExportText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        }
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
  // Export styles
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  exportButton: {
    backgroundColor: '#EFF6FF',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  plusBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#F59E0B',
    borderRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  plusBadgeText: {
    color: 'white',
    fontSize: 8,
    fontWeight: 'bold',
  },
  exportOptionsContainer: {
    width: '100%',
    gap: 12,
    marginTop: 8,
  },
  exportOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  exportOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  exportOptionSubtext: {
    fontSize: 12,
    color: '#64748b',
    marginLeft: 'auto',
  },
  cancelExportButton: {
    alignItems: 'center',
    padding: 12,
    marginTop: 4,
  },
  cancelExportText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
});