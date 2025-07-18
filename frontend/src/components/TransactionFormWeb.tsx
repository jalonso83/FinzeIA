import React, { useState, useEffect } from 'react';
import type { Transaction, Category } from '../utils/api';
import './TransactionForm.css';

interface TransactionFormWebProps {
  onClose: () => void;
  editTransaction?: Transaction | null;
  categories: Category[];
  onSave: (data: any) => void;
  onEdit: (id: string, data: any) => void;
}

const TransactionFormWeb: React.FC<TransactionFormWebProps> = ({ onClose, editTransaction = null, categories, onSave, onEdit }) => {
  // Form state
  const [type, setType] = useState<'income' | 'expense'>(editTransaction?.type?.toLowerCase() as 'income' | 'expense' || 'income');
  const [amount, setAmount] = useState(editTransaction?.amount?.toString() || '');
  const [category, setCategory] = useState(editTransaction?.category?.id || '');
  const [description, setDescription] = useState(editTransaction?.description || '');
  const [date, setDate] = useState(editTransaction?.date ? new Date(editTransaction.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
  
  // Validation state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Currency converter state
  const [showConverter, setShowConverter] = useState(false);
  const [conversionDirection, setConversionDirection] = useState<'foreignToBase' | 'baseToForeign'>('foreignToBase');
  const [foreignAmount, setForeignAmount] = useState('');
  const [foreignCurrency, setForeignCurrency] = useState('USD');
  const [exchangeRate, setExchangeRate] = useState('');
  const [converterErrors, setConverterErrors] = useState<Record<string, string>>({});
  const [convertedAmount, setConvertedAmount] = useState<number | null>(null);
  const [lastExchangeRates, setLastExchangeRates] = useState<Record<string, number>>({});
  
  const currency = { code: 'DOP', symbol: 'RD$', decimalPlaces: 2 };

  // Effect to save last exchange rates to localStorage
  useEffect(() => {
    try {
      const savedRates = localStorage.getItem('lastExchangeRates');
      if (savedRates) {
        setLastExchangeRates(JSON.parse(savedRates));
      }
    } catch (error) {
      console.error('Error loading saved exchange rates:', error);
    }
  }, []);
  
  // Effect to calculate conversion when values change
  useEffect(() => {
    if (foreignAmount && exchangeRate && parseFloat(foreignAmount) > 0 && parseFloat(exchangeRate) > 0) {
      calculateConversion();
    } else {
      setConvertedAmount(null);
    }
  }, [foreignAmount, exchangeRate, foreignCurrency, conversionDirection]);
  
  // Effect to set exchange rate when foreign currency changes
  useEffect(() => {
    if (lastExchangeRates[`${currency.code}_${foreignCurrency}`] && conversionDirection === 'foreignToBase') {
      setExchangeRate(lastExchangeRates[`${currency.code}_${foreignCurrency}`].toString());
    } else if (lastExchangeRates[`${foreignCurrency}_${currency.code}`] && conversionDirection === 'baseToForeign') {
      setExchangeRate(lastExchangeRates[`${foreignCurrency}_${currency.code}`].toString());
    } else {
      setExchangeRate('');
    }
  }, [foreignCurrency, conversionDirection, lastExchangeRates]);

  // Get categories based on transaction type
  const getFilteredCategories = () => {
    const transactionType = type === 'income' ? 'INCOME' : 'EXPENSE';
    return categories.filter(cat => cat.type === transactionType);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Reset errors
    setErrors({});
    let hasErrors = false;
    const newErrors: Record<string, string> = {};

    // Validate amount
    if (!amount.trim()) {
      newErrors.amount = 'El monto es requerido';
      hasErrors = true;
    } else if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      newErrors.amount = 'El monto debe ser un número positivo';
      hasErrors = true;
    }

    // Validate category
    if (!category) {
      newErrors.category = 'La categoría es requerida';
      hasErrors = true;
    }

    // Update errors state if there are any
    if (hasErrors) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      const transactionData = {
        amount: parseFloat(amount),
        type: type.toUpperCase() as 'INCOME' | 'EXPENSE',
        category_id: category,
        description: description.trim() || undefined,
        date: new Date(date).toISOString(),
      };

      console.log('Transaction data:', transactionData);
      
      if (editTransaction) {
        // Update existing transaction
        await onEdit(editTransaction.id, transactionData);
      } else {
        // Create new transaction
        await onSave(transactionData);
      }

      onClose();
    } catch (error) {
      console.error('Error saving transaction:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Open currency converter
  const openConverter = () => {
    setShowConverter(true);
    setForeignAmount('');
    setConvertedAmount(null);
    setConverterErrors({});
    
    if (amount && !isNaN(parseFloat(amount)) && parseFloat(amount) > 0 && conversionDirection === 'baseToForeign') {
      setForeignAmount(amount);
    }
  };
  
  // Close currency converter
  const closeConverter = () => {
    setShowConverter(false);
  };
  
  // Toggle conversion direction
  const toggleConversionDirection = (direction: 'foreignToBase' | 'baseToForeign') => {
    setConversionDirection(direction);
    setForeignAmount('');
    setConvertedAmount(null);
  };
  
  // Calculate conversion
  const calculateConversion = () => {
    const foreignAmountValue = parseFloat(foreignAmount);
    const exchangeRateValue = parseFloat(exchangeRate);
    
    if (!isNaN(foreignAmountValue) && !isNaN(exchangeRateValue) && foreignAmountValue > 0 && exchangeRateValue > 0) {
      let result;
      
      if (conversionDirection === 'foreignToBase') {
        result = foreignAmountValue * exchangeRateValue;
      } else {
        result = foreignAmountValue / exchangeRateValue;
      }
      
      setConvertedAmount(result);
    } else {
      setConvertedAmount(null);
    }
  };
  
  // Apply converted amount to transaction
  const applyConversion = () => {
    const newErrors: Record<string, string> = {};
    let hasErrors = false;
    
    if (!foreignAmount.trim()) {
      newErrors.foreignAmount = 'Campo requerido';
      hasErrors = true;
    } else if (isNaN(parseFloat(foreignAmount)) || parseFloat(foreignAmount) <= 0) {
      newErrors.foreignAmount = 'Monto inválido';
      hasErrors = true;
    }
    
    if (!exchangeRate.trim()) {
      newErrors.exchangeRate = 'Campo requerido';
      hasErrors = true;
    } else if (isNaN(parseFloat(exchangeRate)) || parseFloat(exchangeRate) <= 0) {
      newErrors.exchangeRate = 'Tasa inválida';
      hasErrors = true;
    }
    
    if (hasErrors) {
      setConverterErrors(newErrors);
      return;
    }

    if (convertedAmount !== null) {
      setAmount(convertedAmount.toFixed(currency.decimalPlaces));
      
      // Save exchange rate to localStorage
      const rateKey = conversionDirection === 'foreignToBase' 
        ? `${currency.code}_${foreignCurrency}`
        : `${foreignCurrency}_${currency.code}`;
      
      const newRates = { ...lastExchangeRates, [rateKey]: parseFloat(exchangeRate) };
      setLastExchangeRates(newRates);
      
      try {
        localStorage.setItem('lastExchangeRates', JSON.stringify(newRates));
      } catch (error) {
        console.error('Error saving exchange rates:', error);
      }
      
      closeConverter();
    }
  };

  // Get category icon by ID
  const getCategoryIconById = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    return category?.icon || '📊';
  };

  // Sincronizar el valor del combo de categoría al editar
  useEffect(() => {
    if (editTransaction) {
      // Si la categoría es un objeto, usar su ID; si es string, usarlo directamente
      const categoryId = typeof editTransaction.category === 'object' 
        ? editTransaction.category.id 
        : editTransaction.category;
      setCategory(categoryId);
    }
  }, [editTransaction, categories]);

  // Log de depuración para ver las categorías recibidas y filtradas
  console.log('Categorías recibidas en el modal:', categories);
  console.log('Categorías filtradas:', getFilteredCategories());
  // Antes de renderizar el combo de categorías en el modal:
  console.log('Array categories en el render del modal:', categories);

  return (
    <div className="transaction-form-container">
      <div className="transaction-form-overlay" onClick={onClose}></div>
      
      <div className="transaction-form-modal">
        {/* Header */}
        <div className="transaction-form-header">
          <h2>{editTransaction ? 'Editar Transacción' : 'Nueva Transacción'}</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        {/* Form */}
        <form className="transaction-form" onSubmit={handleSubmit}>
          {/* Type Toggle */}
          <div className="type-toggle">
            <button
              type="button"
              className={`type-button ${type === 'income' ? 'active income' : ''}`}
              onClick={() => setType('income')}
            >
              <span className="type-icon">💰</span>
              Ingreso
            </button>
            <button
              type="button"
              className={`type-button ${type === 'expense' ? 'active expense' : ''}`}
              onClick={() => setType('expense')}
            >
              <span className="type-icon">💸</span>
              Gasto
            </button>
          </div>

          {/* Amount */}
          <div className="form-group">
            <label htmlFor="amount">Monto</label>
            <div className="input-with-prefix">
              <span className="input-prefix">{currency.symbol}</span>
              <input
                type="number"
                id="amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                step="0.01"
                min="0"
                className={errors.amount ? 'error' : ''}
              />
            </div>
            {errors.amount && <div className="error-message">{errors.amount}</div>}
            
            {/* Currency Converter Button */}
            <button
              type="button"
              className="converter-button"
              onClick={openConverter}
            >
              <span className="converter-button-icon">💱</span>
              Convertir Moneda
            </button>
          </div>

          {/* Category */}
          <div className="form-group">
            <label htmlFor="category">Categoría</label>
            {/* Combo de categorías en el modal: */}
            <select
              id="category"
              value={category}
              onChange={e => setCategory(e.target.value)}
              className={errors.category ? 'error' : ''}
            >
              <option value="">Seleccionar categoría</option>
              {categories
                .filter(cat => cat.type === (type === 'income' ? 'INCOME' : 'EXPENSE'))
                .map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.icon} {cat.name}
                  </option>
                ))}
            </select>
            {errors.category && <div className="error-message">{errors.category}</div>}
            {categories.length === 0 && (
              <div className="text-xs text-red-500 mt-1">No hay categorías disponibles. Crea una desde la administración.</div>
            )}
          </div>

          {/* Description */}
          <div className="form-group">
            <label htmlFor="description">Descripción (opcional)</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe la transacción..."
              rows={3}
            />
          </div>

          {/* Date */}
          <div className="form-group">
            <label htmlFor="date">Fecha</label>
            <input
              type="date"
              id="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          {/* Actions */}
          <div className="form-actions">
            <button
              type="button"
              className="cancel-button"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="submit-button"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Guardando...' : (editTransaction ? 'Actualizar' : 'Crear')}
            </button>
          </div>
        </form>
      </div>

      {/* Currency Converter Modal */}
      {showConverter && (
        <div className="converter-modal-container">
          <div className="converter-modal-overlay" onClick={closeConverter}></div>
          
          <div className="converter-modal">
            <div className="converter-header">
              <h3>Convertir Moneda</h3>
              <button className="close-button" onClick={closeConverter}>×</button>
            </div>
            
            <div className="converter-content">
              {/* Conversion Direction Toggle */}
              <div className="conversion-direction-toggle">
                <button
                  type="button"
                  className={`direction-button ${conversionDirection === 'foreignToBase' ? 'active' : ''}`}
                  onClick={() => toggleConversionDirection('foreignToBase')}
                >
                  {foreignCurrency} → {currency.code}
                </button>
                <button
                  type="button"
                  className={`direction-button ${conversionDirection === 'baseToForeign' ? 'active' : ''}`}
                  onClick={() => toggleConversionDirection('baseToForeign')}
                >
                  {currency.code} → {foreignCurrency}
                </button>
              </div>

              {/* Foreign Amount */}
              <div className="form-group">
                <label htmlFor="foreignAmount">Monto en {foreignCurrency}</label>
                <input
                  type="number"
                  id="foreignAmount"
                  value={foreignAmount}
                  onChange={(e) => setForeignAmount(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className={converterErrors.foreignAmount ? 'error' : ''}
                />
                {converterErrors.foreignAmount && <div className="error-message">{converterErrors.foreignAmount}</div>}
              </div>

              {/* Exchange Rate */}
              <div className="form-group">
                <label htmlFor="exchangeRate">Tasa de Cambio</label>
                <input
                  type="number"
                  id="exchangeRate"
                  value={exchangeRate}
                  onChange={(e) => setExchangeRate(e.target.value)}
                  placeholder="0.00"
                  step="0.0001"
                  min="0"
                  className={converterErrors.exchangeRate ? 'error' : ''}
                />
                {converterErrors.exchangeRate && <div className="error-message">{converterErrors.exchangeRate}</div>}
              </div>

              {/* Converted Amount Display */}
              {convertedAmount !== null && (
                <div className="converted-amount">
                  <strong>Resultado: {currency.symbol}{convertedAmount.toFixed(currency.decimalPlaces)}</strong>
                </div>
              )}

              {/* Converter Actions */}
              <div className="form-actions">
                <button
                  type="button"
                  className="cancel-button"
                  onClick={closeConverter}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="submit-button"
                  onClick={applyConversion}
                  disabled={convertedAmount === null}
                >
                  Aplicar Conversión
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionFormWeb; 