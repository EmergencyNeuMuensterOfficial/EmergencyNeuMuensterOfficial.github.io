import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest, getAdminGuilds } from '../../../../lib/auth';
import { fetchBotGuilds, guildIconUrl } from '../../../../lib/discord';
import { COOKIE_NAME, createSessionToken } from '../../../../lib/session';

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { adminGuilds, refreshedSession } = await getAdminGuilds(session);
  if (adminGuilds === null) {
    return NextResponse.json(
      { error: 'Discord session expired. Please log in again.', code: 'TOKEN_EXPIRED' },
      { status: 401 }
    );
  }

  let botGuildIds: Set<string>;
  try {
    const botGuilds = await fetchBotGuilds();
    botGuildIds = new Set(botGuilds.map((guild) => guild.id));
  } catch {
    botGuildIds = new Set();
  }

  // If we have bot guild data, only show guilds the bot is in.
  // If we have no bot data (missing token), show all admin guilds.
  const manageable = botGuildIds.size > 0
    ? adminGuilds.filter((guild) => botGuildIds.has(guild.id))
    : adminGuilds;

  const resp = NextResponse.json({
    data: {
      user: { id: session.userId, username: session.username, avatar: session.avatar },
      guilds: manageable.map((guild) => ({ ...guild, iconUrl: guildIconUrl(guild) })),
      missingBotToken: botGuildIds.size === 0,
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