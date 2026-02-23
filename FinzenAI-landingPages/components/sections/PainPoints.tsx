'use client';

import { Wallet, TableProperties, PiggyBank } from 'lucide-react';
import SectionWrapper from '@/components/ui/SectionWrapper';
import Card from '@/components/ui/Card';
import Icon from '@/components/ui/Icon';
import { useInView } from '@/hooks/useInView';

const painPoints = [
  {
    icon: Wallet,
    text: 'Ganas bien pero a fin de mes no sabes a dónde se fue el dinero',
  },
  {
    icon: TableProperties,
    text: 'Intentaste usar Excel o apps complicadas y las dejaste al segundo día',
  },
  {
    icon: PiggyBank,
    text: 'Quieres ahorrar pero siempre pasa "algo" y se te olvida',
  },
];

function AnimatedCard({
  point,
  index,
}: {
  point: (typeof painPoints)[0];
  index: number;
}) {
  const { ref, isInView } = useInView<HTMLDivElement>();

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${
        isInView
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 translate-y-5'
      }`}
      style={{ transitionDelay: `${index * 150}ms` }}
    >
      <Card className="text-center h-full">
        <div className="flex justify-center mb-4">
          <Icon icon={point.icon} color="text-finzen-green" />
        </div>
        <p className="text-finzen-black font-rubik text-base md:text-lg">
          {point.text}
        </p>
      </Card>
    </div>
  );
}

export default function PainPoints() {
  const { ref: closingRef, isInView: closingVisible } =
    useInView<HTMLDivElement>();

  return (
    <SectionWrapper id="pain-points" background="white">
      <h2 className="font-rubik font-semibold italic text-3xl md:text-4xl text-finzen-black text-center mb-4">
        Seamos honestos...
      </h2>
      <p className="text-finzen-gray text-center mb-12 max-w-2xl mx-auto">
        Si alguna de estas te suena, no estás solo.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {painPoints.map((point, i) => (
          <AnimatedCard key={i} point={point} index={i} />
        ))}
      </div>

      <div
        ref={closingRef}
        className={`max-w-3xl mx-auto text-center transition-all duration-700 ${
          closingVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
        }`}
      >
        <p className="text-finzen-black text-lg md:text-xl font-rubik leading-relaxed">
          No es tu culpa. Nadie te enseñó a manejar tu dinero, y las
          herramientas financieras tradicionales no fueron diseñadas para ti.{' '}
          <span className="font-semibold text-finzen-blue">Hasta ahora.</span>
        </p>
      </div>
    </SectionWrapper>
  );
}
