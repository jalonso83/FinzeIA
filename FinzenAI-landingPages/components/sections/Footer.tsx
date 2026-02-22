import Image from 'next/image';
import {
  CONTACT_EMAIL,
  INSTAGRAM_HANDLE,
  INSTAGRAM_URL,
  COMPANY_NAME,
  COPYRIGHT_YEAR,
} from '@/lib/constants';

export default function Footer() {
  return (
    <footer className="bg-finzen-black">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Logo + tagline */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="relative w-6 h-6">
                <Image
                  src="/isotipo-blanco.png"
                  alt="FinZen AI"
                  fill
                  className="object-contain"
                />
              </div>
              <span className="text-white font-rubik font-semibold text-lg">
                FinZen AI
              </span>
            </div>
            <p className="text-white/50 text-sm">
              Tu copiloto financiero con IA.
            </p>
          </div>

          {/* Producto */}
          <div>
            <h4 className="text-white font-rubik font-semibold text-sm mb-4 uppercase tracking-wider">
              Producto
            </h4>
            <ul className="space-y-3">
              <li>
                <a
                  href="#features"
                  className="text-white/60 hover:text-white text-sm transition-colors"
                >
                  Características
                </a>
              </li>
              <li>
                <a
                  href="#pricing"
                  className="text-white/60 hover:text-white text-sm transition-colors"
                >
                  Precios
                </a>
              </li>
              <li>
                <a
                  href="#faq"
                  className="text-white/60 hover:text-white text-sm transition-colors"
                >
                  FAQ
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-white font-rubik font-semibold text-sm mb-4 uppercase tracking-wider">
              Legal
            </h4>
            <ul className="space-y-3">
              <li>
                <a
                  href="/privacidad"
                  className="text-white/60 hover:text-white text-sm transition-colors"
                >
                  Política de Privacidad
                </a>
              </li>
              <li>
                <a
                  href="/terminos"
                  className="text-white/60 hover:text-white text-sm transition-colors"
                >
                  Términos de Uso
                </a>
              </li>
            </ul>
          </div>

          {/* Contacto */}
          <div>
            <h4 className="text-white font-rubik font-semibold text-sm mb-4 uppercase tracking-wider">
              Contacto
            </h4>
            <ul className="space-y-3">
              <li>
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="text-white/60 hover:text-white text-sm transition-colors"
                >
                  {CONTACT_EMAIL}
                </a>
              </li>
              <li>
                <a
                  href={INSTAGRAM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/60 hover:text-white text-sm transition-colors"
                >
                  Instagram {INSTAGRAM_HANDLE}
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/10 pt-8">
          <p className="text-white/40 text-sm text-center mb-2">
            &copy; {COPYRIGHT_YEAR} FinZen AI by {COMPANY_NAME}. Todos los
            derechos reservados.
          </p>
          <p className="text-white/30 text-xs text-center">
            FinZen AI no es un banco ni ofrece servicios bancarios.
          </p>
        </div>
      </div>
    </footer>
  );
}
