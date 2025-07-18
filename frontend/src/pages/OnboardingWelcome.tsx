import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';
import isotipo from '../assets/isotipo.png';

const OnboardingWelcome = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-lg bg-white rounded-xl shadow-lg p-8 flex flex-col items-center">
        <div className="text-center mb-6">
          <img src={isotipo} alt="FinZen AI" className="w-28 h-auto mx-auto mb-3" />
          <p className="text-base text-textSecondary">Tu copiloto financiero</p>
        </div>
        <h2 className="text-3xl font-bold text-center text-primary mb-4">¡Hola {user?.name || ''}! 👋</h2>
        <p className="text-lg text-gray-700 mb-6 text-center">
          Bienvenido a FinZen AI, soy Zenio, tu copiloto financiero. Antes de empezar, me gustaría conocerte un poco mejor para poder acompañarte y ofrecerte recomendaciones 100% adaptadas a tus metas y hábitos.<br/><br/>
          Te haré unas preguntas sencillas, como si estuviéramos charlando, para que juntos construyamos tu plan financiero personalizado.<br/><br/>
          Pulsa <b>“Comenzar”</b> y prepárate para transformar tu relación con el dinero. 😉
        </p>
        <div className="flex gap-4 mt-4">
          <button
            className="px-6 py-2 bg-primary text-white rounded-lg font-semibold hover:bg-secondary transition"
            onClick={() => navigate('/onboarding')}
          >
            Comenzar
          </button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingWelcome; 