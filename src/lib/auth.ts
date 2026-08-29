import { NextRequest } from 'next/server';
import { DISCORD_BOT_TOKEN, fetchUserGuilds, fetchBotGuilds, refreshAccessToken, userCanManageGuild } from './discord';
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
 * - Discord reports the current user's total guild permissions, including roles.
 * Returns null adminGuilds only when the user access token is invalid and refresh fails.
 */
export async function getAdminGuilds(session: SessionData): Promise<AuthResult> {
  const userResult = await fetchUserGuildsSafe(session);
  if (!userResult) {
    return { adminGuilds: null };
  }

  if (!DISCORD_BOT_TOKEN) {
    return { adminGuilds: [], refreshedSession: userResult.refreshedSession, missingBotToken: true };
  }

  let botGuildIds: Set<string>;
  try {
    const botGuilds = await fetchBotGuilds();
    botGuildIds = new Set(botGuilds.map((g) => g.id));
  } catch {
    // We must not show guilds whose bot membership cannot be verified.
    return { adminGuilds: [], refreshedSession: userResult.refreshedSession, missingBotToken: true };
  }

  const manageable: AdminGuildInfo[] = [];
  for (const guild of userResult.guilds) {
    if (!botGuildIds.has(guild.id)) continue;

    const permissions = guild.permissions ?? guild.permissions_new;
    const canManage = userCanManageGuild(permissions, guild.owner);
    if (canManage) {
      manageable.push({ id: guild.id, name: guild.name, icon: guild.icon, owner: guild.owner });
    }
  }

  return { adminGuilds: manageable, refreshedSession: userResult.refreshedSession };
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
 * The guild must remain in the user's verified manageable-guild list; bot
 * membership alone is not sufficient to grant dashboard access.
 */
export async function getDiscordGuild(session: SessionData, guildId: string): Promise<DiscordGuildResult> {
  const result = await getAdminGuilds(session);
  if (result.adminGuilds) {
    const found = result.adminGuilds.find((g) => g.id === guildId) ?? null;
    if (found) {
      return { guild: found, refreshedSession: result.refreshedSession, tokenFailed: false };
    }
  }

  return { guild: null, refreshedSession: result.refreshedSession, tokenFailed: result.adminGuilds === null };
}
