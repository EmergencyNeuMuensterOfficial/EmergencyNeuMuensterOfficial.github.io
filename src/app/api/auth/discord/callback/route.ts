import { NextRequest, NextResponse } from 'next/server';
import { exchangeCode, fetchDiscordUser, fetchUserGuilds, guildHasAdminPermission } from '../../../../../lib/discord';
import { createSessionToken, COOKIE_NAME } from '../../../../../lib/session';

export async function GET(request: NextRequest) {
  const origin = new URL(request.url).origin;
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  const expectedState = request.cookies.get('onboardx_oauth_state')?.value;

  if (error) {
    return NextResponse.redirect(`${origin}/dashboard?login=error`);
  }
  if (!code || !expectedState || !state || state !== expectedState) {
    return NextResponse.redirect(`${origin}/dashboard?login=invalid`);
  }

  try {
    const token = await exchangeCode(origin, code);

    if (!token.scope.split(' ').includes('guilds')) {
      return NextResponse.redirect(`${origin}/dashboard?login=missing_scope`);
    }

    const user = await fetchDiscordUser(token.access_token);
    const guilds = await fetchUserGuilds(token.access_token);
    const adminGuildIds = guilds.filter((guild) => guild.owner || guildHasAdminPermission(guild.permissions)).map((guild) => guild.id);

    if (adminGuildIds.length === 0) {
      return NextResponse.redirect(`${origin}/dashboard?login=no_admin`);
    }

    const sessionToken = createSessionToken({
      userId: user.id,
      username: user.username,
      avatar: user.avatar,
      accessToken: token.access_token,
    });

    const response = NextResponse.redirect(`${origin}/dashboard`);
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
    return response;
  } catch (cause) {
    console.error('Discord OAuth callback failed:', cause);
    return NextResponse.redirect(`${origin}/dashboard?login=error`);
  }
}