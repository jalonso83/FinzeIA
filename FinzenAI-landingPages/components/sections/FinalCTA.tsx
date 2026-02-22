'use client';

import { Apple, Play } from 'lucide-react';
import Button from '@/components/ui/Button';
import { useDeviceDetect } from '@/hooks/useDeviceDetect';
import { getAppStoreLink, getPlayStoreLink } from '@/lib/constants';
import { trackDownloadIOS, trackDownloadAndroid } from '@/lib/analytics';
import { useInView } from '@/hooks/useInView';

export default function FinalCTA() {
  const device = useDeviceDetect();
  const { ref, isInView } = useInView<HTMLElement>();

  return (
    <section
      id="final-cta"
      ref={ref}
      className="bg-finzen-blue"
    >
      <div
        className={`py-16 md:py-24 px-4 md:px-8 max-w-4xl mx-auto text-center transition-all duration-700 ${
          isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
        }`}
      >
        <h2 className="font-rubik font-semibold italic text-3xl md:text-4xl lg:text-5xl text-white mb-4">
          Tu primer paso hacia la libertad financiera
        </h2>
        <p className="text-white/70 text-lg md:text-xl mb-10 max-w-2xl mx-auto">
          Descarga FinZen AI gratis y empieza a tomar el control de tu dinero
          hoy.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {(device === 'ios' || device === 'desktop') && (
            <Button
              variant="primary"
              size="lg"
              href={getAppStoreLink('footer_cta')}
              icon={<Apple size={20} />}
              onClick={() => trackDownloadIOS('footer_cta')}
            >
              Da el primer paso
            </Button>
          )}
          {(device === 'android' || device === 'desktop') && (
            <Button
              variant="outline-white"
              size="lg"
              href={getPlayStoreLink('footer_cta')}
              icon={<Play size={20} />}
              onClick={() => trackDownloadAndroid('footer_cta')}
            >
              Da el primer paso
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
