import { NextRequest } from 'next/server';
import { fetchUserGuilds, guildHasAdminPermission, refreshAccessToken } from './discord';
import { verifySessionToken, COOKIE_NAME, createSessionToken, type SessionData } from './session';

export async function getSessionFromRequest(request: NextRequest): Promise<SessionData | null> {
  return verifySessionToken(request.cookies.get(COOKIE_NAME)?.value);
}

export interface AdminGuildInfo {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
}

export interface AuthResult {
  adminGuilds: AdminGuildInfo[] | null;
  refreshedSession?: SessionData;
}

/**
 * Fetch the user's guilds and return the subset where they have admin rights.
 * Returns null adminGuilds if the access token is invalid/expired AND refresh fails.
 * If the token was refreshed, refreshedSession contains the updated session.
 */
export async function getAdminGuilds(session: SessionData): Promise<AuthResult> {
  try {
    const guilds = await fetchUserGuilds(session.accessToken);
    const adminGuilds = guilds
      .filter((guild) => guild.owner || guildHasAdminPermission(guild.permissions))
      .map((guild) => ({ id: guild.id, name: guild.name, icon: guild.icon, owner: guild.owner }));
    return { adminGuilds };
  } catch {
    // Access token may be expired — attempt refresh
    if (!session.refreshToken) {
      return { adminGuilds: null };
    }
    try {
      const newToken = await refreshAccessToken(session.refreshToken);
      const guilds = await fetchUserGuilds(newToken.access_token);
      const adminGuilds = guilds
        .filter((guild) => guild.owner || guildHasAdminPermission(guild.permissions))
        .map((guild) => ({ id: guild.id, name: guild.name, icon: guild.icon, owner: guild.owner }));
      const refreshedSession: SessionData = {
        ...session,
        accessToken: newToken.access_token,
        refreshToken: newToken.refresh_token,
      };
      return { adminGuilds, refreshedSession };
    } catch {
      return { adminGuilds: null };
    }
  }
}

export interface DiscordGuildResult {
  guild: AdminGuildInfo | null;
  refreshedSession?: SessionData;
  /** true when the user-guilds lookup failed (token expired / Discord error) */
  tokenFailed: boolean;
}

/**
 * Resolve a single guild the user may manage.
 *
 * We rely on the bot's own guild membership as a fallback: managing a server
 * requires the bot to be in it anyway, so if the Discord user-guilds call is
 * flaky or the token is expired we still allow access when the bot is present.
 */
export async function getDiscordGuild(
  session: SessionData,
  guildId: string,
  botGuildIds?: Set<string>,
): Promise<DiscordGuildResult> {
  const result = await getAdminGuilds(session);
  if (result.adminGuilds) {
    const found = result.adminGuilds.find((g) => g.id === guildId) ?? null;
    if (found) {
      return { guild: found, refreshedSession: result.refreshedSession, tokenFailed: false };
    }
  }

  // User-guilds call failed or the guild wasn't in the admin list.
  // Fall back to the bot's guild membership if we have it.
  if (botGuildIds && botGuildIds.has(guildId)) {
    return {
      guild: { id: guildId, name: guildId, icon: null, owner: false },
      tokenFailed: result.adminGuilds === null,
    };
  }

  return { guild: null, refreshedSession: result.refreshedSession, tokenFailed: result.adminGuilds === null };
}