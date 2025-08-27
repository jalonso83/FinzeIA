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
import { transactionsAPI, Transaction } from '../utils/api';
import TransactionForm from '../components/forms/TransactionForm';

export default function TransactionsScreen() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  useEffect(() => {
    loadTransactions();
  }, []);

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

  const formatAmount = (amount: number, type: string) => {
    const formattedAmount = amount.toLocaleString('es-ES');
    return type === 'INCOME' ? `+$${formattedAmount}` : `-$${formattedAmount}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
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
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => setShowForm(true)}
        >
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        {transactions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={64} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>No hay transacciones</Text>
            <Text style={styles.emptySubtitle}>
              Comienza agregando tu primera transacción
            </Text>
          </View>
        ) : (
          transactions.map((transaction) => (
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
                  <Text style={styles.transactionDate}>
                    {formatDate(transaction.date)}
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
          ))
        )}
      </ScrollView>

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
  transactionCard: {
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
});