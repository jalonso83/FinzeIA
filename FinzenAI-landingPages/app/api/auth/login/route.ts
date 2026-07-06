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

    // Resolver rol (admin | marketing) antes de llamar al backend.
    // null = email no autorizado en ninguna whitelist.
    const role = getRoleForEmail(email);
    if (!role) {
      return NextResponse.json(
        { error: 'No tienes permisos de administrador' },
        { status: 403 }
      );
    }

    // Call backend login
    const backendRes = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await backendRes.json();

    if (!backendRes.ok) {
      return NextResponse.json(
        { error: data.message || 'Credenciales inválidas' },
        { status: backendRes.status }
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
