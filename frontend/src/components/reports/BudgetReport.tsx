import React, { useState, useEffect } from 'react';
import { RefreshCw, Calendar, Filter, Target, TrendingUp, AlertTriangle } from 'lucide-react';
import api from '../../utils/api';
import LineChart from '../charts/LineChart';

interface BudgetReportData {
  period: {
    startDate: string;
    endDate: string;
    activeOnly: boolean;
  };
  metrics: {
    totalBudgetsActive: number;
    totalBudgets: number;
    totalBudgeted: number;
    totalSpent: number;
    totalRemaining: number;
    complianceRate: number;
    avgEfficiency: number;
    budgetsExceeded: number;
    budgetsAtRisk: number;
  };
  budgetStats: Array<{
    id: string;
    name: string;
    category: {
      id: string;
      name: string;
      icon: string;
      type: string;
    };
    period: string;
    budgetAmount: number;
    totalSpent: number;
    remaining: number;
    percentageUsed: number;
    isExceeded: boolean;
    status: string;
    totalDays: number;
    elapsedDays: number;
    remainingDays: number;
    plannedDailySpend: number;
    actualDailySpend: number;
    spendVelocity: number;
    projectedTotal: number;
    projectedExcess: number;
    alertPercentage: number;
    isActive: boolean;
    startDate: string;
    endDate: string;
    transactionCount: number;
  }>;
  insights: {
    bestBudget: {
      name: string;
      category: string;
      efficiency: number;
    } | null;
    worstBudget: {
      name: string;
      category: string;
      overrun: number;
    } | null;
    totalSavingOpportunity: number;
    avgSpendVelocity: number;
  };
  complianceTrend: Array<{
    month: string;
    complianceRate: number;
    totalBudgets: number;
  }>;
  alerts: Array<{
    type: string;
    category: string;
    message: string;
    level: string;
  }>;
}

