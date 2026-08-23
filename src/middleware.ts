import { NextRequest, NextResponse } from 'next/server';

const DASHBOARD_API_KEY = process.env.DASHBOARD_API_KEY || '';

// Endpoints that must work without any API key (browser navigation, public).
const PUBLIC_PATHS = new Set([
  '/api/auth/discord',
  '/api/auth/discord/callback',
  '/api/auth/logout',
  '/api/auth/me',
  '/api/status',
  '/api/status-events',
]);

export function middleware(request: NextRequest) {
  if (!DASHBOARD_API_KEY) return NextResponse.next();

  const { pathname } = request.nextUrl;
  if (!pathname.startsWith('/api/')) return NextResponse.next();
  if (PUBLIC_PATHS.has(pathname)) return NextResponse.next();
  if (request.method === 'OPTIONS') return NextResponse.next();

  const provided = request.headers.get('x-api-key');
  if (provided && provided === DASHBOARD_API_KEY) return NextResponse.next();

  return NextResponse.json(
    { ok: false, error: 'Invalid or missing API key.' },
    { status: 401 }
  );
}

export const config = {
  matcher: ['/api/:path*'],
};
