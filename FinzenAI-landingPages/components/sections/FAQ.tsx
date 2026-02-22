'use client';

import SectionWrapper from '@/components/ui/SectionWrapper';
import { trackFAQExpand } from '@/lib/analytics';
import { useInView } from '@/hooks/useInView';

const faqs = [
  {
    id: 'faq-1',
    question: '¿FinZen AI es un banco?',
    answer:
      'No. FinZen AI es una herramienta de finanzas personales. No manejamos tu dinero, te ayudamos a entenderlo y organizarlo.',
  },
  {
    id: 'faq-2',
    question: '¿Es seguro conectar mi email?',
    answer:
      'Sí. Usamos autenticación segura OAuth. No almacenamos contraseñas. Solo leemos notificaciones bancarias para importar transacciones automáticamente.',
  },
  {
    id: 'faq-3',
    question: '¿Puedo usar FinZen AI gratis?',
    answer:
      'Sí. El plan gratuito incluye transacciones ilimitadas, dashboard completo, 2 presupuestos, 1 meta de ahorro y 15 consultas a Zenio por mes. Sin límite de tiempo.',
  },
  {
    id: 'faq-4',
    question: '¿En qué idioma funciona Zenio?',
    answer:
      'Zenio habla español latinoamericano. Entiende cómo hablas naturalmente — fechas, montos, categorías. Sin necesidad de comandos especiales.',
  },
  {
    id: 'faq-5',
    question: '¿Funciona con mi banco?',
    answer:
      'FinZen AI importa transacciones desde notificaciones bancarias por email. Funciona con cualquier banco que envíe notificaciones a tu correo, incluyendo Popular, BHD, Reservas y más.',
  },
  {
    id: 'faq-6',
    question: '¿Puedo cancelar mi suscripción?',
    answer:
      'En cualquier momento, directamente desde tu teléfono. Sin penalidades, sin preguntas.',
  },
];

export default function FAQ() {
  const { ref, isInView } = useInView<HTMLDivElement>();

  return (
    <SectionWrapper id="faq" background="white">
      <h2 className="font-rubik font-semibold italic text-3xl md:text-4xl text-finzen-black text-center mb-12">
        Preguntas frecuentes
      </h2>

      <div
        ref={ref}
        className={`max-w-3xl mx-auto space-y-4 transition-all duration-700 ${
          isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
        }`}
      >
        {faqs.map((faq) => (
          <details
            key={faq.id}
            className="group rounded-xl border border-finzen-gray/20 bg-white overflow-hidden"
            onToggle={(e) => {
              if ((e.target as HTMLDetailsElement).open) {
                trackFAQExpand(faq.id);
              }
            }}
          >
            <summary className="flex items-center justify-between cursor-pointer px-6 py-4 text-finzen-black font-rubik font-semibold text-base md:text-lg list-none [&::-webkit-details-marker]:hidden">
              {faq.question}
              <span className="ml-4 shrink-0 text-finzen-gray transition-transform duration-300 group-open:rotate-45 text-2xl leading-none">
                +
              </span>
            </summary>
            <div className="px-6 pb-4">
              <p className="text-finzen-gray text-base leading-relaxed">
                {faq.answer}
              </p>
            </div>
          </details>
        ))}
      </div>
    </SectionWrapper>
  );
}
