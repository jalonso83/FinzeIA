'use client';

import Image from 'next/image';
import { Apple, Play } from 'lucide-react';
import Button from '@/components/ui/Button';
import { useDeviceDetect } from '@/hooks/useDeviceDetect';
import { getAppStoreLink, getPlayStoreLink } from '@/lib/constants';
import { trackDownloadIOS, trackDownloadAndroid } from '@/lib/analytics';

export default function Hero() {
  const device = useDeviceDetect();

  return (
    <section
      id="hero"
      className="relative min-h-screen flex items-center"
      style={{
        background: 'linear-gradient(180deg, #204274 0%, #1a3a6a 100%)',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8 w-full pt-20 pb-16 md:py-0">
        <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
          {/* Text content */}
          <div className="text-center md:text-left">
            <p className="text-white/60 text-sm font-rubik mb-4 tracking-wide uppercase">
              Tu copiloto financiero con IA
            </p>
            <h1 className="font-rubik font-semibold italic text-4xl md:text-5xl lg:text-6xl text-white leading-tight mb-6">
              El amigo que sabe de dinero que siempre quisiste tener
            </h1>
            <p className="text-white/80 text-lg md:text-xl font-rubik mb-8 max-w-lg mx-auto md:mx-0">
              Registra gastos hablando, controla presupuestos sin esfuerzo y
              ahorra con un asistente que te entiende. FinZen AI transforma
              cómo manejas tu dinero.
            </p>

            {/* CTAs conditioned by device */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start mb-8">
              {(device === 'ios' || device === 'desktop') && (
                <Button
                  variant="primary"
                  size="md"
                  href={getAppStoreLink('hero')}
                  icon={<Apple size={18} />}
                  onClick={() => trackDownloadIOS('hero')}
                >
                  App Store
                </Button>
              )}
              {(device === 'android' || device === 'desktop') && (
                <Button
                  variant="outline-white"
                  size="md"
                  href={getPlayStoreLink('hero')}
                  icon={<Play size={18} />}
                  onClick={() => trackDownloadAndroid('hero')}
                >
                  Google Play
                </Button>
              )}
            </div>

            <p className="text-white/50 text-sm font-rubik">
              Una nueva generación está cambiando su relación con el dinero
            </p>
          </div>

          {/* Hero mockup placeholder */}
          <div className="flex justify-center md:justify-end">
            <div className="relative w-[280px] h-[560px] md:w-[300px] md:h-[600px] lg:w-[340px] lg:h-[680px]">
              {/* Placeholder glow effect */}
              <div className="absolute inset-0 bg-finzen-green/20 rounded-[3rem] blur-3xl" />
              <div className="relative w-full h-full rounded-[2.5rem] bg-white/10 border border-white/20 overflow-hidden flex items-center justify-center">
                <Image
                  src="/hero-mockup.png"
                  alt="FinZen AI Dashboard"
                  fill
                  className="object-contain p-2"
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