const BudgetReport: React.FC = () => {
  const [reportData, setReportData] = useState<BudgetReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState('currentMonth');
  const [activeOnly, setActiveOnly] = useState(true);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Auto-cargar datos cuando cambien los filtros (con debounce)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadReportData();
    }, 300); // Debounce de 300ms

    return () => clearTimeout(timeoutId);
  }, [dateRange, activeOnly, customStartDate, customEndDate]);

  const getDateRange = () => {
    const now = new Date();
    let startDate, endDate;

    switch (dateRange) {
      case 'currentMonth':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        break;
      case 'lastQuarter':
        const quarterStart = Math.floor(now.getMonth() / 3) * 3;
        startDate = new Date(now.getFullYear(), quarterStart - 3, 1);
        endDate = new Date(now.getFullYear(), quarterStart, 0, 23, 59, 59);
        break;
      case 'currentYear':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
        break;
      case 'custom':
        startDate = customStartDate ? new Date(customStartDate) : new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = customEndDate ? new Date(customEndDate + 'T23:59:59') : new Date();
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    }

    return { startDate, endDate };
  };

  const loadReportData = async () => {
    try {
      setLoading(true);
      setError(null);
      const { startDate, endDate } = getDateRange();
      
      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        activeOnly: activeOnly.toString()
      });

      console.log('BudgetReport loading with params:', params.toString());
      const response = await api.get(`/reports/budgets?${params.toString()}`);
      console.log('BudgetReport response:', response.data);
      setReportData(response.data);
    } catch (error: any) {
      console.error('Error cargando reporte de presupuestos:', error);
      setError(error?.response?.data?.message || error?.message || 'Error al cargar el reporte');
      setReportData(null);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: 'DOP'
    }).format(amount);
  };

  const formatPercent = (percent: number) => {
    const sign = percent > 0 ? '+' : '';
    return `${sign}${percent.toFixed(1)}%`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'on_track': return 'bg-green-100 text-green-800 border-green-200';
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'critical': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'exceeded': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'on_track': return '✅';
      case 'warning': return '⚠️';
      case 'critical': return '🚨';
      case 'exceeded': return '❌';
      default: return '📊';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'on_track': return 'En Control';
      case 'warning': return 'Advertencia';
      case 'critical': return 'Crítico';
      case 'exceeded': return 'Excedido';
      default: return 'Desconocido';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-2 text-gray-600">Cargando análisis de presupuestos...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error al cargar el reporte</h3>
            <p className="mt-1 text-sm text-red-700">{error}</p>
            <div className="mt-4">
              <button
                onClick={loadReportData}
                className="bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded text-sm font-medium"
              >
                Intentar de nuevo
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con Filtros */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Filtros de Período */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-500" />
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="currentMonth">Mes Actual</option>
                <option value="lastQuarter">Último Trimestre</option>
                <option value="currentYear">Año Actual</option>
                <option value="custom">Personalizado</option>
              </select>
            </div>

            {dateRange === 'custom' && (
              <div className="flex gap-2">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            )}
          </div>

          {/* Filtro de Solo Activos */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-500" />
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={activeOnly}
                  onChange={(e) => setActiveOnly(e.target.checked)}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                Solo presupuestos activos
              </label>
            </div>

            {/* Indicador de carga */}
            {loading && (
              <div className="flex items-center gap-2 text-primary">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span className="text-sm">Actualizando...</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {!reportData && !loading && !error && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay presupuestos en este período</h3>
          <p className="text-gray-500">
            Ajusta los filtros de fecha para ver datos diferentes.
          </p>
        </div>
      )}

      {reportData && (
        <>
          {/* Métricas Principales */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Cumplimiento</p>
                  <p className="text-xl font-bold text-green-600">
                    {formatPercent(reportData.metrics.complianceRate)}
                  </p>
                </div>
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-green-600 text-sm">🎯</span>
                </div>
              </div>
              <div className="text-xs text-gray-500 mt-2">
                {reportData.metrics.totalBudgetsActive} activos de {reportData.metrics.totalBudgets}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Presupuestado</p>
                  <p className="text-xl font-bold text-blue-600">
                    {formatCurrency(reportData.metrics.totalBudgeted)}
                  </p>
                </div>
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 text-sm">💰</span>
                </div>
              </div>
              <div className="text-xs text-gray-500 mt-2">
                Límite total establecido
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Gastado</p>
                  <p className="text-xl font-bold text-orange-600">
                    {formatCurrency(reportData.metrics.totalSpent)}
                  </p>
                </div>
                <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                  <span className="text-orange-600 text-sm">💸</span>
                </div>
              </div>
              <div className="text-xs text-gray-500 mt-2">
                {((reportData.metrics.totalSpent / reportData.metrics.totalBudgeted) * 100).toFixed(1)}% del presupuesto
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Ahorro Disponible</p>
                  <p className="text-xl font-bold text-green-600">
                    {formatCurrency(reportData.metrics.totalRemaining)}
                  </p>
                </div>
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-green-600 text-sm">💎</span>
                </div>
              </div>
              <div className="text-xs text-gray-500 mt-2">
                Potencial de ahorro: {formatCurrency(reportData.insights.totalSavingOpportunity)}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Eficiencia Promedio</p>
                  <p className="text-xl font-bold text-purple-600">
                    {formatPercent(reportData.metrics.avgEfficiency)}
                  </p>
                </div>
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <span className="text-purple-600 text-sm">📊</span>
                </div>
              </div>
              <div className="text-xs text-gray-500 mt-2">
                {reportData.metrics.budgetsAtRisk} en riesgo, {reportData.metrics.budgetsExceeded} excedidos
              </div>
            </div>
          </div>

          {/* Alertas */}
          {reportData.alerts.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">🚨 Alertas y Observaciones</h3>
              <div className="space-y-3">
                {reportData.alerts.map((alert, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border-l-4 ${
                      alert.level === 'warning' 
                        ? 'bg-yellow-50 border-yellow-400 text-yellow-800'
                        : 'bg-blue-50 border-blue-400 text-blue-800'
                    }`}
                  >
                    <p className="text-sm font-medium">{alert.category}</p>
                    <p className="text-sm">{alert.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Análisis por Presupuesto */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">📋 Análisis por Presupuesto</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Presupuesto
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Progreso
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Gastado / Límite
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Días Restantes
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Velocidad
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reportData.budgetStats.map((budget) => (
                    <tr key={budget.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className="text-2xl mr-2">{budget.category.icon}</span>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{budget.name}</div>
                            <div className="text-sm text-gray-500">{budget.category.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div 
                            className={`h-3 rounded-full transition-all duration-500 ${
                              budget.isExceeded 
                                ? 'bg-red-600' 
                                : budget.percentageUsed > 75 
                                  ? 'bg-yellow-500' 
                                  : 'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(100, budget.percentageUsed)}%` }}
                          />
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          {budget.percentageUsed.toFixed(1)}%
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div>{formatCurrency(budget.totalSpent)}</div>
                        <div className="text-gray-500">de {formatCurrency(budget.budgetAmount)}</div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div>{budget.remainingDays} días</div>
                        <div className="text-gray-500">{budget.transactionCount} transacciones</div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className={`${budget.spendVelocity > 120 ? 'text-red-600' : budget.spendVelocity > 100 ? 'text-yellow-600' : 'text-green-600'}`}>
                          {formatPercent(budget.spendVelocity - 100)}
                        </div>
                        <div className="text-gray-500">{formatCurrency(budget.actualDailySpend)}/día</div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(budget.status)}`}>
                          {getStatusIcon(budget.status)} {getStatusText(budget.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Análisis Temporal */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">📈 Evolución del Cumplimiento</h3>
            {reportData.complianceTrend.length > 0 ? (
              <LineChart 
                data={reportData.complianceTrend.map(item => ({
                  month: item.month,
                  Cumplimiento: item.complianceRate,
                  Presupuestos: item.totalBudgets
                }))} 
              />
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <div className="text-4xl mb-2">📈</div>
                  <p>No hay suficiente historial para mostrar tendencias</p>
                </div>
              </div>
            )}
          </div>

          {/* Métricas Avanzadas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Rendimiento */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">🏆 Análisis de Rendimiento</h3>
              <div className="space-y-4">
                {reportData.insights.bestBudget && (
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div>
                      <p className="font-medium text-green-900">Mejor Control</p>
                      <p className="text-sm text-green-700">{reportData.insights.bestBudget.name}</p>
                      <p className="text-xs text-green-600">{reportData.insights.bestBudget.category}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-900">{formatPercent(reportData.insights.bestBudget.efficiency)}</p>
                      <p className="text-sm text-green-700">Eficiencia</p>
                    </div>
                  </div>
                )}

                {reportData.insights.worstBudget && (
                  <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <div>
                      <p className="font-medium text-red-900">Mayor Sobregasto</p>
                      <p className="text-sm text-red-700">{reportData.insights.worstBudget.name}</p>
                      <p className="text-xs text-red-600">{reportData.insights.worstBudget.category}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-red-900">{formatPercent(reportData.insights.worstBudget.overrun)}</p>
                      <p className="text-sm text-red-700">Del límite</p>
                    </div>
                  </div>
                )}

                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="font-medium text-gray-900 mb-2">Estadísticas Generales</p>
                  <div className="grid grid-cols-1 gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Velocidad promedio:</span>
                      <span className="font-medium">{formatPercent(reportData.insights.avgSpendVelocity - 100)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Oportunidad de ahorro:</span>
                      <span className="font-medium text-green-600">{formatCurrency(reportData.insights.totalSavingOpportunity)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Proyecciones */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">🔮 Proyecciones de Fin de Período</h3>
              <div className="space-y-3">
                {reportData.budgetStats.filter(b => b.projectedExcess > 0).slice(0, 5).map((budget) => (
                  <div key={budget.id} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                    <div>
                      <p className="font-medium text-orange-900">{budget.name}</p>
                      <p className="text-sm text-orange-700">Proyección: {formatCurrency(budget.projectedTotal)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-orange-900">+{formatCurrency(budget.projectedExcess)}</p>
                      <p className="text-sm text-orange-700">Exceso estimado</p>
                    </div>
                  </div>
                ))}

                {reportData.budgetStats.filter(b => b.projectedExcess > 0).length === 0 && (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-2">🎉</div>
                    <p className="text-gray-600">¡Todas las proyecciones están dentro del presupuesto!</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default BudgetReport;