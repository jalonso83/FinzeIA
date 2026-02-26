'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import SectionWrapper from '@/components/ui/SectionWrapper';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { useInView } from '@/hooks/useInView';
import { getAppStoreLink } from '@/lib/constants';
import { trackPricingPlan } from '@/lib/analytics';

interface PlanFeature {
  text: string;
}

interface PricingPlan {
  name: string;
  badge: string;
  badgeVariant: 'subtle' | 'highlight';
  monthlyPrice: string;
  monthlyPeriod: string;
  annualPrice: string;
  annualPeriod: string;
  annualNote: string;
  features: PlanFeature[];
  cta: string;
  ctaVariant: 'primary' | 'secondary';
  highlighted: boolean;
  planId: string;
}

const plans: PricingPlan[] = [
  {
    name: 'Gratis',
    badge: 'Para empezar',
    badgeVariant: 'subtle',
    monthlyPrice: '$0',
    monthlyPeriod: 'Siempre gratis',
    annualPrice: '$0',
    annualPeriod: 'Siempre gratis',
    annualNote: '',
    features: [
      { text: 'Transacciones ilimitadas' },
      { text: '2 presupuestos activos' },
      { text: '1 meta de ahorro' },
      { text: '15 consultas a Zenio/mes' },
      { text: 'Dashboard completo' },
      { text: 'Gamificación básica' },
      { text: 'Calculadoras financieras' },
    ],
    cta: 'Descargar Gratis',
    ctaVariant: 'secondary',
    highlighted: false,
    planId: 'free',
  },
  {
    name: 'Plus',
    badge: 'Mejor valor',
    badgeVariant: 'highlight',
    monthlyPrice: '$4.99',
    monthlyPeriod: '/mes',
    annualPrice: '$49.99',
    annualPeriod: '/año',
    annualNote: 'Solo $4.17/mes · Paga 10 meses, llévate 12',
    features: [
      { text: 'Todo de Gratis +' },
      { text: 'Presupuestos ilimitados' },
      { text: 'Metas ilimitadas' },
      { text: 'Zenio ilimitado' },
      { text: 'Alertas configurables' },
      { text: 'Zenio con voz' },
      { text: 'Detector de Gastos Hormiga completo' },
      { text: 'Exportar CSV' },
    ],
    cta: 'Prueba 7 Días Gratis',
    ctaVariant: 'primary',
    highlighted: true,
    planId: 'plus',
  },
  {
    name: 'PRO',
    badge: 'Automatización total',
    badgeVariant: 'subtle',
    monthlyPrice: '$9.99',
    monthlyPeriod: '/mes',
    annualPrice: '$99.99',
    annualPeriod: '/año',
    annualNote: 'Solo $8.33/mes · Paga 10 meses, llévate 12',
    features: [
      { text: 'Todo de Plus +' },
      { text: 'Sincronización de email (Gmail/Outlook)' },
      { text: 'Importación automática de transacciones' },
      { text: 'Reportes quincenales con IA' },
      { text: 'Tips personalizados' },
      { text: 'Exportar PDF' },
      { text: 'Recordatorios ilimitados' },
    ],
    cta: 'Prueba 7 Días Gratis',
    ctaVariant: 'primary',
    highlighted: false,
    planId: 'pro',
  },
];

function BillingToggle({
  isAnnual,
  onToggle,
}: {
  isAnnual: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-center gap-3 mb-12">
      <span
        className={`text-sm font-medium transition-colors duration-300 ${
          !isAnnual ? 'text-finzen-black' : 'text-finzen-gray'
        }`}
      >
        Mensual
      </span>

      <button
        onClick={onToggle}
        className="relative w-14 h-7 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-finzen-blue/30"
        style={{ backgroundColor: isAnnual ? '#204274' : '#b0b8be' }}
        aria-label="Cambiar entre facturación mensual y anual"
      >
        <span
          className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-300 ${
            isAnnual ? 'translate-x-7' : 'translate-x-0'
          }`}
        />
      </button>

      <span
        className={`text-sm font-medium transition-colors duration-300 ${
          isAnnual ? 'text-finzen-black' : 'text-finzen-gray'
        }`}
      >
        Anual
      </span>

      <span className="bg-finzen-green/15 text-finzen-green text-xs font-semibold px-2.5 py-1 rounded-full">
        Ahorra 17%
      </span>
    </div>
  );
}

function PricingCard({
  plan,
  index,
  isAnnual,
}: {
  plan: PricingPlan;
  index: number;
  isAnnual: boolean;
}) {
  const { ref, isInView } = useInView<HTMLDivElement>();

  const price = isAnnual ? plan.annualPrice : plan.monthlyPrice;
  const period = isAnnual ? plan.annualPeriod : plan.monthlyPeriod;
  const showNote = isAnnual && plan.annualNote;

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${
        isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
      }`}
      style={{ transitionDelay: `${index * 150}ms` }}
    >
      <Card
        highlighted={plan.highlighted}
        className={`h-full flex flex-col ${
          plan.highlighted ? 'md:-mt-4 md:mb-4 md:py-8' : ''
        }`}
      >
        <div className="mb-4">
          <Badge variant={plan.badgeVariant}>{plan.badge}</Badge>
        </div>

        <div className="mb-6">
          <div className="flex items-baseline gap-1">
            <span className="font-hendangan text-5xl text-finzen-black transition-all duration-300">
              {price}
            </span>
            {period && (
              <span className="text-finzen-gray text-base">{period}</span>
            )}
          </div>
          {showNote && (
            <p className="text-finzen-green font-semibold text-sm mt-2">
              {plan.annualNote}
            </p>
          )}
        </div>

        <ul className="space-y-3 mb-8 flex-grow">
          {plan.features.map((feature, i) => (
            <li key={i} className="flex items-start gap-2">
              <Check
                size={18}
                strokeWidth={2.5}
                className="text-finzen-green mt-0.5 shrink-0"
              />
              <span className="text-finzen-black text-sm">{feature.text}</span>
            </li>
          ))}
        </ul>

        <Button
          variant={plan.ctaVariant}
          size="md"
          href={getAppStoreLink('pricing')}
          className="w-full"
          onClick={() => trackPricingPlan(plan.planId)}
        >
          {plan.cta}
        </Button>
      </Card>
    </div>
  );
}

export default function Pricing() {
  const [isAnnual, setIsAnnual] = useState(true);

  return (
    <SectionWrapper id="pricing" background="light">
      <h2 className="font-rubik font-semibold italic text-3xl md:text-4xl text-finzen-black text-center mb-3">
        Planes que crecen contigo
      </h2>
      <p className="text-finzen-gray text-center mb-8 max-w-2xl mx-auto">
        Empieza gratis. Actualiza cuando quieras. Sin sorpresas.
      </p>

      <BillingToggle
        isAnnual={isAnnual}
        onToggle={() => setIsAnnual(!isAnnual)}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {plans.map((plan, i) => (
          <PricingCard
            key={plan.planId}
            plan={plan}
            index={i}
            isAnnual={isAnnual}
          />
        ))}
      </div>

      <p className="text-finzen-gray text-sm text-center mt-8">
        Prueba gratuita de 7 días. Sin tarjeta de crédito. Cancela cuando
        quieras.
      </p>
      <p className="text-finzen-gray/50 text-xs text-center mt-4">
        FinZen AI no es un banco ni ofrece servicios bancarios. Zenio es un
        asistente de IA que te ayuda a organizar tus finanzas.
      </p>
    </SectionWrapper>
  );
}
