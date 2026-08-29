import { NextResponse } from 'next/server';
import { recordUptimeSample } from '../../../../lib/uptime';

export const dynamic = 'force-dynamic';

/**
 * Liveness ping from the bot or an external monitor. Each call records one
 * "online" sample for today's bucket in the 30-day uptime history.
 *
 * Body (all optional): { online?: boolean, guilds?: number, users?: number }
 */
export async function POST(request: Request) {
  let body: Record<string, unknown> = {};
  try {
    const parsed = await request.json();
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      body = parsed as Record<string, unknown>;
    }
  } catch {
    body = {};
  }

  const online = body.online !== false;
  const guilds = typeof body.guilds === 'number' ? body.guilds : undefined;
  const users = typeof body.users === 'number' ? body.users : undefined;

  try {
    await recordUptimeSample(online, { guilds, users });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to record heartbeat.';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
