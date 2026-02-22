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
    <section id="solution" className="bg-finzen-blue">
      <div className="py-16 md:py-24 px-4 md:px-8 max-w-7xl mx-auto">
        <div
          ref={ref}
          className={`grid md:grid-cols-2 gap-12 items-center transition-all duration-700 ${
            isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
          }`}
        >
          {/* App screenshot - 3D mockup */}
          <div className="flex justify-center md:justify-start md:-ml-8">
            <div className="relative w-[340px] h-[620px] md:w-[460px] md:h-[820px]">
              <Image
                src="/zenio-screenshot.png"
                alt="Zenio - Tu copiloto financiero con IA"
                fill
                className="object-contain"
              />
            </div>
          </div>

          {/* Text content */}
          <div>
            <h2 className="font-rubik font-semibold italic text-3xl md:text-4xl text-white mb-3">
              FinZen AI: tu dinero, tus reglas
            </h2>
            <p className="text-white/70 text-lg mb-6">
              Una app que se adapta a ti — no al revés
            </p>
            <p className="text-white/80 text-base md:text-lg font-rubik leading-relaxed mb-8">
              FinZen AI combina inteligencia artificial conversacional con
              gamificación para que manejar tu dinero sea tan natural como enviar
              un mensaje. Sin formularios aburridos, sin gráficas confusas. Solo
              tú y Zenio, tu copiloto financiero disponible 24/7.
            </p>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              {stats.map((stat) => (
                <div key={stat.value} className="text-center">
                  <p className="font-hendangan text-4xl md:text-5xl text-white mb-1">
                    {stat.value}
                  </p>
                  <p className="text-white/60 text-sm">{stat.label}</p>
                </div>
              ))}
            </div>

            <a
              href="#pricing"
              className="inline-flex items-center justify-center whitespace-nowrap border-2 border-white text-white rounded-xl font-rubik font-semibold hover:bg-white hover:text-finzen-blue transition-all duration-300 px-8 py-4 text-lg"
            >
              Empieza con Zenio
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
