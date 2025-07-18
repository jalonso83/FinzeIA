import React, { useState } from 'react';
import api from '../../utils/api';

interface ProfileFormProps {
  user: any;
  onClose: () => void;
  onProfileUpdated: () => void;
}

const occupationOptions = [
  'Estudiante',
  'Empleado/a',
  'Empresario/a',
  'Profesional independiente',
  'Funcionario público',
  'Jubilado/a',
  'Ama/o de casa',
  'Otra'
];

const latinAmericanCountries = [
  'Argentina', 'Bolivia', 'Brasil', 'Chile', 'Colombia', 'Costa Rica', 'Cuba', 'Ecuador', 'El Salvador',
  'Guatemala', 'Honduras', 'México', 'Nicaragua', 'Panamá', 'Paraguay', 'Perú', 'Puerto Rico',
  'República Dominicana', 'Uruguay', 'Venezuela', 'Estados Unidos', 'España'
];

const currencies = [
  { code: 'ARS', name: 'Peso Argentino', symbol: '$' },
  { code: 'BOB', name: 'Boliviano', symbol: 'Bs.' },
  { code: 'BRL', name: 'Real Brasileño', symbol: 'R$' },
  { code: 'CLP', name: 'Peso Chileno', symbol: '$' },
  { code: 'COP', name: 'Peso Colombiano', symbol: '$' },
  { code: 'CRC', name: 'Colón Costarricense', symbol: '₡' },
  { code: 'CUP', name: 'Peso Cubano', symbol: '$' },
  { code: 'DOP', name: 'Peso Dominicano', symbol: 'RD$' },
  { code: 'USD', name: 'Dólar Estadounidense', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GTQ', name: 'Quetzal Guatemalteco', symbol: 'Q' },
  { code: 'HNL', name: 'Lempira Hondureño', symbol: 'L' },
  { code: 'MXN', name: 'Peso Mexicano', symbol: '$' },
  { code: 'NIO', name: 'Córdoba Nicaragüense', symbol: 'C$' },
  { code: 'PAB', name: 'Balboa Panameño', symbol: 'B/.' },
  { code: 'PYG', name: 'Guaraní Paraguayo', symbol: '₲' },
  { code: 'PEN', name: 'Sol Peruano', symbol: 'S/' },
  { code: 'UYU', name: 'Peso Uruguayo', symbol: '$' },
  { code: 'VEF', name: 'Bolívar Venezolano', symbol: 'Bs.' },
  { code: 'VES', name: 'Bolívar Soberano', symbol: 'Bs.S' },
  { code: 'PR', name: 'Dólar Estadounidense', symbol: '$' }, // Puerto Rico
];

const ProfileForm: React.FC<ProfileFormProps> = ({ user, onClose, onProfileUpdated }) => {
  const [form, setForm] = useState({
    name: user?.name || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    birthDate: user?.birthDate ? user.birthDate.slice(0, 10) : '',
    country: user?.country || '',
    state: user?.state || '',
    city: user?.city || '',
    currency: user?.currency || '',
    preferredLanguage: user?.preferredLanguage || 'es',
    occupation: user?.occupation || '',
    company: user?.company || ''
  });
  const [errors, setErrors] = useState<any>({});
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    const newErrors: any = {};
    if (!form.name) newErrors.name = 'El nombre es obligatorio';
    if (!form.lastName) newErrors.lastName = 'Los apellidos son obligatorios';
    if (!form.email) newErrors.email = 'El email es obligatorio';
    else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) newErrors.email = 'Email inválido';
    if (!form.phone) newErrors.phone = 'El teléfono es obligatorio';
    if (!form.birthDate) newErrors.birthDate = 'La fecha de nacimiento es obligatoria';
    if (!form.country) newErrors.country = 'El país es obligatorio';
    if (!form.state) newErrors.state = 'El estado es obligatorio';
    if (!form.city) newErrors.city = 'La ciudad es obligatoria';
    if (!form.occupation) newErrors.occupation = 'La ocupación es obligatoria';
    return newErrors;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    // Limpiar error del campo cuando el usuario empiece a escribir
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: '' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validate();
    setErrors(validation);
    
    if (Object.keys(validation).length > 0) {
      return;
    }

    setSubmitting(true);
    
    try {
      await api.put('/auth/profile', form);
      onProfileUpdated();
      onClose();
    } catch (error: any) {
      console.error('Error al actualizar perfil:', error);
      const errorMessage = error?.response?.data?.message || 'Error al actualizar perfil';
      setErrors({ general: errorMessage });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-800">Editar Perfil</h2>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-gray-700 text-2xl font-bold"
            >
              &times;
            </button>
          </div>
        </div>
        
        <div className="p-6">
          {errors.general && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {errors.general}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <h4 className="text-lg font-semibold text-gray-800 border-b-2 border-gray-200 pb-2 mb-4">
              Información Personal
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input 
                  name="name" 
                  type="text" 
                  value={form.name} 
                  onChange={handleChange} 
                  placeholder="Tu nombre" 
                  className={`w-full px-4 py-3 border border-gray-300 rounded-lg text-base bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${errors.name ? 'border-red-500' : ''}`} 
                />
                {errors.name && <div className="text-xs text-red-500 mt-1">{errors.name}</div>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Apellidos *</label>
                <input 
                  name="lastName" 
                  type="text" 
                  value={form.lastName} 
                  onChange={handleChange} 
                  placeholder="Tus apellidos" 
                  className={`w-full px-4 py-3 border border-gray-300 rounded-lg text-base bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${errors.lastName ? 'border-red-500' : ''}`} 
                />
                {errors.lastName && <div className="text-xs text-red-500 mt-1">{errors.lastName}</div>}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input 
                name="email" 
                type="email" 
                value={form.email} 
                onChange={handleChange} 
                placeholder="tu@email.com" 
                className={`w-full px-4 py-3 border border-gray-300 rounded-lg text-base bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${errors.email ? 'border-red-500' : ''}`} 
              />
              {errors.email && <div className="text-xs text-red-500 mt-1">{errors.email}</div>}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono *</label>
                <input 
                  name="phone" 
                  type="tel" 
                  value={form.phone} 
                  onChange={handleChange} 
                  placeholder="+52 123 456 7890" 
                  className={`w-full px-4 py-3 border border-gray-300 rounded-lg text-base bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${errors.phone ? 'border-red-500' : ''}`} 
                />
                {errors.phone && <div className="text-xs text-red-500 mt-1">{errors.phone}</div>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Nacimiento *</label>
                <input 
                  name="birthDate" 
                  type="date" 
                  value={form.birthDate} 
                  onChange={handleChange} 
                  className={`w-full px-4 py-3 border border-gray-300 rounded-lg text-base bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${errors.birthDate ? 'border-red-500' : ''}`} 
                />
                {errors.birthDate && <div className="text-xs text-red-500 mt-1">{errors.birthDate}</div>}
              </div>
            </div>
            
            <h4 className="text-lg font-semibold text-gray-800 border-b-2 border-gray-200 pb-2 mb-4">
              Información Básica
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">País *</label>
                <select 
                  name="country" 
                  value={form.country} 
                  onChange={handleChange} 
                  className={`w-full px-4 py-3 border border-gray-300 rounded-lg text-base bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${errors.country ? 'border-red-500' : ''}`}
                >
                  <option value="">Selecciona tu país</option>
                  {latinAmericanCountries.map(country => (
                    <option key={country} value={country}>{country}</option>
                  ))}
                </select>
                {errors.country && <div className="text-xs text-red-500 mt-1">{errors.country}</div>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estado *</label>
                <input 
                  name="state" 
                  type="text" 
                  value={form.state} 
                  onChange={handleChange} 
                  placeholder="Tu estado" 
                  className={`w-full px-4 py-3 border border-gray-300 rounded-lg text-base bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${errors.state ? 'border-red-500' : ''}`} 
                />
                {errors.state && <div className="text-xs text-red-500 mt-1">{errors.state}</div>}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ciudad *</label>
                <input 
                  name="city" 
                  type="text" 
                  value={form.city} 
                  onChange={handleChange} 
                  placeholder="Tu ciudad" 
                  className={`w-full px-4 py-3 border border-gray-300 rounded-lg text-base bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${errors.city ? 'border-red-500' : ''}`} 
                />
                {errors.city && <div className="text-xs text-red-500 mt-1">{errors.city}</div>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Moneda</label>
                <select 
                  name="currency" 
                  value={form.currency} 
                  onChange={handleChange} 
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                >
                  <option value="">Selecciona tu moneda</option>
                  {currencies.map(currency => (
                    <option key={currency.code} value={currency.code}>
                      {currency.name} ({currency.code}) {currency.symbol}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Idioma Preferido</label>
                <select 
                  name="preferredLanguage" 
                  value={form.preferredLanguage} 
                  onChange={handleChange} 
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                >
                  <option value="es">Español</option>
                  <option value="en">English</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ocupación *</label>
                <select 
                  name="occupation" 
                  value={form.occupation} 
                  onChange={handleChange} 
                  className={`w-full px-4 py-3 border border-gray-300 rounded-lg text-base bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${errors.occupation ? 'border-red-500' : ''}`}
                >
                  <option value="">Selecciona tu ocupación</option>
                  {occupationOptions.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
                {errors.occupation && <div className="text-xs text-red-500 mt-1">{errors.occupation}</div>}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Empresa (Opcional)</label>
              <input 
                name="company" 
                type="text" 
                value={form.company} 
                onChange={handleChange} 
                placeholder="Nombre de tu empresa" 
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition" 
              />
            </div>
            
            <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
              <button 
                type="button"
                onClick={onClose}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold text-base hover:bg-gray-300 transition"
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                disabled={submitting}
                className="px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold text-base hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProfileForm; 