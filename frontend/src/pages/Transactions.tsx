import React, { useState, useEffect } from 'react';
import Navigation from '../components/Navigation';
import TransactionFormWeb from '../components/TransactionFormWeb.tsx';
import { transactionsAPI, categoriesAPI } from '../utils/api';
import './Screens.css';
import './Transactions.css';
import { toast } from 'react-hot-toast';
import type { Transaction, Category } from '../utils/api';

const Transactions = () => {
  const [showForm, setShowForm] = useState(false);
  const [editTransaction, setEditTransaction] = useState<Transaction | null>(null);
  const [typeFilter, setTypeFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [periodFilter, setPeriodFilter] = useState('all');
  
  const currency = 'RD$';

  // Estados locales para transacciones y categorías
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const txRes = await transactionsAPI.getAll();
      const catRes = await categoriesAPI.getAll();
      setTransactions(txRes.transactions || []);
      setCategories(catRes);
      console.log('Fetch ejecutado: categorías:', catRes);
    } catch (err) {
      setError('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  // useEffect para cargar datos solo una vez
  useEffect(() => {
    fetchData();
  }, []);

  // Listener para refrescado desde Zenio
  useEffect(() => {
    // Handler para refrescar desde Zenio
    const handleZenioTransactionCreated = () => {
      fetchData();
    };
    
    const handleZenioTransactionUpdated = () => {
      fetchData();
    };
    
    const handleZenioTransactionDeleted = () => {
      fetchData();
    };
    
    // Handler para refrescar cuando se actualizan presupuestos (por si las transacciones los afectan)
    const handleBudgetsUpdated = () => {
      fetchData();
    };
    
    window.addEventListener('zenio-transaction-created', handleZenioTransactionCreated);
    window.addEventListener('zenio-transaction-updated', handleZenioTransactionUpdated);
    window.addEventListener('zenio-transaction-deleted', handleZenioTransactionDeleted);
    window.addEventListener('budgets-updated', handleBudgetsUpdated);
    
    return () => {
      window.removeEventListener('zenio-transaction-created', handleZenioTransactionCreated);
      window.removeEventListener('zenio-transaction-updated', handleZenioTransactionUpdated);
      window.removeEventListener('zenio-transaction-deleted', handleZenioTransactionDeleted);
      window.removeEventListener('budgets-updated', handleBudgetsUpdated);
    };
  }, []); // Dependencia de fetchData
  
  // Agrupar transacciones por fecha
  const groupTransactionsByDate = (transactions: Transaction[]): { date: string, transactions: Transaction[] }[] => {
    const groups: { [date: string]: Transaction[] } = {};
    
    transactions.forEach((transaction: Transaction) => {
      const date = transaction.date;
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(transaction);
    });
    
    // Ordenar las fechas de más reciente a más antigua
    return Object.keys(groups)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
      .map(date => ({
        date,
        transactions: groups[date].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      }));
  };
  
  // Función para parsear fecha sin conversión de zona horaria
  const parseDate = (dateStr: string): Date => {
    const dateParts = dateStr.split('-');
    return new Date(
      parseInt(dateParts[0]), 
      parseInt(dateParts[1]) - 1, // Mes es 0-based en JavaScript
      parseInt(dateParts[2])
    );
  };

  // Filtrar transacciones según los filtros seleccionados
  const getFilteredTransactions = (): Transaction[] => {
    let filtered = [...transactions];
    
    // Filtrar por tipo
    if (typeFilter !== 'all') {
      filtered = filtered.filter(t => t.type === typeFilter);
    }
    
    // Filtrar por categoría
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(t => t.category.id === categoryFilter);
    }
    
    // Filtrar por periodo
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let startDate: Date;
    
    switch (periodFilter) {
      case 'all':
        return filtered;
      case 'this-month':
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        filtered = filtered.filter(t => {
          const transactionDate = parseDate(t.date);
          return transactionDate >= startDate;
        });
        return filtered;
      case 'last-month':
        startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
        filtered = filtered.filter(t => {
          const transactionDate = parseDate(t.date);
          return transactionDate >= startDate && transactionDate <= endOfLastMonth;
        });
        return filtered;
      case '3-months':
        startDate = new Date(today.getFullYear(), today.getMonth() - 3, 1);
        filtered = filtered.filter(t => {
          const transactionDate = parseDate(t.date);
          return transactionDate >= startDate;
        });
        return filtered;
      case 'year':
        startDate = new Date(today.getFullYear(), 0, 1);
        filtered = filtered.filter(t => {
          const transactionDate = parseDate(t.date);
          return transactionDate >= startDate;
        });
        return filtered;
      default:
        return filtered;
    }
  };
  
  // CRUD locales
  const handleCreateTransaction = async (data: any) => {
    setLoading(true);
    try {
      await transactionsAPI.create(data);
      const txRes = await transactionsAPI.getAll();
      setTransactions(txRes.transactions || []);
      toast.success('¡Transacción creada!');
      window.dispatchEvent(new Event('budgets-updated'));
    } catch {
      toast.error('Error al crear transacción');
    } finally {
      setLoading(false);
    }
  };
  const handleEditTransaction = async (id: string, data: any) => {
    setLoading(true);
    try {
      await transactionsAPI.update(id, data);
      const txRes = await transactionsAPI.getAll();
      setTransactions(txRes.transactions || []);
      toast.success('¡Transacción actualizada!');
      window.dispatchEvent(new Event('budgets-updated'));
    } catch {
      toast.error('Error al actualizar transacción');
    } finally {
      setLoading(false);
    }
  };
  const handleDeleteTransaction = async (id: string) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar esta transacción?')) {
      setLoading(true);
      try {
        await transactionsAPI.delete(id);
        setTransactions(transactions.filter(t => t.id !== id));
        toast.success('¡Transacción eliminada!');
        window.dispatchEvent(new Event('budgets-updated'));
      } catch {
        toast.error('Error al eliminar transacción');
      } finally {
        setLoading(false);
      }
    }
  };

  // Funciones para obtener nombre e icono de categoría (ya no necesarias, category es objeto completo)
  const getCategoryNameById = (categoryId: string): string => {
    const category = categories.find(c => c.id === categoryId);
    return category ? category.name : 'Otra';
  };
  const getCategoryIconById = (categoryId: string): string => {
    const category = categories.find(c => c.id === categoryId);
    return category ? category.icon : '📊';
  };

  // Obtener las categorías para el filtro
  const getCategories = (): Category[] => {
    return categories;
  };
  
  // Formatear la fecha para mostrar
  const getFormattedDateHeader = (dateStr: string): string => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    
    const transactionDate = parseDate(dateStr);
    
    if (transactionDate.getTime() === today.getTime()) {
      return 'Hoy';
    } else if (transactionDate.getTime() === yesterday.getTime()) {
      return 'Ayer';
    } else {
      return new Date(dateStr).toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
  };

  // Formatear moneda
  const formatCurrency = (amount: number, currency: string): string => {
    return `${currency}${amount.toLocaleString('es-DO')}`;
  };
  
  // Iniciar la edición de una transacción
  const handleEditTransactionClick = (transaction: Transaction) => {
    setEditTransaction(transaction);
    setShowForm(true);
  };
  
  const filteredTransactions = getFilteredTransactions();
  const groupedTransactions = groupTransactionsByDate(filteredTransactions);
  
  return (
    <div className="min-h-screen bg-background px-4 md:px-8 py-6">
      <Navigation />
      
      <div className="screen-container">
        <div className="screen-header">
          <h2 className="section-title text-text mb-6 font-bold">Transacciones</h2>
          <button 
            className="primary-button" 
            onClick={() => {
              if (categories.length === 0) {
                alert('Debes esperar a que las categorías se carguen antes de crear una transacción.');
                return;
              }
              setEditTransaction(null);
              setShowForm(true);
            }}
            disabled={categories.length === 0}
          >
            + Nueva
          </button>
        </div>
        
        <div className="filter-section">
          <div className="filter-group">
            <label>Tipo:</label>
            <select 
              className="filter-select"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="all">Todos</option>
              <option value="INCOME">Ingresos</option>
              <option value="EXPENSE">Gastos</option>
            </select>
          </div>
          
          <div className="filter-group">
            <label>Categoría:</label>
            {/* Combo de categorías del filtro: */}
            <select
              className="filter-select"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="all">Todas</option>
              {categories
                .filter(cat => typeFilter === 'all' || cat.type === typeFilter)
                .map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
            </select>
          </div>
          
          <div className="filter-group">
            <label>Periodo:</label>
            <select 
              className="filter-select"
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value)}
            >
              <option value="all">Todas</option>
              <option value="this-month">Este mes</option>
              <option value="last-month">Mes pasado</option>
              <option value="3-months">Últimos 3 meses</option>
              <option value="year">Este año</option>
            </select>
          </div>
        </div>
        
        <div className="transactions-list-container">
          {loading && <div className="text-center py-4">Cargando datos...</div>}
          {groupedTransactions.length > 0 ? (
            groupedTransactions.map(group => (
              <div className="transaction-group" key={group.date}>
                <h3 className="transaction-date-header">{getFormattedDateHeader(group.date)}</h3>
                
                {group.transactions.map(transaction => {
                  const icon = typeof transaction.category === 'object' && transaction.category !== null ? transaction.category.icon : '📊';
                  const name = typeof transaction.category === 'object' && transaction.category !== null ? transaction.category.name : '';
                  return (
                    <div 
                      className={`transaction-item ${transaction.type}`} 
                      key={transaction.id}
                      onClick={() => handleEditTransactionClick(transaction)}
                    >
                      <div className="transaction-icon">
                        {icon}
                      </div>
                      <div className="transaction-info">
                        <p className="transaction-title">
                          {transaction.description || name || 'Sin descripción'}
                        </p>
                      </div>
                      <p className={`transaction-amount ${transaction.type === 'INCOME' ? 'income' : 'expense'}`}> 
                        <span className={`transaction-sign ${transaction.type === 'INCOME' ? 'income' : 'expense'}`}>{transaction.type === 'INCOME' ? '+' : '−'}</span>
                        {formatCurrency(transaction.amount, currency)}
                      </p>
                      <button 
                        className="delete-button" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTransaction(transaction.id);
                        }}
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
            ))
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">📊</div>
              <h3>No hay transacciones</h3>
              <p>No hay transacciones que coincidan con los filtros seleccionados.</p>
              <button 
                className="primary-button" 
                onClick={() => {
                  setEditTransaction(null);
                  setShowForm(true);
                }}
              >
                + Nueva Transacción
              </button>
            </div>
          )}
        </div>
        
        {showForm && (
          <TransactionFormWeb
            key={categories.length}
            onClose={() => setShowForm(false)}
            editTransaction={editTransaction}
            categories={categories}
            onSave={handleCreateTransaction}
            onEdit={handleEditTransaction}
          />
        )}
      </div>
    </div>
  );
};

export default Transactions; 