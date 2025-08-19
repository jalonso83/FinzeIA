import React, { useState, useEffect } from 'react';
import { Download, Filter, RefreshCw, Calendar, Tag } from 'lucide-react';
import api from '../../utils/api';
import { useCategoriesStore } from '../../stores/categories';
import CategoryMultiSelect from '../ui/CategoryMultiSelect';
import PieChart from '../charts/PieChart';
import LineChart from '../charts/LineChart';

interface CategoryReportData {
  period: {
    startDate: string;
    endDate: string;
  };
  metrics: {
    totalExpenses: number;
    totalIncome: number;
    totalTransactions: number;
    averageTransactionAmount: number;
    maxTransaction: number;
    minTransaction: number;
    activeCategories: number;
  };
  categoryData: Array<{
    id: number;
    name: string;
    type: string;
    icon: string;
    total: number;
    count: number;
    average: number;
    percentage: number;
    maxAmount: number;
    minAmount: number;
  }>;
  top5Categories: Array<any>;
  chartData: Array<any>;
  alerts: Array<{
    type: string;
    category: string;
    message: string;
    level: string;
  }>;
}

const CategoryReport: React.FC = () => {
  const [reportData, setReportData] = useState<CategoryReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState('currentMonth');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  
  const { categories, fetchCategories } = useCategoriesStore();

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Auto-cargar datos cuando cambien los filtros o se carguen las categorías (con debounce)
  useEffect(() => {
    if (categories.length > 0) {
      const timeoutId = setTimeout(() => {
        loadReportData();
      }, 300); // Debounce de 300ms

      return () => clearTimeout(timeoutId);
    }
  }, [dateRange, selectedCategories, categories]);

  const getDateRange = () => {
    const now = new Date();
    let startDate, endDate;

    switch (dateRange) {
      case 'currentMonth':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        break;
      case 'lastMonth':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
        break;
      case 'last3Months':
        startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
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
        endDate: endDate.toISOString()
      });

      if (selectedCategories.length > 0) {
        params.append('categories', selectedCategories.join(','));
      }

      const response = await api.get(`/reports/categories?${params.toString()}`);
      console.log('CategoryReport response:', response.data);
      console.log('CategoryData for PieChart:', response.data.categoryData);
      console.log('ChartData for LineChart:', response.data.chartData);
      setReportData(response.data);
    } catch (error: any) {
      console.error('Error cargando reporte:', error);
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
    return `${percent.toFixed(1)}%`;
  };


  const handleExport = async (format: 'pdf' | 'excel') => {
    try {
      const { startDate, endDate } = getDateRange();
      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      });

      if (selectedCategories.length > 0) {
        params.append('categories', selectedCategories.join(','));
      }

      if (format === 'excel') {
        // Exportar a Excel usando CSV del backend
        params.append('format', 'csv');
        
        const response = await api.get(`/reports/categories/export?${params.toString()}`, {
          responseType: 'blob'
        });

        // Crear y descargar el archivo
        const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `reporte-categorias-${startDate.toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
      } else if (format === 'pdf') {
        // Para PDF, obtenemos los datos del backend y generamos PDF en el frontend
        params.append('format', 'json');
        
        const response = await api.get(`/reports/categories/export?${params.toString()}`);
        const exportData = response.data;
        
        // Generar PDF usando los datos
        await generatePDF(exportData);
      }
      
    } catch (error) {
      console.error('Error exportando:', error);
      // Mostrar notificación de error al usuario
      if (error instanceof Error) {
        console.error('Error específico:', error.message);
      }
    }
  };

  const generatePDF = async (data: any) => {
    // Crear una página HTML formateada para imprimir como PDF
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Reporte por Categorías - FinZen AI</title>
            <style>
              body { 
                font-family: Arial, sans-serif; 
                margin: 20px; 
                color: #333;
              }
              .header {
                text-align: center;
                margin-bottom: 30px;
                border-bottom: 2px solid #3B82F6;
                padding-bottom: 20px;
              }
              .header h1 {
                color: #3B82F6;
                margin: 0;
                font-size: 28px;
              }
              .period {
                color: #666;
                margin: 10px 0;
                font-size: 14px;
              }
              .summary {
                background: #F8FAFC;
                padding: 20px;
                border-radius: 8px;
                margin: 20px 0;
                border-left: 4px solid #3B82F6;
              }
              .summary h2 {
                color: #1E40AF;
                margin-top: 0;
                font-size: 18px;
              }
              .summary-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 15px;
                margin-top: 15px;
              }
              .summary-item {
                display: flex;
                justify-content: space-between;
                padding: 8px;
                background: white;
                border-radius: 4px;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                margin: 20px 0;
                font-size: 12px;
              }
              th {
                background: #3B82F6;
                color: white;
                padding: 12px 8px;
                text-align: left;
                font-weight: bold;
              }
              td {
                padding: 10px 8px;
                border-bottom: 1px solid #E5E7EB;
              }
              tr:nth-child(even) {
                background: #F9FAFB;
              }
              .expense { color: #DC2626; }
              .income { color: #059669; }
              .percentage {
                background: #EFF6FF;
                padding: 4px 8px;
                border-radius: 12px;
                color: #1D4ED8;
                font-weight: bold;
              }
              .footer {
                margin-top: 40px;
                text-align: center;
                color: #6B7280;
                font-size: 12px;
                border-top: 1px solid #E5E7EB;
                padding-top: 20px;
              }
              @media print {
                body { margin: 0; }
                .no-print { display: none; }
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>📊 Reporte por Categorías</h1>
              <div class="period">
                Período: ${data.metadata.dateRange.start} - ${data.metadata.dateRange.end}
              </div>
              <div class="period">
                Generado: ${new Date(data.metadata.generatedAt).toLocaleDateString('es-DO', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </div>

            <div class="summary">
              <h2>📈 Resumen Ejecutivo</h2>
              <div class="summary-grid">
                <div class="summary-item">
                  <span>💸 Total Gastos:</span>
                  <strong class="expense">${formatCurrency(data.summary.totalExpenses)}</strong>
                </div>
                <div class="summary-item">
                  <span>💰 Total Ingresos:</span>
                  <strong class="income">${formatCurrency(data.summary.totalIncome)}</strong>
                </div>
                <div class="summary-item">
                  <span>📝 Total Transacciones:</span>
                  <strong>${data.summary.totalTransactions}</strong>
                </div>
                <div class="summary-item">
                  <span>🏷️ Categorías Activas:</span>
                  <strong>${data.summary.activeCategories}</strong>
                </div>
              </div>
            </div>

            <h2>📊 Detalle por Categorías</h2>
            <table>
              <thead>
                <tr>
                  <th>🏷️ Categoría</th>
                  <th>📋 Tipo</th>
                  <th>💰 Total</th>
                  <th>📝 Trans.</th>
                  <th>📊 Promedio</th>
                  <th>⬆️ Máximo</th>
                  <th>⬇️ Mínimo</th>
                  <th>📈 %</th>
                </tr>
              </thead>
              <tbody>
                ${data.categoryData.map((cat: any, index: number) => `
                  <tr>
                    <td><strong>${cat.name}</strong></td>
                    <td class="${cat.type === 'EXPENSE' ? 'expense' : 'income'}">
                      ${cat.type === 'EXPENSE' ? '📤 Gasto' : '📥 Ingreso'}
                    </td>
                    <td><strong>${formatCurrency(cat.total)}</strong></td>
                    <td>${cat.count}</td>
                    <td>${formatCurrency(cat.average)}</td>
                    <td>${formatCurrency(cat.maxAmount)}</td>
                    <td>${formatCurrency(cat.minAmount)}</td>
                    <td><span class="percentage">${cat.percentage.toFixed(1)}%</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <div class="footer">
              <p>🤖 Generado automáticamente por <strong>FinZen AI</strong></p>
              <p>Este reporte contiene información confidencial de sus finanzas personales</p>
            </div>

            <script>
              // Auto-print cuando la página cargue
              window.onload = function() {
                setTimeout(function() {
                  window.print();
                }, 500);
              }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-2 text-gray-600">Cargando reporte...</span>
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
          {/* Filtros de Fecha */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-500" />
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="currentMonth">Este Mes</option>
                <option value="lastMonth">Mes Anterior</option>
                <option value="last3Months">Últimos 3 Meses</option>
                <option value="lastQuarter">Último Trimestre</option>
                <option value="lastYear">Año Anterior</option>
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

          {/* Filtro de Categorías */}
          <div className="flex items-center gap-2 flex-1 lg:flex-initial">
            <Tag className="w-5 h-5 text-gray-500" />
            <div className="min-w-80 w-full lg:w-80">
              <CategoryMultiSelect
                categories={categories}
                selectedCategories={selectedCategories}
                onSelectionChange={setSelectedCategories}
                placeholder="Todas las categorías"
              />
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="flex gap-2 items-center">
            {loading && (
              <div className="flex items-center gap-2 text-primary">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span className="text-sm">Actualizando...</span>
              </div>
            )}
            
            <div className="relative group">
              <button 
                disabled={loading || !reportData}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-4 h-4" />
                Exportar
              </button>
              {!loading && reportData && (
                <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                  <button
                    onClick={() => handleExport('pdf')}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-t-lg"
                  >
                    Exportar PDF
                  </button>
                  <button
                    onClick={() => handleExport('excel')}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-b-lg"
                  >
                    Exportar Excel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {!reportData && !loading && !error && categories.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Cargando categorías...</h3>
          <p className="text-gray-500">
            Preparando el análisis de tus gastos e ingresos organizados por categorías.
          </p>
        </div>
      )}

      {!reportData && !loading && !error && categories.length > 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay transacciones en este período</h3>
          <p className="text-gray-500">
            Ajusta los filtros de fecha o categorías para ver datos diferentes.
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
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Promedio</p>
                  <p className="text-xl font-bold text-blue-600">
                    {formatCurrency(reportData.metrics.averageTransactionAmount)}
                  </p>
                </div>
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 text-sm">📊</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Máximo</p>
                  <p className="text-xl font-bold text-orange-600">
                    {formatCurrency(reportData.metrics.maxTransaction)}
                  </p>
                </div>
                <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                  <span className="text-orange-600 text-sm">⬆️</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Mínimo</p>
                  <p className="text-xl font-bold text-green-600">
                    {formatCurrency(reportData.metrics.minTransaction)}
                  </p>
                </div>
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-green-600 text-sm">⬇️</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Categorías</p>
                  <p className="text-xl font-bold text-purple-600">
                    {reportData.metrics.activeCategories}
                  </p>
                </div>
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <span className="text-purple-600 text-sm">🏷️</span>
                </div>
              </div>
            </div>
          </div>

          {/* Alertas */}
          {reportData.alerts.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Alertas y Notificaciones</h3>
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
                    <p className="text-sm">{alert.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Distribución por Categorías</h3>
              <PieChart data={reportData.categoryData} />
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Tendencias Mensuales</h3>
              <LineChart data={reportData.chartData} />
            </div>
          </div>

          {/* Top 5 y Tabla Detallada */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top 5 Categorías */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Top 5 Categorías</h3>
              <div className="space-y-3">
                {reportData.top5Categories.map((category, index) => (
                  <div key={category.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                        index === 0 ? 'bg-yellow-500' : 
                        index === 1 ? 'bg-gray-400' :
                        index === 2 ? 'bg-orange-400' : 'bg-blue-500'
                      }`}>
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-medium text-gray-900">{category.name}</p>
                        <p className="text-sm text-gray-600">{category.count} transacciones</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">{formatCurrency(category.total)}</p>
                      <p className="text-sm text-gray-600">{formatPercent(category.percentage)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tabla Detallada */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Análisis Detallado</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 font-medium text-gray-600">Categoría</th>
                      <th className="text-right py-2 font-medium text-gray-600">Total</th>
                      <th className="text-right py-2 font-medium text-gray-600">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.categoryData.slice(0, 10).map((category) => (
                      <tr key={category.id} className="border-b border-gray-100">
                        <td className="py-2">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{category.icon}</span>
                            <span className="font-medium">{category.name}</span>
                          </div>
                        </td>
                        <td className="text-right py-2 font-medium">
                          {formatCurrency(category.total)}
                        </td>
                        <td className="text-right py-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            category.percentage > 20 ? 'bg-red-100 text-red-800' :
                            category.percentage > 10 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {formatPercent(category.percentage)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CategoryReport;