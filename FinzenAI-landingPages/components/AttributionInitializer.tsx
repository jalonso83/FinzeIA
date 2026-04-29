'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { captureAttribution } from '@/lib/attribution';

/**
 * Corre captureAttribution() en mount y en cada cambio de pathname.
 *
 * Por qué pathname (y NO useSearchParams):
 *   - useSearchParams fuerza dynamic rendering del layout completo → mata SSG
 *   - captureAttribution lee window.location.search directo, no necesita el hook
 *   - pathname change cubre el caso real: navegación SPA a otra ruta con UTMs
 *
 * Si el user llega a /?utm_source=meta y permanece en la misma URL,
 * el mount inicial captura. Si navega a /pricing?utm_content=premium,
 * el cambio de pathname dispara la re-captura.
 *
 * Componente vacío (no renderiza nada). Sólo hook point client-side.
 */
export default function AttributionInitializer() {
  const pathname = usePathname();

  useEffect(() => {
    captureAttribution();
  }, [pathname]);

  return null;
}
