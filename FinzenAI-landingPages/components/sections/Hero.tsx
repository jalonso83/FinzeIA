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
              <Button
                variant="primary"
                size="md"
                href={getAppStoreLink('hero')}
                icon={<Apple size={18} />}
                onClick={() => trackDownloadIOS('hero')}
                className="min-w-[180px]"
              >
                App Store
              </Button>
              {/* Google Play — oculto temporalmente
              {(device === 'android' || device === 'desktop') && (
                <Button
                  variant="outline-white"
                  size="md"
                  href={getPlayStoreLink('hero')}
                  icon={<Play size={18} />}
                  onClick={() => trackDownloadAndroid('hero')}
                  className="min-w-[180px]"
                >
                  Google Play
                </Button>
              )}
              */}
            </div>

            <p className="text-white/50 text-sm font-rubik">
              Una nueva generación está cambiando su relación con el dinero
            </p>
          </div>

          {/* Hero 3D mockup */}
          <div className="flex justify-center md:justify-end">
            <div className="relative w-[340px] h-[620px] md:w-[420px] md:h-[750px] lg:w-[460px] lg:h-[820px]">
              <Image
                src="/zenio-screenshot.png"
                alt="Zenio - Tu copiloto financiero con IA"
                fill
                className="object-contain"
                priority
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
