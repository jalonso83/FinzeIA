import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/auth'
import { Toaster } from './components/ui/toaster'
import ZenioFloatingButton from './components/ZenioFloatingButton';

// Páginas (se crearán después)
import Login from './pages/Login'
import Register from './pages/Register'
import VerifyEmail from './pages/VerifyEmail'
import Dashboard from './pages/Dashboard'
import Transactions from './pages/Transactions'
import Budgets from './pages/Budgets'
import Goals from './pages/Goals'
import LoanCalculator from './pages/LoanCalculator'
import Reports from './pages/Reports'
import Zenio from './pages/Zenio'
import Onboarding from './pages/Onboarding'
import OnboardingWelcome from './pages/OnboardingWelcome'



// Componente de protección de rutas
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, user } = useAuthStore()
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // Si el usuario no ha completado el onboarding, redirigir a la página de bienvenida
  if (user && user.verified && !user.onboardingCompleted && window.location.pathname !== '/onboarding' && window.location.pathname !== '/onboarding-bienvenida') {
    return <Navigate to="/onboarding-bienvenida" replace />
  }

  return <>{children}</>
}

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-background">
        <Routes>
          {/* Rutas públicas */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          
          {/* Rutas protegidas */}
          <Route path="/" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/transactions" element={
            <ProtectedRoute>
              <Transactions />
            </ProtectedRoute>
          } />
          <Route path="/budgets" element={
            <ProtectedRoute>
              <Budgets />
            </ProtectedRoute>
          } />
          <Route path="/goals" element={
            <ProtectedRoute>
              <Goals />
            </ProtectedRoute>
          } />
          <Route path="/loan-calculator" element={
            <ProtectedRoute>
              <LoanCalculator />
            </ProtectedRoute>
          } />
          <Route path="/reports" element={
            <ProtectedRoute>
              <Reports />
            </ProtectedRoute>
          } />
          <Route path="/zenio" element={
            <ProtectedRoute>
              <Zenio />
            </ProtectedRoute>
          } />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/onboarding-bienvenida" element={<OnboardingWelcome />} />
          
          {/* Redirección por defecto */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        
        {/* Toaster para notificaciones */}
        <ZenioFloatingButton />
        <Toaster />
      </div>
    </Router>
  )
}

export default App
