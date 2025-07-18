import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'

const VerifyEmail = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [isVerifying, setIsVerifying] = useState(true)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState('')

  const token = searchParams.get('token')
  const email = searchParams.get('email')

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token || !email) {
        setError('Enlace de verificación inválido')
        setIsVerifying(false)
        return
      }

      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/verify-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token, email }),
        })

        const data = await response.json()

        if (response.ok) {
          setIsSuccess(true)
        } else {
          setError(data.message || 'Error al verificar el email')
        }
      } catch (error) {
        setError('Error de conexión. Por favor, intenta de nuevo.')
      } finally {
        setIsVerifying(false)
      }
    }

    verifyEmail()
  }, [token, email])

  const handleGoToLogin = () => {
    navigate('/login')
  }

  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <p className="text-center text-gray-600">Verificando tu email...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {isSuccess ? (
            <>
              <div className="flex justify-center mb-4">
                <CheckCircle className="h-12 w-12 text-green-600" />
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900">
                ¡Email verificado!
              </CardTitle>
              <CardDescription className="text-gray-600">
                Tu cuenta ha sido verificada exitosamente
              </CardDescription>
            </>
          ) : (
            <>
              <div className="flex justify-center mb-4">
                <XCircle className="h-12 w-12 text-red-600" />
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900">
                Error de verificación
              </CardTitle>
              <CardDescription className="text-gray-600">
                {error}
              </CardDescription>
            </>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={handleGoToLogin}
            className="w-full bg-primary hover:bg-secondary"
          >
            Ir al login
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

export default VerifyEmail 