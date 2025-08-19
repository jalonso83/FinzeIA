import React, { useState, useEffect } from 'react';
import { Download, RefreshCw, Calendar, BarChart3, TrendingUp } from 'lucide-react';
import api from '../../utils/api';
import LineChart from '../charts/LineChart';

interface DateReportData {
  period: {
    startDate: string;
    endDate: string;
    granularity: string;
    transactionType: string;
  };
  metrics: {
    totalExpenses: number;
    totalIncome: number;
    balanceNet: number;
    totalTransactions: number;
    averageTicket: number;
    expensesGrowth: number;
    incomeGrowth: number;
    balanceGrowth: number;
    avgDailyAmount: number;
    volatility: number;
    burnRate: number;
    runway: number | null;
    activeDays: number;
    inactiveDays: number;
  };
  patterns: {
    mostActiveDay: {
      date: string;
      total: number;
      transactions: number;
    } | null;
    highestExpenseDay: {
      date: string;
      amount: number;
    } | null;
    highestIncomeDay: {
      date: string;
      amount: number;
    } | null;
    weekdayActivity: number[];
  };
  timeSeriesData: Array<{
    period: string;
    expenses: number;
    income: number;
    transactions: number;
    balance: number;
  }>;
  alerts: Array<{
    type: string;
    category: string;
    message: string;
    level: string;
  }>;
}

