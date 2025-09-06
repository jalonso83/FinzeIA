import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  Animated,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../utils/api';

const { width } = Dimensions.get('window');

// Tipos
interface AntExpenseAnalysis {
  totalAntExpenses: number;
  analysisMessage: string;
  topCriminals: Array<{
    category: string;
    amount: number;
    count: number;
    averageAmount: number;
    impact: string;
    suggestions: string[];
  }>;
  monthlyTrend: Array<{
    month: string;
    amount: number;
  }>;
  equivalencies: string[];
  savingsOpportunity: number;
  zenioInsights: string;
}

export default function AntExpenseDetectiveScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState<AntExpenseAnalysis | null>(null);
  const [animatedValue] = useState(new Animated.Value(0));

  useEffect(() => {
    loadAntExpenseAnalysis();
  }, []);

  const loadAntExpenseAnalysis = async () => {
    try {
      setLoading(true);
      
      // Loading message simulation
      setTimeout(() => {
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }).start();
      }, 1000);

      const response = await api.get('/zenio/ant-expense-analysis');
      setAnalysis(response.data);
      
    } catch (error: any) {
      console.error('Error loading ant expense analysis:', error);
      Alert.alert(
        'Error',
        'No se pudo cargar el análisis de gastos hormiga'
      );
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `RD$${amount.toLocaleString('es-DO')}`;
  };

  const renderLoadingState = () => (
    <View style={styles.loadingContainer}>
      <Animated.View style={[styles.zenioAnalyzing, { opacity: animatedValue }]}>
        <Image 
          source={require('../assets/isotipo.png')} 
          style={styles.zenioIcon}
          resizeMode="contain"
        />
        <Text style={styles.zenioText}>Zenio está analizando tus gastos...</Text>
        <Text style={styles.zenioSubtext}>Revisando últimos 3 meses 🕵️</Text>
      </Animated.View>
      <ActivityIndicator size="large" color="#7c3aed" style={{ marginTop: 20 }} />
    </View>
  );

  const renderAnalysis = () => analysis && (
    <ScrollView 
      style={styles.analysisContainer}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Header con mensaje de Zenio */}
      <View style={styles.zenioHeaderCard}>
        <Text style={styles.zenioHeaderIcon}>🕵️</Text>
        <Text style={styles.zenioHeaderTitle}>Detective Zenio Reporta:</Text>
        <Text style={styles.zenioMessage}>{analysis.zenioInsights}</Text>
      </View>

      {/* Resumen principal */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>🐜 Tus Gastos Hormiga</Text>
        <Text style={styles.summaryAmount}>{formatCurrency(analysis.totalAntExpenses)}</Text>
        <Text style={styles.summaryPeriod}>Últimos 3 meses</Text>
        
        {analysis.savingsOpportunity > 0 && (
          <View style={styles.opportunityBadge}>
            <Text style={styles.opportunityText}>
              💡 Oportunidad de ahorro: {formatCurrency(analysis.savingsOpportunity)}/mes
            </Text>
          </View>
        )}
      </View>

      {/* Top 3 Criminales */}
      <View style={styles.criminalsCard}>
        <Text style={styles.criminalsTitle}>🚨 Top 3 Criminales Financieros</Text>
        {analysis.topCriminals.map((criminal, index) => (
          <View key={index} style={styles.criminalItem}>
            <View style={styles.criminalHeader}>
              <Text style={styles.criminalRank}>#{index + 1}</Text>
              <View style={styles.criminalInfo}>
                <Text style={styles.criminalCategory}>{criminal.category}</Text>
                <Text style={styles.criminalAmount}>{formatCurrency(criminal.amount)}</Text>
              </View>
              <View style={styles.criminalStats}>
                <Text style={styles.criminalCount}>{criminal.count} veces</Text>
                <Text style={styles.criminalAverage}>~{formatCurrency(criminal.averageAmount)} c/u</Text>
              </View>
            </View>
            <Text style={styles.criminalImpact}>{criminal.impact}</Text>
            
            {/* Sugerencias */}
            <View style={styles.suggestionsContainer}>
              <Text style={styles.suggestionsTitle}>💡 Sugerencias:</Text>
              {criminal.suggestions.map((suggestion, idx) => (
                <Text key={idx} style={styles.suggestionItem}>• {suggestion}</Text>
              ))}
            </View>
          </View>
        ))}
      </View>

      {/* Tendencia mensual */}
      <View style={styles.trendCard}>
        <Text style={styles.trendTitle}>📊 Tendencia Mensual</Text>
        <View style={styles.trendChart}>
          {analysis.monthlyTrend.map((month, index) => {
            const maxAmount = Math.max(...analysis.monthlyTrend.map(m => m.amount));
            const height = (month.amount / maxAmount) * 80;
            
            return (
              <View key={index} style={styles.trendBar}>
                <View style={[styles.trendBarFill, { height: `${height}%` }]} />
                <Text style={styles.trendMonth}>{month.month}</Text>
                <Text style={styles.trendAmount}>{formatCurrency(month.amount)}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Equivalencias */}
      {analysis.equivalencies.length > 0 && (
        <View style={styles.equivalenciesCard}>
          <Text style={styles.equivalenciesTitle}>😱 Con lo que gastas en hormigas podrías tener:</Text>
          {analysis.equivalencies.map((equiv, index) => (
            <Text key={index} style={styles.equivalencyItem}>• {equiv}</Text>
          ))}
        </View>
      )}

      {/* Call to action */}
      <View style={styles.ctaCard}>
        <Text style={styles.ctaTitle}>🎯 Plan de Acción</Text>
        <Text style={styles.ctaText}>
          1. Usa nuestras calculadoras para planificar mejor{'\n'}
          2. Configura presupuestos para controlar gastos{'\n'}
          3. Convierte gastos hormiga en inversiones automáticas
        </Text>
        
        <TouchableOpacity style={styles.ctaButton}>
          <Text style={styles.ctaButtonText}>📈 Ver Simulador de Inversión</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.refreshButton}
        onPress={loadAntExpenseAnalysis}
      >
        <Text style={styles.refreshButtonText}>🔄 Actualizar Análisis</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerBackButton}
        >
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.title}>🕵️ Detective de Gastos Hormiga</Text>
        <View style={styles.placeholder} />
      </View>

      {loading ? renderLoadingState() : renderAnalysis()}
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerBackButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  placeholder: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  zenioAnalyzing: {
    alignItems: 'center',
    marginBottom: 20,
  },
  zenioIcon: {
    width: 60,
    height: 60,
    marginBottom: 16,
  },
  zenioText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 8,
  },
  zenioSubtext: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  analysisContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
    gap: 20,
  },
  zenioHeaderCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#7c3aed',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  zenioHeaderIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  zenioHeaderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#7c3aed',
    marginBottom: 12,
  },
  zenioMessage: {
    fontSize: 16,
    color: '#374151',
    textAlign: 'center',
    lineHeight: 22,
  },
  summaryCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  summaryAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ef4444',
    marginBottom: 8,
  },
  summaryPeriod: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 16,
  },
  opportunityBadge: {
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  opportunityText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#047857',
    textAlign: 'center',
  },
  criminalsCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  criminalsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 16,
  },
  criminalItem: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  criminalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  criminalRank: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ef4444',
    width: 30,
  },
  criminalInfo: {
    flex: 1,
    marginLeft: 12,
  },
  criminalCategory: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 2,
  },
  criminalAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ef4444',
  },
  criminalStats: {
    alignItems: 'flex-end',
  },
  criminalCount: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 2,
  },
  criminalAverage: {
    fontSize: 12,
    color: '#64748b',
  },
  criminalImpact: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  suggestionsContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
  },
  suggestionsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 6,
  },
  suggestionItem: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 2,
  },
  trendCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  trendTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 16,
  },
  trendChart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
    paddingTop: 20,
  },
  trendBar: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 2,
  },
  trendBarFill: {
    backgroundColor: '#7c3aed',
    width: '80%',
    borderRadius: 4,
    marginBottom: 8,
  },
  trendMonth: {
    fontSize: 10,
    color: '#64748b',
    marginBottom: 2,
  },
  trendAmount: {
    fontSize: 9,
    color: '#374151',
    fontWeight: '500',
  },
  equivalenciesCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  equivalenciesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 12,
  },
  equivalencyItem: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 6,
    paddingLeft: 8,
  },
  ctaCard: {
    backgroundColor: '#f0f9ff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  ctaTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0c4a6e',
    marginBottom: 12,
  },
  ctaText: {
    fontSize: 14,
    color: '#075985',
    lineHeight: 20,
    marginBottom: 16,
  },
  ctaButton: {
    backgroundColor: '#0ea5e9',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  ctaButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  refreshButton: {
    backgroundColor: '#f1f5f9',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  refreshButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
});