'use client';

import { Instagram, Mail, MessageCircle } from 'lucide-react';
import Card from '@/components/ui/Card';
import Icon from '@/components/ui/Icon';
import { useInView } from '@/hooks/useInView';
import {
  CONTACT_EMAIL,
  INSTAGRAM_HANDLE,
  INSTAGRAM_URL,
  WHATSAPP_NUMBER,
  WHATSAPP_URL,
} from '@/lib/constants';

// Bloque de contacto con personas reales (punto 10 de las mejoras del
// 23/10/2026). Versión ligera: tres vías, sin formulario ni central telefónica.
const channels = [
  {
    icon: MessageCircle,
    label: 'WhatsApp',
    value: WHATSAPP_NUMBER,
    href: WHATSAPP_URL,
    external: true,
  },
  {
    icon: Mail,
    label: 'Correo',
    value: CONTACT_EMAIL,
    href: `mailto:${CONTACT_EMAIL}`,
    external: false,
  },
  {
    icon: Instagram,
    label: 'Instagram',
    value: `Escríbenos por DM a ${INSTAGRAM_HANDLE}`,
    href: INSTAGRAM_URL,
    external: true,
  },
];

export default function Contact() {
  const { ref, isInView } = useInView<HTMLDivElement>();

  // Va pegado al final de las FAQ (mismo fondo blanco, sin título de sección
  // propio): quien no encontró su respuesta tiene el contacto justo debajo, y
  // el cierre azul de descarga sigue inmediatamente después.
  return (
    <section id="contacto" className="bg-white">
      <div className="px-4 md:px-8 pb-16 md:pb-24 -mt-8 md:-mt-12 max-w-4xl mx-auto">
        <div className="rounded-2xl bg-finzen-white border border-finzen-gray/20 px-4 py-8 md:px-8 text-center">
          <h3 className="font-rubik font-semibold text-xl md:text-2xl text-finzen-black mb-1">
            ¿No encontraste tu respuesta? Escríbenos
          </h3>
          <p className="text-finzen-gray text-sm md:text-base mb-6">
            Te responde una persona del equipo de FinZen AI.
          </p>

          <div
            ref={ref}
            className={`grid grid-cols-1 md:grid-cols-3 gap-4 transition-all duration-700 ${
              isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
            }`}
          >
            {channels.map((channel) => (
              <a
                key={channel.label}
                href={channel.href}
                {...(channel.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                className="group focus:outline-none focus-visible:ring-2 focus-visible:ring-finzen-green/50 rounded-xl"
              >
                <Card className="h-full flex flex-col items-center text-center">
                  <Icon icon={channel.icon} color="text-finzen-green" variant="gradient" size={28} />
                  <h4 className="font-rubik font-semibold text-lg text-finzen-black mt-4 mb-1">
                    {channel.label}
                  </h4>
                  <p className="text-finzen-gray text-sm group-hover:text-finzen-blue transition-colors break-words">
                    {channel.value}
                  </p>
                </Card>
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
