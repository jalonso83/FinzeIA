import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useCurrency } from '../hooks/useCurrency';
import { useSubscriptionStore } from '../stores/subscriptionStore';
import { getLogoBase64 } from '../services/exportService';
import api from '../utils/api';
import { logger } from '../utils/logger';

// Color de marca FinZen AI (azul marino del logo) - mismo que exportService
const BRAND_COLOR = '#2B4C7E';
const BRAND_GREEN = '#6B9E78';

interface WeeklyReport {
  id: string;
  weekStart: string;
  weekEnd: string;
  totalIncome: number;
  totalExpenses: number;
  savingsRate: number;
  financialScore: number;
  topCategories: Array<{
    category: string;
    icon: string;
    amount: number;
    percentage: number;
  }>;
  budgetsStatus: Array<{
    name: string;
    spent: number;
    limit: number;
    percentage: number;
    isExceeded: boolean;
  }>;
  goalsProgress: Array<{
    name: string;
    current: number;
    target: number;
    percentage: number;
    deadline: string | null;
  }>;
  antExpenses: {
    total: number;
    percentage: number;
    topItems: Array<{ category: string; amount: number; count: number }>;
  };
  predictions: {
    endOfMonthSavings: number;
    budgetWarnings: string[];
    savingsProjection: number;
  };
  aiAnalysis: string;
  recommendations: string[];
  vsLastWeek: {
    incomeChange: number;
    expensesChange: number;
    scoreChange: number;
    savingsRateChange: number;
  } | null;
  viewedAt: string | null;
  isNew: boolean;
  createdAt: string;
}

interface WeeklyReportsScreenProps {
  onClose: () => void;
  onOpenPlans?: () => void;
}

