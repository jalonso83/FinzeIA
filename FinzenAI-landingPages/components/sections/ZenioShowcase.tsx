'use client';

import { Check } from 'lucide-react';
import SectionWrapper from '@/components/ui/SectionWrapper';
import { useInView } from '@/hooks/useInView';

const chatMessages = [
  {
    sender: 'user',
    text: 'Gasté 1,200 en el súper',
  },
  {
    sender: 'zenio',
    text: '¡Registrado! 🛒 Gasté RD$1,200 en Supermercado. Este mes llevas RD$4,800 de tu presupuesto de RD$8,000 en comida. Vas bien, te queda el 40%.',
  },
  {
    sender: 'user',
    text: '¿Cuánto llevo gastado este mes?',
  },
  {
    sender: 'zenio',
    text: 'Este mes llevas RD$28,500 en gastos totales. Tu categoría más alta es Comida (RD$4,800), seguida de Transporte (RD$3,200). ¿Quieres ver el desglose completo?',
  },
];

const bullets = [
  'Registra gastos por voz o texto en lenguaje natural',
  'Crea presupuestos y metas conversando',
  'Responde preguntas sobre finanzas sin juzgarte',
  'Recuerda tus conversaciones anteriores',
  'Habla español latinoamericano como tú',
  'Funciones de voz: habla y Zenio responde (Plan PRO)',
];

export default function ZenioShowcase() {
  const { ref, isInView } = useInView<HTMLDivElement>();

  return (
    <section id="zenio" className="bg-finzen-blue">
      <div className="py-16 md:py-24 px-4 md:px-8 max-w-7xl mx-auto">
        <h2 className="font-rubik font-semibold italic text-3xl md:text-4xl text-white text-center mb-3">
          Conoce a Zenio, tu asistente financiero
        </h2>
        <p className="text-white/70 text-center mb-12 max-w-2xl mx-auto text-lg">
          Como tener un amigo que sabe de dinero — disponible 24/7
        </p>

        <div
          ref={ref}
          className={`grid md:grid-cols-2 gap-12 items-start transition-all duration-700 ${
            isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
          }`}
        >
          {/* Chat mockup */}
          <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
            <div className="flex flex-col gap-4">
              {chatMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${
                    msg.sender === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {msg.sender === 'zenio' && (
                    <div className="w-8 h-8 rounded-full bg-finzen-green/30 flex items-center justify-center mr-2 shrink-0 mt-1">
                      <span className="text-xs font-bold text-white">Z</span>
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm md:text-base ${
                      msg.sender === 'user'
                        ? 'bg-white/10 text-white'
                        : 'bg-white/20 text-white'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bullets */}
          <div>
            <ul className="space-y-4">
              {bullets.map((bullet, i) => (
                <li key={i} className="flex items-start gap-3">
                  <Check
                    size={20}
                    strokeWidth={2.5}
                    className="text-finzen-green mt-0.5 shrink-0"
                  />
                  <span className="text-white text-base md:text-lg">
                    {bullet}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-8 pt-6 border-t border-white/10">
              <p className="text-white/80 text-base italic">
                A diferencia de otras apps de finanzas, con FinZen AI no llenas
                formularios — solo hablas.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
