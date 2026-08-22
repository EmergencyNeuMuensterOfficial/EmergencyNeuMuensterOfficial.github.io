export const DISCORD_API_URL = 'https://discord.com/api/v10';

export const DISCORD_CLIENT_ID = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID || process.env.DISCORD_CLIENT_ID || '';
export const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET || '';
export const DISCORD_BOT_TOKEN = process.env.DISCORD_TOKEN || '';

export const DASHBOARD_SCOPE = 'identify guilds';

// Admin-like permission bits:
// ADMINISTRATOR (0x8), MANAGE_GUILD (0x20), MANAGE_CHANNELS (0x10),
// MANAGE_ROLES (0x1000000), MANAGE_WEBHOOKS (0x20000000), BAN_MEMBERS (0x4),
// KICK_MEMBERS (0x2)
const ADMIN_PERMISSION_BITS = BigInt(0x8) | BigInt(0x20) | BigInt(0x10) | BigInt(0x1000000) | BigInt(0x20000000) | BigInt(0x4) | BigInt(0x2);

export function guildHasAdminPermission(permissions: unknown): boolean {
  if (permissions == null) return false;
  try {
    const bits = BigInt(String(permissions));
    return (bits & ADMIN_PERMISSION_BITS) !== BigInt(0);
  } catch {
    return false;
  }
}

export function discordRedirectUri(origin: string): string {
  return `${origin}/api/auth/discord/callback`;
}

export function oauthAuthorizeUrl(origin: string, state: string): string {
  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    redirect_uri: discordRedirectUri(origin),
    response_type: 'code',
    scope: DASHBOARD_SCOPE,
    state,
    prompt: 'consent',
  });
  return `https://discord.com/oauth2/authorize?${params.toString()}`;
}

export async function exchangeCode(origin: string, code: string): Promise<{ access_token: string; token_type: string; expires_in: number; scope: string }> {
  const body = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    client_secret: DISCORD_CLIENT_SECRET,
    grant_type: 'authorization_code',
    code,
    redirect_uri: discordRedirectUri(origin),
  });

  const response = await fetch(`${DISCORD_API_URL}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    cache: 'no-store',
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Discord token exchange failed (${response.status}): ${text}`);
  }
  return response.json();
}

export interface DiscordUser {
  id: string;
  username: string;
  global_name: string | null;
  discriminator: string;
  avatar: string | null;
  banner: string | null;
  accent_color: number | null;
}

export async function fetchDiscordUser(accessToken: string): Promise<DiscordUser> {
  const response = await fetch(`${DISCORD_API_URL}/users/@me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch Discord user (${response.status})`);
  }
  return response.json();
}

export interface DiscordGuild {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions?: string;
}

export async function fetchUserGuilds(accessToken: string): Promise<DiscordGuild[]> {
  const response = await fetch(`${DISCORD_API_URL}/users/@me/guilds`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch user guilds (${response.status})`);
  }
  return response.json();
}

export async function fetchBotGuilds(): Promise<DiscordGuild[]> {
  if (!DISCORD_BOT_TOKEN) return [];
  const response = await fetch(`${DISCORD_API_URL}/users/@me/guilds`, {
    headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` },
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch bot guilds (${response.status})`);
  }
  return response.json();
}

export function guildIconUrl(guild: { id: string; icon: string | null }): string | null {
  if (!guild.icon) return null;
  return `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=256`;
}

export function userAvatarUrl(user: DiscordUser): string {
  if (!user.avatar) {
    const fallback = Number(user.discriminator) % 5 || 0;
    return `https://cdn.discordapp.com/embed/avatars/${fallback}.png`;
  }
  return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=64`;
}