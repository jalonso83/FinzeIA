import { useState } from 'react';
import logo from '../assets/logo.png';
import { authAPI } from '../utils/api';

const initialState = {
  name: '',
  lastName: '',
  email: '',
  password: '',
  confirmPassword: '',
  phone: '',
  birthDate: '',
  country: '',
  state: '',
  city: '',
  currency: '',
  preferredLanguage: 'es',
  occupation: '',
  company: '',
};

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

const Register = () => {
  const [form, setForm] = useState(initialState);
  const [errors, setErrors] = useState<any>({});
  const [submitting, setSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  const validate = () => {
    const newErrors: any = {};
    if (!form.name) newErrors.name = 'El nombre es obligatorio';
    if (!form.lastName) newErrors.lastName = 'Los apellidos son obligatorios';
    if (!form.email) newErrors.email = 'El email es obligatorio';
    else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) newErrors.email = 'Email inválido';
    if (!form.password) newErrors.password = 'La contraseña es obligatoria';
    else if (form.password.length < 6) newErrors.password = 'Mínimo 6 caracteres';
    if (!form.confirmPassword) newErrors.confirmPassword = 'Confirma tu contraseña';
    else if (form.password !== form.confirmPassword) newErrors.confirmPassword = 'Las contraseñas no coinciden';
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
      console.log('Iniciando registro...');
      
      // Preparar datos para el backend
      const registerData = {
        name: form.name,
        lastName: form.lastName,
        email: form.email,
        password: form.password,
        phone: form.phone,
        birthDate: form.birthDate,
        country: form.country,
        state: form.state,
        city: form.city,
        currency: form.currency,
        preferredLanguage: form.preferredLanguage,
        occupation: form.occupation,
        company: form.company || undefined
      };

      console.log('Datos a enviar:', registerData);
      console.log('URL de la API:', `${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/auth/register`);

      await authAPI.register(registerData);
      
      console.log('Registro exitoso');
      alert('Usuario registrado exitosamente. Revisa tu email para verificar tu cuenta.');
      window.location.href = '/login';
      
    } catch (error: any) {
      console.error('Error completo al registrar:', error);
      console.error('Error response:', error.response);
      console.error('Error message:', error.message);
      
      let errorMessage = 'Error al registrar usuario';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      alert(`Error: ${errorMessage}`);
    } finally {
      console.log('Finalizando registro...');
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-5">
      <div className="w-full max-w-2xl flex flex-col items-center">
        <div className="text-center mb-8">
          <img src={logo} alt="FinZen AI" className="w-28 h-auto mx-auto mb-3" />
          <p className="text-base text-textSecondary">Tu copiloto financiero</p>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-8 w-full mb-6">
          <h2 className="text-2xl font-bold text-text text-center mb-2">Crea tu cuenta</h2>
          {/* Mensaje de bienvenida */}
          {currentStep === 1 && (
            <div className="mb-8 p-4 border-2 border-primary bg-[#f8f9fa] rounded-lg text-center">
              <h3 className="text-xl font-bold text-primary mb-2">¡Bienvenido/a a FinZen AI!</h3>
              <p className="text-base text-text">Para empezar, necesitamos conocer un poco sobre ti. Esta información nos ayudará a personalizar tu experiencia.</p>
            </div>
          )}
          {/* Formulario paso 1 */}
          {currentStep === 1 && (
            <form className="space-y-6" onSubmit={handleSubmit}>
              <h4 className="text-lg font-semibold text-text border-b-2 border-border pb-2 mb-4">Información Personal</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text mb-1">Nombre *</label>
                  <input name="name" type="text" value={form.name} onChange={handleChange} placeholder="Tu nombre" className={`w-full px-4 py-3 border border-border rounded-lg text-base bg-white focus:outline-none focus:ring-2 focus:ring-primary transition ${errors.name ? 'border-error' : ''}`} />
                  {errors.name && <div className="text-xs text-error mt-1">{errors.name}</div>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-text mb-1">Apellidos *</label>
                  <input name="lastName" type="text" value={form.lastName} onChange={handleChange} placeholder="Tus apellidos" className={`w-full px-4 py-3 border border-border rounded-lg text-base bg-white focus:outline-none focus:ring-2 focus:ring-primary transition ${errors.lastName ? 'border-error' : ''}`} />
                  {errors.lastName && <div className="text-xs text-error mt-1">{errors.lastName}</div>}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">Email *</label>
                <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="tu@email.com" className={`w-full px-4 py-3 border border-border rounded-lg text-base bg-white focus:outline-none focus:ring-2 focus:ring-primary transition ${errors.email ? 'border-error' : ''}`} />
                {errors.email && <div className="text-xs text-error mt-1">{errors.email}</div>}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text mb-1">Contraseña *</label>
                  <input name="password" type="password" value={form.password} onChange={handleChange} placeholder="••••••••" className={`w-full px-4 py-3 border border-border rounded-lg text-base bg-white focus:outline-none focus:ring-2 focus:ring-primary transition ${errors.password ? 'border-error' : ''}`} />
                  {errors.password && <div className="text-xs text-error mt-1">{errors.password}</div>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-text mb-1">Confirmar Contraseña *</label>
                  <input name="confirmPassword" type="password" value={form.confirmPassword} onChange={handleChange} placeholder="••••••••" className={`w-full px-4 py-3 border border-border rounded-lg text-base bg-white focus:outline-none focus:ring-2 focus:ring-primary transition ${errors.confirmPassword ? 'border-error' : ''}`} />
                  {errors.confirmPassword && <div className="text-xs text-error mt-1">{errors.confirmPassword}</div>}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text mb-1">Teléfono *</label>
                  <input name="phone" type="tel" value={form.phone} onChange={handleChange} placeholder="+52 123 456 7890" className={`w-full px-4 py-3 border border-border rounded-lg text-base bg-white focus:outline-none focus:ring-2 focus:ring-primary transition ${errors.phone ? 'border-error' : ''}`} />
                  {errors.phone && <div className="text-xs text-error mt-1">{errors.phone}</div>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-text mb-1">Fecha de Nacimiento *</label>
                  <input name="birthDate" type="date" value={form.birthDate} onChange={handleChange} className={`w-full px-4 py-3 border border-border rounded-lg text-base bg-white focus:outline-none focus:ring-2 focus:ring-primary transition ${errors.birthDate ? 'border-error' : ''}`} />
                  {errors.birthDate && <div className="text-xs text-error mt-1">{errors.birthDate}</div>}
                </div>
              </div>
              <h4 className="text-lg font-semibold text-text border-b-2 border-border pb-2 mb-4">Información Básica</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text mb-1">País *</label>
                  <select name="country" value={form.country} onChange={handleChange} className={`w-full px-4 py-3 border border-border rounded-lg text-base bg-white focus:outline-none focus:ring-2 focus:ring-primary transition ${errors.country ? 'border-error' : ''}`}>
                    <option value="">Selecciona tu país</option>
                    {latinAmericanCountries.map(country => (
                      <option key={country} value={country}>{country}</option>
                    ))}
                  </select>
                  {errors.country && <div className="text-xs text-error mt-1">{errors.country}</div>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-text mb-1">Estado / Provincia *</label>
                  <input name="state" type="text" value={form.state} onChange={handleChange} placeholder="Tu estado o provincia" className={`w-full px-4 py-3 border border-border rounded-lg text-base bg-white focus:outline-none focus:ring-2 focus:ring-primary transition ${errors.state ? 'border-error' : ''}`} />
                  {errors.state && <div className="text-xs text-error mt-1">{errors.state}</div>}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text mb-1">Ciudad *</label>
                  <input name="city" type="text" value={form.city} onChange={handleChange} placeholder="Tu ciudad" className={`w-full px-4 py-3 border border-border rounded-lg text-base bg-white focus:outline-none focus:ring-2 focus:ring-primary transition ${errors.city ? 'border-error' : ''}`} />
                  {errors.city && <div className="text-xs text-error mt-1">{errors.city}</div>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-text mb-1">Moneda</label>
                  <select name="currency" value={form.currency} onChange={handleChange} className="w-full px-4 py-3 border border-border rounded-lg text-base bg-white focus:outline-none focus:ring-2 focus:ring-primary transition">
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
                  <label className="block text-sm font-medium text-text mb-1">Idioma Preferido</label>
                  <select name="preferredLanguage" value={form.preferredLanguage} onChange={handleChange} className="w-full px-4 py-3 border border-border rounded-lg text-base bg-white focus:outline-none focus:ring-2 focus:ring-primary transition">
                    <option value="es">Español</option>
                    <option value="en">English</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text mb-1">Ocupación *</label>
                  <select name="occupation" value={form.occupation} onChange={handleChange} className={`w-full px-4 py-3 border border-border rounded-lg text-base bg-white focus:outline-none focus:ring-2 focus:ring-primary transition ${errors.occupation ? 'border-error' : ''}`}>
                    <option value="">Selecciona tu ocupación</option>
                    {occupationOptions.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                  {errors.occupation && <div className="text-xs text-error mt-1">{errors.occupation}</div>}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">Empresa (Opcional)</label>
                <input name="company" type="text" value={form.company} onChange={handleChange} placeholder="Nombre de tu empresa" className="w-full px-4 py-3 border border-border rounded-lg text-base bg-white focus:outline-none focus:ring-2 focus:ring-primary transition" />
              </div>
              <div className="flex justify-end gap-4 mt-8">
                {/* Botón para registrar */}
                <button 
                  type="submit" 
                  disabled={submitting}
                  className="px-8 py-3 bg-primary text-white rounded-lg font-semibold text-base hover:bg-secondary transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Registrando...' : 'Registrar'}
                </button>
              </div>
            </form>
          )}
          {/* Aquí irá el paso 2 (onboarding/IA) */}
          {currentStep === 2 && (
            <div className="text-center text-textSecondary py-12">
              <h3 className="text-xl font-bold mb-4">Próximamente: Onboarding FinZen AI</h3>
              <p>En esta sección se personalizará tu experiencia con preguntas inteligentes de nuestro asistente.</p>
              <button onClick={() => setCurrentStep(1)} className="mt-8 px-6 py-2 bg-border text-textSecondary rounded-lg font-semibold hover:bg-lightGray transition">Volver</button>
            </div>
          )}
        </div>
        <button onClick={() => window.location.href = '/login'} className="text-sm text-textSecondary underline mt-4 text-center bg-transparent">
          ¿Ya tienes cuenta? Iniciar sesión
        </button>
      </div>
    </div>
  );
};

export default Register; 