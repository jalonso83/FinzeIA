import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useCurrency } from '../hooks/useCurrency';
import CustomModal from '../components/modals/CustomModal';
import UpgradeModal from '../components/subscriptions/UpgradeModal';
import { useSubscriptionStore } from '../stores/subscriptionStore';
import ExportService, { ExportFormat, TableColumn } from '../services/exportService';

import { logger } from '../utils/logger';
interface AmortizationRow {
  payment: number;
  paymentAmount: number;
  principal: number;
  interest: number;
  remainingBalance: number;
}

export default function LoanCalculatorScreen() {
  const navigation = useNavigation();
  const { formatCurrency } = useCurrency();
  const { canExportData } = useSubscriptionStore();

  const [loanAmount, setLoanAmount] = useState('');
  const [loanType, setLoanType] = useState('hipotecario');
  const [interestRate, setInterestRate] = useState('5.5');
  const [term, setTerm] = useState('');
  const [termUnit, setTermUnit] = useState('años');
  const [monthlyPayment, setMonthlyPayment] = useState<number | null>(null);
  const [totalPayment, setTotalPayment] = useState<number | null>(null);
  const [totalInterest, setTotalInterest] = useState<number | null>(null);
  const [amortizationTable, setAmortizationTable] = useState<AmortizationRow[]>([]);
  const [showAmortization, setShowAmortization] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(12);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Estados para exportación
  const [isExporting, setIsExporting] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showExportOptions, setShowExportOptions] = useState(false);

  const loanTypes = [
    { value: 'hipotecario', label: 'Hipotecario' },
    { value: 'personal', label: 'Personal' },
    { value: 'vehicular', label: 'Vehicular' },
    { value: 'comercial', label: 'Comercial' },
  ];

  const calculateLoan = () => {
    const principal = parseFloat(loanAmount);
    const rate = parseFloat(interestRate) / 100 / 12; // Tasa mensual
    const numberOfPayments = parseFloat(term) * (termUnit === 'años' ? 12 : 1);

    if (isNaN(principal) || principal <= 0) {
      setErrorMessage('Ingresa un monto válido');
      setShowErrorModal(true);
      return;
    }

    if (isNaN(rate) || rate <= 0) {
      setErrorMessage('Ingresa una tasa de interés válida');
      setShowErrorModal(true);
      return;
    }

    if (isNaN(numberOfPayments) || numberOfPayments <= 0) {
      setErrorMessage('Ingresa un plazo válido');
      setShowErrorModal(true);
      return;
    }

    // Fórmula de cuota mensual: P * (r * (1 + r)^n) / ((1 + r)^n - 1)
    const monthlyRate = rate;
    const numPayments = numberOfPayments;
    
    const monthlyPaymentAmount = principal * 
      (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
      (Math.pow(1 + monthlyRate, numPayments) - 1);
    
    const totalPaymentAmount = monthlyPaymentAmount * numPayments;
    const totalInterestAmount = totalPaymentAmount - principal;

    setMonthlyPayment(monthlyPaymentAmount);
    setTotalPayment(totalPaymentAmount);
    setTotalInterest(totalInterestAmount);

    // Generar tabla de amortización
    generateAmortizationTable(principal, monthlyRate, numPayments, monthlyPaymentAmount);
  };

  const generateAmortizationTable = (
    principal: number,
    monthlyRate: number,
    numPayments: number,
    monthlyPaymentAmount: number
  ) => {
    const table: AmortizationRow[] = [];
    let remainingBalance = principal;

    for (let i = 1; i <= numPayments; i++) {
      const interestPayment = remainingBalance * monthlyRate;
      const principalPayment = monthlyPaymentAmount - interestPayment;
      remainingBalance -= principalPayment;

      // Evitar balances negativos por errores de redondeo
      if (remainingBalance < 0.01) remainingBalance = 0;

      table.push({
        payment: i,
        paymentAmount: monthlyPaymentAmount,
        principal: principalPayment,
        interest: interestPayment,
        remainingBalance,
      });
    }

    setAmortizationTable(table);
  };


  const clearCalculation = () => {
    setLoanAmount('');
    setTerm('');
    setMonthlyPayment(null);
    setTotalPayment(null);
    setTotalInterest(null);
    setAmortizationTable([]);
    setShowAmortization(false);
    setCurrentPage(1);
  };

  // Calcular datos de paginación
  const totalPages = Math.ceil(amortizationTable.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPageData = amortizationTable.slice(startIndex, endIndex);

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Función para manejar exportación
  const handleExport = async (format: ExportFormat) => {
    setShowExportOptions(false);

    // Verificar si tiene permiso de exportación (PLUS/PRO)
    if (!canExportData()) {
      setShowUpgradeModal(true);
      return;
    }

    if (amortizationTable.length === 0) {
      Alert.alert('Error', 'No hay datos para exportar. Calcula un préstamo primero.');
      return;
    }

    setIsExporting(true);

    try {
      // Preparar columnas para la tabla
      const columns: TableColumn[] = [
        { header: '#', key: 'payment', align: 'center', width: '8%' },
        { header: 'Cuota', key: 'paymentAmount', align: 'right', width: '23%', format: (v) => formatCurrency(v) },
        { header: 'Capital', key: 'principal', align: 'right', width: '23%', format: (v) => formatCurrency(v) },
        { header: 'Interés', key: 'interest', align: 'right', width: '23%', format: (v) => formatCurrency(v) },
        { header: 'Balance', key: 'remainingBalance', align: 'right', width: '23%', format: (v) => formatCurrency(v) },
      ];

      // Preparar resumen
      const summary = [
        { label: 'Monto del préstamo', value: formatCurrency(parseFloat(loanAmount)) },
        { label: 'Tasa de interés', value: `${interestRate}% anual` },
        { label: 'Plazo', value: `${term} ${termUnit}` },
        { label: 'Cuota mensual', value: formatCurrency(monthlyPayment || 0) },
        { label: 'Total a pagar', value: formatCurrency(totalPayment || 0) },
        { label: 'Total intereses', value: formatCurrency(totalInterest || 0) },
      ];

      // Obtener nombre del tipo de préstamo
      const loanTypeName = loanTypes.find(lt => lt.value === loanType)?.label || loanType;

      const result = await ExportService.exportData(
        {
          title: 'Tabla de Amortización',
          subtitle: `Préstamo ${loanTypeName} - ${formatCurrency(parseFloat(loanAmount))}`,
          filename: `amortizacion_${loanType}_${new Date().getTime()}`,
          format,
        },
        {
          columns,
          rows: amortizationTable,
          summary,
        }
      );

      if (!result.success) {
        Alert.alert('Error', result.message);
      }
    } catch (error: any) {
      Alert.alert('Error', 'No se pudo exportar el documento');
      logger.error('Error exportando:', error);
    } finally {
      setIsExporting(false);
    }
  };

  // Función para mostrar opciones de exportación
  const handleExportPress = () => {
    if (!canExportData()) {
      setShowUpgradeModal(true);
      return;
    }
    setShowExportOptions(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.title}>Calculadora de Préstamos</Text>
        <View style={styles.placeholder} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 140 : 20}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
        {/* Formulario */}
        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Información del Préstamo</Text>
          
          {/* Monto del préstamo */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Monto del Préstamo</Text>
            <TextInput
              style={styles.textInput}
              value={loanAmount}
              onChangeText={setLoanAmount}
              placeholder="Ej: 100000"
              keyboardType="numeric"
            />
          </View>

          {/* Tipo de préstamo */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Tipo de Préstamo</Text>
            <View style={styles.buttonGroup}>
              {loanTypes.map((type) => (
                <TouchableOpacity
                  key={type.value}
                  style={[
                    styles.optionButton,
                    loanType === type.value && styles.optionButtonSelected,
                  ]}
                  onPress={() => setLoanType(type.value)}
                >
                  <Text
                    style={[
                      styles.optionButtonText,
                      loanType === type.value && styles.optionButtonTextSelected,
                    ]}
                  >
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Tasa de interés */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Tasa de Interés Anual (%)</Text>
            <TextInput
              style={styles.textInput}
              value={interestRate}
              onChangeText={setInterestRate}
              placeholder="Ej: 5.5"
              keyboardType="decimal-pad"
            />
          </View>

          {/* Plazo */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Plazo</Text>
            <View style={styles.termContainer}>
              <TextInput
                style={[styles.textInput, styles.termInput]}
                value={term}
                onChangeText={setTerm}
                placeholder="Ej: 20"
                keyboardType="numeric"
              />
              <View style={styles.termUnitContainer}>
                <TouchableOpacity
                  style={[
                    styles.termUnitButton,
                    termUnit === 'años' && styles.termUnitButtonSelected,
                  ]}
                  onPress={() => setTermUnit('años')}
                >
                  <Text
                    style={[
                      styles.termUnitText,
                      termUnit === 'años' && styles.termUnitTextSelected,
                    ]}
                  >
                    Años
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.termUnitButton,
                    termUnit === 'meses' && styles.termUnitButtonSelected,
                  ]}
                  onPress={() => setTermUnit('meses')}
                >
                  <Text
                    style={[
                      styles.termUnitText,
                      termUnit === 'meses' && styles.termUnitTextSelected,
                    ]}
                  >
                    Meses
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Botones */}
          <View style={styles.buttonsContainer}>
            <TouchableOpacity style={styles.calculateButton} onPress={calculateLoan}>
              <Ionicons name="calculator" size={20} color="white" />
              <Text style={styles.calculateButtonText}>Calcular</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.clearButton} onPress={clearCalculation}>
              <Ionicons name="refresh" size={20} color="#64748b" />
              <Text style={styles.clearButtonText}>Limpiar</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Resultados */}
        {monthlyPayment && (
          <View style={styles.resultsCard}>
            <Text style={styles.sectionTitle}>Resultados</Text>
            
            <View style={styles.resultItem}>
              <Text style={styles.resultLabel}>Cuota Mensual</Text>
              <Text style={[styles.resultValue, styles.monthlyPaymentValue]}>
                {formatCurrency(monthlyPayment)}
              </Text>
            </View>
            
            <View style={styles.resultItem}>
              <Text style={styles.resultLabel}>Total a Pagar</Text>
              <Text style={styles.resultValue}>
                {totalPayment && formatCurrency(totalPayment)}
              </Text>
            </View>
            
            <View style={styles.resultItem}>
              <Text style={styles.resultLabel}>Total Intereses</Text>
              <Text style={[styles.resultValue, styles.interestValue]}>
                {totalInterest && formatCurrency(totalInterest)}
              </Text>
            </View>

            {/* Botón tabla de amortización */}
            {amortizationTable.length > 0 && (
              <TouchableOpacity
                style={styles.amortizationButton}
                onPress={() => {
                  setShowAmortization(!showAmortization);
                  setCurrentPage(1); // Reset a la primera página
                }}
              >
                <Text style={styles.amortizationButtonText}>
                  {showAmortization ? 'Ocultar' : 'Ver'} Tabla de Amortización
                </Text>
                <Ionicons
                  name={showAmortization ? "chevron-up" : "chevron-down"}
                  size={20}
                  color="#2563EB"
                />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Tabla de amortización */}
        {showAmortization && amortizationTable.length > 0 && (
          <View style={styles.amortizationCard}>
            <Text style={styles.sectionTitle}>Tabla de Amortización</Text>
            <Text style={styles.amortizationNote}>
              Mostrando {currentPageData.length} de {amortizationTable.length} pagos totales
            </Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.table}>
                {/* Header */}
                <View style={styles.tableHeader}>
                  <Text style={[styles.tableHeaderText, styles.paymentColumn]}>#</Text>
                  <Text style={[styles.tableHeaderText, styles.amountColumn]}>Cuota</Text>
                  <Text style={[styles.tableHeaderText, styles.amountColumn]}>Capital</Text>
                  <Text style={[styles.tableHeaderText, styles.amountColumn]}>Interés</Text>
                  <Text style={[styles.tableHeaderText, styles.amountColumn]}>Balance</Text>
                </View>

                {/* Rows - mostrar página actual */}
                {currentPageData.map((row, index) => (
                  <View key={startIndex + index} style={styles.tableRow}>
                    <Text style={[styles.tableCellText, styles.paymentColumn]}>{row.payment}</Text>
                    <Text style={[styles.tableCellText, styles.amountColumn]}>
                      {formatCurrency(row.paymentAmount)}
                    </Text>
                    <Text style={[styles.tableCellText, styles.amountColumn]}>
                      {formatCurrency(row.principal)}
                    </Text>
                    <Text style={[styles.tableCellText, styles.amountColumn]}>
                      {formatCurrency(row.interest)}
                    </Text>
                    <Text style={[styles.tableCellText, styles.amountColumn]}>
                      {formatCurrency(row.remainingBalance)}
                    </Text>
                  </View>
                ))}
              </View>
            </ScrollView>

            {/* Paginación */}
            {totalPages > 1 && (
              <View style={styles.paginationContainer}>
                <TouchableOpacity
                  style={[styles.paginationButton, currentPage === 1 && styles.paginationButtonDisabled]}
                  onPress={goToPrevPage}
                  disabled={currentPage === 1}
                >
                  <Ionicons name="chevron-back" size={16} color={currentPage === 1 ? "#9CA3AF" : "#2563EB"} />
                  <Text style={[styles.paginationButtonText, currentPage === 1 && styles.paginationButtonTextDisabled]}>
                    Anterior
                  </Text>
                </TouchableOpacity>

                <View style={styles.pageInfo}>
                  <Text style={styles.pageInfoText}>
                    Página {currentPage} de {totalPages}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.paginationButton, currentPage === totalPages && styles.paginationButtonDisabled]}
                  onPress={goToNextPage}
                  disabled={currentPage === totalPages}
                >
                  <Text style={[styles.paginationButtonText, currentPage === totalPages && styles.paginationButtonTextDisabled]}>
                    Siguiente
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={currentPage === totalPages ? "#9CA3AF" : "#2563EB"} />
                </TouchableOpacity>
              </View>
            )}

            {/* Botón de exportar */}
            <TouchableOpacity
              style={styles.exportButton}
              onPress={handleExportPress}
              disabled={isExporting}
            >
              {isExporting ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Ionicons name="download-outline" size={20} color="white" />
                  <Text style={styles.exportButtonText}>Exportar Tabla</Text>
                  {!canExportData() && (
                    <View style={styles.premiumBadge}>
                      <Text style={styles.premiumBadgeText}>PLUS</Text>
                    </View>
                  )}
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modal de error */}
      <CustomModal
        visible={showErrorModal}
        type="error"
        title="Error"
        message={errorMessage}
        buttonText="Entendido"
        onClose={() => setShowErrorModal(false)}
      />

      {/* Modal de upgrade para exportación */}
      <UpgradeModal
        visible={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        limitType="export"
      />

      {/* Modal de opciones de exportación */}
      <CustomModal
        visible={showExportOptions}
        type="info"
        title="Exportar Tabla"
        message=""
        onClose={() => setShowExportOptions(false)}
        hideDefaultButton={true}
        customContent={
          <View style={styles.exportOptionsContainer}>
            <TouchableOpacity
              style={styles.exportOptionButton}
              onPress={() => handleExport('pdf')}
            >
              <Ionicons name="document-text" size={32} color="#dc2626" />
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
  keyboardAvoidingView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  placeholder: {
    width: 32,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  formCard: {
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: 'white',
  },
  buttonGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: 'white',
    alignItems: 'center',
    minWidth: '45%',
  },
  optionButtonSelected: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  optionButtonText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  optionButtonTextSelected: {
    color: 'white',
    fontWeight: '600',
  },
  termContainer: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  termInput: {
    width: 80,
    textAlign: 'center',
  },
  termUnitContainer: {
    flex: 1,
    flexDirection: 'row',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginLeft: 4,
  },
  termUnitButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
  },
  termUnitButtonSelected: {
    backgroundColor: '#2563EB',
  },
  termUnitText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  termUnitTextSelected: {
    color: 'white',
    fontWeight: '600',
  },
  buttonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  calculateButton: {
    flex: 1,
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  calculateButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  clearButton: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  clearButtonText: {
    color: '#64748b',
    fontSize: 16,
    fontWeight: '600',
  },
  resultsCard: {
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
  resultItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  resultLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  resultValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  monthlyPaymentValue: {
    color: '#2563EB',
    fontSize: 18,
  },
  interestValue: {
    color: '#dc2626',
  },
  amortizationButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    marginTop: 16,
  },
  amortizationButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563EB',
  },
  amortizationCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  amortizationNote: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  table: {
    minWidth: 500,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    paddingVertical: 12,
    borderRadius: 8,
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#374151',
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  tableCellText: {
    fontSize: 11,
    color: '#64748b',
    textAlign: 'center',
  },
  paymentColumn: {
    width: 40,
  },
  amountColumn: {
    width: 115,
  },
  // Estilos de paginación
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  paginationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: 'white',
    gap: 4,
  },
  paginationButtonDisabled: {
    backgroundColor: '#f9fafb',
    borderColor: '#f3f4f6',
  },
  paginationButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2563EB',
  },
  paginationButtonTextDisabled: {
    color: '#9CA3AF',
  },
  pageInfo: {
    alignItems: 'center',
  },
  pageInfoText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  // Estilos de exportación
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 16,
    gap: 8,
  },
  exportButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  premiumBadge: {
    backgroundColor: '#fbbf24',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 4,
  },
  premiumBadgeText: {
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
});