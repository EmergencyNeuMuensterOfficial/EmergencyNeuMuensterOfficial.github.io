import { NextRequest } from 'next/server';
import { randomUUID } from 'crypto';
import { DISCORD_BOT_TOKEN, fetchUserGuilds, fetchBotGuilds, refreshAccessToken, userCanManageGuild, type TokenResponse } from './discord';
import { verifySessionToken, COOKIE_NAME, createSessionToken, type SessionData } from './session';
import { claimOAuthRefresh, completeOAuthRefresh, getOAuthSession, releaseOAuthRefresh } from './mongo';

// Discord rotates refresh tokens. Multiple dashboard requests can otherwise
// refresh the same token simultaneously; the losing request then receives
// `invalid_grant` and incorrectly treats a valid website session as failed.
const refreshInFlight = new Map<string, Promise<TokenResponse>>();

function refreshOnce(refreshToken: string): Promise<TokenResponse> {
  const active = refreshInFlight.get(refreshToken);
  if (active) return active;

  const request = refreshAccessToken(refreshToken).finally(() => {
    refreshInFlight.delete(refreshToken);
  });
  refreshInFlight.set(refreshToken, request);
  return request;
}

export async function getSessionFromRequest(request: NextRequest): Promise<SessionData | null> {
  const cookieSession = verifySessionToken(request.cookies.get(COOKIE_NAME)?.value);
  if (!cookieSession?.sessionId) return cookieSession;
  try {
    return await getOAuthSession(cookieSession.sessionId) ?? cookieSession;
  } catch (error) {
    console.error('Failed to load server-side OAuth session:', error);
    return cookieSession;
  }
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
  } catch (accessError) {
    console.warn('Discord guild access-token request failed; trying refresh:', accessError);
    if (!session.refreshToken) return null;
    const lockId = randomUUID();
    try {
      // On Vercel, concurrent API routes can execute in separate functions.
      // MongoDB is the shared refresh-token lock, not process memory alone.
      const claimed = session.sessionId
        ? await claimOAuthRefresh(session.sessionId, session.refreshToken, lockId)
        : true;

      if (!claimed && session.sessionId) {
        for (let attempt = 0; attempt < 20; attempt += 1) {
          await new Promise((resolve) => setTimeout(resolve, 100));
          const latest = await getOAuthSession(session.sessionId);
          if (latest && latest.refreshToken !== session.refreshToken) {
            const guilds = await fetchUserGuilds(latest.accessToken);
            return { guilds, refreshedSession: latest };
          }
        }
        throw new Error('Another request is already refreshing this Discord session.');
      }

      const newToken = await refreshOnce(session.refreshToken);
      const refreshedSession: SessionData = {
        ...session,
        accessToken: newToken.access_token,
        refreshToken: newToken.refresh_token,
      };
      if (refreshedSession.sessionId) await completeOAuthRefresh(refreshedSession as SessionData & { sessionId: string }, lockId);
      const guilds = await fetchUserGuilds(newToken.access_token);
      return { guilds, refreshedSession };
    } catch (refreshError) {
      if (session.sessionId) {
        const latest = await getOAuthSession(session.sessionId).catch(() => null);
        if (latest && latest.refreshToken !== session.refreshToken) {
          try {
            return { guilds: await fetchUserGuilds(latest.accessToken), refreshedSession: latest };
          } catch {
            // Fall through to the diagnostic below.
          }
        }
      }
      console.error('Discord OAuth refresh failed:', refreshError);
      return null;
    } finally {
      if (session.sessionId) await releaseOAuthRefresh(session.sessionId, lockId).catch(() => {});
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
