import { useAuthStore } from '../stores/auth';
import { useNavigate } from 'react-router-dom';
import ZenioChat from '../components/ZenioChat';
import isotipo from '../assets/isotipo.png';
import { useState } from 'react';

const Onboarding = () => {
  const { user, updateUser } = useAuthStore();
  const navigate = useNavigate();
  const [onboardingFinished, setOnboardingFinished] = useState(false);

  // Handler para detectar el fin del onboarding desde ZenioChat
  const handleZenioMessage = (msg: string) => {
    // Detectar diferentes formas en que Zenio puede indicar que el onboarding está completo
    const lowerMsg = msg.toLowerCase();
    if (msg && (
      lowerMsg.includes('tu perfil está listo') ||
      lowerMsg.includes('perfil completado') ||
      lowerMsg.includes('onboarding completado') ||
      lowerMsg.includes('configuración terminada') ||
      lowerMsg.includes('todo listo') ||
      lowerMsg.includes('ya puedes empezar') ||
      lowerMsg.includes('estás listo para usar') ||
      lowerMsg.includes('onboarding finalizado') ||
      lowerMsg.includes('tu perfil ha sido registrado') ||
      lowerMsg.includes('ya tengo todo lo que necesito') ||
      lowerMsg.includes('perfil registrado') ||
      lowerMsg.includes('camino hacia una mejor planificación') ||
      lowerMsg.includes('acompañarte en tu camino') ||
      lowerMsg.includes('tu perfil está registrado') ||
      lowerMsg.includes('registrado y preparado') ||
      lowerMsg.includes('te veo en el dashboard') ||
      lowerMsg.includes('cuando estés listo') ||
      lowerMsg.includes('herramientas que ofrece finzen') ||
      lowerMsg.includes('planificación financiera plena')
    )) {
      setOnboardingFinished(true);
      if (user) {
        updateUser({ ...user, onboardingCompleted: true });
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4 relative">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-lg p-6 flex flex-col items-center">
        <div className="text-center mb-6">
          <img src={isotipo} alt="FinZen AI" className="w-28 h-auto mx-auto mb-3" />
          <p className="text-base text-textSecondary">Tu copiloto financiero</p>
        </div>
        <h2 className="text-2xl font-bold text-center text-primary mb-4">Onboarding con Zenio</h2>
        <div className="w-full flex justify-center">
          <ZenioChat 
            isOnboarding={true} 
            initialMessage={`Hola Zenio, soy nuevo y quiero empezar mi onboarding`} 
            onZenioMessage={handleZenioMessage}
          />
        </div>
        {onboardingFinished && (
          <button
            className="mt-8 w-full max-w-xs py-3 bg-primary text-white rounded-lg font-semibold text-base hover:bg-secondary transition shadow-md"
            onClick={() => navigate('/')}
          >
            Continuar
          </button>
        )}
      </div>
    </div>
  );
};

export default Onboarding; 