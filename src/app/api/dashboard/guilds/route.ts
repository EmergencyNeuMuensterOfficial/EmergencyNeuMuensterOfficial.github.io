import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest, getAdminGuilds } from '../../../../lib/auth';
import { guildIconUrl } from '../../../../lib/discord';
import { COOKIE_NAME, createSessionToken } from '../../../../lib/session';

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { adminGuilds, refreshedSession, missingBotToken } = await getAdminGuilds(session);
  if (adminGuilds === null) {
    return NextResponse.json(
      { error: 'Discord session expired. Please log in again.', code: 'TOKEN_EXPIRED' },
      { status: 401 }
    );
  }

  const resp = NextResponse.json({
    data: {
      user: { id: session.userId, username: session.username, avatar: session.avatar },
      guilds: adminGuilds.map((guild) => ({ ...guild, iconUrl: guildIconUrl(guild) })),
      missingBotToken: Boolean(missingBotToken),
    },
  });

  if (refreshedSession) {
    resp.cookies.set(COOKIE_NAME, createSessionToken(refreshedSession), {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });
  }

  return resp;
}