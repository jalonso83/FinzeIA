import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { transactionsAPI, Transaction } from '../utils/api';
import TransactionForm from '../components/forms/TransactionForm';
import { useCurrency } from '../hooks/useCurrency';
import { countryToLocale } from '../utils/currency';

type FilterType = 'all' | 'INCOME' | 'EXPENSE';

export default function TransactionsScreen() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  
  // Estados para filtros
  const [showFilters, setShowFilters] = useState(false);
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Hook para moneda del usuario
  const { formatCurrency, userCountry } = useCurrency();

  useEffect(() => {
    loadTransactions();
  }, []);

  // Filtrar transacciones cuando cambien los filtros
  useEffect(() => {
    applyFilters();
  }, [transactions, filterType, startDate, endDate]);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const response = await transactionsAPI.getAll({ limit: 5000 }); // Cargar todas las transacciones como la web
      console.log('Transactions response:', response.data);
      
      // El backend puede devolver { data: [...] } o directamente [...]
      const transactionsData = response.data.transactions || response.data || [];
      setTransactions(Array.isArray(transactionsData) ? transactionsData : []);
    } catch (error: any) {
      console.error('Error loading transactions:', error);
      
      // Si es error de autenticación, mostrar mensaje específico
      if (error.response?.status === 401) {
        Alert.alert('Sesión Expirada', 'Por favor inicia sesión nuevamente');
      } else {
        Alert.alert('Error', 'No se pudieron cargar las transacciones');
      }
      
      // Mostrar lista vacía en caso de error
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...transactions];

    // Filtrar por tipo
    if (filterType !== 'all') {
      filtered = filtered.filter(transaction => transaction.type === filterType);
    }

    // Filtrar por rango de fechas
    if (startDate) {
      const start = new Date(startDate + 'T00:00:00');
      filtered = filtered.filter(transaction => createSafeDate(transaction.date) >= start);
    }

    if (endDate) {
      const end = new Date(endDate + 'T23:59:59');
      filtered = filtered.filter(transaction => createSafeDate(transaction.date) <= end);
    }

    setFilteredTransactions(filtered);
  };

  const clearFilters = () => {
    setFilterType('all');
    setStartDate('');
    setEndDate('');
  };

  const formatDateForSummary = (dateString: string) => {
    // Usar la función createSafeDate para consistencia
    const date = createSafeDate(dateString);
    // Usar el mismo locale que el formatDate principal pero con formato corto
    const locale = (userCountry && countryToLocale[userCountry]) || 'en-US';
    
    return date.toLocaleDateString(locale, {
      day: '2-digit',
      month: '2-digit',
    });
  };

  const getFilterSummary = () => {
    const activeFilters = [];
    if (filterType !== 'all') {
      activeFilters.push(filterType === 'INCOME' ? 'Ingresos' : 'Gastos');
    }
    if (startDate || endDate) {
      if (startDate && endDate) {
        // Si es el mismo día, mostrar solo una fecha
        if (startDate === endDate) {
          activeFilters.push(formatDateForSummary(startDate));
        } else {
          activeFilters.push(`${formatDateForSummary(startDate)} - ${formatDateForSummary(endDate)}`);
        }
      } else if (startDate) {
        activeFilters.push(`Desde ${formatDateForSummary(startDate)}`);
      } else if (endDate) {
        activeFilters.push(`Hasta ${formatDateForSummary(endDate)}`);
      }
    }
    return activeFilters.length > 0 ? activeFilters.join(' • ') : 'Sin filtros';
  };

  const formatAmount = (amount: number, type: string) => {
    const formattedAmount = formatCurrency(amount);
    return type === 'INCOME' ? `+${formattedAmount}` : `-${formattedAmount}`;
  };

  // Función para crear fecha sin problemas de zona horaria
  const createSafeDate = (dateString: string) => {
    // Si ya tiene hora, usarla; si no, agregar mediodía para evitar zona horaria
    if (dateString.includes('T')) {
      return new Date(dateString);
    }
    return new Date(dateString + 'T12:00:00');
  };

  const formatDate = (dateString: string) => {
    const date = createSafeDate(dateString);
    // Usar el locale del país del usuario usando la configuración centralizada
    const locale = (userCountry && countryToLocale[userCountry]) || 'en-US';
    
    return date.toLocaleDateString(locale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatDateHeader = (dateString: string) => {
    const date = createSafeDate(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Comparar fechas sin hora
    const transactionDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const yesterdayDate = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
    
    if (transactionDate.getTime() === todayDate.getTime()) {
      return 'Hoy';
    } else if (transactionDate.getTime() === yesterdayDate.getTime()) {
      return 'Ayer';
    } else {
      const locale = (userCountry && countryToLocale[userCountry]) || 'en-US';
      return date.toLocaleDateString(locale, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      });
    }
  };

  const groupTransactionsByDate = (transactions: Transaction[]) => {
    const grouped: Record<string, Transaction[]> = {};
    
    transactions.forEach(transaction => {
      const date = createSafeDate(transaction.date);
      const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(transaction);
    });
    
    // Ordenar las fechas de más reciente a más antigua
    const sortedDates = Object.keys(grouped).sort((a, b) => new Date(b + 'T12:00:00').getTime() - new Date(a + 'T12:00:00').getTime());
    
    return sortedDates.map(dateKey => ({
      date: dateKey,
      dateHeader: formatDateHeader(dateKey),
      transactions: grouped[dateKey].sort((a, b) => createSafeDate(b.date).getTime() - createSafeDate(a.date).getTime())
    }));
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Cargando transacciones...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Transacciones</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            style={[styles.filterButton, (filterType !== 'all' || startDate || endDate) && styles.filterButtonActive]}
            onPress={() => setShowFilters(true)}
          >
            <Ionicons name="filter" size={20} color={(filterType !== 'all' || startDate || endDate) ? "white" : "#64748b"} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => setShowForm(true)}
          >
            <Ionicons name="add" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Resumen de filtros */}
      {(filterType !== 'all' || startDate || endDate) && (
        <View style={styles.filterSummary}>
          <View style={styles.filterSummaryContent}>
            <Ionicons name="funnel" size={16} color="#2563EB" />
            <Text style={styles.filterSummaryText}>{getFilterSummary()}</Text>
            <TouchableOpacity onPress={clearFilters} style={styles.clearFiltersButton}>
              <Text style={styles.clearFiltersText}>Limpiar</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <ScrollView style={styles.scrollView}>
        {filteredTransactions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={64} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>
              {transactions.length === 0 ? 'No hay transacciones' : 'No hay transacciones que coincidan'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {transactions.length === 0 
                ? 'Comienza agregando tu primera transacción'
                : 'Intenta ajustar los filtros para encontrar lo que buscas'
              }
            </Text>
          </View>
        ) : (
          groupTransactionsByDate(filteredTransactions).map((group, groupIndex) => (
            <View key={group.date} style={styles.dateGroup}>
              <Text style={styles.dateHeader}>{group.dateHeader}</Text>
              {group.transactions.map((transaction) => (
                <TouchableOpacity 
                  key={transaction.id} 
                  style={styles.transactionCard}
                  onPress={() => {
                    setEditingTransaction(transaction);
                    setShowForm(true);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.transactionHeader}>
                    <View style={styles.transactionInfo}>
                      <Text style={styles.transactionDescription}>
                        {transaction.description}
                      </Text>
                      {transaction.category && (
                        <Text style={styles.transactionCategory}>
                          {transaction.category.name}
                        </Text>
                      )}
                    </View>
                    <View style={styles.transactionRight}>
                      <Text
                        style={[
                          styles.transactionAmount,
                          transaction.type === 'INCOME'
                            ? styles.incomeAmount
                            : styles.expenseAmount,
                        ]}
                      >
                        {formatAmount(transaction.amount, transaction.type)}
                      </Text>
                      <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ))
        )}
      </ScrollView>

      {/* Modal de Filtros */}
      <Modal
        visible={showFilters}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowFilters(false)}
      >
        <SafeAreaView style={styles.filtersContainer}>
          <View style={styles.filtersHeader}>
            <TouchableOpacity onPress={() => setShowFilters(false)} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#64748b" />
            </TouchableOpacity>
            <Text style={styles.filtersTitle}>Filtros</Text>
            <TouchableOpacity onPress={clearFilters} style={styles.clearButton}>
              <Text style={styles.clearButtonText}>Limpiar</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.filtersContent}>
            {/* Filtro por tipo */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Tipo de transacción</Text>
              <View style={styles.filterTypeButtons}>
                <TouchableOpacity
                  style={[styles.typeButton, filterType === 'all' && styles.typeButtonActive]}
                  onPress={() => setFilterType('all')}
                >
                  <Text style={[styles.typeButtonText, filterType === 'all' && styles.typeButtonTextActive]}>
                    Todas
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.typeButton, filterType === 'INCOME' && styles.typeButtonActive]}
                  onPress={() => setFilterType('INCOME')}
                >
                  <Ionicons name="trending-up" size={16} color={filterType === 'INCOME' ? "white" : "#059669"} />
                  <Text style={[styles.typeButtonText, { color: filterType === 'INCOME' ? "white" : "#059669" }]}>
                    Ingresos
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.typeButton, filterType === 'EXPENSE' && styles.typeButtonActive]}
                  onPress={() => setFilterType('EXPENSE')}
                >
                  <Ionicons name="trending-down" size={16} color={filterType === 'EXPENSE' ? "white" : "#dc2626"} />
                  <Text style={[styles.typeButtonText, { color: filterType === 'EXPENSE' ? "white" : "#dc2626" }]}>
                    Gastos
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Filtro por fechas */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Rango de fechas</Text>
              <View style={styles.dateInputs}>
                <View style={styles.dateInputContainer}>
                  <Text style={styles.dateInputLabel}>Fecha inicial</Text>
                  <TouchableOpacity style={styles.dateInput}>
                    <TextInput
                      style={styles.dateInputText}
                      value={startDate}
                      onChangeText={setStartDate}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor="#9CA3AF"
                    />
                    <Ionicons name="calendar-outline" size={20} color="#64748b" />
                  </TouchableOpacity>
                </View>
                <View style={styles.dateInputContainer}>
                  <Text style={styles.dateInputLabel}>Fecha final</Text>
                  <TouchableOpacity style={styles.dateInput}>
                    <TextInput
                      style={styles.dateInputText}
                      value={endDate}
                      onChangeText={setEndDate}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor="#9CA3AF"
                    />
                    <Ionicons name="calendar-outline" size={20} color="#64748b" />
                  </TouchableOpacity>
                </View>
              </View>
              
              {/* Botones de rango rápido */}
              <View style={styles.quickDateButtons}>
                <TouchableOpacity
                  style={styles.quickDateButton}
                  onPress={() => {
                    const today = new Date();
                    setStartDate(today.toISOString().split('T')[0]);
                    setEndDate(today.toISOString().split('T')[0]);
                  }}
                >
                  <Text style={styles.quickDateButtonText}>Hoy</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickDateButton}
                  onPress={() => {
                    const today = new Date();
                    // Calcular el lunes de esta semana (semana empieza en lunes, no domingo)
                    const currentDay = today.getDay(); // 0=domingo, 1=lunes, ..., 6=sábado
                    const daysFromMonday = currentDay === 0 ? 6 : currentDay - 1; // Si es domingo (0), restamos 6 días
                    const startOfWeek = new Date(today);
                    startOfWeek.setDate(today.getDate() - daysFromMonday);
                    
                    setStartDate(startOfWeek.toISOString().split('T')[0]);
                    setEndDate(today.toISOString().split('T')[0]);
                  }}
                >
                  <Text style={styles.quickDateButtonText}>Esta semana</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickDateButton}
                  onPress={() => {
                    const today = new Date();
                    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                    setStartDate(startOfMonth.toISOString().split('T')[0]);
                    setEndDate(today.toISOString().split('T')[0]);
                  }}
                >
                  <Text style={styles.quickDateButtonText}>Este mes</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>

          <View style={styles.filtersFooter}>
            <TouchableOpacity
              style={styles.applyFiltersButton}
              onPress={() => setShowFilters(false)}
            >
              <Text style={styles.applyFiltersButtonText}>Aplicar Filtros</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Formulario de Transacción */}
      <TransactionForm
        visible={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingTransaction(null);
        }}
        onSuccess={() => {
          loadTransactions();
          setEditingTransaction(null);
        }}
        editTransaction={editingTransaction}
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
    paddingTop: 20,
    paddingBottom: 20,
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
  dateGroup: {
    marginBottom: 20,
  },
  dateHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 12,
    marginLeft: 20,
    marginTop: 8,
    textTransform: 'capitalize',
  },
  transactionCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    marginHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  transactionInfo: {
    flex: 1,
    marginRight: 12,
  },
  transactionDescription: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 2,
  },
  transactionCategory: {
    fontSize: 12,
    color: '#7c3aed',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  transactionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  incomeAmount: {
    color: '#059669',
  },
  expenseAmount: {
    color: '#dc2626',
  },
  // Estilos para header
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterButtonActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  // Estilos para resumen de filtros
  filterSummary: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  filterSummaryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterSummaryText: {
    flex: 1,
    fontSize: 14,
    color: '#1e40af',
  },
  clearFiltersButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: '#2563EB',
    borderRadius: 12,
  },
  clearFiltersText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '600',
  },
  // Estilos para modal de filtros
  filtersContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  filtersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  closeButton: {
    padding: 4,
  },
  filtersTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
  },
  clearButtonText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  filtersContent: {
    flex: 1,
    padding: 20,
  },
  filterSection: {
    marginBottom: 32,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 16,
  },
  // Filtros de tipo
  filterTypeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  typeButtonActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  typeButtonTextActive: {
    color: 'white',
  },
  // Filtros de fecha
  dateInputs: {
    gap: 16,
    marginBottom: 16,
  },
  dateInputContainer: {
    gap: 8,
  },
  dateInputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  dateInputText: {
    flex: 1,
    fontSize: 16,
    color: '#1e293b',
  },
  quickDateButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  quickDateButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    alignItems: 'center',
  },
  quickDateButtonText: {
    fontSize: 12,
    color: '#2563EB',
    fontWeight: '500',
  },
  // Footer de filtros
  filtersFooter: {
    padding: 20,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  applyFiltersButton: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  applyFiltersButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});