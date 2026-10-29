'use client';

import { useState } from 'react';
import Image from 'next/image';
import { BatteryFull, Signal, Wifi } from 'lucide-react';
import SectionWrapper from '@/components/ui/SectionWrapper';
import Button from '@/components/ui/Button';
import { useInView } from '@/hooks/useInView';
import { getAppStoreLink } from '@/lib/constants';

const stats = [
  { value: '24/7', label: 'Zenio disponible siempre' },
  // Antes: "3 seg · Registra un gasto hablando". Seguía vendiendo la voz como
  // el diferencial, cuando el de hoy es no tener que registrar nada.
  { value: '0', label: 'Gastos que tienes que teclear' },
  { value: '100%', label: 'Control de tu dinero' },
];

// Marco de teléfono (estilo Android, como las capturas) para capturas de
// 923×2000. Recorta la barra de estado real (62px arriba) y la barra de
// navegación (110px abajo): quedan 1828px de app. En su lugar dibuja una barra
// de estado limpia arriba y la barra de gestos abajo, para que el contenido no
// choque con las esquinas redondeadas.
function PhoneFrame({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="relative rounded-[2.4rem] md:rounded-[2.8rem] p-[6px] md:p-[7px] bg-gradient-to-b from-[#3a404c] via-[#1c2027] to-[#0b0d12] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.6)] ring-1 ring-black/50">
      {/* Botones laterales (volumen y encendido) */}
      <span aria-hidden className="absolute -right-[3px] top-[18%] h-[8%] w-[3px] rounded-r bg-[#2a2f38]" />
      <span aria-hidden className="absolute -right-[3px] top-[29%] h-[12%] w-[3px] rounded-r bg-[#2a2f38]" />

      <div className="relative overflow-hidden rounded-[2rem] md:rounded-[2.35rem] bg-white ring-1 ring-white/10">
        {/* Barra de estado */}
        <div className="relative flex items-center justify-between px-5 md:px-6 pt-2 pb-1 text-[9px] md:text-[11px] font-semibold text-finzen-black">
          <span>9:41</span>
          <span aria-hidden className="absolute left-1/2 top-1.5 md:top-2 -translate-x-1/2 h-2 w-2 md:h-2.5 md:w-2.5 rounded-full bg-[#0b0d12]" />
          <span className="flex items-center gap-1">
            <Signal size={10} strokeWidth={2.5} />
            <Wifi size={10} strokeWidth={2.5} />
            <BatteryFull size={13} strokeWidth={2} />
          </span>
        </div>

        <div className="relative overflow-hidden aspect-[923/1828]">
          <Image
            src={src}
            alt={alt}
            width={923}
            height={2000}
            className="absolute left-0 w-full h-auto max-w-none"
            style={{ top: '-3.39%' }}
          />
        </div>

        {/* Barra de gestos */}
        <div className="flex justify-center py-1.5 md:py-2">
          <span aria-hidden className="h-1 w-1/3 rounded-full bg-finzen-black/80" />
        </div>
      </div>
    </div>
  );
}

type Telefono = 'chat' | 'transacciones';

export default function Solution() {
  const { ref, isInView } = useInView<HTMLDivElement>();
  const [alFrente, setAlFrente] = useState<Telefono>('transacciones');

  return (
    <section id="solution" className="bg-finzen-blue">
      <div className="py-12 md:py-16 px-4 md:px-8 max-w-7xl mx-auto">
        <div
          ref={ref}
          className={`grid md:grid-cols-2 gap-12 items-center transition-all duration-700 ${
            isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
          }`}
        >
          {/* Dos teléfonos: las transacciones adelante y el chat con Zenio
              detrás. Al pasar el mouse (o tocar, en celular) por el de atrás,
              pasa al frente y se ve completo; al salir del área vuelven las
              transacciones adelante. */}
          <div className="flex justify-center md:justify-start">
            <div
              className="relative w-[300px] h-[430px] md:w-[420px] md:h-[580px] md:ml-6"
              onMouseLeave={() => setAlFrente('transacciones')}
            >
              <button
                type="button"
                aria-label="Ver el chat con Zenio"
                onMouseEnter={() => setAlFrente('chat')}
                onClick={() => setAlFrente('chat')}
                className={`absolute right-0 top-10 md:top-12 w-[165px] md:w-[220px] text-left transition-all duration-500 ease-out ${
                  alFrente === 'chat'
                    ? 'z-20 -translate-x-[18%] -translate-y-[4%] rotate-0 scale-[1.12]'
                    : 'z-10 rotate-[5deg] opacity-90 cursor-pointer'
                }`}
              >
                <PhoneFrame
                  src="/captura-chat-zenio.png"
                  alt="FinZen AI - Chat con Zenio, tu copiloto financiero"
                />
              </button>
              <button
                type="button"
                aria-label="Ver la pantalla de transacciones"
                onMouseEnter={() => setAlFrente('transacciones')}
                onClick={() => setAlFrente('transacciones')}
                className={`absolute left-0 top-0 w-[185px] md:w-[250px] text-left transition-all duration-500 ease-out ${
                  alFrente === 'transacciones'
                    ? 'z-20 -rotate-[3deg]'
                    : 'z-10 -translate-x-[6%] -rotate-[7deg] scale-90 opacity-80 cursor-pointer'
                }`}
              >
                <PhoneFrame
                  src="/captura-transacciones.png"
                  alt="FinZen AI - Listado de transacciones"
                />
              </button>
            </div>
          </div>

          {/* Text content */}
          <div>
            <h2 className="font-rubik font-semibold italic text-3xl md:text-4xl text-white mb-3">
              FinZen AI: tu dinero, tus reglas
            </h2>
            <p className="text-white/70 text-lg mb-6">
              Una app que se adapta a ti, no al revés
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
                  <p className="font-playfair text-4xl md:text-5xl text-white mb-1">
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
