import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL =
  process.env.BACKEND_URL ||
  'https://finzenai-backend-production.up.railway.app';

export async function GET(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const cookieStore = cookies();
  const token = cookieStore.get('admin-token')?.value;

  if (!token) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const path = params.path.join('/');
  const url = new URL(`${BACKEND_URL}/api/admin/${path}`);

  // Forward query params
  req.nextUrl.searchParams.forEach((value, key) => {
    url.searchParams.set(key, value);
  });

  try {
    const backendRes = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    const data = await backendRes.json();
    return NextResponse.json(data, { status: backendRes.status });
  } catch {
    return NextResponse.json(
      { error: 'Error conectando con el backend' },
      { status: 502 }
    );
  }
}

async function forwardWithBody(
  req: NextRequest,
  params: { path: string[] },
  method: 'POST' | 'PATCH' | 'PUT' | 'DELETE'
) {
  const cookieStore = cookies();
  const token = cookieStore.get('admin-token')?.value;

  if (!token) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const path = params.path.join('/');
  const url = new URL(`${BACKEND_URL}/api/admin/${path}`);

  req.nextUrl.searchParams.forEach((value, key) => {
    url.searchParams.set(key, value);
  });

  let body: string | undefined;
  try {
    body = await req.text();
  } catch {
    body = undefined;
  }

  try {
    const backendRes = await fetch(url.toString(), {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: body || '{}',
      cache: 'no-store',
    });

    const data = await backendRes.json();
    return NextResponse.json(data, { status: backendRes.status });
  } catch {
    return NextResponse.json(
      { error: 'Error conectando con el backend' },
      { status: 502 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return forwardWithBody(req, params, 'POST');
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return forwardWithBody(req, params, 'PATCH');
}
