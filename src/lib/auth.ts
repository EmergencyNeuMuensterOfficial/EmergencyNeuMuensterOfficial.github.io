import { NextRequest } from 'next/server';
import { fetchUserGuilds, fetchBotGuilds, guildHasAdminPermission, refreshAccessToken, userCanManageGuild } from './discord';
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
  /** true when the bot token is missing, so bot-membership could not be verified */
  missingBotToken?: boolean;
}

async function fetchUserGuildsSafe(session: SessionData): Promise<{ guilds: import('./discord').DiscordGuild[]; refreshedSession?: SessionData } | null> {
  try {
    const guilds = await fetchUserGuilds(session.accessToken);
    return { guilds };
  } catch {
    if (!session.refreshToken) return null;
    try {
      const newToken = await refreshAccessToken(session.refreshToken);
      const guilds = await fetchUserGuilds(newToken.access_token);
      const refreshedSession: SessionData = {
        ...session,
        accessToken: newToken.access_token,
        refreshToken: newToken.refresh_token,
      };
      return { guilds, refreshedSession };
    } catch {
      return null;
    }
  }
}

/**
 * Return the guilds the user can manage AND the bot is present in.
 *
 * - We require the bot to be in the guild (management is only meaningful there).
 * - We resolve effective permissions (base + role-granted admin) so servers where
 *   the user is an admin via a role are correctly included.
 * Returns null adminGuilds only when the user access token is invalid and refresh fails.
 */
export async function getAdminGuilds(session: SessionData): Promise<AuthResult> {
  const userResult = await fetchUserGuildsSafe(session);
  if (!userResult) {
    return { adminGuilds: null };
  }

  let botGuildIds = new Set<string>();
  let missingBotToken = false;
  try {
    const botGuilds = await fetchBotGuilds();
    botGuildIds = new Set(botGuilds.map((g) => g.id));
  } catch {
    missingBotToken = true;
  }

  const manageable: AdminGuildInfo[] = [];
  for (const guild of userResult.guilds) {
    // Only consider guilds the bot is in (skip if we can verify bot membership).
    if (!missingBotToken && !botGuildIds.has(guild.id)) continue;

    const canManage = await userCanManageGuild(guild.id, guild.permissions, guild.owner);
    if (canManage) {
      manageable.push({ id: guild.id, name: guild.name, icon: guild.icon, owner: guild.owner });
    }
  }

  return { adminGuilds: manageable, refreshedSession: userResult.refreshedSession, missingBotToken };
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