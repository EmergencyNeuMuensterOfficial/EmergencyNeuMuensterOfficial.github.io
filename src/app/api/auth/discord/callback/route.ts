import { NextRequest, NextResponse } from 'next/server';
import { exchangeCode, fetchDiscordUser, fetchUserGuilds } from '../../../../../lib/discord';
import { createSessionToken, COOKIE_NAME, generateState } from '../../../../../lib/session';
import { storeOAuthSession } from '../../../../../lib/mongo';

export const dynamic = 'force-dynamic';

function callbackRedirect(origin: string, nextPath: string, login: string) {
  const destination = new URL(nextPath, origin);
  destination.searchParams.set('login', login);
  return destination;
}

export async function GET(request: NextRequest) {
  const origin = new URL(request.url).origin;
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  const expectedState = request.cookies.get('onboardx_oauth_state')?.value;
  const nextPath = request.cookies.get('onboardx_next')?.value ?? '/dashboard';
  const safeNext = nextPath.startsWith('/') && !nextPath.startsWith('//') && !nextPath.includes('\\') ? nextPath : '/dashboard';

  if (error) {
    return NextResponse.redirect(callbackRedirect(origin, safeNext, 'error'));
  }
  if (!code || !expectedState || !state || state !== expectedState) {
    return NextResponse.redirect(callbackRedirect(origin, safeNext, 'invalid'));
  }

  try {
    const token = await exchangeCode(origin, code);

    if (!token.scope.split(' ').includes('guilds')) {
      return NextResponse.redirect(callbackRedirect(origin, safeNext, 'missing_scope'));
    }

    const user = await fetchDiscordUser(token.access_token);
    await fetchUserGuilds(token.access_token).catch(() => []); // keep the guilds scope fresh; filtering happens in /api/dashboard/guilds

    const session = {
      sessionId: generateState(),
      userId: user.id,
      username: user.username,
      avatar: user.avatar,
      globalName: user.global_name ?? null,
      discriminator: user.discriminator ?? '0',
      banner: user.banner ?? null,
      accentColor: typeof user.accent_color === 'number' ? user.accent_color : null,
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
    };
    // Persist OAuth credentials server-side. The browser cookie only contains
    // a signed session copy, while refresh-token rotation is coordinated in MongoDB.
    await storeOAuthSession(session);
    const sessionToken = createSessionToken(session);

    const response = NextResponse.redirect(callbackRedirect(origin, safeNext, 'complete'));
    response.cookies.set(COOKIE_NAME, sessionToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });
    response.cookies.set('onboardx_oauth_state', '', {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 0,
    });
    response.cookies.set('onboardx_next', '', {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 0,
    });
    return response;
  } catch (cause) {
    console.error('Discord OAuth callback failed:', cause);
    return NextResponse.redirect(callbackRedirect(origin, safeNext, 'error'));
  }
}
