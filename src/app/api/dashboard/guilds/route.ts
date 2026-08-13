import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest, getAdminGuilds } from '../../../../lib/auth';
import { fetchBotGuilds, guildIconUrl } from '../../../../lib/discord';

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const adminGuilds = await getAdminGuilds(session);
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

  const manageable = adminGuilds
    .filter((guild) => botGuildIds.size === 0 || botGuildIds.has(guild.id))
    .map((guild) => ({ ...guild, iconUrl: guildIconUrl(guild) }));

  return NextResponse.json({
    data: {
      user: { id: session.userId, username: session.username, avatar: session.avatar },
      guilds: manageable,
      missingBotToken: botGuildIds.size === 0,
    },
  });
}