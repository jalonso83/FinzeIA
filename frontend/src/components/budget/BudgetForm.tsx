import React, { useState, useEffect, useMemo } from 'react';
import '../../pages/Screens.css';
import { budgetsAPI, categoriesAPI, type Category, type Budget } from '../../utils/api';

interface BudgetFormProps {
  onClose: () => void;
  editBudget?: Budget | null;
  onSaved?: () => void;
}

const periodOptions = [
  { value: 'weekly', label: 'Semanal' },
  { value: 'monthly', label: 'Mensual' },
  { value: 'yearly', label: 'Anual' },
];

function getPeriodDates(period: string): { start: string; end: string } {
  const now = new Date();
  let start: Date, end: Date;
  if (period === 'weekly') {
    // Lunes de la semana actual
    const day = now.getDay();
    const diffToMonday = (day === 0 ? -6 : 1) - day;
    start = new Date(now);
    start.setDate(now.getDate() + diffToMonday);
    start.setHours(0, 0, 0, 0);
    // Domingo de la semana actual
    end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
  } else if (period === 'monthly') {
    start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  } else if (period === 'yearly') {
    start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
    end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
  } else {
    start = now;
    end = now;
  }
  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

const BudgetForm: React.FC<BudgetFormProps> = ({ onClose, editBudget, onSaved }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState(editBudget?.category?.id || '');
  const [amount, setAmount] = useState(editBudget?.amount?.toString() || '');
  const [period, setPeriod] = useState(editBudget?.period || 'monthly');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Obtener nombre de la categoría seleccionada
  const categoryName = useMemo(() => {
    const cat = categories.find(c => c.id === categoryId);
    return cat ? cat.name : '';
  }, [categoryId, categories]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const cats = await categoriesAPI.getAll();
        setCategories(cats.filter((cat: Category) => cat.type === 'EXPENSE'));
      } catch {
        setError('Error al cargar categorías');
      }
    };
    fetchCategories();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (!categoryId || !amount || !period) {
        setError('Todos los campos son obligatorios');
        setLoading(false);
        return;
      }
      const { start, end } = getPeriodDates(period);
      const data = {
        name: categoryName,
        category_id: categoryId,
        amount: parseFloat(amount),
        period,
        start_date: start,
        end_date: end,
      };
      if (editBudget) {
        await budgetsAPI.update(editBudget.id, data);
      } else {
        await budgetsAPI.create(data);
      }
      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      setError('Error al guardar el presupuesto');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <form className="bg-white rounded-xl shadow-lg p-8 w-full max-w-lg" onSubmit={handleSubmit}>
        <h3 className="text-xl font-bold mb-6 text-primary">{editBudget ? 'Editar Presupuesto' : 'Nuevo Presupuesto'}</h3>
        <div className="mb-4">
          <label className="block text-gray-700 mb-1">Categoría</label>
          <select
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
            value={categoryId}
            onChange={e => setCategoryId(e.target.value)}
            required
          >
            <option value="">Selecciona una categoría</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>
                {cat.icon} {cat.name}
              </option>
            ))}
          </select>
        </div>
        <div className="mb-4">
          <label className="block text-gray-700 mb-1">Monto Límite</label>
          <div className="flex items-center">
            <span className="mr-2 text-gray-500">RD$</span>
            <input
              type="number"
              min="0"
              step="0.01"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              required
            />
          </div>
        </div>
        <div className="mb-6">
          <label className="block text-gray-700 mb-1">Período</label>
          <select
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
            value={period}
            onChange={e => setPeriod(e.target.value)}
            required
          >
            {periodOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        {error && <div className="text-red-500 mb-4 text-sm">{error}</div>}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="bg-gray-200 text-gray-700 rounded-lg px-6 py-2 font-semibold hover:bg-gray-300 transition"
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="bg-primary text-white rounded-lg px-6 py-2 font-semibold shadow hover:bg-secondary transition"
            disabled={loading}
          >
            {loading ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default BudgetForm; 