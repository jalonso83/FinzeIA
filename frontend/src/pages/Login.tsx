import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import logo from '../assets/logo.png'
import { authAPI } from '../utils/api'
import { useAuthStore } from '../stores/auth'
import { Eye, EyeOff } from 'lucide-react'

const Login = () => {
  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState<any>({})
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState('')
  const [rememberCredentials, setRememberCredentials] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const navigate = useNavigate()
  const { login } = useAuthStore()

  const validate = () => {
    const newErrors: any = {}
    if (!form.email) newErrors.email = 'El email es obligatorio'
    else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) newErrors.email = 'Email inválido'
    if (!form.password) newErrors.password = 'La contraseña es obligatoria'
    return newErrors
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    // Limpiar errores cuando el usuario empiece a escribir
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: '' })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const validation = validate()
    setErrors(validation)
    setSuccess('')
    
    if (Object.keys(validation).length === 0) {
      setSubmitting(true)
      
      try {
        const response = await authAPI.login(form.email, form.password)
        
        // Guardar credenciales si el usuario lo solicitó
        if (rememberCredentials) {
          localStorage.setItem('rememberedEmail', form.email)
          localStorage.setItem('rememberedPassword', form.password)
        } else {
          localStorage.removeItem('rememberedEmail')
          localStorage.removeItem('rememberedPassword')
        }
        
        // Guardar datos de autenticación en el store
        login(response.user, response.token)
        
        setSuccess('Inicio de sesión exitoso')
        
        // Después de login exitoso
        if (!response.user.onboardingCompleted) {
          navigate('/onboarding-bienvenida')
        } else {
          navigate('/')
        }
        
      } catch (error: any) {
        console.error('Error de login:', error)
        
        if (error.response?.status === 401) {
          setErrors({ api: 'Email o contraseña incorrectos' })
        } else if (error.response?.status === 403) {
          setErrors({ api: 'Por favor verifica tu email antes de iniciar sesión' })
        } else if (error.response?.status === 400) {
          setErrors({ api: error.response.data.message || 'Datos inválidos' })
        } else if (error.response?.status === 500) {
          setErrors({ api: 'Error del servidor. Intenta nuevamente.' })
        } else if (error.message === 'Network Error') {
          setErrors({ api: 'Error de conexión. Verifica tu internet.' })
        } else {
          setErrors({ api: 'Error inesperado. Intenta nuevamente.' })
        }
      } finally {
        setSubmitting(false)
      }
    }
  }

  // Cargar email y contraseña recordados al montar el componente
  useEffect(() => {
    const rememberedEmail = localStorage.getItem('rememberedEmail')
    const rememberedPassword = localStorage.getItem('rememberedPassword')
    if (rememberedEmail) {
      setForm(prev => ({ ...prev, email: rememberedEmail }))
      setRememberCredentials(true)
    }
    if (rememberedPassword) {
      setForm(prev => ({ ...prev, password: rememberedPassword }))
    }
  }, [])

  // Resetear submitting si se queda bloqueado
  useEffect(() => {
    const timer = setTimeout(() => {
      if (submitting) {
        console.log('Reseteando estado submitting bloqueado')
        setSubmitting(false)
      }
    }, 10000) // 10 segundos

    return () => clearTimeout(timer)
  }, [submitting])

  const resetForm = () => {
    setSubmitting(false)
    setErrors({})
    setSuccess('')
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-5">
      <div className="w-full max-w-md flex flex-col items-center">
        <div className="text-center mb-8">
          <img src={logo} alt="FinZen AI" className="w-32 h-auto mx-auto mb-3" />
          <p className="text-lg text-textSecondary">Tu copiloto financiero</p>
        </div>
        <Card className="bg-white rounded-xl shadow-lg p-8 w-full mb-6">
          <CardHeader className="text-center pb-2 flex flex-col items-center">
            <CardTitle className="text-2xl font-bold text-text mb-2">Iniciar Sesión</CardTitle>
            <CardDescription className="text-sm text-textSecondary mb-6">Ingresa tu email y contraseña para acceder a tu cuenta</CardDescription>
          </CardHeader>
          <CardContent className="w-full p-0">
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="block text-sm font-medium text-text mb-1">Email</label>
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="tu@email.com"
                  className={`w-full px-4 py-3 border border-border rounded-lg text-base bg-white focus:outline-none focus:ring-2 focus:ring-primary transition ${errors.email ? 'border-error' : ''}`}
                  autoComplete="email"
                />
                {errors.email && <div className="text-xs text-error mt-1">{errors.email}</div>}
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">Contraseña</label>
                <div className="relative">
                  <input
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className={`w-full px-4 py-3 border border-border rounded-lg text-base bg-white focus:outline-none focus:ring-2 focus:ring-primary transition ${errors.password ? 'border-error' : ''}`}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-primary focus:outline-none p-1"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {errors.password && <div className="text-xs text-error mt-1">{errors.password}</div>}
                <div className="flex justify-end mt-1">
                  <Link to="/forgot-password" className="text-xs text-primary hover:underline">¿Olvidaste tu contraseña?</Link>
                </div>
              </div>
              <div className="flex items-center justify-between mb-4 py-2">
                <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-text">
                  <span>Recordar credenciales</span>
                  <input
                    type="checkbox"
                    checked={rememberCredentials}
                    onChange={(e) => setRememberCredentials(e.target.checked)}
                    className="form-checkbox h-5 w-5 text-primary rounded focus:ring-primary border-border"
                  />
                </label>
              </div>
              {errors.api && <div className="text-error text-center text-sm mb-2">{errors.api}</div>}
              {success && <div className="text-green-600 text-center text-sm mb-2">{success}</div>}
              <button
                type="submit"
                className={`w-full py-3 bg-primary text-white rounded-lg font-semibold text-base hover:bg-secondary transition ${submitting ? 'bg-textSecondary cursor-not-allowed' : ''}`}
                disabled={submitting}
              >
                {submitting ? 'Ingresando...' : 'Iniciar Sesión'}
              </button>
              {submitting && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="w-full py-2 text-sm text-textSecondary underline"
                >
                  Cancelar
                </button>
              )}
            </form>
          </CardContent>
        </Card>
        {/* Botón grande y visible para crear cuenta */}
        <button
          onClick={() => navigate('/register')}
          className="w-full py-3 bg-green-600 text-white rounded-lg font-semibold text-base hover:bg-green-700 transition mb-2 shadow-md"
        >
          Crear Nueva Cuenta
        </button>
        <button
          onClick={() => navigate('/admin')}
          className="text-xs text-textSecondary underline mt-2 text-center bg-transparent"
        >
          Acceso Administrador
        </button>
      </div>
    </div>
  )
}

export default Login 