import React, { useState, useEffect } from 'react';
import api from '../../utils/api';

interface Category {
  id: string;
  name: string;
  icon: string;
  type: string;
}

interface Goal {
  id: string;
  name: string;
  description?: string;
  targetAmount: number;
  targetDate?: string;
  categoryId: string;
  priority: string;
  monthlyTargetPercentage?: number;
  monthlyContributionAmount?: number;
}

interface GoalFormProps {
  onClose: () => void;
  onGoalCreated: () => void;
  editGoal?: Goal | null;
}

interface FormData {
  name: string;
  description: string;
  targetAmount: string;
  targetDate: string;
  categoryId: string;
  priority: 'low' | 'medium' | 'high';
  monthlyTargetPercentage: string;
  monthlyContributionAmount: string;
}

const GoalForm: React.FC<GoalFormProps> = ({ onClose, onGoalCreated, editGoal }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [goalType, setGoalType] = useState<'percentage' | 'amount'>('percentage');
  const [warnings, setWarnings] = useState<string[]>([]);
  
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    targetAmount: '',
    targetDate: '',
    categoryId: '',
    priority: 'medium',
    monthlyTargetPercentage: '',
    monthlyContributionAmount: ''
  });

  // Cargar datos de la meta a editar
  useEffect(() => {
    if (editGoal) {
      setFormData({
        name: editGoal.name,
        description: editGoal.description || '',
        targetAmount: editGoal.targetAmount.toString(),
        targetDate: editGoal.targetDate ? new Date(editGoal.targetDate).toISOString().split('T')[0] : '',
        categoryId: editGoal.categoryId,
        priority: editGoal.priority as 'low' | 'medium' | 'high',
        monthlyTargetPercentage: editGoal.monthlyTargetPercentage?.toString() || '',
        monthlyContributionAmount: editGoal.monthlyContributionAmount?.toString() || ''
      });

      // Determinar el tipo de meta
      if (editGoal.monthlyTargetPercentage) {
        setGoalType('percentage');
      } else if (editGoal.monthlyContributionAmount) {
        setGoalType('amount');
      }
    }
  }, [editGoal]);

  // Cargar categorías al montar el componente
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await api.get('/categories');
        setCategories(response.data);
      } catch (error) {
        console.error('Error al cargar categorías:', error);
      }
    };
    fetchCategories();
  }, []);

  // Validar y mostrar advertencias
  const validateForm = () => {
    const newWarnings: string[] = [];

    // Validar porcentaje mensual
    if (goalType === 'percentage' && formData.monthlyTargetPercentage) {
      const percentage = parseFloat(formData.monthlyTargetPercentage);
      if (percentage > 30) {
        newWarnings.push('⚠️ Dedicar más del 30% de tus ingresos puede ser difícil de mantener. Considera un porcentaje más conservador.');
      }
      if (percentage > 50) {
        newWarnings.push('🚨 ¡Cuidado! Más del 50% de tus ingresos es muy agresivo y puede afectar tu calidad de vida.');
      }
    }

    // Validar monto fijo mensual (asumiendo ingreso estimado de 100,000 RD$)
    if (goalType === 'amount' && formData.monthlyContributionAmount) {
      const amount = parseFloat(formData.monthlyContributionAmount);
      const estimatedIncome = 100000; // Esto debería venir del perfil del usuario
      const percentageOfIncome = (amount / estimatedIncome) * 100;
      
      if (percentageOfIncome > 30) {
        newWarnings.push(`⚠️ Este monto representa el ${percentageOfIncome.toFixed(1)}% de tus ingresos estimados. Asegúrate de que sea sostenible.`);
      }
    }

    setWarnings(newWarnings);
    return newWarnings.length === 0;
  };

  // Validar cuando cambian los campos
  useEffect(() => {
    validateForm();
  }, [formData.monthlyTargetPercentage, formData.monthlyContributionAmount, goalType]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validaciones básicas
      if (!formData.name || !formData.targetAmount || !formData.categoryId) {
        alert('Por favor completa todos los campos requeridos');
        return;
      }

      if (parseFloat(formData.targetAmount) <= 0) {
        alert('El monto objetivo debe ser mayor a 0');
        return;
      }

      // Preparar datos para enviar
      const goalData = {
        name: formData.name,
        description: formData.description || undefined,
        targetAmount: parseFloat(formData.targetAmount),
        targetDate: formData.targetDate || undefined,
        categoryId: formData.categoryId,
        priority: formData.priority,
        monthlyTargetPercentage: goalType === 'percentage' ? parseFloat(formData.monthlyTargetPercentage) : undefined,
        monthlyContributionAmount: goalType === 'amount' ? parseFloat(formData.monthlyContributionAmount) : undefined
      };

      if (editGoal) {
        // Actualizar meta existente
        await api.put(`/goals/${editGoal.id}`, goalData);
      } else {
        // Crear nueva meta
        await api.post('/goals', goalData);
      }
      
      // Cerrar modal y actualizar lista
      onGoalCreated();
      onClose();
    } catch (error: any) {
      console.error('Error al guardar meta:', error);
      alert(error.response?.data?.error || 'Error al guardar la meta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-4xl max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h3 className="text-xl font-semibold text-gray-800">
            {editGoal ? 'Editar Meta de Ahorro' : 'Nueva Meta de Ahorro'}
          </h3>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(85vh-140px)]">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Columna Izquierda - Información Principal */}
            <div className="space-y-5">
              <h4 className="text-lg font-medium text-gray-800 mb-4">Información Principal</h4>
              
              {/* Nombre de la meta */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre de la meta *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Ej: La casa de mis sueños"
                  required
                />
              </div>

              {/* Monto objetivo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Monto objetivo *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    name="targetAmount"
                    value={formData.targetAmount}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="0.00"
                    min="1000"
                    step="1000"
                    required
                  />
                  <span className="absolute right-3 top-2 text-gray-500">RD$</span>
                </div>
              </div>

              {/* Categoría */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Categoría *
                </label>
                <select
                  name="categoryId"
                  value={formData.categoryId}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  required
                >
                  <option value="">Selecciona una categoría</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.icon} {category.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Objetivo mensual */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Objetivo mensual *
                </label>
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="percentage"
                      checked={goalType === 'percentage'}
                      onChange={() => setGoalType('percentage')}
                      className="mr-2"
                    />
                    Porcentaje de mis ingresos
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="amount"
                      checked={goalType === 'amount'}
                      onChange={() => setGoalType('amount')}
                      className="mr-2"
                    />
                    Monto fijo mensual
                  </label>
                </div>
              </div>

              {/* Campo de porcentaje o monto */}
              <div>
                {goalType === 'percentage' ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Porcentaje mensual *
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        name="monthlyTargetPercentage"
                        value={formData.monthlyTargetPercentage}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        placeholder="15"
                        min="1"
                        max="100"
                        required
                      />
                      <span className="absolute right-3 top-2 text-gray-500">%</span>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Monto fijo mensual *
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        name="monthlyContributionAmount"
                        value={formData.monthlyContributionAmount}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        placeholder="50000"
                        min="1000"
                        step="1000"
                        required
                      />
                      <span className="absolute right-3 top-2 text-gray-500">RD$</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Columna Derecha - Información Adicional */}
            <div className="space-y-5">
              <h4 className="text-lg font-medium text-gray-800 mb-4">Información Adicional</h4>
              
              {/* Fecha objetivo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha objetivo (opcional)
                </label>
                <input
                  type="date"
                  name="targetDate"
                  value={formData.targetDate}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

                            {/* Prioridad */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Prioridad
                </label>
                <select
                  name="priority"
                  value={formData.priority}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="low">Baja</option>
                  <option value="medium">Media</option>
                  <option value="high">Alta</option>
                </select>
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descripción (opcional)
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Describe tu meta..."
                  rows={3}
                />
              </div>

              {/* Advertencias */}
              {warnings.length > 0 && (
                <div className="space-y-2">
                  <h5 className="text-sm font-medium text-gray-700">Advertencias:</h5>
                  {warnings.map((warning, index) => (
                    <div key={index} className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-800">{warning}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </form>
        </div>

        {/* Footer con botones */}
        <div className="flex gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-white transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {loading ? 'Guardando...' : (editGoal ? 'Actualizar Meta' : 'Crear Meta')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GoalForm; 