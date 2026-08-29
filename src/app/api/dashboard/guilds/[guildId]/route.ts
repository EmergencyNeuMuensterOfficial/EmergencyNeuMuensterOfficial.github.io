import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest, getDiscordGuild } from '../../../../../lib/auth';
import { getGuildConfig, updateGuildConfig } from '../../../../../lib/mongo';
import { COOKIE_NAME, createSessionToken } from '../../../../../lib/session';

function withRefreshCookie(response: NextResponse, refreshedSession: { userId: string; username: string; avatar: string | null; globalName: string | null; discriminator: string; banner: string | null; accentColor: number | null; accessToken: string; refreshToken: string } | undefined): NextResponse {
  if (!refreshedSession) return response;
  response.cookies.set(COOKIE_NAME, createSessionToken(refreshedSession), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
  });
  return response;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { guild, refreshedSession, tokenFailed } = await getDiscordGuild(session, guildId);
  if (!guild) {
    const resp = NextResponse.json(
      tokenFailed
        ? { error: 'Your login session expired. Please sign in again.' }
        : { error: 'You do not have permission to manage this server.' },
      { status: tokenFailed ? 401 : 403 },
    );
    return withRefreshCookie(resp, refreshedSession);
  }

  const config = await getGuildConfig(guildId);
  if (!config) {
    const resp = NextResponse.json(
      {
        error: 'No configuration exists yet for this server. Save a setting to create it.',
        data: { guildId, guild: { name: guild.name, icon: guild.icon } },
      },
      { status: 404 },
    );
    return withRefreshCookie(resp, refreshedSession);
  }

  const { _id, ...safeConfig } = config;
  const resp = NextResponse.json({
    data: { guild: { name: guild.name, icon: guild.icon }, config: safeConfig },
  });
  return withRefreshCookie(resp, refreshedSession);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { guild, refreshedSession, tokenFailed } = await getDiscordGuild(session, guildId);
  if (!guild) {
    const resp = NextResponse.json(
      tokenFailed
        ? { error: 'Your login session expired. Please sign in again.' }
        : { error: 'You do not have permission to manage this server.' },
      { status: tokenFailed ? 401 : 403 },
    );
    return withRefreshCookie(resp, refreshedSession);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const updates = sanitizeUpdates(body);
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid settings supplied.' }, { status: 400 });
  }

  try {
    await updateGuildConfig(guildId, updates);
  } catch (cause) {
    console.error(`Failed to update guild config ${guildId}:`, cause);
    return NextResponse.json({ error: 'Failed to save settings.' }, { status: 500 });
  }

  const config = await getGuildConfig(guildId);
  const { _id, ...safeConfig } = config ?? {};
  const resp = NextResponse.json({ data: { config: safeConfig } });
  return withRefreshCookie(resp, refreshedSession);
}

function sanitizeUpdates(body: unknown): Record<string, unknown> {
  const updates: Record<string, unknown> = {};
  if (!body || typeof body !== 'object' || Array.isArray(body)) return updates;

  const allowedTopLevel = new Set(['prefix', 'language']);

  for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
    if (allowedTopLevel.has(key) && typeof value === 'string' && value.length <= 4) {
      updates[key] = value;
      continue;
    }

    if (key === 'modules' && value && typeof value === 'object' && !Array.isArray(value)) {
      const modules: Record<string, unknown> = {};
      for (const [moduleName, enabled] of Object.entries(value as Record<string, unknown>)) {
        if (typeof enabled === 'boolean') modules[moduleName] = enabled;
      }
      if (Object.keys(modules).length > 0) updates['modules'] = modules;
    }
  }

  return updates;
}
