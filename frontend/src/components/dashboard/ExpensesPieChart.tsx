import React, { useMemo } from 'react';
import { Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
} from 'chart.js';
import type { Transaction, Category } from '../../utils/api';
import './ExpensesPieChart.css';

// Registrar los componentes necesarios de Chart.js
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale);

interface ExpensesPieChartProps {
  transactions: Transaction[];
  categories: Category[];
}

const ExpensesPieChart: React.FC<ExpensesPieChartProps> = ({ transactions, categories }) => {
  // Paleta de colores única y diversa para las categorías
  const colors = [
    '#FF6384', // Rosa
    '#36A2EB', // Azul
    '#FFCE56', // Amarillo
    '#4BC0C0', // Turquesa
    '#9966FF', // Púrpura
    '#FF9F40', // Naranja
    '#C9CBCF', // Gris
    '#8AC249', // Verde
    '#E91E63', // Rosa oscuro
    '#2196F3', // Azul oscuro
    '#FFC107', // Amarillo oscuro
    '#00BCD4', // Cian
    '#9C27B0', // Púrpura oscuro
    '#FF5722', // Rojo
    '#607D8B', // Azul gris
    '#4CAF50', // Verde oscuro
    '#FF9800', // Naranja oscuro
    '#795548', // Marrón
    '#9E9E9E'  // Gris oscuro
  ];

  // Calcular gastos por categoría
  const expensesByCategory = useMemo(() => {
    const expenses = transactions.filter(t => t.type === 'EXPENSE');
    
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
        const category = categories.find(c => c.id === categoryId);
        return {
          id: categoryId,
          name: category?.name || 'Sin categoría',
          icon: category?.icon || '📊',
          total: total,
        };
      })
      .sort((a, b) => b.total - a.total)
      .slice(0, 8); // Mostrar solo las 8 categorías con más gastos

    // Asignar colores únicos basados en el índice
    return sortedCategories.map((item, index) => ({
      ...item,
      color: colors[index % colors.length]
    }));
  }, [transactions, categories]);

  // Preparar datos para el gráfico
  const chartData = useMemo(() => {
    if (expensesByCategory.length === 0) {
      return {
        labels: [],
        datasets: [{
          data: [],
          backgroundColor: [],
          borderColor: [],
          borderWidth: 2,
          hoverBorderWidth: 3,
        }],
      };
    }

    return {
      labels: expensesByCategory.map(item => `${item.icon} ${item.name}`),
      datasets: [
        {
          data: expensesByCategory.map(item => item.total),
          backgroundColor: expensesByCategory.map(item => item.color),
          borderColor: expensesByCategory.map(item => item.color),
          borderWidth: 2,
          hoverBorderWidth: 3,
        },
      ],
    };
  }, [expensesByCategory]);

  // Configuración del gráfico
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          padding: 20,
          usePointStyle: true,
          pointStyle: 'circle',
          font: {
            size: 12,
          },
          generateLabels: (chart: any) => {
            const data = chart.data;
            if (data.labels.length && data.datasets.length) {
              return data.labels.map((label: string, index: number) => {
                const dataset = data.datasets[0];
                const value = dataset.data[index];
                const total = dataset.data.reduce((a: number, b: number) => a + b, 0);
                const percentage = ((value / total) * 100).toFixed(1);
                
                return {
                  text: `${label} - RD$${value.toLocaleString('es-DO')} (${percentage}%)`,
                  fillStyle: dataset.backgroundColor[index],
                  strokeStyle: dataset.borderColor[index],
                  lineWidth: 2,
                  pointStyle: 'circle',
                  hidden: false,
                  index: index,
                };
              });
            }
            return [];
          },
        },
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const label = context.label || '';
            const value = context.parsed;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: RD$${value.toLocaleString('es-DO')} (${percentage}%)`;
          },
        },
      },
    },
  };

  // Calcular total de gastos
  const totalExpenses = expensesByCategory.reduce((sum, item) => sum + item.total, 0);

  if (expensesByCategory.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <div className="text-4xl mb-2">📈</div>
        <p className="text-sm">No hay datos para mostrar</p>
        <p className="text-xs mt-1">Agrega transacciones para ver el análisis por categorías</p>
      </div>
    );
  }

  return (
    <div className="expenses-chart-container">
      {/* Resumen de gastos totales */}
      <div className="expenses-summary mb-4">
        <div className="text-center">
          <p className="text-sm text-gray-600 mb-1">Total de Gastos</p>
          <p className="text-2xl font-bold text-red-600">
            RD${totalExpenses.toLocaleString('es-DO')}
          </p>
        </div>
      </div>

      {/* Gráfico de pastel */}
      <div className="chart-wrapper" style={{ height: '300px', position: 'relative' }}>
        <Pie data={chartData} options={chartOptions} />
      </div>


    </div>
  );
};

export default ExpensesPieChart; 