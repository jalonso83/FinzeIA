import type { Metadata } from 'next';
import Link from 'next/link';
import InviteActions from './InviteActions';

// Invitación a un presupuesto o meta compartidos (2026-10). La app manda este
// enlace; quien lo abre ve quién lo invita, el código y cómo bajar la app.
// Solo se muestra lo que da el endpoint público: nada de montos ni miembros.

const BACKEND_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  'https://finzenai-backend-production.up.railway.app';

type Estado = 'valida' | 'vencida' | 'usada' | 'revocada' | 'cerrada' | 'pausada' | 'llena';

interface VistaInvitacion {
  code: string;
  tipo: 'presupuesto' | 'meta';
  estado: Estado;
  dueno: string;
  nombre: string | null;
  icono: string | null;
}

type Resultado = { ok: true; inv: VistaInvitacion } | { ok: false; noExiste: boolean };

function normalizar(code: string): string {
  return decodeURIComponent(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
}

async function cargar(code: string): Promise<Resultado> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/shared/public/invitations/${encodeURIComponent(code)}`, {
      next: { revalidate: 60 },
    });
    if (res.status === 404) return { ok: false, noExiste: true };
    if (!res.ok) return { ok: false, noExiste: false };
    return { ok: true, inv: (await res.json()) as VistaInvitacion };
  } catch {
    return { ok: false, noExiste: false };
  }
}

function frase(inv: VistaInvitacion): string {
  const nombre = inv.nombre ? `«${inv.nombre}»` : inv.tipo === 'meta' ? 'una meta' : 'un presupuesto';
  return inv.tipo === 'meta'
    ? `${inv.dueno} te invita a ahorrar juntos para la meta ${nombre}`
    : `${inv.dueno} te invita a llevar juntos el presupuesto ${nombre}`;
}

function problema(inv: VistaInvitacion): { titulo: string; texto: string } | null {
  const cosa = inv.tipo === 'meta' ? 'Esta meta' : 'Este presupuesto';
  switch (inv.estado) {
    case 'valida':
      return null;
    case 'vencida':
      return { titulo: 'Esta invitación venció', texto: `Pídele a ${inv.dueno} que te mande una nueva desde la app.` };
    case 'usada':
      return {
        titulo: 'Esta invitación ya se usó',
        texto: `Si fuiste tú, abre FinZen AI: ya estás dentro. Si no, pídele a ${inv.dueno} una invitación nueva.`,
      };
    case 'revocada':
      return { titulo: 'Esta invitación se canceló', texto: `${inv.dueno} la canceló. Si fue un error, pídele una nueva.` };
    case 'cerrada':
      return { titulo: `${cosa} ya no se comparte`, texto: `${inv.dueno} dejó de compartirlo o lo borró.` };
    case 'pausada':
      return { titulo: `${cosa} está en pausa`, texto: `Por ahora no se puede entrar. Pídele a ${inv.dueno} que te avise cuando vuelva.` };
    case 'llena':
      return { titulo: `${cosa} ya está completo`, texto: 'Ya tiene 4 personas, que es el máximo.' };
    default:
      return { titulo: 'Esta invitación no está disponible', texto: `Pídele a ${inv.dueno} una nueva.` };
  }
}

export async function generateMetadata({ params }: { params: { code: string } }): Promise<Metadata> {
  const code = normalizar(params.code);
  const r = await cargar(code);
  const titulo = r.ok && r.inv.estado === 'valida' ? `${frase(r.inv)} en FinZen AI` : 'Invitación a FinZen AI';
  const descripcion = 'Lleven juntos sus gastos y metas en FinZen AI. Toca para ver la invitación.';
  return {
    title: titulo,
    description: descripcion,
    alternates: { canonical: `https://finzenai.com/invite/${code}` },
    robots: { index: false, follow: false },
    openGraph: {
      title: titulo,
      description: descripcion,
      images: ['/og-image.png'],
      type: 'website',
      url: `https://finzenai.com/invite/${code}`,
    },
    twitter: { card: 'summary_large_image', title: titulo, description: descripcion, images: ['/og-image.png'] },
  };
}

export default async function InvitePage({ params }: { params: { code: string } }) {
  const code = normalizar(params.code);
  const r = await cargar(code);

  return (
    <div className="min-h-screen bg-finzen-white flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-lg border border-finzen-gray/10 p-6 sm:p-8 text-center">
          <div className="flex justify-center mb-5">
            <img src="/logo-finzen-icon.png" alt="FinZen AI" className="w-20 h-20 object-contain" />
          </div>

          {!r.ok && (
            <>
              <h1 className="text-2xl font-bold text-finzen-black mb-2">
                {r.noExiste ? 'Ese código no existe' : 'No pudimos cargar la invitación'}
              </h1>
              <p className="text-finzen-gray mb-6">
                {r.noExiste
                  ? 'Revisa que el enlace esté completo o pide que te lo manden otra vez.'
                  : 'Revisa tu conexión e inténtalo de nuevo en un momento.'}
              </p>
              <Link
                href="/"
                className="inline-block w-full py-3 rounded-xl bg-finzen-blue text-white font-semibold text-sm hover:opacity-90 transition-all"
              >
                Conocer FinZen AI
              </Link>
            </>
          )}

          {r.ok && problema(r.inv) && (
            <>
              <h1 className="text-2xl font-bold text-finzen-black mb-2">{problema(r.inv)!.titulo}</h1>
              <p className="text-finzen-gray mb-6">{problema(r.inv)!.texto}</p>
              <Link
                href="/"
                className="inline-block w-full py-3 rounded-xl bg-finzen-blue text-white font-semibold text-sm hover:opacity-90 transition-all"
              >
                Conocer FinZen AI
              </Link>
            </>
          )}

          {r.ok && !problema(r.inv) && (
            <>
              {r.inv.icono && <div className="text-4xl mb-3" aria-hidden>{r.inv.icono}</div>}
              <h1 className="text-xl sm:text-2xl font-bold text-finzen-black mb-3 leading-snug">{frase(r.inv)}</h1>
              <p className="text-finzen-gray text-sm mb-6">
                {r.inv.tipo === 'meta'
                  ? 'Cada quien aporta desde su celular y todos ven cómo avanza.'
                  : 'Los gastos de cada uno suman en el mismo presupuesto y todos ven cuánto queda.'}
              </p>
              <InviteActions code={code} />
            </>
          )}
        </div>

        <p className="text-xs text-finzen-gray text-center mt-6">
          ¿Necesitas ayuda? Escríbenos a{' '}
          <a href="mailto:info@finzenai.com" className="text-finzen-blue hover:underline">
            info@finzenai.com
          </a>
        </p>
      </div>
    </div>
  );
}
