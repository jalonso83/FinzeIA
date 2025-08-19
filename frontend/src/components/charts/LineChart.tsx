import React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import type { ChartOptions } from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface ChartDataItem {
  month: string;
  [categoryName: string]: number | string;
}

interface LineChartProps {
  data: ChartDataItem[];
  title?: string;
}

const LineChart: React.FC<LineChartProps> = ({ data, title = "Tendencias Mensuales" }) => {
  console.log('LineChart data received:', data);
  
  if (!data || data.length === 0) {
    console.log('LineChart: No data available');
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <div className="text-4xl mb-2">📈</div>
          <p>No hay datos para mostrar</p>
        </div>
      </div>
    );
  }

  // Formatear etiquetas de meses
  const formatMonthLabel = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const monthNames = [
      'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
      'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
    ];
    return `${monthNames[parseInt(month) - 1]} ${year}`;
  };

  // Extraer todas las categorías (excluyendo 'month')
  const allCategories = new Set<string>();
  data.forEach(item => {
    Object.keys(item).forEach(key => {
      if (key !== 'month') {
        allCategories.add(key);
      }
    });
  });

  const categories = Array.from(allCategories);

  // Generar colores para las líneas
  const generateLineColors = (count: number) => {
    const colors = [
      '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16',
      '#22C55E', '#10B981', '#14B8A6', '#06B6D4', '#0EA5E9',
      '#3B82F6', '#6366F1', '#8B5CF6', '#A855F7', '#D946EF',
      '#EC4899', '#F43F5E', '#FB7185', '#FD6C6C', '#FE9595'
    ];
    
    return colors.slice(0, count);
  };

  const colors = generateLineColors(categories.length);

  const chartData = {
    labels: data.map(item => formatMonthLabel(item.month)),
    datasets: categories.map((category, index) => ({
      label: category,
      data: data.map(item => (item[category] as number) || 0),
      borderColor: colors[index],
      backgroundColor: colors[index] + '20', // 12% opacity for fill
      borderWidth: 3,
      pointBackgroundColor: colors[index],
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
      pointRadius: 6,
      pointHoverRadius: 8,
      fill: false,
      tension: 0.4, // Smooth curves
      spanGaps: true
    }))
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: 'DOP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const options: ChartOptions<'line'> = {
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
            size: 12
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(255, 255, 255, 0.2)',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        mode: 'index',
        intersect: false,
        callbacks: {
          label: function(context) {
            return `${context.dataset.label}: ${formatCurrency(context.parsed.y)}`;
          },
          title: function(context) {
            return `Mes: ${context[0].label}`;
          }
        }
      }
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Período',
          font: {
            size: 12,
            weight: 'bold'
          }
        },
        grid: {
          display: true,
          color: 'rgba(0, 0, 0, 0.1)'
        }
      },
      y: {
        display: true,
        title: {
          display: true,
          text: 'Monto (DOP)',
          font: {
            size: 12,
            weight: 'bold'
          }
        },
        beginAtZero: true,
        grid: {
          display: true,
          color: 'rgba(0, 0, 0, 0.1)'
        },
        ticks: {
          callback: function(value) {
            return formatCurrency(value as number);
          }
        }
      }
    },
    animation: {
      duration: 1500,
      easing: 'easeInOutQuart'
    },
    interaction: {
      intersect: false,
      mode: 'index'
    },
    elements: {
      line: {
        borderJoinStyle: 'round' as const,
        borderCapStyle: 'round' as const
      }
    }
  };

  try {
    return (
      <div className="h-64 relative">
        <Line data={chartData} options={options} />
      </div>
    );
  } catch (error) {
    console.error('Error rendering LineChart:', error);
    return (
      <div className="h-64 flex items-center justify-center text-red-500">
        <div className="text-center">
          <div className="text-4xl mb-2">⚠️</div>
          <p>Error al cargar el gráfico</p>
          <p className="text-sm">{error instanceof Error ? error.message : 'Error desconocido'}</p>
        </div>
      </div>
    );
  }
};

export default LineChart;