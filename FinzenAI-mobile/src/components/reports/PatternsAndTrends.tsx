import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { reportsAPI } from '../../utils/api';

interface PatternsData {
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
}


const PatternsAndTrends: React.FC = () => {
  const [patternsData, setPatternsData] = useState<PatternsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPatternsData();
  }, []);

  const loadPatternsData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Calcular fecha inicio y fin del mes actual
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      
      const response = await reportsAPI.getDateReport({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        granularity: 'daily',
        transactionType: 'both'
      });

      const data = response.data;

      if (data.patterns) {
        setPatternsData(data.patterns);
      }
    } catch (error: any) {
      console.error('Error loading patterns data:', error);
      setError('No se pudieron cargar los patrones del mes');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number): string => {
    return `$${amount.toLocaleString('es-ES')}`;
  };

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('es-DO', {
      day: 'numeric',
      month: 'short',
    });
  };

  const getWeekdayName = (index: number): string => {
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    return days[index];
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Patrones y Tendencias</Text>
          <Text style={styles.subtitle}>Mes actual</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#2563EB" />
          <Text style={styles.loadingText}>Analizando...</Text>
        </View>
      </View>
    );
  }

  if (error || !patternsData) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Patrones y Tendencias</Text>
          <Text style={styles.subtitle}>Mes actual</Text>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={24} color="#dc2626" />
          <Text style={styles.errorText}>No hay datos suficientes</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Patrones y Tendencias</Text>
        <Text style={styles.subtitle}>Mes actual</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Día más activo */}
        {patternsData.mostActiveDay && (
          <View style={[styles.patternCard, styles.activeCard]}>
            <View style={styles.patternHeader}>
              <Text style={styles.patternLabel}>Día más activo</Text>
              <Text style={styles.patternDate}>{formatDate(patternsData.mostActiveDay.date)}</Text>
            </View>
            <Text style={styles.patternAmount}>{formatCurrency(patternsData.mostActiveDay.total)}</Text>
            <Text style={styles.patternExtra}>{patternsData.mostActiveDay.transactions} transacciones</Text>
          </View>
        )}

        {/* Mayor gasto */}
        {patternsData.highestExpenseDay && (
          <View style={[styles.patternCard, styles.expenseCard]}>
            <View style={styles.patternHeader}>
              <Text style={styles.patternLabel}>Mayor gasto</Text>
              <Text style={styles.patternDate}>{formatDate(patternsData.highestExpenseDay.date)}</Text>
            </View>
            <Text style={styles.patternAmount}>{formatCurrency(patternsData.highestExpenseDay.amount)}</Text>
          </View>
        )}

        {/* Mayor ingreso */}
        {patternsData.highestIncomeDay && (
          <View style={[styles.patternCard, styles.incomeCard]}>
            <View style={styles.patternHeader}>
              <Text style={styles.patternLabel}>Mayor ingreso</Text>
              <Text style={styles.patternDate}>{formatDate(patternsData.highestIncomeDay.date)}</Text>
            </View>
            <Text style={styles.patternAmount}>{formatCurrency(patternsData.highestIncomeDay.amount)}</Text>
          </View>
        )}


        {/* Actividad por día de la semana (versión compacta) */}
        {patternsData.weekdayActivity && patternsData.weekdayActivity.length > 0 && (
          <View style={styles.weekdayCard}>
            <Text style={styles.weekdayTitle}>Actividad por día</Text>
            <View style={styles.weekdayGridVertical}>
              {patternsData.weekdayActivity.map((amount, index) => {
                const maxAmount = Math.max(...patternsData.weekdayActivity);
                const percentage = maxAmount > 0 ? (amount / maxAmount) * 100 : 0;
                
                return (
                  <View key={index} style={styles.weekdayItemVertical}>
                    <Text style={styles.weekdayNameVertical}>{getWeekdayName(index)}</Text>
                    <View style={styles.weekdayBarVertical}>
                      <View 
                        style={[
                          styles.weekdayFillVertical,
                          { width: `${percentage}%` }
                        ]}
                      />
                    </View>
                    <Text style={styles.weekdayAmountVertical}>{formatCurrency(amount)}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    marginBottom: 20,
  },
  header: {
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  headerInfoButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#eff6ff',
  },
  content: {
    flex: 1, // Cambiar de maxHeight a flex para debug
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#64748b',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  errorText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#dc2626',
  },
  patternCard: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  activeCard: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
    borderWidth: 1,
  },
  expenseCard: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderWidth: 1,
  },
  incomeCard: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
    borderWidth: 1,
  },
  patternHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  patternLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  patternDate: {
    fontSize: 11,
    color: '#64748b',
  },
  patternAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 2,
  },
  patternExtra: {
    fontSize: 10,
    color: '#64748b',
  },
  weekdayCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
  },
  weekdayTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  weekdayGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  weekdayItem: {
    flex: 1,
    alignItems: 'center',
  },
  weekdayName: {
    fontSize: 10,
    color: '#64748b',
    marginBottom: 4,
  },
  weekdayBar: {
    width: '100%',
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
    marginBottom: 4,
  },
  weekdayFill: {
    height: '100%',
    backgroundColor: '#2563EB',
    borderRadius: 2,
  },
  weekdayAmount: {
    fontSize: 8,
    color: '#64748b',
    textAlign: 'center',
  },
  // Nuevos estilos para layout vertical
  weekdayGridVertical: {
    gap: 6,
  },
  weekdayItemVertical: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  weekdayNameVertical: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
    width: 45,
  },
  weekdayBarVertical: {
    flex: 1,
    height: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
    marginHorizontal: 8,
  },
  weekdayFillVertical: {
    height: '100%',
    backgroundColor: '#2563EB',
    borderRadius: 3,
  },
  weekdayAmountVertical: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
    width: 60,
    textAlign: 'right',
  },
});

export default PatternsAndTrends;