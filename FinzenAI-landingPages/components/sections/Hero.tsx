'use client';

import Image from 'next/image';
import { Play } from 'lucide-react';
import Button from '@/components/ui/Button';
import AppleLogo from '@/components/ui/AppleLogo';
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
          <div className="text-center md:text-left animate-fade-in-up">
            <p className="text-white/60 text-sm font-rubik font-medium mb-4 tracking-widest uppercase animate-fade-in-down">
              Tu copiloto financiero con IA
            </p>
            <h1 className="font-rubik font-bold italic text-4xl md:text-5xl lg:text-6xl text-white leading-tight mb-6 animate-scale-in" 
                style={{textShadow: '0 4px 8px rgba(0,0,0,0.3)'}}>
              El amigo que sabe de dinero que siempre quisiste tener
            </h1>
            <p className="text-white/80 text-lg md:text-xl font-rubik font-normal mb-8 max-w-lg mx-auto md:mx-0 leading-relaxed animate-slide-in-bottom">
              Registra gastos hablando, controla presupuestos sin esfuerzo y
              ahorra con un asistente que te entiende. FinZen AI transforma
              cómo manejas tu dinero.
            </p>

            {/* CTAs conditioned by device */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start items-start mb-8 animate-bounce-gentle">
              <Button
                variant="primary"
                size="md"
                href={getAppStoreLink('hero')}
                icon={<AppleLogo size={18} />}
                onClick={() => trackDownloadIOS('hero')}
                className="min-w-[200px] h-[52px] transform hover:scale-105 transition-all duration-300 hover:shadow-lg animate-glow"
              >
                App Store
              </Button>
              <Button
                variant="primary"
                size="md"
                href="https://play.google.com/store/apps/details?id=com.jl.alonso.finzenaimobile&pcampaignid=web_share"
                icon={<Play size={18} />}
                className="min-w-[200px] h-[52px] transform hover:scale-105 transition-all duration-300 hover:shadow-lg animate-glow"
              >
                Google Play
              </Button>
            </div>

            <p className="text-white/50 text-sm font-rubik font-light tracking-wide animate-pulse-soft">
              Una nueva generación está cambiando su relación con el dinero
            </p>
          </div>

          {/* Hero 3D mockup */}
          <div className="flex justify-center md:justify-end animate-float">
            <div className="relative w-[340px] h-[620px] md:w-[420px] md:h-[750px] lg:w-[460px] lg:h-[820px] transform hover:scale-105 transition-all duration-500">
              <Image
                src="/zenio-screenshot.png"
                alt="Zenio - Tu copiloto financiero con IA"
                fill
                className="object-contain drop-shadow-2xl"
                priority
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
