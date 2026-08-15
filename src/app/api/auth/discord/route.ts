import { NextResponse } from 'next/server';
import { oauthAuthorizeUrl } from '../../../../lib/discord';
import { generateState, COOKIE_NAME } from '../../../../lib/session';

function safeNextPath(value: string | null): string | null {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return null;
  return value;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = url.origin;
  const next = safeNextPath(url.searchParams.get('next'));
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