export default function WeeklyReportsScreen({ onClose, onOpenPlans }: WeeklyReportsScreenProps) {
  const [reports, setReports] = useState<WeeklyReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<WeeklyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [downloadingPDF, setDownloadingPDF] = useState<string | null>(null);
  const { formatCurrency } = useCurrency();
  const { subscription } = useSubscriptionStore();

  const isPro = subscription?.plan === 'PRO';

  const fetchReports = useCallback(async () => {
    try {
      const response = await api.get('/weekly-reports/history');
      if (response.data.success) {
        setReports(response.data.reports);
      }
    } catch (error: any) {
      logger.error('Error fetching weekly reports:', error);
      if (error.response?.status === 403) {
        // No es PRO
      } else {
        Alert.alert('Error', 'No se pudieron cargar los reportes');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (isPro) {
      fetchReports();
    } else {
      // Si no es PRO, cerrar y abrir modal de planes directamente
      // Usar setTimeout para evitar problemas con modales anidados en iOS
      onClose();
      setTimeout(() => {
        onOpenPlans?.();
      }, 300);
    }
  }, [isPro, fetchReports, onClose, onOpenPlans]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchReports();
  };

  const handleViewReport = async (report: WeeklyReport) => {
    try {
      const response = await api.get(`/weekly-reports/${report.id}`);
      if (response.data.success) {
        setSelectedReport(response.data.report);
      }
    } catch (error) {
      logger.error('Error loading report:', error);
      Alert.alert('Error', 'No se pudo cargar el reporte');
    }
  };

  const handleDownloadPDF = async (report: WeeklyReport) => {
    try {
      setDownloadingPDF(report.id);

      // Cargar logo
      const logoBase64 = await getLogoBase64();

      // Generar HTML para el PDF
      const html = generatePDFHTML(report, logoBase64);

      // Generar PDF con expo-print
      const { uri } = await Print.printToFileAsync({ html });

      // Compartir para guardar
      const sharingAvailable = await Sharing.isAvailableAsync();
      if (sharingAvailable) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Guardar Reporte Quincenal',
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('Error', 'No es posible compartir archivos en este dispositivo');
      }

    } catch (error) {
      logger.error('Error generating PDF:', error);
      Alert.alert('Error', 'No se pudo generar el PDF');
    } finally {
      setDownloadingPDF(null);
    }
  };

  // Genera el HTML para el PDF del reporte (mismo estilo que exportService)
  const generatePDFHTML = (report: WeeklyReport, logoBase64: string): string => {
    const weekStart = new Date(report.weekStart).toLocaleDateString('es-DO', {
      day: 'numeric', month: 'long', year: 'numeric'
    });
    const weekEnd = new Date(report.weekEnd).toLocaleDateString('es-DO', {
      day: 'numeric', month: 'long', year: 'numeric'
    });

    const getScoreColor = (score: number) => {
      if (score >= 80) return '#10B981';
      if (score >= 60) return '#F59E0B';
      return '#EF4444';
    };

    // Logo: imagen si existe, sino texto estilizado (igual que exportService)
    const logoHTML = logoBase64
      ? `<img src="${logoBase64}" style="width: 120px; height: auto; margin-bottom: 10px;" alt="FinZen AI" />`
      : `<div class="logo-text"><span class="logo-fin">Fin</span><span class="logo-zen">Zen</span><span class="logo-ai">AI</span></div>`;

    const categoriesHTML = report.topCategories.map((cat, i) => `
      <tr>
        <td>${i + 1}. ${cat.icon} ${cat.category}</td>
        <td style="text-align: right;">${formatCurrency(cat.amount)}</td>
        <td style="text-align: right;">${cat.percentage}%</td>
      </tr>
    `).join('');

    const budgetsHTML = report.budgetsStatus.length > 0 ? `
      <div class="section-break">
      <h3 style="color: ${BRAND_COLOR};">Estado de Presupuestos</h3>
      <table>
        <tr style="background-color: ${BRAND_COLOR}; color: white;">
          <th>Presupuesto</th>
          <th style="text-align: right;">Gastado</th>
          <th style="text-align: right;">Limite</th>
          <th style="text-align: right;">%</th>
        </tr>
        ${report.budgetsStatus.map(b => `
          <tr>
            <td>${b.name}</td>
            <td style="text-align: right;">${formatCurrency(b.spent)}</td>
            <td style="text-align: right;">${formatCurrency(b.limit)}</td>
            <td style="text-align: right; color: ${b.isExceeded ? '#EF4444' : b.percentage >= 80 ? '#F59E0B' : '#10B981'};">${b.percentage}%</td>
          </tr>
        `).join('')}
      </table>
      </div>
    ` : '';

    const goalsHTML = report.goalsProgress.length > 0 ? `
      <div class="section-break">
      <h3 style="color: ${BRAND_COLOR};">Progreso de Metas</h3>
      <table>
        <tr style="background-color: ${BRAND_COLOR}; color: white;">
          <th>Meta</th>
          <th style="text-align: right;">Actual</th>
          <th style="text-align: right;">Objetivo</th>
          <th style="text-align: right;">%</th>
        </tr>
        ${report.goalsProgress.map(g => `
          <tr>
            <td>${g.name}</td>
            <td style="text-align: right;">${formatCurrency(g.current)}</td>
            <td style="text-align: right;">${formatCurrency(g.target)}</td>
            <td style="text-align: right;">${g.percentage}%</td>
          </tr>
        `).join('')}
      </table>
      </div>
    ` : '';

    const recommendationsHTML = report.recommendations.length > 0 ? `
      <div class="section-break">
      <h3 style="color: ${BRAND_COLOR};">Recomendaciones</h3>
      <ol style="padding-left: 20px;">
        ${report.recommendations.map(r => `<li style="margin-bottom: 8px;">${r}</li>`).join('')}
      </ol>
      </div>
    ` : '';

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            @page {
              margin: 40px 40px 40px 40px;
            }
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              padding: 0;
              color: #1e293b;
              font-size: 12px;
              line-height: 1.5;
            }
            /* Evitar cortes de página dentro de elementos */
            table, .summary-grid, .analysis, .summary-box {
              page-break-inside: avoid;
            }
            /* Evitar que los títulos queden solos al final de página */
            h3 {
              page-break-after: avoid;
            }
            /* Asegurar espacio antes de secciones que podrían estar en nueva página */
            .section-break {
              page-break-before: auto;
              margin-top: 24px;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              padding-bottom: 20px;
              border-bottom: 2px solid ${BRAND_COLOR};
            }
            .logo-text {
              font-size: 28px;
              font-weight: bold;
              margin-bottom: 8px;
              font-family: 'Georgia', serif;
            }
            .logo-fin { color: ${BRAND_COLOR}; }
            .logo-zen { color: ${BRAND_GREEN}; font-style: italic; }
            .logo-ai { color: ${BRAND_COLOR}; font-size: 20px; margin-left: 4px; }
            .title { font-size: 18px; font-weight: 600; color: #1e293b; margin-top: 8px; }
            .period { font-size: 12px; color: #64748b; margin-top: 5px; }
            .date { font-size: 10px; color: #94a3b8; margin-top: 10px; }
            .summary-grid {
              display: flex;
              justify-content: space-between;
              margin: 20px 0;
            }
            .summary-box {
              flex: 1;
              text-align: center;
              padding: 16px;
              background-color: #f8fafc;
              border-radius: 8px;
              margin: 0 8px;
            }
            .summary-box:first-child { margin-left: 0; }
            .summary-box:last-child { margin-right: 0; }
            .summary-label { font-size: 11px; color: #64748b; }
            .summary-value { font-size: 20px; font-weight: bold; margin-top: 4px; }
            .income { color: #10B981; }
            .expense { color: #EF4444; }
            h3 { font-size: 14px; margin-bottom: 12px; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; }
            th {
              background-color: ${BRAND_COLOR};
              color: white;
              padding: 10px 8px;
              text-align: left;
              font-weight: 600;
              font-size: 11px;
            }
            td { padding: 8px; border-bottom: 1px solid #e2e8f0; font-size: 11px; }
            tr:nth-child(even) { background-color: #f8fafc; }
            .analysis {
              background-color: #f0fdf4;
              padding: 16px;
              border-radius: 8px;
              margin: 20px 0;
              border-left: 4px solid ${BRAND_GREEN};
            }
            .analysis-title {
              color: ${BRAND_COLOR};
              font-weight: 600;
              margin-bottom: 8px;
              font-size: 14px;
            }
            .footer {
              text-align: center;
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #e2e8f0;
              font-size: 10px;
              color: #94a3b8;
            }
          </style>
        </head>
        <body>
          <div class="header">
            ${logoHTML}
            <div class="title">Reporte Quincenal</div>
            <div class="period">${weekStart} - ${weekEnd}</div>
            <div class="date">Generado el ${new Date().toLocaleDateString('es-DO', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
          </div>

          <div class="summary-grid">
            <div class="summary-box">
              <div class="summary-label">Ingresos</div>
              <div class="summary-value income">${formatCurrency(report.totalIncome)}</div>
            </div>
            <div class="summary-box">
              <div class="summary-label">Gastos</div>
              <div class="summary-value expense">${formatCurrency(report.totalExpenses)}</div>
            </div>
            <div class="summary-box">
              <div class="summary-label">Score Financiero</div>
              <div class="summary-value" style="color: ${getScoreColor(report.financialScore)};">${report.financialScore}/100</div>
            </div>
          </div>

          <p style="text-align: center; color: #64748b; margin-bottom: 20px;">Tasa de ahorro: <strong>${report.savingsRate}%</strong></p>

          <div class="analysis">
            <div class="analysis-title">Analisis de Zenio</div>
            <p>${report.aiAnalysis}</p>
          </div>

          <h3 style="color: ${BRAND_COLOR};">Top Categorias de Gasto</h3>
          <table>
            <tr>
              <th>Categoria</th>
              <th style="text-align: right;">Monto</th>
              <th style="text-align: right;">%</th>
            </tr>
            ${categoriesHTML}
          </table>

          ${budgetsHTML}
          ${goalsHTML}
          ${recommendationsHTML}

          <div class="footer">
            Generado por FinZen AI
          </div>
        </body>
      </html>
    `;
  };

  const handleShareReport = async (report: WeeklyReport) => {
    const weekStart = new Date(report.weekStart).toLocaleDateString('es-DO', {
      day: 'numeric',
      month: 'short',
    });
    const weekEnd = new Date(report.weekEnd).toLocaleDateString('es-DO', {
      day: 'numeric',
      month: 'short',
    });

    try {
      await Share.share({
        message: `Mi reporte quincenal de FinZen AI (${weekStart} - ${weekEnd}):\n\nScore: ${report.financialScore}/100\nTasa de ahorro: ${report.savingsRate}%\nIngresos: ${formatCurrency(report.totalIncome)}\nGastos: ${formatCurrency(report.totalExpenses)}\n\nDescarga FinZen AI para gestionar tus finanzas.`,
      });
    } catch (error) {
      logger.error('Error sharing:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-DO', {
      day: 'numeric',
      month: 'short',
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#10B981';
    if (score >= 60) return '#F59E0B';
    return '#EF4444';
  };

  const getScoreEmoji = (score: number) => {
    if (score >= 80) return '🌟';
    if (score >= 60) return '📊';
    return '💡';
  };

  // Not PRO - se redirige automáticamente al modal de planes en el useEffect
  if (!isPro) {
    return null;
  }

  // Report detail view
  if (selectedReport) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setSelectedReport(null)} style={styles.closeButton}>
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.title}>
            {formatDate(selectedReport.weekStart)} - {formatDate(selectedReport.weekEnd)}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.reportDetail} showsVerticalScrollIndicator={false}>
          {/* Score Card */}
          <View style={styles.scoreCard}>
            <Text style={styles.scoreEmoji}>{getScoreEmoji(selectedReport.financialScore)}</Text>
            <Text style={[styles.scoreValue, { color: getScoreColor(selectedReport.financialScore) }]}>
              {selectedReport.financialScore}
            </Text>
            <Text style={styles.scoreLabel}>Score Financiero</Text>
            {selectedReport.vsLastWeek && (
              <View style={styles.vsLastWeek}>
                <Ionicons
                  name={selectedReport.vsLastWeek.scoreChange >= 0 ? 'trending-up' : 'trending-down'}
                  size={16}
                  color={selectedReport.vsLastWeek.scoreChange >= 0 ? '#10B981' : '#EF4444'}
                />
                <Text style={[
                  styles.vsLastWeekText,
                  { color: selectedReport.vsLastWeek.scoreChange >= 0 ? '#10B981' : '#EF4444' }
                ]}>
                  {selectedReport.vsLastWeek.scoreChange >= 0 ? '+' : ''}
                  {selectedReport.vsLastWeek.scoreChange} vs quincena anterior
                </Text>
              </View>
            )}
          </View>

          {/* Summary Cards */}
          <View style={styles.summaryRow}>
            <View style={[styles.summaryCard, { backgroundColor: '#ECFDF5' }]}>
              <Ionicons name="trending-up" size={24} color="#10B981" />
              <Text style={styles.summaryLabel}>Ingresos</Text>
              <Text style={[styles.summaryValue, { color: '#10B981' }]}>
                {formatCurrency(selectedReport.totalIncome)}
              </Text>
              {selectedReport.vsLastWeek && (
                <Text style={styles.summaryChange}>
                  {selectedReport.vsLastWeek.incomeChange >= 0 ? '+' : ''}
                  {selectedReport.vsLastWeek.incomeChange}%
                </Text>
              )}
            </View>
            <View style={[styles.summaryCard, { backgroundColor: '#FEF2F2' }]}>
              <Ionicons name="trending-down" size={24} color="#EF4444" />
              <Text style={styles.summaryLabel}>Gastos</Text>
              <Text style={[styles.summaryValue, { color: '#EF4444' }]}>
                {formatCurrency(selectedReport.totalExpenses)}
              </Text>
              {selectedReport.vsLastWeek && (
                <Text style={styles.summaryChange}>
                  {selectedReport.vsLastWeek.expensesChange >= 0 ? '+' : ''}
                  {selectedReport.vsLastWeek.expensesChange}%
                </Text>
              )}
            </View>
          </View>

          {/* Savings Rate */}
          <View style={styles.savingsCard}>
            <Text style={styles.savingsLabel}>Tasa de Ahorro</Text>
            <Text style={styles.savingsValue}>{selectedReport.savingsRate}%</Text>
          </View>

          {/* AI Analysis */}
          <View style={styles.analysisCard}>
            <View style={styles.analysisHeader}>
              <Ionicons name="sparkles" size={24} color="#2B4C7E" />
              <Text style={styles.analysisTitle}>Analisis de Zenio</Text>
            </View>
            <Text style={styles.analysisText}>{selectedReport.aiAnalysis}</Text>
          </View>

          {/* Recommendations */}
          {selectedReport.recommendations.length > 0 && (
            <View style={styles.recommendationsCard}>
              <Text style={styles.sectionTitle}>Recomendaciones</Text>
              {selectedReport.recommendations.map((rec, index) => (
                <View key={index} style={styles.recommendationItem}>
                  <View style={styles.recommendationNumber}>
                    <Text style={styles.recommendationNumberText}>{index + 1}</Text>
                  </View>
                  <Text style={styles.recommendationText}>{rec}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Top Categories */}
          {selectedReport.topCategories.length > 0 && (
            <View style={styles.categoriesCard}>
              <Text style={styles.sectionTitle}>Top Categorias de Gasto</Text>
              {selectedReport.topCategories.map((cat, index) => (
                <View key={index} style={styles.categoryItem}>
                  <Text style={styles.categoryIcon}>{cat.icon}</Text>
                  <View style={styles.categoryInfo}>
                    <Text style={styles.categoryName}>{cat.category}</Text>
                    <View style={styles.categoryProgress}>
                      <View
                        style={[
                          styles.categoryProgressFill,
                          { width: `${cat.percentage}%` },
                        ]}
                      />
                    </View>
                  </View>
                  <View style={styles.categoryValues}>
                    <Text style={styles.categoryAmount}>
                      {formatCurrency(cat.amount)}
                    </Text>
                    <Text style={styles.categoryPercentage}>{cat.percentage}%</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Ant Expenses */}
          {selectedReport.antExpenses.total > 0 && (
            <View style={styles.antExpensesCard}>
              <Text style={styles.sectionTitle}>Gastos Hormiga</Text>
              <View style={styles.antExpensesSummary}>
                <Text style={styles.antExpensesTotal}>
                  {formatCurrency(selectedReport.antExpenses.total)}
                </Text>
                <Text style={styles.antExpensesPercentage}>
                  {selectedReport.antExpenses.percentage}% del total
                </Text>
              </View>
              {/* Lista de categorías de gastos hormiga */}
              {selectedReport.antExpenses.topItems && selectedReport.antExpenses.topItems.length > 0 && (
                <View style={styles.antExpensesItems}>
                  {selectedReport.antExpenses.topItems.map((item, index) => (
                    <View key={index} style={styles.antExpenseItem}>
                      <View style={styles.antExpenseItemLeft}>
                        <Text style={styles.antExpenseItemCategory}>{item.category}</Text>
                        <Text style={styles.antExpenseItemCount}>{item.count} compras</Text>
                      </View>
                      <Text style={styles.antExpenseItemAmount}>
                        {formatCurrency(item.amount)}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleDownloadPDF(selectedReport)}
              disabled={downloadingPDF === selectedReport.id}
            >
              {downloadingPDF === selectedReport.id ? (
                <ActivityIndicator color="#2B4C7E" size="small" />
              ) : (
                <Ionicons name="download" size={20} color="#2B4C7E" />
              )}
              <Text style={styles.actionButtonText}>Descargar PDF</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleShareReport(selectedReport)}
            >
              <Ionicons name="share-social" size={20} color="#2B4C7E" />
              <Text style={styles.actionButtonText}>Compartir</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Reports list view
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.title}>Reportes Quincenales</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2B4C7E" />
          <Text style={styles.loadingText}>Cargando reportes...</Text>
        </View>
      ) : reports.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="document-text-outline" size={64} color="#9CA3AF" />
          <Text style={styles.emptyTitle}>Sin reportes aun</Text>
          <Text style={styles.emptyDescription}>
            Tu primer reporte quincenal se generara automaticamente el dia 1 o 16 del mes.
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.reportsList}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2B4C7E']} />
          }
        >
          {reports.map((report) => (
            <TouchableOpacity
              key={report.id}
              style={[styles.reportCard, report.isNew && styles.reportCardNew]}
              onPress={() => handleViewReport(report)}
            >
              <View style={styles.reportCardLeft}>
                {report.isNew && (
                  <View style={styles.newBadge}>
                    <Text style={styles.newBadgeText}>NUEVO</Text>
                  </View>
                )}
                <Text style={styles.reportDate}>
                  {formatDate(report.weekStart)} - {formatDate(report.weekEnd)}
                </Text>
                <Text style={styles.reportSavings}>
                  Tasa de ahorro: {report.savingsRate}%
                </Text>
              </View>
              <View style={styles.reportCardRight}>
                <View style={[styles.reportScore, { backgroundColor: getScoreColor(report.financialScore) + '20' }]}>
                  <Text style={[styles.reportScoreText, { color: getScoreColor(report.financialScore) }]}>
                    {report.financialScore}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </View>
            </TouchableOpacity>
          ))}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  closeButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
  },
  reportsList: {
    flex: 1,
    padding: 16,
  },
  reportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  reportCardNew: {
    borderColor: '#2B4C7E',
    backgroundColor: '#EBF4FF',
  },
  reportCardLeft: {
    flex: 1,
  },
  newBadge: {
    backgroundColor: '#2B4C7E',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  newBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  reportDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  reportSavings: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  reportCardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  reportScore: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reportScoreText: {
    fontSize: 14,
    fontWeight: '700',
  },
  // Report Detail Styles
  reportDetail: {
    flex: 1,
    padding: 16,
  },
  scoreCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  scoreEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: '800',
  },
  scoreLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  vsLastWeek: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 4,
  },
  vsLastWeekText: {
    fontSize: 12,
    fontWeight: '500',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 8,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 4,
  },
  summaryChange: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 4,
  },
  savingsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  savingsLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  savingsValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2B4C7E',
  },
  analysisCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  analysisHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  analysisTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  analysisText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 22,
  },
  recommendationsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  recommendationNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#2B4C7E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recommendationNumberText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  recommendationText: {
    flex: 1,
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  categoriesCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  categoryIcon: {
    fontSize: 24,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 4,
  },
  categoryProgress: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
  },
  categoryProgressFill: {
    height: '100%',
    backgroundColor: '#2B4C7E',
    borderRadius: 3,
  },
  categoryValues: {
    alignItems: 'flex-end',
  },
  categoryAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  categoryPercentage: {
    fontSize: 12,
    color: '#6B7280',
  },
  antExpensesCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  antExpensesSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  antExpensesTotal: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F59E0B',
  },
  antExpensesPercentage: {
    fontSize: 14,
    color: '#6B7280',
  },
  antExpensesItems: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 12,
  },
  antExpenseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  antExpenseItemLeft: {
    flex: 1,
  },
  antExpenseItemCategory: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  antExpenseItemCount: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  antExpenseItemAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F59E0B',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2B4C7E',
    gap: 8,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2B4C7E',
  },
});
