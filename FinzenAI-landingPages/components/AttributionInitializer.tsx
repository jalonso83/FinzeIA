'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { captureAttribution } from '@/lib/attribution';
import { trackPageView } from '@/lib/analytics';

/**
 * Corre en mount y en cada cambio de pathname:
 *  1. captureAttribution() → guarda UTMs/click IDs en cookie + sessionStorage
 *  2. trackPageView() → POST /api/events/track al backend para que persista
 *     el PageView en attribution_events (alimenta el dashboard de Adquisición).
 *
 * Por qué pathname (y NO useSearchParams):
 *   - useSearchParams fuerza dynamic rendering del layout completo → mata SSG
 *   - captureAttribution lee window.location.search directo, no necesita el hook
 *   - pathname change cubre el caso real: navegación SPA a otra ruta con UTMs
 *
 * Componente vacío (no renderiza nada). Sólo hook point client-side.
 */
export default function AttributionInitializer() {
  const pathname = usePathname();

  useEffect(() => {
    captureAttribution();
    trackPageView(pathname);
  }, [pathname]);

  return null;
}
