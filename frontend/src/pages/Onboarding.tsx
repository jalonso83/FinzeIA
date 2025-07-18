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
    // Puedes ajustar la condición según el mensaje final de Zenio
    if (msg && msg.toLowerCase().includes('tu perfil está listo')) {
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