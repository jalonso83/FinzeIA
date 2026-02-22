'use client';

import {
  MessageCircle,
  LayoutDashboard,
  Wallet,
  Target,
  Search,
  Trophy,
} from 'lucide-react';
import SectionWrapper from '@/components/ui/SectionWrapper';
import Card from '@/components/ui/Card';
import Icon from '@/components/ui/Icon';
import { useInView } from '@/hooks/useInView';

const features = [
  {
    icon: MessageCircle,
    color: 'text-finzen-green',
    title: 'Zenio AI, tu asistente financiero',
    description:
      'Habla con Zenio como si fuera un amigo. Dile "Gasté 500 en comida" y listo — se registra solo. Pregúntale lo que quieras sobre finanzas, te responde sin juzgarte.',
  },
  {
    icon: LayoutDashboard,
    color: 'text-finzen-blue',
    title: 'Dashboard inteligente',
    description:
      'Tu situación financiera completa en una pantalla: ingresos vs gastos, presupuestos activos, metas de ahorro y tu Vibe Financiero del mes.',
  },
  {
    icon: Wallet,
    color: 'text-finzen-blue',
    title: 'Presupuestos que funcionan',
    description:
      'Define límites por categoría y recibe alertas antes de pasarte. Barras de progreso visuales te muestran exactamente dónde estás.',
  },
  {
    icon: Target,
    color: 'text-finzen-blue',
    title: 'Metas de ahorro',
    description:
      'Vacaciones, fondo de emergencia, tu primer carro — crea metas con fecha y monto, contribuye cuando puedas y visualiza tu progreso.',
  },
  {
    icon: Search,
    color: 'text-finzen-green',
    title: 'Detector de Gastos Hormiga',
    description:
      'Esos cafecitos diarios, el delivery de siempre, las suscripciones olvidadas... la IA los encuentra y te muestra cuánto suman al mes.',
  },
  {
    icon: Trophy,
    color: 'text-finzen-green',
    title: 'Gamificación financiera',
    description:
      'FinScore, puntos, insignias y rachas. Porque manejar tu dinero debería sentirse como un logro, no como un castigo.',
  },
];

function FeatureCard({
  feature,
  index,
}: {
  feature: (typeof features)[0];
  index: number;
}) {
  const { ref, isInView } = useInView<HTMLDivElement>();

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${
        isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
      }`}
      style={{ transitionDelay: `${index * 100}ms` }}
    >
      <Card className="h-full">
        <div className="mb-4">
          <Icon icon={feature.icon} color={feature.color} />
        </div>
        <h3 className="font-rubik font-semibold text-xl text-finzen-black mb-2">
          {feature.title}
        </h3>
        <p className="text-finzen-gray text-base leading-relaxed">
          {feature.description}
        </p>
      </Card>
    </div>
  );
}

export default function Features() {
  return (
    <SectionWrapper id="features" background="white">
      <h2 className="font-rubik font-semibold italic text-3xl md:text-4xl text-finzen-black text-center mb-4">
        Esto es lo que Zenio hace por ti
      </h2>
      <p className="text-finzen-gray text-center mb-12 max-w-2xl mx-auto">
        Todo lo que necesitas para tomar el control de tus finanzas, en un solo
        lugar.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((feature, i) => (
          <FeatureCard key={i} feature={feature} index={i} />
        ))}
      </div>
    </SectionWrapper>
  );
}
