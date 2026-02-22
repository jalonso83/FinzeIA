'use client';

import Image from 'next/image';
import SectionWrapper from '@/components/ui/SectionWrapper';
import Button from '@/components/ui/Button';
import { useInView } from '@/hooks/useInView';
import { getAppStoreLink } from '@/lib/constants';

const stats = [
  { value: '24/7', label: 'Zenio disponible siempre' },
  { value: '3 seg', label: 'Registra un gasto hablando' },
  { value: '100%', label: 'Control de tu dinero' },
];

export default function Solution() {
  const { ref, isInView } = useInView<HTMLDivElement>();

  return (
    <SectionWrapper id="solution" background="light">
      <div
        ref={ref}
        className={`grid md:grid-cols-2 gap-12 items-center transition-all duration-700 ${
          isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
        }`}
      >
        {/* Image placeholder */}
        <div className="flex justify-center">
          <div className="relative w-[260px] h-[520px] md:w-[280px] md:h-[560px] rounded-[2.5rem] bg-finzen-blue/5 border border-finzen-gray/20 overflow-hidden">
            <Image
              src="/hero-mockup.png"
              alt="FinZen AI App"
              fill
              className="object-contain p-2"
            />
          </div>
        </div>

        {/* Text content */}
        <div>
          <h2 className="font-rubik font-semibold italic text-3xl md:text-4xl text-finzen-black mb-3">
            FinZen AI: tu dinero, tus reglas
          </h2>
          <p className="text-finzen-gray text-lg mb-6">
            Una app que se adapta a ti — no al revés
          </p>
          <p className="text-finzen-black text-base md:text-lg font-rubik leading-relaxed mb-8">
            FinZen AI combina inteligencia artificial conversacional con
            gamificación para que manejar tu dinero sea tan natural como enviar
            un mensaje. Sin formularios aburridos, sin gráficas confusas. Solo
            tú y Zenio, tu asistente financiero disponible 24/7.
          </p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            {stats.map((stat) => (
              <div key={stat.value} className="text-center">
                <p className="font-hendangan text-4xl md:text-5xl text-finzen-blue mb-1">
                  {stat.value}
                </p>
                <p className="text-finzen-gray text-sm">{stat.label}</p>
              </div>
            ))}
          </div>

          <Button variant="primary" size="lg" href={getAppStoreLink('solution')}>
            Empieza con Zenio
          </Button>
        </div>
      </div>
    </SectionWrapper>
  );
}
