import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest, getDiscordGuild } from '../../../../../lib/auth';
import { getGuildConfig, updateGuildConfig } from '../../../../../lib/mongo';

export async function GET(request: NextRequest, { params }: { params: { guildId: string } }) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const guild = await getDiscordGuild(session, params.guildId);
  if (!guild) {
    return NextResponse.json({ error: 'You do not have permission to manage this server.' }, { status: 403 });
  }

  const config = await getGuildConfig(params.guildId);
  if (!config) {
    return NextResponse.json(
      {
        error: 'No configuration exists yet for this server. Save a setting to create it.',
        data: { guildId: params.guildId, guild: { name: guild.name, icon: guild.icon } },
      },
      { status: 404 }
    );
  }

  const { _id, ...safeConfig } = config;
  return NextResponse.json({
    data: { guild: { name: guild.name, icon: guild.icon }, config: safeConfig },
  });
}

export async function PATCH(request: NextRequest, { params }: { params: { guildId: string } }) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const guild = await getDiscordGuild(session, params.guildId);
  if (!guild) {
    return NextResponse.json({ error: 'You do not have permission to manage this server.' }, { status: 403 });
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
    await updateGuildConfig(params.guildId, updates);
  } catch (cause) {
    console.error(`Failed to update guild config ${params.guildId}:`, cause);
    return NextResponse.json({ error: 'Failed to save settings.' }, { status: 500 });
  }

  const config = await getGuildConfig(params.guildId);
  const { _id, ...safeConfig } = config ?? {};
  return NextResponse.json({ data: { config: safeConfig } });
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