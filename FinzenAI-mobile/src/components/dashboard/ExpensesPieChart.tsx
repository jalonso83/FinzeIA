import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

interface Transaction {
  id: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
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

  // Calcular gastos por categoría
  const expensesByCategory = useMemo(() => {
    // Verificar que transactions sea un array válido
    if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
      return [];
    }
    
    const expenses = transactions.filter(t => t && t.type === 'EXPENSE');
    
    console.log('ExpensesPieChart - Total transactions:', transactions.length);
    console.log('ExpensesPieChart - Expense transactions:', expenses.length);
    
    if (expenses.length === 0) {
      return [];
    }
    
    // Agrupar por categoría
    const categoryTotals: { [key: string]: number } = {};
    
    expenses.forEach(transaction => {
      const categoryId = typeof transaction.category === 'object' 
        ? transaction.category?.id 
        : transaction.category;
      
      if (categoryId) {
        categoryTotals[categoryId] = (categoryTotals[categoryId] || 0) + transaction.amount;
      }
    });

    // Convertir a array y ordenar por monto
    const sortedCategories = Object.entries(categoryTotals)
      .map(([categoryId, total]) => {
        // Verificar que categories sea un array válido
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
      .sort((a, b) => b.total - a.total)
      // Mostrar TODAS las categorías con gastos

    const totalExpenses = sortedCategories.reduce((sum, item) => sum + item.total, 0);
    
    console.log('ExpensesPieChart - Categories with totals:', sortedCategories);
    console.log('ExpensesPieChart - Total expenses:', totalExpenses);

    // Asignar colores únicos y calcular porcentajes
    return sortedCategories.map((item, index) => ({
      ...item,
      color: colors[index % colors.length],
      percentage: totalExpenses > 0 ? (item.total / totalExpenses) * 100 : 0,
    }));
  }, [transactions, categories]);

  const formatCurrency = (amount: number): string => {
    return `RD$${amount.toLocaleString('es-DO')}`;
  };

  // Crear paths del SVG para el gráfico de dona
  const createDonutPaths = (data: CategoryData[], radius = 60, innerRadius = 35) => {
    const centerX = 70;
    const centerY = 70;
    let currentAngle = -90; // Empezar desde la parte superior

    return data.map((item, index) => {
      const angle = (item.percentage / 100) * 360;
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
        `M ${x1} ${y1}`,
        `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
        `L ${x3} ${y3}`,
        `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x4} ${y4}`,
        'Z'
      ].join(' ');
      
      currentAngle += angle;
      
      return {
        path: pathData,
        color: item.color,
      };
    });
  };

  const totalExpenses = expensesByCategory.reduce((sum, item) => sum + item.total, 0);

  if (expensesByCategory.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📈</Text>
          <Text style={styles.emptyTitle}>No hay datos para mostrar</Text>
          <Text style={styles.emptySubtitle}>
            Agrega transacciones para ver el análisis por categorías
          </Text>
        </View>
      </View>
    );
  }

  const donutPaths = createDonutPaths(expensesByCategory);

  return (
    <View style={styles.container}>
      {/* Total en una línea */}
      <View style={styles.summaryRow}>
        <Text style={styles.summaryText}>Total de Gastos: </Text>
        <Text style={styles.summaryAmount}>{formatCurrency(totalExpenses)}</Text>
      </View>

      {/* Gráfico de pastel en todo el card */}
      <View style={styles.chartContainer}>
        <Svg width={140} height={140} style={styles.svgChart}>
          {donutPaths.map((pathData, index) => (
            <Path
              key={index}
              d={pathData.path}
              fill={pathData.color}
              stroke="#ffffff"
              strokeWidth={1}
            />
          ))}
        </Svg>
      </View>

      {/* Detalle por todas las categorías que sean */}
      <View style={styles.categoriesList}>
        {expensesByCategory.map((item, index) => (
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
    color: '#dc2626',
  },
  chartContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  svgChart: {
    // SVG styles are handled by the component itself
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