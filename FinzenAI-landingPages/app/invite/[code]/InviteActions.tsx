'use client';

import { useEffect, useState } from 'react';

const APP_STORE_URL = 'https://apps.apple.com/app/finzen-ai/id6758305719?utm_source=website&utm_medium=invite&utm_campaign=compartidos';
const PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=com.jl.alonso.finzenaimobile&utm_source=website&utm_medium=invite&utm_campaign=compartidos';

type Plataforma = 'ios' | 'android' | 'otra';

function detectar(): Plataforma {
  const ua = navigator.userAgent || '';
  if (/iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && 'ontouchend' in document)) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  return 'otra';
}

export default function InviteActions({ code }: { code: string }) {
  const [plataforma, setPlataforma] = useState<Plataforma>('otra');
  const [copiado, setCopiado] = useState(false);

  useEffect(() => setPlataforma(detectar()), []);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Sin permiso de portapapeles: el código queda visible para copiarlo a mano.
    }
  };

  const tienda = (cual: 'ios' | 'android', principal: boolean) => (
    <a
      key={cual}
      href={cual === 'ios' ? APP_STORE_URL : PLAY_STORE_URL}
      className={
        principal
          ? 'block w-full text-center py-3 rounded-xl bg-finzen-green text-white font-semibold text-sm hover:opacity-90 transition-all'
          : 'block w-full text-center py-3 rounded-xl border border-finzen-gray/20 text-finzen-black font-semibold text-sm hover:bg-finzen-white transition-all'
      }
    >
      {cual === 'ios' ? 'Descargar en App Store' : 'Descargar en Google Play'}
    </a>
  );

  return (
    <div className="text-left">
      <p className="text-sm font-semibold text-finzen-black mb-2">Tu código de invitación</p>
      <button
        type="button"
        onClick={copiar}
        className="w-full flex items-center justify-between gap-3 rounded-xl border-2 border-dashed border-finzen-blue/40 bg-finzen-blue/5 px-4 py-3 mb-1"
        aria-label={`Copiar el código ${code}`}
      >
        <span className="font-mono text-2xl sm:text-3xl tracking-[0.3em] text-finzen-black">{code}</span>
        <span className="text-xs font-semibold text-finzen-blue whitespace-nowrap">{copiado ? '¡Copiado!' : 'Copiar'}</span>
      </button>
      <p className="text-xs text-finzen-gray mb-6">Lo vas a necesitar dentro de la app.</p>

      <p className="text-sm font-semibold text-finzen-black mb-2">¿Todavía no tienes FinZen?</p>
      <ol className="text-sm text-finzen-gray list-decimal pl-5 space-y-1 mb-4">
        <li>Descárgala gratis.</li>
        <li>Crea tu cuenta.</li>
        <li>Escribe el código {code} cuando la app te lo pida.</li>
      </ol>
      <div className="space-y-2 mb-6">
        {plataforma === 'android'
          ? [tienda('android', true), tienda('ios', false)]
          : [tienda('ios', plataforma === 'ios'), tienda('android', plataforma === 'otra')]}
      </div>

      <a
        href={`finzenai://invite/${code}`}
        className="block w-full text-center py-3 rounded-xl text-finzen-blue font-semibold text-sm hover:underline"
      >
        Ya tengo FinZen: abrir la app
      </a>
    </div>
  );
}
