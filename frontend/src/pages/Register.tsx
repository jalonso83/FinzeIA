import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const Register = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-900">
            Registro - FinZen AI
          </CardTitle>
          <CardDescription>
            Crea tu cuenta para comenzar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-gray-600">
            Página de registro en desarrollo...
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export default Register 