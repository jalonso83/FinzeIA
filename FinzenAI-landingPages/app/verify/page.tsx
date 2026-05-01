'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';

const BACKEND_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  'https://finzenai-backend-production.up.railway.app';

const STORAGE_ANONYMOUS_ID = 'finzen_anonymous_id';

type VerifyState =
  | { status: 'loading' }
  | { status: 'success'; alreadyVerified: boolean; message: string }
  | { status: 'error'; message: string };

function readAnonymousId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(STORAGE_ANONYMOUS_ID);
  } catch {
    return null;
  }
}

function VerifyContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const email = searchParams.get('email');
  const [state, setState] = useState<VerifyState>({ status: 'loading' });
  const calledRef = useRef(false);

  useEffect(() => {
    // Guard contra doble fetch en React strict mode (dev) y dobles renders
    if (calledRef.current) return;
    calledRef.current = true;

    if (!token || !email) {
      setState({
        status: 'error',
        message: 'El enlace de verificación es inválido o está incompleto. Solicita un nuevo correo desde la app.',
      });
      return;
    }

    const anonymousId = readAnonymousId();

    fetch(`${BACKEND_URL}/api/auth/verify-email-with-attribution`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        email,
        anonymousId: anonymousId ?? undefined,
      }),
      credentials: 'omit',
    })
      .then(async (res) => {
        const data = await res.json().catch(() => null);
        if (res.ok && data?.success) {
          setState({
            status: 'success',
            alreadyVerified: !!data.alreadyVerified,
            message: data.message || '¡Tu cuenta ha sido verificada!',
          });
        } else {
          setState({
            status: 'error',
            message: data?.error || 'No pudimos verificar tu cuenta. Intenta nuevamente.',
          });
        }
      })
      .catch(() => {
        setState({
          status: 'error',
          message: 'Error de conexión. Verifica tu internet e intenta nuevamente.',
        });
      });
  }, [token, email]);

  return (
    <div className="min-h-screen bg-finzen-white flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-lg border border-finzen-gray/10 p-8 text-center">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <img
              src="/logo-finzen-icon.png"
              alt="FinZen AI"
              className="w-24 h-24 object-contain"
            />
          </div>

          {state.status === 'loading' && (
            <>
              <div className="w-12 h-12 mx-auto mb-4 border-4 border-finzen-gray/20 border-t-finzen-blue rounded-full animate-spin" />
              <h1 className="text-xl font-bold text-finzen-black mb-2">
                Verificando tu cuenta...
              </h1>
              <p className="text-finzen-gray text-sm">
                Esto solo tomará un momento.
              </p>
            </>
          )}

          {state.status === 'success' && (
            <>
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-finzen-green/10 flex items-center justify-center">
                <svg
                  className="w-10 h-10 text-finzen-green"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-finzen-black mb-2">
                {state.alreadyVerified ? '¡Ya estabas verificado!' : '¡Cuenta verificada!'}
              </h1>
              <p className="text-finzen-gray mb-6">{state.message}</p>
              <p className="text-sm text-finzen-gray mb-6">
                Ya puedes iniciar sesión en la app FinZen AI.
              </p>
              <Link
                href="/"
                className="inline-block w-full py-3 rounded-xl bg-finzen-green text-white font-semibold text-sm hover:opacity-90 transition-all"
              >
                Volver a finzenai.com
              </Link>
            </>
          )}

          {state.status === 'error' && (
            <>
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-finzen-red/10 flex items-center justify-center">
                <svg
                  className="w-10 h-10 text-finzen-red"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-finzen-black mb-2">
                No pudimos verificar tu cuenta
              </h1>
              <p className="text-finzen-gray mb-6">{state.message}</p>
              <Link
                href="/"
                className="inline-block w-full py-3 rounded-xl bg-finzen-blue text-white font-semibold text-sm hover:opacity-90 transition-all"
              >
                Volver a finzenai.com
              </Link>
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

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-finzen-white flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-finzen-gray/20 border-t-finzen-blue rounded-full animate-spin" />
        </div>
      }
    >
      <VerifyContent />
    </Suspense>
  );
}
