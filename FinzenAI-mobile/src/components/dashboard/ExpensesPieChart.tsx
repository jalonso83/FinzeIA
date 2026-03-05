import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useCurrency } from '../../hooks/useCurrency';

interface Transaction {
  id: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  category_id?: string;
  category?: {
    id: string;
    name: string;
    icon: string;
  } | string;
}

interface Category {
  id: string;
  name: string;
  icon: string;
}

interface ExpensesPieChartProps {
  transactions: Transaction[];
  categories: Category[];
}

interface CategoryData {
  id: string;
  name: string;
  icon: string;
  total: number;
  color: string;
  percentage: number;
}

const ExpensesPieChart: React.FC<ExpensesPieChartProps> = ({ transactions, categories }) => {
  const [selectedType, setSelectedType] = useState<'EXPENSE' | 'INCOME'>('INCOME');
  
  // Hook para moneda del usuario
  const { formatCurrency } = useCurrency();
  
  // Paleta de colores para las categorías
  const colors = [
    '#FF6384', // Rosa
    '#36A2EB', // Azul
    '#FFCE56', // Amarillo
    '#4BC0C0', // Turquesa
    '#9966FF', // Púrpura
    '#FF9F40', // Naranja
    '#8AC249', // Verde
    '#E91E63', // Rosa oscuro
    '#2196F3', // Azul oscuro
    '#FFC107', // Amarillo oscuro
    '#00BCD4', // Cian
    '#9C27B0', // Púrpura oscuro
    '#FF5722', // Rojo
    '#4CAF50', // Verde oscuro
    '#FF9800', // Naranja oscuro
  ];


  // Calcular transacciones por categoría según el tipo seleccionado
  const transactionsByCategory = useMemo(() => {
    if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
      return [];
    }
    
    const filteredTransactions = transactions.filter(t => t && t.type === selectedType);
    
    if (filteredTransactions.length === 0) {
      return [];
    }
    
    // Agrupar por categoría
    const categoryTotals: { [key: string]: number } = {};
    
    filteredTransactions.forEach(transaction => {
      const categoryId = typeof transaction.category === 'object'
        ? transaction.category?.id
        : transaction.category_id;
      
      if (categoryId) {
        categoryTotals[categoryId] = (categoryTotals[categoryId] || 0) + transaction.amount;
      }
    });

    // Convertir a array y ordenar por monto
    const sortedCategories = Object.entries(categoryTotals)
      .map(([categoryId, total]) => {
        const category = categories && Array.isArray(categories) 
          ? categories.find(c => c && c.id === categoryId)
          : null;
        return {
          id: categoryId,
          name: category?.name || 'Sin categoría',
          icon: category?.icon || '📊',
          total: total,
        };
      })
      .sort((a, b) => b.total - a.total);

    const totalAmount = sortedCategories.reduce((sum, item) => sum + item.total, 0);

    // Asignar colores únicos y calcular porcentajes
    return sortedCategories.map((item, index) => ({
      ...item,
      color: colors[index % colors.length],
      percentage: totalAmount > 0 ? (item.total / totalAmount) * 100 : 0,
    }));
  }, [transactions, categories, selectedType]);

  // Crear paths del SVG para el gráfico de dona
  const createDonutPaths = (data: CategoryData[]) => {
    
    if (!data || data.length === 0) {
      return [];
    }
    
    const centerX = 70;
    const centerY = 70;
    const radius = 60;
    const innerRadius = 35;
    let currentAngle = -90;

    // CASO ESPECIAL: Si solo hay una categoría (100%), crear un círculo completo con agujero
    if (data.length === 1 && data[0].percentage >= 99) {
      const item = data[0];
      
      // Crear un círculo completo con agujero usando dos arcos de 180° cada uno
      const pathData = [
        // Arco superior (0° a 180°)
        `M ${centerX + radius} ${centerY}`,
        `A ${radius} ${radius} 0 0 1 ${centerX - radius} ${centerY}`,
        // Arco inferior (180° a 360°)
        `A ${radius} ${radius} 0 0 1 ${centerX + radius} ${centerY}`,
        // Línea al agujero interior
        `L ${centerX + innerRadius} ${centerY}`,
        // Arco interior inferior (360° a 180°) - dirección opuesta
        `A ${innerRadius} ${innerRadius} 0 0 0 ${centerX - innerRadius} ${centerY}`,
        // Arco interior superior (180° a 0°) - dirección opuesta  
        `A ${innerRadius} ${innerRadius} 0 0 0 ${centerX + innerRadius} ${centerY}`,
        'Z'
      ].join(' ');
      
      return [{
        path: pathData,
        color: item.color,
      }];
    }

    // CASO NORMAL: Múltiples categorías
    const paths = data.map((item, index) => {
      const angle = (item.percentage / 100) * 360;
      
      if (angle <= 0) return null;

      const startAngle = currentAngle * (Math.PI / 180);
      const endAngle = (currentAngle + angle) * (Math.PI / 180);
      
      const x1 = centerX + radius * Math.cos(startAngle);
      const y1 = centerY + radius * Math.sin(startAngle);
      const x2 = centerX + radius * Math.cos(endAngle);
      const y2 = centerY + radius * Math.sin(endAngle);
      
      const x3 = centerX + innerRadius * Math.cos(endAngle);
      const y3 = centerY + innerRadius * Math.sin(endAngle);
      const x4 = centerX + innerRadius * Math.cos(startAngle);
      const y4 = centerY + innerRadius * Math.sin(startAngle);
      
      const largeArcFlag = angle > 180 ? 1 : 0;
      
      const pathData = [
        `M ${x1.toFixed(2)} ${y1.toFixed(2)}`,
        `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`,
        `L ${x3.toFixed(2)} ${y3.toFixed(2)}`,
        `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x4.toFixed(2)} ${y4.toFixed(2)}`,
        'Z'
      ].join(' ');
      
      currentAngle += angle;
      
      return {
        path: pathData,
        color: item.color,
      };
    }).filter(path => path !== null);

    return paths;
  };

  const totalAmount = transactionsByCategory.reduce((sum, item) => sum + item.total, 0);
  const isIncome = selectedType === 'INCOME';
  const donutPaths = createDonutPaths(transactionsByCategory);


  if (transactionsByCategory.length === 0) {
    return (
      <View style={styles.container}>
        {/* Switch de tipo de transacción */}
        <View style={styles.switchContainer}>
          <TouchableOpacity
            style={[
              styles.switchButton, 
              selectedType === 'INCOME' && styles.switchButtonActive,
              selectedType === 'INCOME' && styles.incomeButtonActive
            ]}
            onPress={() => setSelectedType('INCOME')}
          >
            <Text style={[
              styles.switchText, 
              selectedType === 'INCOME' && styles.switchTextActive,
              selectedType === 'INCOME' && styles.incomeTextActive
            ]}>
              Ingresos
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.switchButton, 
              selectedType === 'EXPENSE' && styles.switchButtonActive,
              selectedType === 'EXPENSE' && styles.expenseButtonActive
            ]}
            onPress={() => setSelectedType('EXPENSE')}
          >
            <Text style={[
              styles.switchText, 
              selectedType === 'EXPENSE' && styles.switchTextActive,
              selectedType === 'EXPENSE' && styles.expenseTextActive
            ]}>
              Gastos
            </Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📈</Text>
          <Text style={styles.emptyTitle}>No hay datos para mostrar</Text>
          <Text style={styles.emptySubtitle}>
            Agrega {isIncome ? 'ingresos' : 'gastos'} para ver el análisis por categorías
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Switch de tipo de transacción */}
      <View style={styles.switchContainer}>
        <TouchableOpacity
          style={[
            styles.switchButton, 
            selectedType === 'INCOME' && styles.switchButtonActive,
            selectedType === 'INCOME' && styles.incomeButtonActive
          ]}
          onPress={() => setSelectedType('INCOME')}
        >
          <Text style={[
            styles.switchText, 
            selectedType === 'INCOME' && styles.switchTextActive,
            selectedType === 'INCOME' && styles.incomeTextActive
          ]}>
            Ingresos
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.switchButton, 
            selectedType === 'EXPENSE' && styles.switchButtonActive,
            selectedType === 'EXPENSE' && styles.expenseButtonActive
          ]}
          onPress={() => setSelectedType('EXPENSE')}
        >
          <Text style={[
            styles.switchText, 
            selectedType === 'EXPENSE' && styles.switchTextActive,
            selectedType === 'EXPENSE' && styles.expenseTextActive
          ]}>
            Gastos
          </Text>
        </TouchableOpacity>
      </View>

      {/* Total en una línea */}
      <View style={styles.summaryRow}>
        <Text style={styles.summaryText}>Total de {isIncome ? 'Ingresos' : 'Gastos'}: </Text>
        <Text style={[styles.summaryAmount, isIncome ? styles.incomeColor : styles.expenseColor]}>
          {formatCurrency(totalAmount)}
        </Text>
      </View>

      {/* Gráfico de pastel */}
      <View style={styles.chartContainer}>
        <Svg width={140} height={140} viewBox="0 0 140 140">
          {donutPaths.map((pathData, index) => (
            <Path
              key={`${selectedType}-${index}`}
              d={pathData.path}
              fill={pathData.color}
              stroke="#ffffff"
              strokeWidth={2}
            />
          ))}
        </Svg>
      </View>

      {/* Lista de categorías */}
      <View style={styles.categoriesList}>
        {transactionsByCategory.map((item, index) => (
          <View key={item.id} style={styles.categoryRow}>
            <View style={[styles.categoryColor, { backgroundColor: item.color }]} />
            <Text style={styles.categoryIcon}>{item.icon}</Text>
            <Text style={styles.categoryName}>{item.name}</Text>
            <Text style={styles.categoryAmount}>{formatCurrency(item.total)}</Text>
            <Text style={styles.categoryPercent}>({item.percentage.toFixed(1)}%)</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  switchContainer: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    padding: 3,
    marginBottom: 16,
  },
  switchButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  switchButtonActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  switchText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  switchTextActive: {
    color: '#1e293b',
    fontWeight: '600',
  },
  expenseButtonActive: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderWidth: 1,
  },
  incomeButtonActive: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
    borderWidth: 1,
  },
  expenseTextActive: {
    color: '#dc2626',
    fontWeight: '700',
  },
  incomeTextActive: {
    color: '#059669',
    fontWeight: '700',
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    justifyContent: 'center',
  },
  summaryText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  summaryAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  expenseColor: {
    color: '#dc2626',
  },
  incomeColor: {
    color: '#059669',
  },
  chartContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  categoriesList: {
    gap: 8,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
  },
  categoryColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  categoryIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  categoryName: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
    fontWeight: '500',
  },
  categoryAmount: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
    marginRight: 8,
  },
  categoryPercent: {
    fontSize: 12,
    color: '#64748b',
    minWidth: 45,
    textAlign: 'right',
  },
});

export default ExpensesPieChart;