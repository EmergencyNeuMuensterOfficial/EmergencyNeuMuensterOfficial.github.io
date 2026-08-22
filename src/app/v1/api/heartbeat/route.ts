import { NextRequest, NextResponse } from 'next/server';
import { recordUptimeSample } from '../../../../lib/uptime';

export const dynamic = 'force-dynamic';

const HEARTBEAT_KEY = process.env.PUBLIC_API_HEARTBEAT_KEY || '';

/**
 * Authenticated liveness ping (e.g. from the bot itself or an external
 * monitor). Each accepted call records one "online" sample for today's
 * bucket in the 30-day uptime history.
 *
 * Body (all optional): { online?: boolean, guilds?: number, users?: number }
 */
export async function POST(request: NextRequest) {
  if (!HEARTBEAT_KEY) {
    return NextResponse.json(
      { ok: false, error: 'Heartbeat endpoint is disabled (PUBLIC_API_HEARTBEAT_KEY not configured).' },
      { status: 503 }
    );
  }

  const provided = request.headers.get('x-api-key');
  if (!provided || provided !== HEARTBEAT_KEY) {
    return NextResponse.json({ ok: false, error: 'Invalid or missing API key.' }, { status: 401 });
  }

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
