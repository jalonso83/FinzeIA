import React, { useState, useEffect } from 'react';
import { transactionsAPI, type Transaction } from '../../utils/api';
import './DebtCapacityIndicator.css';

interface DebtCapacityData {
  capacity: number;
  utilization: number;
}

type CapacityStatus = 'excellent' | 'good' | 'limited' | 'exceeded';

const DebtCapacityIndicator = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [borrowingCapacity, setBorrowingCapacity] = useState<number>(0);
  const [utilizationPercentage, setUtilizationPercentage] = useState<number>(0);
  const [capacityStatus, setCapacityStatus] = useState<CapacityStatus>('excellent');
  const [monthlyIncome, setMonthlyIncome] = useState<number>(0);
  const [monthlyDebtPayments, setMonthlyDebtPayments] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [hasData, setHasData] = useState<boolean>(false);

  // Función para parsear fechas
  const parseDate = (dateStr: string): Date | null => {
    try {
      const dateParts = dateStr.split('-');
      return new Date(
        parseInt(dateParts[0]), 
        parseInt(dateParts[1]) - 1, 
        parseInt(dateParts[2])
      );
    } catch {
      return null;
    }
  };

  // Detectar categorías de deuda
  const isDebtCategory = (categoryId: string | any): boolean => {
    // IDs de las categorías que consideramos como pagos de deuda
    const debtCategoryIds = [
      '10d93cca-91c8-46d4-97e3-7e98d29dc470', // Préstamos y deudas
    ];
    
    // Si categoryId es un objeto, extraer el ID
    const id = typeof categoryId === 'object' ? categoryId.id : categoryId;
    const result = debtCategoryIds.includes(id);
    console.log(`Verificando si categoría ${id} es deuda: ${result}`);
    return result;
  };

  // Cálculo de ingresos mensuales
  const getMonthlyIncome = (): number => {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    console.log(`🏦 Capacidad - Calculando ingresos para ${currentMonth + 1}/${currentYear}`);
    
    // Filtrar solo transacciones de ingreso del mes actual
    const monthlyIncomeTransactions = transactions.filter(t => {
      if (t.type !== 'INCOME') return false;
      
      const transDate = parseDate(t.date);
      if (!transDate) return false;
      
      return transDate.getMonth() === currentMonth && 
             transDate.getFullYear() === currentYear;
    });
    
    // Sumar todos los ingresos del mes actual
    const totalIncome = monthlyIncomeTransactions.reduce(
      (sum, t) => sum + parseFloat(t.amount.toString()), 0
    );
    
    console.log(`📊 Total ingresos mensuales: ${totalIncome}`);
    return totalIncome;
  };

  // Cálculo de pagos de deuda mensuales
  const getMonthlyDebtPayments = (): number => {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    console.log(`💳 Capacidad - Calculando pagos de deuda para ${currentMonth + 1}/${currentYear}`);
    
    // Filtrar solo transacciones reales de deuda del mes actual
    const monthlyDebtTransactions = transactions.filter(t => {
      if (t.type !== 'EXPENSE') return false;
      if (!isDebtCategory(t.category)) return false;
      
      const transDate = parseDate(t.date);
      if (!transDate) return false;
      
      const isCurrentMonth = transDate.getMonth() === currentMonth && 
                            transDate.getFullYear() === currentYear;
      
      if (isCurrentMonth) {
        console.log(`💸 Pago de deuda del mes: ${t.description || 'Sin descripción'} - ${t.amount}`);
      }
      
      return isCurrentMonth;
    });
    
    // Sumar solo transacciones reales de deuda del mes actual
    const debtFromTransactions = monthlyDebtTransactions.reduce(
      (sum, t) => sum + parseFloat(t.amount.toString()), 0
    );
    
    console.log(`📊 Total pagos de deuda mensuales: ${debtFromTransactions}`);
    return debtFromTransactions;
  };

  // Fórmula principal de capacidad de endeudamiento
  const calculateBorrowingCapacity = (): DebtCapacityData => {
    const monthly = getMonthlyIncome();
    const debt = getMonthlyDebtPayments();
    
    if (monthly <= 0) return { capacity: 0, utilization: 100 }; // Evitar división por cero
    
    // 🎯 LA CAPACIDAD DE ENDEUDAMIENTO ES EL 30% DEL INGRESO MENSUAL
    const totalCapacity = monthly * 0.3;
    
    // La capacidad de pago disponible es la capacidad total menos los pagos actuales
    const availableCapacity = totalCapacity - debt;
    
    // Porcentaje de utilización (qué porcentaje de tu capacidad total ya está comprometido)
    const utilization = (debt / totalCapacity) * 100;
    
    console.log({
      monthly,
      totalCapacity,
      debt,
      availableCapacity,
      utilizationPct: utilization
    });
    
    return { 
      capacity: Math.max(0, availableCapacity), 
      utilization: utilization
    };
  };

  // Determinar el estado basado en el porcentaje de utilización
  const determineCapacityStatus = (utilization: number): CapacityStatus => {
    if (utilization <= 40) {
      return 'excellent'; // 0-40% de utilización: excelente capacidad
    } else if (utilization <= 70) {
      return 'good';      // 41-70% de utilización: buena capacidad
    } else if (utilization <= 95) {
      return 'limited';   // 71-95% de utilización: capacidad limitada
    } else {
      return 'exceeded';  // >95% de utilización: capacidad excedida
    }
  };

  // Obtener mensaje dinámico según el estado
  const getCapacityMessage = (): string => {
    const formattedMargin = formatCurrency(borrowingCapacity);
    
    switch (capacityStatus) {
      case 'excellent':
        return `Excelente! Tienes ${formattedMargin} disponibles para nuevos préstamos.`;
      case 'good':
        return `Buena capacidad. Dispones de ${formattedMargin} para nuevos préstamos.`;
      case 'limited':
        return `Capacidad limitada. Solo ${formattedMargin} disponibles. Evalúa cuidadosamente.`;
      case 'exceeded':
        return `Capacidad excedida. No se recomiendan nuevos préstamos.`;
      default:
        return '';
    }
  };

  // Formatear moneda
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: 'DOP',
      minimumFractionDigits: 2
    }).format(amount);
  };

  // Cargar transacciones
  const loadTransactions = async () => {
    try {
      const response = await transactionsAPI.getAll({ limit: 1000 });
      setTransactions(response.transactions || []);
    } catch (error) {
      console.error('Error cargando transacciones:', error);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  // Calcular capacidad cuando cambien las transacciones
  useEffect(() => {
    if (transactions.length > 0) {
      const monthlyIncome = getMonthlyIncome();
      const monthlyDebt = getMonthlyDebtPayments();
      const capacityData = calculateBorrowingCapacity();
      
      setMonthlyIncome(monthlyIncome);
      setMonthlyDebtPayments(monthlyDebt);
      setBorrowingCapacity(capacityData.capacity);
      setUtilizationPercentage(capacityData.utilization);
      setCapacityStatus(determineCapacityStatus(capacityData.utilization));
      
      // Verificar si hay datos suficientes (al menos un ingreso)
      setHasData(monthlyIncome > 0);
    } else {
      // Si no hay transacciones, establecer valores por defecto
      setMonthlyIncome(0);
      setMonthlyDebtPayments(0);
      setBorrowingCapacity(0);
      setUtilizationPercentage(0);
      setCapacityStatus('excellent');
      setHasData(false);
    }
  }, [transactions]);

  // Cargar datos al montar el componente
  useEffect(() => {
    loadTransactions();
  }, []);

  // Escuchar eventos para refrescar datos
  useEffect(() => {
    const handleTransactionCreated = () => {
      loadTransactions();
    };
    
    window.addEventListener('zenio-transaction-created', handleTransactionCreated);
    
    return () => {
      window.removeEventListener('zenio-transaction-created', handleTransactionCreated);
    };
  }, []);

  if (loading) {
    return (
      <div className="debt-capacity-card">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-gray-500 mt-2">Calculando capacidad de endeudamiento...</p>
        </div>
      </div>
    );
  }

  // Si no hay datos suficientes, mostrar mensaje informativo
  if (!hasData) {
    return (
      <div className="debt-capacity-card">
        <div className="capacity-header">
          <h3 className="capacity-title">Capacidad de Endeudamiento</h3>
        </div>
        <div className="text-center py-8">
          <div className="text-4xl mb-4">📊</div>
          <p className="text-gray-600 mb-2">Análisis no disponible</p>
          <p className="text-sm text-gray-500">Agrega transacciones de ingreso para obtener este análisis</p>
        </div>
      </div>
    );
  }

  const totalCapacity = monthlyIncome * 0.3;

  return (
    <div className="debt-capacity-card">
      <div className="capacity-header">
        <h3 className="capacity-title">Capacidad de Endeudamiento</h3>
        <div className={`capacity-status-badge ${capacityStatus}`}>
          {capacityStatus === 'excellent' && '🟢 Excelente'}
          {capacityStatus === 'good' && '🟡 Buena'}
          {capacityStatus === 'limited' && '🟠 Limitada'}
          {capacityStatus === 'exceeded' && '🔴 Excedida'}
        </div>
      </div>

      {/* Indicador visual de semáforo */}
      <div className="traffic-light-container">
        <div className="traffic-light-track">
          <div className="traffic-light-segment green" data-level="0-40%"></div>
          <div className="traffic-light-segment yellow" data-level="41-70%"></div>
          <div className="traffic-light-segment orange" data-level="71-95%"></div>
          <div className="traffic-light-segment red" data-level=">95%"></div>
        </div>
        
        <div 
          className="traffic-light-indicator"
          style={{ left: `${Math.min(Math.max(utilizationPercentage, 5), 95)}%` }}
        ></div>
      </div>

      {/* Tarjetas de resumen */}
      <div className="capacity-summary-grid">
        <div className="summary-card">
          <div className="summary-icon">💰</div>
          <div className="summary-content">
            <div className="summary-label">Techo de Endeudamiento</div>
            <div className="summary-value">{formatCurrency(totalCapacity)}</div>
            <div className="summary-description">30% del ingreso mensual</div>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-icon">💳</div>
          <div className="summary-content">
            <div className="summary-label">Pagos Actuales</div>
            <div className="summary-value">{formatCurrency(monthlyDebtPayments)}</div>
            <div className="summary-description">Deudas del mes actual</div>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-icon">📈</div>
          <div className="summary-content">
            <div className="summary-label">Margen Disponible</div>
            <div className="summary-value">{formatCurrency(borrowingCapacity)}</div>
            <div className="summary-description">Capacidad restante</div>
          </div>
        </div>
      </div>

      {/* Mensaje dinámico */}
      <div className="capacity-message">
        <p>{getCapacityMessage()}</p>
      </div>

      {/* Información adicional */}
      <div className="capacity-info">
        <div className="info-item">
          <span className="info-label">Ingreso mensual:</span>
          <span className="info-value">{formatCurrency(monthlyIncome)}</span>
        </div>
        <div className="info-item">
          <span className="info-label">Utilización actual:</span>
          <span className="info-value">{utilizationPercentage.toFixed(1)}%</span>
        </div>
      </div>
    </div>
  );
};

export default DebtCapacityIndicator; 