import { NextRequest, NextResponse } from 'next/server';
import { exchangeCode, fetchDiscordUser, fetchUserGuilds } from '../../../../../lib/discord';
import { createSessionToken, COOKIE_NAME } from '../../../../../lib/session';

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
    return NextResponse.redirect(`${origin}${safeNext}?login=error`);
  }
  if (!code || !expectedState || !state || state !== expectedState) {
    return NextResponse.redirect(`${origin}${safeNext}?login=invalid`);
  }

  try {
    const token = await exchangeCode(origin, code);

    if (!token.scope.split(' ').includes('guilds')) {
      return NextResponse.redirect(`${origin}${safeNext}?login=missing_scope`);
    }

    const user = await fetchDiscordUser(token.access_token);
    await fetchUserGuilds(token.access_token).catch(() => []); // keep the guilds scope fresh; filtering happens in /api/dashboard/guilds

    const sessionToken = createSessionToken({
      userId: user.id,
      username: user.username,
      avatar: user.avatar,
      accessToken: token.access_token,
    });

    const response = NextResponse.redirect(`${origin}${safeNext}`);
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
    return NextResponse.redirect(`${origin}${safeNext}?login=error`);
  }
}