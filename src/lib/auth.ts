import { NextRequest } from 'next/server';
import { fetchUserGuilds, guildHasAdminPermission } from './discord';
import { verifySessionToken, COOKIE_NAME, type SessionData } from './session';

export async function getSessionFromRequest(request: NextRequest): Promise<SessionData | null> {
  return verifySessionToken(request.cookies.get(COOKIE_NAME)?.value);
}

export interface AdminGuildInfo {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
}

/**
 * Fetch the user's guilds and return the subset where they have admin rights.
 * Returns null if the access token is invalid/expired.
 */
export async function getAdminGuilds(session: SessionData): Promise<AdminGuildInfo[] | null> {
  try {
    const guilds = await fetchUserGuilds(session.accessToken);
    return guilds
      .filter((guild) => guild.owner || guildHasAdminPermission(guild.permissions))
      .map((guild) => ({ id: guild.id, name: guild.name, icon: guild.icon, owner: guild.owner }));
  } catch {
    return null;
  }
}

export async function getDiscordGuild(session: SessionData, guildId: string): Promise<AdminGuildInfo | null> {
  const adminGuilds = await getAdminGuilds(session);
  if (!adminGuilds) return null;
  return adminGuilds.find((guild) => guild.id === guildId) ?? null;
}