const DateReport: React.FC = () => {
  const [reportData, setReportData] = useState<DateReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState('lastMonth');
  const [granularity, setGranularity] = useState('weekly');
  const [transactionType, setTransactionType] = useState('both');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Auto-cargar datos cuando cambien los filtros (con debounce)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadReportData();
    }, 300); // Debounce de 300ms

    return () => clearTimeout(timeoutId);
  }, [dateRange, granularity, transactionType, customStartDate, customEndDate]);

  const getDateRange = () => {
    const now = new Date();
    let startDate, endDate;

    switch (dateRange) {
      case 'lastWeek':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        endDate = new Date();
        break;
      case 'lastMonth':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        break;
      case 'lastQuarter':
        const quarterStart = Math.floor(now.getMonth() / 3) * 3;
        startDate = new Date(now.getFullYear(), quarterStart - 3, 1);
        endDate = new Date(now.getFullYear(), quarterStart, 0, 23, 59, 59);
        break;
      case 'lastYear':
        startDate = new Date(now.getFullYear() - 1, 0, 1);
        endDate = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59);
        break;
      case 'custom':
        startDate = customStartDate ? new Date(customStartDate) : new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = customEndDate ? new Date(customEndDate + 'T23:59:59') : new Date();
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
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
        granularity,
        transactionType
      });

      console.log('DateReport loading with params:', params.toString());
      const response = await api.get(`/reports/dates?${params.toString()}`);
      console.log('DateReport response:', response.data);
      setReportData(response.data);
    } catch (error: any) {
      console.error('Error cargando reporte de fechas:', error);
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

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-DO', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getWeekdayName = (index: number) => {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return days[index];
  };

  const getTrendIcon = (value: number) => {
    if (value > 0) return <span className="text-green-600">📈</span>;
    if (value < 0) return <span className="text-red-600">📉</span>;
    return <span className="text-gray-600">➖</span>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-2 text-gray-600">Cargando análisis temporal...</span>
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
                <option value="lastWeek">Última Semana</option>
                <option value="lastMonth">Mes Actual</option>
                <option value="lastQuarter">Último Trimestre</option>
                <option value="lastYear">Último Año</option>
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

          {/* Filtros de Granularidad y Tipo */}
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-gray-500" />
              <select
                value={granularity}
                onChange={(e) => setGranularity(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="daily">Diario</option>
                <option value="weekly">Semanal</option>
                <option value="monthly">Mensual</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-gray-500" />
              <select
                value={transactionType}
                onChange={(e) => setTransactionType(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="both">Ambos</option>
                <option value="expenses">Solo Gastos</option>
                <option value="income">Solo Ingresos</option>
              </select>
            </div>
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

      {!reportData && !loading && !error && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay transacciones en este período</h3>
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
                  <p className="text-sm text-gray-600">Total Gastos</p>
                  <p className="text-xl font-bold text-red-600">
                    {formatCurrency(reportData.metrics.totalExpenses)}
                  </p>
                </div>
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                  <span className="text-red-600 text-sm">💸</span>
                </div>
              </div>
              <div className="flex items-center mt-2">
                {getTrendIcon(reportData.metrics.expensesGrowth)}
                <span className="text-sm text-gray-600 ml-1">
                  {formatPercent(reportData.metrics.expensesGrowth)}
                </span>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Ingresos</p>
                  <p className="text-xl font-bold text-green-600">
                    {formatCurrency(reportData.metrics.totalIncome)}
                  </p>
                </div>
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-green-600 text-sm">💰</span>
                </div>
              </div>
              <div className="flex items-center mt-2">
                {getTrendIcon(reportData.metrics.incomeGrowth)}
                <span className="text-sm text-gray-600 ml-1">
                  {formatPercent(reportData.metrics.incomeGrowth)}
                </span>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Balance Neto</p>
                  <p className={`text-xl font-bold ${reportData.metrics.balanceNet >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(reportData.metrics.balanceNet)}
                  </p>
                </div>
                <div className={`w-8 h-8 ${reportData.metrics.balanceNet >= 0 ? 'bg-green-100' : 'bg-red-100'} rounded-full flex items-center justify-center`}>
                  <span className={`${reportData.metrics.balanceNet >= 0 ? 'text-green-600' : 'text-red-600'} text-sm`}>
                    {reportData.metrics.balanceNet >= 0 ? '💎' : '⚠️'}
                  </span>
                </div>
              </div>
              <div className="flex items-center mt-2">
                {getTrendIcon(reportData.metrics.balanceGrowth)}
                <span className="text-sm text-gray-600 ml-1">
                  {formatPercent(reportData.metrics.balanceGrowth)}
                </span>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Transacciones</p>
                  <p className="text-xl font-bold text-blue-600">
                    {reportData.metrics.totalTransactions}
                  </p>
                </div>
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 text-sm">📝</span>
                </div>
              </div>
              <div className="text-xs text-gray-500 mt-2">
                {reportData.metrics.activeDays} días activos
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Ticket Promedio</p>
                  <p className="text-xl font-bold text-purple-600">
                    {formatCurrency(reportData.metrics.averageTicket)}
                  </p>
                </div>
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <span className="text-purple-600 text-sm">🎯</span>
                </div>
              </div>
              <div className="text-xs text-gray-500 mt-2">
                Promedio diario: {formatCurrency(reportData.metrics.avgDailyAmount)}
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

          {/* Gráfico Temporal */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">📈 Evolución Temporal</h3>
            {reportData.timeSeriesData.length > 0 ? (
              <LineChart 
                data={reportData.timeSeriesData.map(item => ({
                  month: item.period,
                  Gastos: item.expenses,
                  Ingresos: item.income,
                  Balance: item.balance
                }))} 
              />
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <div className="text-4xl mb-2">📈</div>
                  <p>No hay suficientes datos para generar el gráfico</p>
                </div>
              </div>
            )}
          </div>

          {/* Análisis Detallado */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Patrones y Tendencias */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">🔍 Patrones y Tendencias</h3>
              <div className="space-y-4">
                {reportData.patterns.mostActiveDay && (
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div>
                      <p className="font-medium text-blue-900">Día más activo</p>
                      <p className="text-sm text-blue-700">{formatDate(reportData.patterns.mostActiveDay.date)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-blue-900">{formatCurrency(reportData.patterns.mostActiveDay.total)}</p>
                      <p className="text-sm text-blue-700">{reportData.patterns.mostActiveDay.transactions} transacciones</p>
                    </div>
                  </div>
                )}

                {reportData.patterns.highestExpenseDay && (
                  <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <div>
                      <p className="font-medium text-red-900">Mayor gasto</p>
                      <p className="text-sm text-red-700">{formatDate(reportData.patterns.highestExpenseDay.date)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-red-900">{formatCurrency(reportData.patterns.highestExpenseDay.amount)}</p>
                    </div>
                  </div>
                )}

                {reportData.patterns.highestIncomeDay && (
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div>
                      <p className="font-medium text-green-900">Mayor ingreso</p>
                      <p className="text-sm text-green-700">{formatDate(reportData.patterns.highestIncomeDay.date)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-900">{formatCurrency(reportData.patterns.highestIncomeDay.amount)}</p>
                    </div>
                  </div>
                )}

                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="font-medium text-gray-900 mb-2">Estadísticas del período</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-600">Volatilidad: </span>
                      <span className="font-medium">{formatCurrency(reportData.metrics.volatility)}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Burn rate: </span>
                      <span className="font-medium">{formatCurrency(reportData.metrics.burnRate)}/día</span>
                    </div>
                    {reportData.metrics.runway && (
                      <div className="col-span-2">
                        <span className="text-gray-600">Runway: </span>
                        <span className="font-medium text-orange-600">{reportData.metrics.runway} días</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Heatmap de Actividad por Día */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">🔥 Actividad por Día de la Semana</h3>
              <div className="space-y-3">
                {reportData.patterns.weekdayActivity.map((amount, index) => {
                  const maxAmount = Math.max(...reportData.patterns.weekdayActivity);
                  const percentage = maxAmount > 0 ? (amount / maxAmount) * 100 : 0;
                  
                  return (
                    <div key={index} className="flex items-center gap-3">
                      <div className="w-16 text-sm text-gray-600 font-medium">
                        {getWeekdayName(index).slice(0, 3)}
                      </div>
                      <div className="flex-1 bg-gray-200 rounded-full h-6 relative">
                        <div 
                          className="bg-gradient-to-r from-blue-500 to-purple-600 h-6 rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-xs font-medium text-white">
                            {formatCurrency(amount)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DateReport;