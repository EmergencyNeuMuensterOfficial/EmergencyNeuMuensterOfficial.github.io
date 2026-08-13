import { NextResponse } from 'next/server';
import { oauthAuthorizeUrl } from '../../../../lib/discord';
import { generateState, COOKIE_NAME } from '../../../../lib/session';

export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  const state = generateState();

  const response = NextResponse.redirect(oauthAuthorizeUrl(origin, state));

  response.cookies.set('onboardx_oauth_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 600,
  });

  response.cookies.set(COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });

  return response;
}