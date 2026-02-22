'use client';

import { Download, MessageCircle, TrendingUp } from 'lucide-react';
import SectionWrapper from '@/components/ui/SectionWrapper';
import Icon from '@/components/ui/Icon';
import { useInView } from '@/hooks/useInView';

const steps = [
  {
    icon: Download,
    title: 'Descarga gratis',
    description: 'Disponible en App Store y Google Play.',
  },
  {
    icon: MessageCircle,
    title: 'Habla con Zenio',
    description:
      'Zenio te guía paso a paso para configurar tu perfil, metas y presupuestos.',
  },
  {
    icon: TrendingUp,
    title: 'Toma el control',
    description:
      'Ve crecer tu FinScore mientras tus finanzas se organizan solas.',
  },
];

export default function HowItWorks() {
  const { ref, isInView } = useInView<HTMLDivElement>();

  return (
    <SectionWrapper id="how-it-works" background="light">
      <h2 className="font-rubik font-semibold italic text-3xl md:text-4xl text-finzen-black text-center mb-4">
        Empieza en 2 minutos
      </h2>
      <p className="text-finzen-gray text-center mb-12 max-w-2xl mx-auto">
        Tres pasos. Sin complicaciones.
      </p>

      <div
        ref={ref}
        className={`relative transition-all duration-700 ${
          isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
        }`}
      >
        {/* Connector line — horizontal on desktop, vertical on mobile */}
        <div className="hidden md:block absolute top-16 left-1/6 right-1/6 h-0.5 bg-finzen-gray/20" />
        <div className="md:hidden absolute top-0 bottom-0 left-8 w-0.5 bg-finzen-gray/20" />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
          {steps.map((step, i) => (
            <div
              key={i}
              className="flex md:flex-col items-start md:items-center md:text-center gap-4 md:gap-0 relative"
            >
              {/* Step circle */}
              <div className="w-16 h-16 rounded-full bg-finzen-blue/10 flex items-center justify-center shrink-0 relative z-10 md:mb-6">
                <Icon icon={step.icon} color="text-finzen-blue" />
              </div>

              <div>
                {/* Step number */}
                <span className="text-finzen-green text-sm font-semibold mb-1 block">
                  Paso {i + 1}
                </span>
                <h3 className="font-rubik font-semibold text-xl text-finzen-black mb-2">
                  {step.title}
                </h3>
                <p className="text-finzen-gray text-base">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </SectionWrapper>
  );
}
