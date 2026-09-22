import { NextRequest, NextResponse } from 'next/server';
import { hasAdminPanelAccess } from '../../../../lib/admin';
import { fetchBotGuilds } from '../../../../lib/discord';
import { listClosedBetaGuilds, setClosedBetaEnrollment } from '../../../../lib/mongo';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (!hasAdminPanelAccess(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const [configuredGuilds, botGuilds] = await Promise.all([
      listClosedBetaGuilds(),
      fetchBotGuilds().catch(() => []),
    ]);
    const names = new Map(botGuilds.map((guild) => [guild.id, guild.name]));
    const data = configuredGuilds.map((guild) => ({
      ...guild,
      name: guild.name ?? names.get(guild.guildId) ?? null,
    }));
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Failed to load closed beta servers.' },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  if (!hasAdminPanelAccess(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const guildId = body && typeof body.guildId === 'string' ? body.guildId : '';
  const enabled = body && typeof body.enabled === 'boolean' ? body.enabled : null;
  if (!/^\d{15,25}$/.test(guildId) || enabled === null) {
    return NextResponse.json({ error: 'A valid guild ID and enrollment status are required.' }, { status: 400 });
  }

  try {
    const updated = await setClosedBetaEnrollment(guildId, enabled);
    if (!updated) return NextResponse.json({ error: 'Server configuration was not found.' }, { status: 404 });
    return NextResponse.json({ ok: true, data: { guildId, enabled } });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Failed to update closed beta enrollment.' },
      { status: 500 },
    );
  }
}
