import { NextResponse } from 'next/server';
import { discordRedirectUri, oauthAuthorizeUrl } from '../../../../lib/discord';
import { generateState, COOKIE_NAME } from '../../../../lib/session';

export const dynamic = 'force-dynamic';

function safeNextPath(value: string | null): string | null {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return null;
  return value;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = url.origin;
  const next = safeNextPath(url.searchParams.get('next'));

  // The OAuth state cookie must be created on the same host that Discord
  // returns to. A custom domain plus a stale Vercel-domain redirect URI would
  // otherwise lose the cookie and continuously restart the login flow.
  const callbackOrigin = new URL(discordRedirectUri(origin)).origin;
  if (callbackOrigin !== origin) {
    const canonicalLogin = new URL('/api/auth/discord', callbackOrigin);
    if (next) canonicalLogin.searchParams.set('next', next);
    return NextResponse.redirect(canonicalLogin);
  }

  const state = generateState();

  const response = NextResponse.redirect(oauthAuthorizeUrl(origin, state));

  response.cookies.set('onboardx_oauth_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 600,
  });

  if (next) {
    response.cookies.set('onboardx_next', next, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 600,
    });
  }

  response.cookies.set(COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });

  return response;
}
