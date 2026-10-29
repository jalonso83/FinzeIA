import { NextRequest, NextResponse } from 'next/server';
import { getRoleForEmail } from '@/lib/roles';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    const BACKEND_URL = process.env.BACKEND_URL || 'https://finzenai-backend-production.up.railway.app';

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email y contraseña son requeridos' },
        { status: 400 }
      );
    }

    // Primero la contraseña y DESPUÉS la whitelist, y el mismo mensaje en todos
    // los rechazos. Antes la whitelist iba primero con su propio 403 ("No tienes
    // permisos"), instantáneo, y el resto pasaba por el backend con otro mensaje
    // y otro tiempo: comparando respuestas se sabía qué emails son admin. Por lo
    // mismo no se reenvían los mensajes del backend ("verifica tu email", "esta
    // cuenta usa Google"), que confirman que la cuenta existe.
    const backendRes = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    // Bloqueo por intentos: decirlo no revela nada de la cuenta y evita que
    // quien se equivocó siga probando sin saber que está bloqueado.
    if (backendRes.status === 429) {
      return NextResponse.json(
        { error: 'Demasiados intentos. Espera 15 minutos e inténtalo de nuevo.' },
        { status: 429 }
      );
    }

    // Una caída del backend no es "contraseña incorrecta": que no confunda.
    if (backendRes.status >= 500) {
      return NextResponse.json(
        { error: 'Error del servidor' },
        { status: 502 }
      );
    }

    const data = await backendRes.json();

    // Resolver rol (admin | marketing). null = email no autorizado en ninguna whitelist.
    const role = backendRes.ok ? getRoleForEmail(email) : null;
    if (!backendRes.ok || !role) {
      return NextResponse.json(
        { error: 'Email o contraseña incorrectos' },
        { status: 401 }
      );
    }

    // Set httpOnly cookie with token
    const response = NextResponse.json({
      message: 'Login exitoso',
      user: {
        name: data.user.name,
        email: data.user.email,
        role,
      },
    });

    response.cookies.set('admin-token', data.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    response.cookies.set('admin-user', JSON.stringify({
      name: data.user.name,
      email: data.user.email,
      role, // usado por la UI para filtrar navegación/widgets
    }), {
      httpOnly: false, // readable by client for UI
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    // Cookie httpOnly con el rol: la leen el middleware y el proxy para el
    // enforcement REAL (bloqueo de rutas/endpoints). No accesible por JS del cliente.
    response.cookies.set('admin-role', role, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch {
    return NextResponse.json(
      { error: 'Error del servidor' },
      { status: 500 }
    );
  }
}
