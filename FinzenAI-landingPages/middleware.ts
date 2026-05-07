import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Protect /dashboard routes
  if (pathname.startsWith('/dashboard')) {
    const token = req.cookies.get('admin-token')?.value;
    const pdfToken = req.nextUrl.searchParams.get('pdfToken');

    // Permitir acceso si hay cookie admin O pdfToken (Puppeteer en generación
    // de PDF). El backend valida el pdfToken cuando el dashboard hace API calls.
    if (!token && !pdfToken) {
      const loginUrl = new URL('/login', req.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Redirect /login to /dashboard if already logged in
  if (pathname === '/login') {
    const token = req.cookies.get('admin-token')?.value;

    if (token) {
      const dashboardUrl = new URL('/dashboard', req.url);
      return NextResponse.redirect(dashboardUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/login'],
};
