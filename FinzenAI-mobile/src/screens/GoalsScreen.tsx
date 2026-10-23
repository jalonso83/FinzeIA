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
import { goalsAPI, sharedAPI, CompartidoInfo, MetaCompartidaConmigo, AporteConvertible } from '../utils/api';
import { useDashboardStore } from '../stores/dashboard';
import { useSubscriptionStore } from '../stores/subscriptionStore';
import { useCurrency } from '../hooks/useCurrency';
import CustomModal from '../components/modals/CustomModal';
import UpgradeModal from '../components/subscriptions/UpgradeModal';
import ExportService, { ExportFormat, TableColumn } from '../services/exportService';
import { useSharedStore } from '../stores/sharedStore';
import MetaCompartidaModal from '../components/shared/MetaCompartidaModal';
import { montoEn, mensajeDeError, pideMejorarPlan } from '../components/shared/sharedUi';

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
  // Solo en las PROPIAS que están compartidas (GET /goals).
  shared?: CompartidoInfo | null;
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

  // ─── Compartidas (2026-10) ───
  const { enabled: puedeCompartir, version: versionCompartidos, abrirInvitacion, refrescarCompartidos } = useSharedStore();
  const [conmigo, setConmigo] = useState<MetaCompartidaConmigo[]>([]);
  const [convertibles, setConvertibles] = useState<AporteConvertible[]>([]);
  const [convirtiendo, setConvirtiendo] = useState<string | null>(null);
  const [hojaMeta, setHojaMeta] = useState<{
    goal: Goal | null; goalId: string; nombre: string; soyDueno: boolean; sinCompartir: boolean;
  } | null>(null);

  // Export states
  const [isExporting, setIsExporting] = useState(false);
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [showExportUpgradeModal, setShowExportUpgradeModal] = useState(false);
  const [showProModalPdf, setShowProModalPdf] = useState(false);

  // Dashboard store para notificar cambios
  const { onGoalChange, goalChangeTrigger} = useDashboardStore();

  // Subscription store para validar límites
  const { canCreateGoal, canExportData, canExportPdf, fetchSubscription, isFreePlan, openPlansModal } = useSubscriptionStore();

  // Memoizado: Carga de metas
  // Solo la PRIMERA carga muestra el cargador: las recargas son silenciosas para
  // no desmontar la hoja de meta compartida que esté abierta.
  const primeraCargaRef = React.useRef(true);
  const loadGoals = useCallback(async () => {
    const esPrimera = primeraCargaRef.current;
    try {
      if (esPrimera) setLoading(true);
      const response = await goalsAPI.getAll();
      const goalsData = response.data.goals || response.data || [];
      logger.log('Goals loaded:', goalsData);
      setGoals(goalsData);
    } catch (error) {
      logger.error('Error loading goals:', error);
      // Sin modal de error en recargas: podría haber una hoja abierta (iOS).
      if (!esPrimera) return;
      setErrorMessage('No se pudieron cargar las metas');
      setShowErrorModal(true);
    } finally {
      primeraCargaRef.current = false;
      setLoading(false);
    }
  }, []);

  // Lo compartido va aparte de GET /goals. Si falla, la pantalla sigue con lo propio.
  const loadCompartidas = useCallback(async () => {
    const [c, v] = await Promise.allSettled([sharedAPI.metasConmigo(), sharedAPI.aportesConvertibles()]);
    if (c.status === 'fulfilled') setConmigo(c.value.data.compartidas || []);
    else logger.error('Error cargando metas compartidas conmigo:', c.reason);
    if (v.status === 'fulfilled') setConvertibles(v.value.data.convertibles || []);
    else logger.error('Error cargando aportes convertibles:', v.reason);
  }, []);

  useEffect(() => {
    loadGoals();
    loadCompartidas();
    fetchSubscription();
  }, [loadGoals, loadCompartidas, fetchSubscription]);

  useEffect(() => {
    if (versionCompartidos > 0) {
      loadGoals();
      loadCompartidas();
    }
  }, [versionCompartidos, loadGoals, loadCompartidas]);

  // Listener para cambios de metas desde Zenio
  useEffect(() => {
    if (goalChangeTrigger > 0) {
      logger.log('[GoalsScreen] Goal change detected, reloading...');
      loadGoals();
      loadCompartidas();
    }
  }, [goalChangeTrigger, loadGoals, loadCompartidas]);

  // iOS: nunca dos <Modal> a la vez. Se cierra la hoja y después se abre lo otro.
  const mejorarPlanDesdeMeta = useCallback(() => {
    setHojaMeta(null);
    setTimeout(() => openPlansModal(), 500);
  }, [openPlansModal]);

  const aportarDesdeHoja = useCallback(() => {
    const goal = hojaMeta?.goal;
    setHojaMeta(null);
    if (goal) {
      setTimeout(() => {
        setSelectedGoal(goal);
        setShowContributionForm(true);
      }, 500);
    }
  }, [hojaMeta]);

  // Quien salió de una meta compartida pasa lo que aportó a una meta suya.
  const convertir = useCallback(async (c: AporteConvertible) => {
    setConvirtiendo(c.groupId);
    try {
      await sharedAPI.convertirAportes(c.groupId);
      loadGoals();
      loadCompartidas();
      onGoalChange();
      setSuccessMessage(`Listo: "${c.meta}" ya es una meta tuya con lo que aportaste.`);
      setShowSuccessModal(true);
    } catch (e: any) {
      logger.error('Error convirtiendo aportes:', e);
      if (pideMejorarPlan(e)) {
        setShowUpgradeModal(true);
      } else {
        setErrorMessage(mensajeDeError(e, 'No pudimos crear la meta.'));
        setShowErrorModal(true);
      }
    } finally {
      setConvirtiendo(null);
    }
  }, [loadGoals, loadCompartidas, onGoalChange]);

  // Memoizado: Función para validar límites antes de crear meta
  const handleCreateGoal = useCallback(() => {
    // Solo contar metas NO completadas para el límite
    const activeGoalsCount = goals.filter(g => !g.isCompleted).length;
    if (!canCreateGoal(activeGoalsCount)) {
      setShowUpgradeModal(true);
      return;
    }
    setShowForm(true);
  }, [canCreateGoal, goals]);

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

  // Memoizado: Callback cuando se añade contribución.
  // Patrón unificado iOS/Android Screen-level:
  // 1. Cerrar ContributionForm
  // 2. Limpiar goal seleccionado
  // 3. Refrescar lista
  // 4. Mostrar modal de éxito
  const handleContributionAdded = useCallback((message: string) => {
    setShowContributionForm(false);
    setSelectedGoal(null);
    loadGoals();
    onGoalChange();
    setSuccessMessage(message);
    setShowSuccessModal(true);
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

    // Verificar si tiene permiso de exportación PDF (solo PRO)
    if (format === 'pdf' && !canExportPdf()) {
      setShowProModalPdf(true);
      return;
    }

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

      const summary = [
        { label: 'Total Metas', value: `${goals.length}` },
        { label: 'Completadas', value: `${completedGoals}` },
        { label: 'Progreso Total', value: `${overallProgress}%` },
        { label: 'Meta Total', value: formatCurrency(totalTarget) },
        { label: 'Total Ahorrado', value: formatCurrency(totalSaved) },
        { label: 'Por Ahorrar', value: formatCurrency(totalToSave) },
      ];

      const result = await ExportService.exportData(
        {
          title: 'Metas de Ahorro',
          subtitle: `Reporte generado el ${getCurrentDate()}`,
          filename: `metas_ahorro_${new Date().toISOString().split('T')[0]}`,
          format,
        },
        {
          columns,
          rows: exportData,
          summary,
        },
        'save'
      );

      if (!result.success) {
        setErrorMessage(result.message);
        setShowErrorModal(true);
        return;
      }

      setSuccessMessage(`Metas exportadas correctamente en formato ${format.toUpperCase()}`);
      setShowSuccessModal(true);
    } catch (error) {
      logger.error('Error exporting goals:', error);
      setErrorMessage('Error al exportar las metas');
      setShowErrorModal(true);
    } finally {
      setIsExporting(false);
    }
  }, [goals, totalTarget, totalSaved, totalToSave, formatCurrency, canExportPdf]);

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
                {isFreePlan() && (
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
                    <View style={styles.goalActions}>
                      {(!!goal.shared || puedeCompartir) && (
                        <TouchableOpacity
                          style={styles.shareButton}
                          onPress={() => setHojaMeta({ goal, goalId: goal.id, nombre: goal.name, soyDueno: true, sinCompartir: !goal.shared })}
                          accessibilityLabel={goal.shared ? 'Ver meta compartida' : 'Compartir meta'}
                        >
                          <Ionicons name={goal.shared ? 'people' : 'person-add-outline'} size={20} color="#2563EB" />
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => handleDeleteGoal(goal)}
                      >
                        <Ionicons name="trash-outline" size={20} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
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
                    {goal.shared && (
                      <Text style={[styles.sharedBadge, goal.shared.pausado && styles.sharedBadgePausa]}>
                        {goal.shared.pausado
                          ? '⏸ En pausa'
                          : goal.shared.miembros > 1
                            ? `👥 ${goal.shared.miembros} personas`
                            : '👥 Invitación enviada'}
                      </Text>
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

        {/* Salió de una meta compartida y puede quedarse con lo que aportó */}
        {convertibles.map((c) => (
          <View key={c.groupId} style={styles.convertibleCard}>
            <Text style={styles.convertibleTexto}>
              Aportaste {formatCurrency(c.aportado)} a «{c.meta}». ¿Lo pasas a una meta tuya?
            </Text>
            <TouchableOpacity style={styles.convertibleBoton} onPress={() => convertir(c)} disabled={!!convirtiendo}>
              {convirtiendo === c.groupId
                ? <ActivityIndicator color="white" />
                : <Text style={styles.convertibleBotonTexto}>Crear mi meta</Text>}
            </TouchableOpacity>
          </View>
        ))}

        {conmigo.length > 0 && (
          <View style={styles.conmigoSection}>
            <Text style={styles.conmigoTitle}>Compartidas conmigo</Text>
            <View style={styles.goalsList}>
              {conmigo.map((c) => {
                if (c.pausado || !c.goal) {
                  return (
                    <View key={c.groupId} style={[styles.goalCard, styles.conmigoPausado]}>
                      <Text style={styles.goalName}>⏸ Meta de {c.dueno}</Text>
                      <Text style={styles.conmigoPausadoTexto}>{c.mensaje}</Text>
                    </View>
                  );
                }
                const g = c.goal as unknown as Goal;
                const progress = calculateProgress(g.currentAmount, g.targetAmount);
                const m = (n: number) => montoEn(n, c.moneda, formatCurrency);
                return (
                  <TouchableOpacity
                    key={c.groupId}
                    style={styles.goalCard}
                    activeOpacity={0.7}
                    onPress={() => setHojaMeta({ goal: g, goalId: g.id, nombre: g.name, soyDueno: false, sinCompartir: false })}
                  >
                    <View style={styles.goalHeader}>
                      <View style={styles.goalInfo}>
                        <View style={styles.goalTitleRow}>
                          <Text style={styles.categoryIcon}>{g.category?.icon}</Text>
                          <Text style={styles.goalName} numberOfLines={1}>{g.name}</Text>
                        </View>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
                    </View>
                    <Text style={styles.conmigoDe}>De {c.dueno} · {c.miembros ?? 2} personas · tu aporte {m(c.miAporte ?? 0)}</Text>
                    <View style={styles.progressContainer}>
                      <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: getProgressColor(progress) }]} />
                      </View>
                    </View>
                    <View style={styles.amountsContainer}>
                      <View style={styles.amountRow}>
                        <Text style={styles.amountLabel}>Ahorrado vs meta</Text>
                        <Text style={styles.amountValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                          {m(g.currentAmount)} / {m(g.targetAmount)}
                        </Text>
                      </View>
                    </View>
                    {!g.isCompleted && (
                      <TouchableOpacity
                        style={styles.contributeButton}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleAddContribution(g);
                        }}
                      >
                        <Text style={styles.contributeButtonText}>Aportar</Text>
                      </TouchableOpacity>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {(puedeCompartir || conmigo.length > 0) && (
          <TouchableOpacity style={styles.tengoCodigo} onPress={() => abrirInvitacion('')}>
            <Ionicons name="key-outline" size={18} color="#2563EB" />
            <Text style={styles.tengoCodigoTexto}>¿Te invitaron? Escribe tu código</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Meta compartida: invitar, quiénes aportaron, salir */}
      <MetaCompartidaModal
        visible={!!hojaMeta}
        goalId={hojaMeta?.goalId ?? null}
        nombre={hojaMeta?.nombre ?? ''}
        soyDueno={!!hojaMeta?.soyDueno}
        sinCompartir={!!hojaMeta?.sinCompartir}
        onClose={() => setHojaMeta(null)}
        onCambio={refrescarCompartidos}
        onMejorarPlan={mejorarPlanDesdeMeta}
        onAportar={aportarDesdeHoja}
      />

      {/* Formulario de Meta */}
      <GoalForm
        visible={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingGoal(null);
        }}
        onSuccess={(message: string) => {
          // Patrón unificado iOS/Android Screen-level:
          // 1. Cerrar form
          // 2. Limpiar estado de edición
          // 3. Refrescar lista
          // 4. Mostrar modal de éxito a nivel Screen
          setShowForm(false);
          setEditingGoal(null);
          loadGoals();
          onGoalChange();
          setSuccessMessage(message);
          setShowSuccessModal(true);
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
        message={
          goalToDelete?.shared
            ? `¿Eliminar "${goalToDelete?.name}"? Está compartida: las demás personas dejarán de verla.`
            : `¿Estás seguro de que quieres eliminar "${goalToDelete?.name}"?`
        }
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

      {/* Export Upgrade Modal CSV */}
      <UpgradeModal
        visible={showExportUpgradeModal}
        onClose={() => {
          setShowExportUpgradeModal(false);
          fetchSubscription();
        }}
        limitType="export"
      />

      {/* Modal de Función PRO para exportación PDF */}
      <CustomModal
        visible={showProModalPdf}
        type="warning"
        title="Función PRO"
        message={`La exportación a PDF está disponible exclusivamente para usuarios del plan PRO.\n\n¡Mejora tu plan para desbloquear esta y más funciones!`}
        buttonText="Ver Planes"
        onClose={() => {
          setShowProModalPdf(false);
          openPlansModal();
        }}
        showSecondaryButton={true}
        secondaryButtonText="Cerrar"
        onSecondaryPress={() => setShowProModalPdf(false)}
      />

      {/* Export Options Modal */}
      <CustomModal
        visible={showExportOptions}
        type="info"
        title="Exportar Metas"
        message=""
        hideDefaultButton={true}
        onClose={() => setShowExportOptions(false)}
        customContent={
          <View>
            <View style={styles.exportOptionsContainer}>
              <TouchableOpacity
                style={styles.exportOptionButton}
                onPress={() => handleExport('pdf')}
              >
                <View style={styles.exportOptionIconContainer}>
                  <Ionicons name="document-text" size={32} color="#dc2626" />
                  {!canExportPdf() && (
                    <View style={styles.proBadge}>
                      <Text style={styles.proBadgeText}>PRO</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.exportOptionText}>PDF</Text>
                <Text style={styles.exportOptionSubtext}>Documento con formato</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.exportOptionButton}
                onPress={() => handleExport('csv')}
              >
                <Ionicons name="grid" size={32} color="#059669" />
                <Text style={styles.exportOptionText}>CSV</Text>
                <Text style={styles.exportOptionSubtext}>Hoja de cálculo</Text>
              </TouchableOpacity>
            </View>
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
    borderRadius: 22,
    width: 44,
    height: 44,
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
  goalActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  shareButton: {
    padding: 4,
  },
  sharedBadge: {
    fontSize: 12,
    color: '#1d4ed8',
    fontWeight: '600',
  },
  sharedBadgePausa: {
    color: '#b45309',
  },
  conmigoSection: {
    marginTop: 24,
  },
  conmigoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
  },
  conmigoDe: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 10,
  },
  conmigoPausado: {
    backgroundColor: '#f8fafc',
  },
  conmigoPausadoTexto: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 6,
    lineHeight: 20,
  },
  convertibleCard: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
    gap: 10,
  },
  convertibleTexto: {
    fontSize: 14,
    color: '#166534',
    lineHeight: 20,
  },
  convertibleBoton: {
    backgroundColor: '#16a34a',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  convertibleBotonTexto: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  tengoCodigo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 18,
  },
  tengoCodigoTexto: {
    color: '#2563EB',
    fontSize: 14,
    fontWeight: '600',
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
    backgroundColor: '#eff6ff',
    // Mismo círculo con borde azul que los de Transacciones y Presupuestos.
    // Sin el borde, este botón se veía plano al lado de los demás.
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 19,
    width: 38,
    height: 38,
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
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
    gap: 16,
  },
  exportOptionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  exportOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginTop: 8,
  },
  exportOptionSubtext: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  exportOptionIconContainer: {
    position: 'relative',
  },
  proBadge: {
    position: 'absolute',
    top: -8,
    right: -12,
    backgroundColor: '#7c3aed',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  proBadgeText: {
    color: 'white',
    fontSize: 9,
    fontWeight: 'bold',
  },
  cancelExportButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginTop: 12,
    backgroundColor: '#e5e7eb',
    borderRadius: 12,
  },
  cancelExportText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '600',
  },
});