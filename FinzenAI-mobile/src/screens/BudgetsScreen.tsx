import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
import api, { budgetsAPI, Budget, sharedAPI, PresupuestoCompartidoConmigo, GastoPorConfirmar } from '../utils/api';
import BudgetForm from '../components/forms/BudgetForm';
import { useDashboardStore } from '../stores/dashboard';
import { useSubscriptionStore } from '../stores/subscriptionStore';
import { useCurrency } from '../hooks/useCurrency';
import CustomModal from '../components/modals/CustomModal';
import UpgradeModal from '../components/subscriptions/UpgradeModal';
import ExportService, { ExportFormat, TableColumn } from '../services/exportService';
import { useSharedStore } from '../stores/sharedStore';
import PresupuestoCompartidoModal from '../components/shared/PresupuestoCompartidoModal';
import PorConfirmarModal from '../components/shared/PorConfirmarModal';
import { montoEn } from '../components/shared/sharedUi';

import { logger } from '../utils/logger';
const { width } = Dimensions.get('window');

export default function BudgetsScreen() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [budgetToDelete, setBudgetToDelete] = useState<{id: string, name: string} | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // ─── Compartidos (2026-10) ───
  // `puedeCompartir` solo decide si se ve el botón de compartir en los propios.
  // Lo que otros me comparten se ve siempre.
  const { enabled: puedeCompartir, version: versionCompartidos, abrirInvitacion, refrescarCompartidos } = useSharedStore();
  const [conmigo, setConmigo] = useState<PresupuestoCompartidoConmigo[]>([]);
  const [porConfirmar, setPorConfirmar] = useState<GastoPorConfirmar[]>([]);
  const [hojaCompartido, setHojaCompartido] = useState<{
    budgetId: string | null; nombre: string; soyDueno: boolean; sinCompartir: boolean;
  } | null>(null);
  const [showPorConfirmar, setShowPorConfirmar] = useState(false);

  // Dashboard store para notificar cambios
  const { onBudgetChange, budgetChangeTrigger, transactionChangeTrigger} = useDashboardStore();

  // Subscription store para validar límites y exportación
  const { canCreateBudget, canExportData, canExportPdf, fetchSubscription, openPlansModal } = useSubscriptionStore();

  // Hook para moneda del usuario
  const { formatCurrency } = useCurrency();

  // Estados para exportación
  const [isExporting, setIsExporting] = useState(false);
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [exportUpgradeModal, setExportUpgradeModal] = useState(false);
  const [showProModalPdf, setShowProModalPdf] = useState(false);

  // Calcular resumen dinámicamente con análisis de rendimiento y proyecciones
  const stats = useMemo(() => {
    // Filtrar presupuestos activos y del mes actual
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    // SOLO presupuestos de GASTO. Todo lo que se calcula debajo tiene forma de
    // gasto: "gastado del mes", "bajo control", "en riesgo de excederse". Meter
    // un presupuesto de ingreso ahí sumaría lo que el usuario COBRÓ dentro de lo
    // que gastó, y lo alertaría por estar a punto de "excederse" cuando en
    // realidad está por cumplir su meta de facturación.
    // Los de ingreso tendrán su propio resumen en la Fase 2.
    const monthlyBudgets = budgets.filter(b =>
      b.is_active &&
      (b.type ?? 'EXPENSE') === 'EXPENSE' &&
      // 'biweekly' entra junto con 'monthly': un quincenal cubre media parte
      // del mes en curso y el usuario lo ve como su presupuesto vigente. Si se
      // dejara fuera, quien solo tenga quincenales vería este resumen en cero
      // mientras el Dashboard sí los suma — dos cifras distintas para lo mismo.
      (b.period === 'monthly' || b.period === 'biweekly') &&
      new Date(b.start_date) <= monthEnd &&
      new Date(b.end_date) >= monthStart
    );
    
    // Metas de INGRESO vigentes, con su propio agregado: nunca deben entrar en
    // los totales de gasto (sumarían lo COBRADO dentro de lo gastado).
    const metasIngreso = budgets.filter(b =>
      b.is_active &&
      b.type === 'INCOME' &&
      new Date(b.start_date) <= monthEnd &&
      new Date(b.end_date) >= monthStart
    );
    const metaIngresoTotal = metasIngreso.reduce((sum, b) => sum + (b.amount || 0), 0);
    const recibidoTotal = metasIngreso.reduce((sum, b) => sum + (b.spent || 0), 0);

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
      tieneGastos: monthlyBudgets.length > 0,
      metasIngreso: metasIngreso.length,
      metaIngresoTotal,
      recibidoTotal,
      remaining,
      currency: formatCurrency(0).replace('0', '').trim(), // Extraer símbolo dinámico
      bestBudget,
      controlStatus,
      controlIcon,
      projectionAlerts
    };

    return result;
  }, [budgets]);

  // Memoizado: Carga de presupuestos (definido antes de useEffects que lo usan)
  // Solo la PRIMERA carga muestra el cargador a pantalla completa. Las recargas
  // (aceptar, invitar, confirmar…) son silenciosas: el cargador desmonta la
  // pantalla, y con ella la hoja de compartido que estuviera abierta.
  const primeraCargaRef = React.useRef(true);
  const loadBudgets = useCallback(async () => {
    const esPrimera = primeraCargaRef.current;
    try {
      if (esPrimera) setLoading(true);
      const response = await budgetsAPI.getAll();
      const budgetsData = response.data.budgets || response.data || [];
      setBudgets(budgetsData);
    } catch (error: any) {
      logger.error('Error loading budgets:', error);
      // En una recarga silenciosa no se abre el modal de error: podría haber una
      // hoja abierta y en iOS dos <Modal> traban la app. Queda lo ya cargado.
      if (!esPrimera) return;

      if (error.response?.status === 401) {
        setErrorMessage('Por favor inicia sesión nuevamente');
      } else {
        setErrorMessage('No se pudieron cargar los presupuestos');
      }
      setShowErrorModal(true);
      setBudgets([]);
    } finally {
      primeraCargaRef.current = false;
      setLoading(false);
    }
  }, []);

  // Lo compartido va aparte de GET /budgets. Si falla no se muestra error: la
  // pantalla sigue sirviendo con lo propio.
  const loadCompartidos = useCallback(async () => {
    const [c, p] = await Promise.allSettled([sharedAPI.presupuestosConmigo(), sharedAPI.porConfirmar()]);
    if (c.status === 'fulfilled') setConmigo(c.value.data.compartidos || []);
    else logger.error('Error cargando compartidos conmigo:', c.reason);
    if (p.status === 'fulfilled') setPorConfirmar(p.value.data.gastos || []);
    else logger.error('Error cargando gastos por confirmar:', p.reason);
  }, []);

  useEffect(() => {
    loadBudgets();
    loadCompartidos();
    fetchSubscription();
  }, [loadBudgets, loadCompartidos, fetchSubscription]);

  // Aceptó una invitación, salió, confirmó un gasto…: recargar las dos listas.
  useEffect(() => {
    if (versionCompartidos > 0) {
      loadBudgets();
      loadCompartidos();
    }
  }, [versionCompartidos, loadBudgets, loadCompartidos]);

  // Listener para cambios de presupuestos desde Zenio
  useEffect(() => {
    if (budgetChangeTrigger > 0) {
      loadBudgets();
    }
  }, [budgetChangeTrigger, loadBudgets]);

  // Listener para cambios de transacciones (actualizar spent en budgets)
  useEffect(() => {
    if (transactionChangeTrigger > 0) {
      loadBudgets();
      loadCompartidos();
    }
  }, [transactionChangeTrigger, loadBudgets, loadCompartidos]);

  // iOS: la hoja de compartido es un <Modal>; Planes es otro. Primero se cierra
  // la hoja y después se abre Planes, nunca los dos a la vez.
  const mejorarPlanDesdeCompartido = useCallback(() => {
    setHojaCompartido(null);
    setTimeout(() => openPlansModal(), 500);
  }, [openPlansModal]);

  // Memoizado: Función para validar límites antes de crear presupuesto
  const handleCreateBudget = useCallback(() => {
    // Solo contar presupuestos ACTIVOS para el límite
    const activeBudgetsCount = budgets.filter(b => b.is_active).length;
    if (!canCreateBudget(activeBudgetsCount)) {
      setShowUpgradeModal(true);
      return;
    }
    setShowForm(true);
  }, [canCreateBudget, budgets]);

  // Función para eliminar presupuesto (replicando la web)
  const handleDeleteBudget = (budgetId: string, budgetName: string) => {
    setBudgetToDelete({id: budgetId, name: budgetName});
    setShowDeleteConfirmModal(true);
  };

  const confirmDeleteBudget = async () => {
    if (!budgetToDelete) return;

    try {
      await budgetsAPI.delete(budgetToDelete.id);
      setShowDeleteConfirmModal(false);
      setBudgetToDelete(null);
      loadBudgets();
      onBudgetChange(); // Notificar al dashboard
      setSuccessMessage('Presupuesto eliminado correctamente');
      setShowSuccessModal(true);
    } catch (error) {
      logger.error('Error deleting budget:', error);
      setShowDeleteConfirmModal(false);
      setBudgetToDelete(null);
      setErrorMessage('No se pudo eliminar el presupuesto');
      setShowErrorModal(true);
    }
  };

  // Función para formatear periodo (replicando la web)
  const formatPeriod = (period: string) => {
    switch (period) {
      case 'weekly': return 'semanal';
      case 'biweekly': return 'quincenal';
      case 'monthly': return 'mensual';
      case 'yearly': return 'anual';
      default: return period;
    }
  };

  // Funciones de utilidad (replicando la web)
  // El tope del 100% solo aplica a los TECHOS de gasto (la barra no puede
  // pasar del borde). En una META de ingreso, quien facturó 120.000 sobre una
  // meta de 80.000 tiene que ver 150%, no un 100% que le esconde el logro.
  /**
   * Porcentaje REAL, sin topar. Es el que se escribe al lado de la barra.
   *
   * Topaba en 100 para gastos, y eso escondía justo el dato que más importa:
   * quien gastó 26.633 de un presupuesto de 10.000 leía "100.0%", igual que
   * quien lo clavó exacto. Se ven idénticos y no lo son — uno cumplió y el otro
   * se pasó al triple.
   *
   * El tope sigue existiendo, pero solo para el ANCHO de la barra
   * (`anchoDeBarra`): eso es una limitación de dibujo, no del dato.
   */
  const calculateProgress = (spent: number, amount: number, _type?: 'EXPENSE' | 'INCOME') => {
    if (!(amount > 0)) return 0;
    return (spent / amount) * 100;
  };

  /** Ancho de la barra: nunca más del carril. */
  const anchoDeBarra = (pct: number) => Math.max(0, Math.min(pct, 100));

  // La escala de color se INVIERTE según el tipo de presupuesto:
  //   GASTO   → es un techo: verde al principio, rojo al acercarse al límite.
  //   INGRESO → es un piso: rojo mientras va corto, verde al alcanzar la meta.
  // Sin esto, a alguien que ya facturó lo que esperaba se le pintaría la barra
  // en rojo como si fuera un problema.
  // Para INGRESO se compara el avance con el TIEMPO transcurrido del período,
  // igual que la tarjeta "Ingresos esperados" del dashboard. Con una escala
  // absoluta, el día 3 del mes una meta al 5% salía en ROJO en esta pantalla
  // mientras el dashboard decía "Vas al ritmo": dos veredictos opuestos sobre
  // lo mismo en pantallas contiguas.
  const getProgressColor = (progress: number, type?: 'EXPENSE' | 'INCOME', pctTiempo?: number) => {
    if (type === 'INCOME') {
      if (progress >= 100) return '#4CAF50';
      if (pctTiempo === undefined) {
        if (progress >= 70) return '#FFC107';
        return '#F44336';
      }
      // 10 puntos de holgura, la misma tolerancia que usa el dashboard.
      if (progress >= pctTiempo - 10) return '#4CAF50';
      if (progress >= pctTiempo - 25) return '#FFC107';
      return '#F44336';
    }
    if (progress < 70) return '#4CAF50';
    if (progress < 80) return '#FFC107';
    return '#F44336';
  };

  // Porcentaje del período ya transcurrido, para el semáforo de los de ingreso.
  const porcentajeTiempo = (inicio: string, fin: string) => {
    const ini = new Date(inicio).getTime();
    const f = new Date(fin).getTime();
    const ahora = Date.now();
    if (!(f > ini)) return 0;
    return Math.max(0, Math.min(100, ((ahora - ini) / (f - ini)) * 100));
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

  // Obtener nombre del mes actual
  const getCurrentMonth = (): string => {
    const now = new Date();
    return now.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  };

  // Función para manejar exportación
  const handleExport = async (format: ExportFormat) => {
    setShowExportOptions(false);

    // Verificar si tiene permiso de exportación CSV (PLUS/PRO)
    if (!canExportData()) {
      setExportUpgradeModal(true);
      return;
    }

    // Verificar si tiene permiso de exportación PDF (solo PRO)
    if (format === 'pdf' && !canExportPdf()) {
      setShowProModalPdf(true);
      return;
    }

    // Se exportan los dos tipos, pero SEPARADOS. Antes se mezclaban: lo
    // COBRADO de una meta de ingreso se sumaba en "Total gastado", los totales
    // salían inflados y una meta de facturación cumplida se contaba como
    // "presupuesto excedido", o sea el logro reportado como problema.
    const activeBudgets = budgets.filter(b => b.is_active);
    const activosGasto = activeBudgets.filter(b => (b.type ?? 'EXPENSE') === 'EXPENSE');
    const activosIngreso = activeBudgets.filter(b => b.type === 'INCOME');

    if (activeBudgets.length === 0) {
      setErrorMessage('No hay presupuestos activos para exportar');
      setShowErrorModal(true);
      return;
    }

    setIsExporting(true);

    try {
      // Preparar columnas para la tabla
      const columns: TableColumn[] = [
        {
          header: 'Presupuesto',
          key: 'name',
          align: 'left',
          width: '21%',
          format: (v, row) => `${row?.category?.icon || '💰'} ${v}`
        },
        {
          header: 'Categoría',
          key: 'category',
          align: 'left',
          width: '17%',
          format: (v) => v?.name || 'General'
        },
        {
          header: 'Tipo',
          key: 'type',
          align: 'center',
          width: '10%',
          format: (v) => (v === 'INCOME' ? 'Ingreso' : 'Gasto')
        },
        {
          header: 'Frecuencia',
          key: 'period',
          align: 'center',
          width: '11%',
          format: (v) => formatPeriod(v)
        },
        {
          // Encabezados NEUTROS a propósito: en un presupuesto de gasto la
          // columna es "presupuestado/gastado" y en uno de ingreso es
          // "meta/recibido". Un solo rótulo tiene que ser cierto en los dos.
          header: 'Monto',
          key: 'amount',
          align: 'right',
          width: '15%',
          format: (v) => formatCurrency(v)
        },
        {
          header: 'Acumulado',
          key: 'spent',
          align: 'right',
          width: '15%',
          format: (v) => formatCurrency(v)
        },
        {
          header: 'Diferencia',
          key: 'remaining',
          align: 'right',
          width: '15%',
          format: (v, row) => {
            const remaining = (row?.amount || 0) - (row?.spent || 0);
            const prefix = remaining >= 0 ? '' : '-';
            return `${prefix}${formatCurrency(Math.abs(remaining))}`;
          }
        },
      ];

      // Preparar filas con datos calculados (solo activos)
      const rows = activeBudgets.map(b => ({
        ...b,
        remaining: b.amount - b.spent,
        progress: b.amount > 0 ? ((b.spent / b.amount) * 100).toFixed(1) + '%' : '0%'
      }));

      // Totales de GASTO. "Excedido" solo tiene sentido aquí: pasarse de un
      // techo es malo, pero superar una meta de ingreso es el mejor resultado.
      const exceededBudgets = activosGasto.filter(b => b.spent > b.amount);
      const totalBudgeted = activosGasto.reduce((sum, b) => sum + b.amount, 0);
      const totalSpent = activosGasto.reduce((sum, b) => sum + b.spent, 0);
      const balance = totalBudgeted - totalSpent;

      // Totales de INGRESO, en sus propias líneas.
      const metaIngresos = activosIngreso.reduce((sum, b) => sum + b.amount, 0);
      const recibido = activosIngreso.reduce((sum, b) => sum + b.spent, 0);
      const metasLogradas = activosIngreso.filter(b => b.spent >= b.amount).length;

      const summary = [
        { label: 'Período', value: getCurrentMonth() },
        { label: 'Total presupuestado (gastos)', value: formatCurrency(totalBudgeted) },
        { label: 'Total gastado', value: formatCurrency(totalSpent) },
        { label: 'Balance', value: `${balance >= 0 ? '+' : ''}${formatCurrency(balance)}` },
        { label: 'Presupuestos excedidos', value: `${exceededBudgets.length}` },
        ...(activosIngreso.length > 0 ? [
          // "Presupuesto de ingresos" y nunca "meta": una meta es otro objeto del
          // producto (juntar dinero para algo). Llamarle meta aquí enseñaba la
          // palabra equivocada, y luego el usuario le pedía a Zenio "una meta de
          // ingresos" y no había forma de saber cuál de los dos quería.
          { label: 'Presupuesto de ingresos', value: formatCurrency(metaIngresos) },
          { label: 'Total recibido', value: formatCurrency(recibido) },
          { label: 'Metas de ingreso logradas', value: `${metasLogradas} de ${activosIngreso.length}` },
        ] : []),
      ];

      const result = await ExportService.exportData(
        {
          title: 'Reporte de Presupuestos',
          subtitle: getCurrentMonth(),
          filename: `presupuestos_${new Date().getTime()}`,
          format,
        },
        {
          columns,
          rows,
          summary,
        },
        'save'
      );

      if (!result.success) {
        setErrorMessage(result.message);
        setShowErrorModal(true);
      }
    } catch (error: any) {
      logger.error('Error exportando:', error);
      setErrorMessage('No se pudo exportar el documento');
      setShowErrorModal(true);
    } finally {
      setIsExporting(false);
    }
  };

  // Función para mostrar opciones de exportación
  const handleExportPress = () => {
    if (!canExportData()) {
      setExportUpgradeModal(true);
      return;
    }
    setShowExportOptions(true);
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
        <View style={styles.headerButtons}>
          {/* Botón de exportar */}
          <TouchableOpacity
            style={styles.exportHeaderButton}
            onPress={handleExportPress}
            disabled={isExporting}
          >
            {isExporting ? (
              <ActivityIndicator size="small" color="#2563EB" />
            ) : (
              <>
                <Ionicons name="download-outline" size={20} color="#2563EB" />
                {!canExportData() && (
                  <View style={styles.plusBadgeSmall}>
                    <Text style={styles.plusBadgeSmallText}>+</Text>
                  </View>
                )}
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addButton}
            onPress={handleCreateBudget}
          >
            <Ionicons name="add" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Gastos automáticos que cuentan en un compartido y nadie ha confirmado */}
        {porConfirmar.length > 0 && (
          <TouchableOpacity style={styles.porConfirmarBanner} onPress={() => setShowPorConfirmar(true)} activeOpacity={0.8}>
            <Ionicons name="mail-unread-outline" size={20} color="#b45309" />
            <Text style={styles.porConfirmarTexto}>
              {porConfirmar.length === 1
                ? 'Tienes 1 gasto automático por confirmar'
                : `Tienes ${porConfirmar.length} gastos automáticos por confirmar`}
            </Text>
            <Ionicons name="chevron-forward" size={18} color="#b45309" />
          </TouchableOpacity>
        )}

        {/* Resumen de presupuestos (patrón dashboard) */}
        <View style={styles.summaryContainer}>
          <Text style={styles.summaryTitle}>Resumen de Presupuestos</Text>
          
          {/* Bloque de GASTOS. Se oculta si la persona no tiene ninguno: antes
              salia siempre, y quien solo usaba metas de ingreso veia
              "Presupuesto vigente $0.00 / Gasto actual $0.00" como si la app
              hubiera perdido sus datos, mientras abajo si aparecian sus metas. */}
          {stats.tieneGastos && (
            <>
              <View style={styles.monthlyBudgetRow}>
                <Text style={styles.monthlyBudgetLabel}>Presupuesto vigente</Text>
                <Text style={styles.monthlyBudgetValue}>
                  {formatCurrency(stats.totalBudget)}
                </Text>
              </View>

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
            </>
          )}

          {/* Bloque de METAS DE INGRESO: aqui lo bueno es acercarse al total,
              no alejarse, asi que tiene sus propias etiquetas y colores. */}
          {stats.metasIngreso > 0 && (
            <View style={stats.tieneGastos ? styles.ingresoSeparador : undefined}>
              <View style={styles.monthlyBudgetRow}>
                <Text style={styles.monthlyBudgetLabel}>Ingresos esperados</Text>
                <Text style={styles.monthlyBudgetValue}>
                  {formatCurrency(stats.metaIngresoTotal)}
                </Text>
              </View>

              <View style={styles.bottomRow}>
                <View style={styles.bottomColumn}>
                  <Text style={styles.bottomLabel}>Recibido</Text>
                  <Text style={[styles.bottomValue, { color: '#059669' }]}>
                    {formatCurrency(stats.recibidoTotal)}
                  </Text>
                </View>
                <View style={styles.bottomColumn}>
                  <Text style={styles.bottomLabel}>
                    {stats.recibidoTotal >= stats.metaIngresoTotal ? 'De mas' : 'Te falta'}
                  </Text>
                  <Text style={[
                    styles.bottomValue,
                    { color: stats.recibidoTotal >= stats.metaIngresoTotal ? '#059669' : '#d97706' }
                  ]}>
                    {formatCurrency(Math.abs(stats.metaIngresoTotal - stats.recibidoTotal))}
                  </Text>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Descripción */}
        <View style={styles.descriptionContainer}>
          <Text style={styles.descriptionText}>
            Ponle un techo a tus gastos por categoría o fija una meta de lo que esperas cobrar, y sigue tu avance.
          </Text>
        </View>

        {budgets.filter(b => b.is_active).length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="wallet-outline" size={64} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>No hay presupuestos activos</Text>
            <Text style={styles.emptySubtitle}>
              Crea tu primer presupuesto para controlar tus gastos o para seguir lo que facturas
            </Text>
          </View>
        ) : (
          budgets
            .filter(budget => budget.is_active)
            .map((budget) => {
            const esIngresoB = budget.type === 'INCOME';
            const progress = calculateProgress(budget.spent, budget.amount, budget.type);
            // El semáforo de los de ingreso necesita saber cuánto período va
            // corrido: al principio del mes ir al 5% es normal, al final no.
            const progressColor = getProgressColor(
              progress,
              budget.type,
              esIngresoB ? porcentajeTiempo(budget.start_date, budget.end_date) : undefined
            );
            const esIngreso = budget.type === 'INCOME';
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
                      {/* "Previsto" y no "Meta"/"Objetivo": esas dos pertenecen a las
                          metas de ahorro, que son otro objeto. Ver el guard de
                          utils/presupuestoDeIngresos en el backend. */}
                      {esIngreso ? 'Previsto' : 'Límite'} {formatPeriod(budget.period)}
                    </Text>
                    {budget.category && (
                      <Text style={styles.budgetCategory}>
                        {budget.category.name}
                      </Text>
                    )}
                    {budget.shared && (
                      <Text style={[styles.sharedBadge, budget.shared.pausado && styles.sharedBadgePausa]}>
                        {budget.shared.pausado
                          ? '⏸ Compartido en pausa'
                          : budget.shared.miembros > 1
                            ? `👥 Compartido · ${budget.shared.miembros} personas`
                            : '👥 Invitación enviada'}
                      </Text>
                    )}
                    {!!budget.description && (
                      <Text style={styles.budgetDescription} numberOfLines={2}>
                        {budget.description}
                      </Text>
                    )}
                  </View>
                  <View style={styles.budgetActions}>
                    {(!!budget.shared || (puedeCompartir && !esIngreso)) && (
                      <TouchableOpacity
                        style={styles.shareButton}
                        onPress={(e) => {
                          e.stopPropagation();
                          setHojaCompartido({ budgetId: budget.id, nombre: budget.name, soyDueno: true, sinCompartir: !budget.shared });
                        }}
                        accessibilityLabel={budget.shared ? 'Ver compartido' : 'Compartir presupuesto'}
                      >
                        <Ionicons name={budget.shared ? 'people' : 'person-add-outline'} size={20} color="#2563EB" />
                      </TouchableOpacity>
                    )}
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
                        { width: `${anchoDeBarra(progress)}%`, backgroundColor: progressColor },
                      ]}
                    />
                  </View>
                  <Text
                    style={[
                      styles.progressText,
                      // Pasarse del techo se marca en rojo y en negrita: es el
                      // dato que la persona tiene que ver primero.
                      budget.type !== 'INCOME' && progress > 100 && styles.progressTextExcedido,
                    ]}
                  >
                    {progress.toFixed(1)}%
                  </Text>
                </View>

                <View style={styles.amountContainer}>
                  <View style={styles.amountRow}>
                    <Text style={styles.amountLabel}>{esIngreso ? 'Recibido:' : 'Gastado:'}</Text>
                    <Text style={[styles.amountValue, { color: progressColor }]}>
                      {formatAmount(budget.spent)}
                    </Text>
                  </View>
                  <View style={styles.amountRow}>
                    <Text style={styles.amountLabel}>{esIngreso ? 'Meta:' : 'Presupuesto:'}</Text>
                    <Text style={styles.amountValue}>
                      {formatAmount(budget.amount)}
                    </Text>
                  </View>
                  <View style={styles.amountRow}>
                    <Text style={styles.amountLabel}>
                      {esIngreso
                        ? (remaining > 0 ? 'Te falta:' : 'De más:')
                        : (remaining >= 0 ? 'Disponible:' : 'Excedido:')}
                    </Text>
                    <Text
                      style={[
                        styles.amountValue,
                        // En ingresos el signo se lee al revés: quedar corto es lo
                        // malo (rojo) y pasarse es lo bueno (verde).
                        { color: esIngreso
                            ? (remaining > 0 ? '#dc2626' : '#059669')
                            : (remaining >= 0 ? '#059669' : '#dc2626') },
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

        {conmigo.length > 0 && (
          <View style={styles.conmigoSection}>
            <Text style={styles.conmigoTitle}>Compartidos conmigo</Text>
            {conmigo.map((c) => {
              if (c.pausado || !c.budget) {
                return (
                  <View key={c.groupId} style={[styles.budgetCard, styles.conmigoPausado]}>
                    <Text style={styles.budgetName}>⏸ Compartido de {c.dueno}</Text>
                    <Text style={styles.conmigoPausadoTexto}>{c.mensaje}</Text>
                  </View>
                );
              }
              const b = c.budget;
              const progress = calculateProgress(b.spent, b.amount, 'EXPENSE');
              const color = getProgressColor(progress, 'EXPENSE');
              const restante = b.amount - b.spent;
              const m = (n: number) => montoEn(n, c.moneda, formatCurrency);
              return (
                <TouchableOpacity
                  key={c.groupId}
                  style={styles.budgetCard}
                  activeOpacity={0.7}
                  onPress={() => setHojaCompartido({ budgetId: b.id, nombre: b.name, soyDueno: false, sinCompartir: false })}
                >
                  <View style={styles.budgetHeader}>
                    <View style={styles.budgetInfo}>
                      <Text style={styles.budgetName}>{b.category?.icon || '💰'} {b.name}</Text>
                      <Text style={styles.budgetPeriod}>
                        De {c.dueno} · {c.miembros ?? 2} personas
                      </Text>
                      {b.category && <Text style={styles.budgetCategory}>{b.category.name}</Text>}
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
                  </View>
                  <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                      <View style={[styles.progressFill, { width: `${anchoDeBarra(progress)}%`, backgroundColor: color }]} />
                    </View>
                    <Text style={[styles.progressText, progress > 100 && styles.progressTextExcedido]}>
                      {progress.toFixed(1)}%
                    </Text>
                  </View>
                  <View style={styles.amountContainer}>
                    <View style={styles.amountRow}>
                      <Text style={styles.amountLabel}>Llevan:</Text>
                      <Text style={[styles.amountValue, { color }]}>{m(b.spent)}</Text>
                    </View>
                    <View style={styles.amountRow}>
                      <Text style={styles.amountLabel}>Presupuesto:</Text>
                      <Text style={styles.amountValue}>{m(b.amount)}</Text>
                    </View>
                    <View style={styles.amountRow}>
                      <Text style={styles.amountLabel}>{restante >= 0 ? 'Disponible:' : 'Excedido:'}</Text>
                      <Text style={[styles.amountValue, { color: restante >= 0 ? '#059669' : '#dc2626' }]}>
                        {m(Math.abs(restante))}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {(puedeCompartir || conmigo.length > 0) && (
          <TouchableOpacity style={styles.tengoCodigo} onPress={() => abrirInvitacion('')}>
            <Ionicons name="key-outline" size={18} color="#2563EB" />
            <Text style={styles.tengoCodigoTexto}>¿Te invitaron? Escribe tu código</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Presupuesto compartido: invitar, quiénes están, gastos, salir */}
      <PresupuestoCompartidoModal
        visible={!!hojaCompartido}
        budgetId={hojaCompartido?.budgetId ?? null}
        nombre={hojaCompartido?.nombre ?? ''}
        soyDueno={!!hojaCompartido?.soyDueno}
        sinCompartir={!!hojaCompartido?.sinCompartir}
        onClose={() => setHojaCompartido(null)}
        onCambio={refrescarCompartidos}
        onMejorarPlan={mejorarPlanDesdeCompartido}
      />

      <PorConfirmarModal
        visible={showPorConfirmar}
        gastos={porConfirmar}
        onClose={() => setShowPorConfirmar(false)}
        onCambio={refrescarCompartidos}
      />

      {/* Formulario de Presupuesto */}
      <BudgetForm
        visible={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingBudget(null);
        }}
        onSuccess={(message: string) => {
          loadBudgets();
          // Notificar al dashboard que hubo cambios
          onBudgetChange();
          setEditingBudget(null);

          // Cerrar el formulario al guardar (crear o actualizar) y volver a la
          // lista, igual que iOS. Antes se quedaba abierto y, al limpiar
          // editingBudget, reaparecía como "Nuevo Presupuesto" tras actualizar.
          setShowForm(false);
          setSuccessMessage(message);
          setShowSuccessModal(true);
        }}
        editBudget={editingBudget}
      />

      {/* Modal de confirmación de eliminación */}
      <CustomModal
        visible={showDeleteConfirmModal}
        type="warning"
        title="Eliminar Presupuesto"
        message={
          budgets.find(b => b.id === budgetToDelete?.id)?.shared
            ? `¿Eliminar "${budgetToDelete?.name}"? Está compartido: las demás personas dejarán de verlo.`
            : `¿Estás seguro de que quieres eliminar el presupuesto "${budgetToDelete?.name}"?`
        }
        buttonText="Eliminar"
        showSecondaryButton={true}
        secondaryButtonText="Cancelar"
        onSecondaryPress={() => {
          setShowDeleteConfirmModal(false);
          setBudgetToDelete(null);
        }}
        onClose={confirmDeleteBudget}
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

      {/* Upgrade Modal para límite de presupuestos */}
      <UpgradeModal
        visible={showUpgradeModal}
        onClose={() => {
          setShowUpgradeModal(false);
          // Refrescar suscripción después de cerrar
          fetchSubscription();
        }}
        limitType="budgets"
      />

      {/* Upgrade Modal para exportación CSV */}
      <UpgradeModal
        visible={exportUpgradeModal}
        onClose={() => setExportUpgradeModal(false)}
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

      {/* Modal de opciones de exportación */}
      <CustomModal
        visible={showExportOptions}
        type="info"
        title="Exportar Presupuestos"
        message=""
        onClose={() => setShowExportOptions(false)}
        hideDefaultButton={true}
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
              style={styles.exportCancelButton}
              onPress={() => setShowExportOptions(false)}
            >
              <Text style={styles.exportCancelText}>Cancelar</Text>
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
  budgetDescription: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 6,
    fontStyle: 'italic',
  },
  budgetCategory: {
    fontSize: 12,
    color: '#2563EB',
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
  shareButton: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#eff6ff',
  },
  sharedBadge: {
    fontSize: 12,
    color: '#1d4ed8',
    fontWeight: '600',
    marginTop: 6,
  },
  sharedBadgePausa: {
    color: '#b45309',
  },
  porConfirmarBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
  },
  porConfirmarTexto: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#92400e',
  },
  conmigoSection: {
    marginTop: 12,
  },
  conmigoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
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
  tengoCodigo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 18,
    marginBottom: 24,
  },
  tengoCodigoTexto: {
    color: '#2563EB',
    fontSize: 14,
    fontWeight: '600',
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
    // Necesario desde que el progreso de los presupuestos de INGRESO puede
    // pasar del 100% (facturar mas de la meta): sin esto, la barra interior se
    // dibuja fuera del carril y pisa el texto del porcentaje.
    overflow: 'hidden',
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
  progressTextExcedido: {
    color: '#dc2626',
    fontWeight: '700',
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
  ingresoSeparador: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
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
  // Estilos de exportación
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  exportHeaderButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    position: 'relative',
  },
  plusBadgeSmall: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#fbbf24',
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  plusBadgeSmallText: {
    color: '#1e293b',
    fontSize: 10,
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
    minWidth: 120,
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
  exportCancelButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginTop: 12,
    backgroundColor: '#e5e7eb',
    borderRadius: 12,
  },
  exportCancelText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '600',
  },
});