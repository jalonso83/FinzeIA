'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import SectionWrapper from '@/components/ui/SectionWrapper';
import Card from '@/components/ui/Card';
import { useInView } from '@/hooks/useInView';

const cases = [
  {
    name: 'María',
    age: '22 años',
    role: 'Universitaria',
    story:
      'Trabajaba medio tiempo y sentía que su dinero se evaporaba. Con el Detector de Gastos Hormiga descubrió que gastaba RD$4,000 al mes solo en cafés y delivery. En 2 meses, redirigió ese dinero y creó su primer fondo de emergencia.',
    highlight: 'Fondo de emergencia creado en 2 meses',
  },
  {
    name: 'Carlos',
    age: '28 años',
    role: 'Profesional joven',
    story:
      'Ganaba bien pero vivía al día sin entender por qué. Con los presupuestos por categoría y los recordatorios de pago, organizó sus finanzas. En 6 meses construyó un fondo de emergencia de 3 meses de gastos.',
    highlight: 'Fondo de 3 meses de gastos en 6 meses',
  },
  {
    name: 'Ana y Pedro',
    age: 'Pareja',
    role: 'Comparten apartamento',
    story:
      'Manejaban el dinero por separado, lo que generaba conflictos. Con FinZen AI, ambos ven sus gastos en tiempo real y ahora ahorran juntos RD$5,000 al mes para su próximo viaje.',
    highlight: 'Ahorran RD$5,000/mes juntos',
  },
];

export default function UseCases() {
  const [current, setCurrent] = useState(0);
  const { ref, isInView } = useInView<HTMLDivElement>();

  const prev = () => setCurrent((c) => (c === 0 ? cases.length - 1 : c - 1));
  const next = () => setCurrent((c) => (c === cases.length - 1 ? 0 : c + 1));

  return (
    <SectionWrapper id="use-cases" background="white">
      <h2 className="font-rubik font-semibold italic text-3xl md:text-4xl text-finzen-black text-center mb-4">
        Personas reales, resultados reales
      </h2>
      <p className="text-finzen-gray text-center mb-12 max-w-2xl mx-auto">
        Historias de cómo FinZen AI está cambiando la relación con el dinero.
      </p>

      <div
        ref={ref}
        className={`transition-all duration-700 ${
          isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
        }`}
      >
        {/* Desktop: 3 cards */}
        <div className="hidden md:grid md:grid-cols-3 gap-6">
          {cases.map((c, i) => (
            <Card key={i} className="h-full flex flex-col">
              <div className="mb-4">
                <h3 className="font-rubik font-semibold text-lg text-finzen-black">
                  {c.name}
                </h3>
                <p className="text-finzen-gray text-sm">
                  {c.age} · {c.role}
                </p>
              </div>
              <p className="text-finzen-black text-base leading-relaxed flex-grow">
                {c.story}
              </p>
              <div className="mt-4 pt-4 border-t border-finzen-gray/20">
                <p className="text-finzen-green font-semibold text-sm">
                  {c.highlight}
                </p>
              </div>
            </Card>
          ))}
        </div>

        {/* Mobile: carousel */}
        <div className="md:hidden">
          <Card className="mb-6">
            <div className="mb-4">
              <h3 className="font-rubik font-semibold text-lg text-finzen-black">
                {cases[current].name}
              </h3>
              <p className="text-finzen-gray text-sm">
                {cases[current].age} · {cases[current].role}
              </p>
            </div>
            <p className="text-finzen-black text-base leading-relaxed">
              {cases[current].story}
            </p>
            <div className="mt-4 pt-4 border-t border-finzen-gray/20">
              <p className="text-finzen-green font-semibold text-sm">
                {cases[current].highlight}
              </p>
            </div>
          </Card>

          <div className="flex items-center justify-center gap-4">
            <button
              onClick={prev}
              className="w-10 h-10 rounded-full bg-finzen-blue/10 flex items-center justify-center hover:bg-finzen-blue/20 transition-colors"
              aria-label="Anterior"
            >
              <ChevronLeft size={20} className="text-finzen-blue" />
            </button>

            <div className="flex gap-2">
              {cases.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className={`w-2.5 h-2.5 rounded-full transition-colors ${
                    i === current ? 'bg-finzen-blue' : 'bg-finzen-gray/30'
                  }`}
                  aria-label={`Caso ${i + 1}`}
                />
              ))}
            </div>

            <button
              onClick={next}
              className="w-10 h-10 rounded-full bg-finzen-blue/10 flex items-center justify-center hover:bg-finzen-blue/20 transition-colors"
              aria-label="Siguiente"
            >
              <ChevronRight size={20} className="text-finzen-blue" />
            </button>
          </div>
        </div>
      </div>
    </SectionWrapper>
  );
}
