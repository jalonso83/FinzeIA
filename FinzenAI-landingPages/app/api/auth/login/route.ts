import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase());
    const BACKEND_URL = process.env.BACKEND_URL || 'https://finzenai-backend-production.up.railway.app';

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email y contraseña son requeridos' },
        { status: 400 }
      );
    }

    // Check whitelist before calling backend
    if (!ADMIN_EMAILS.includes(email.toLowerCase())) {
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
    }), {
      httpOnly: false, // readable by client for UI
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
