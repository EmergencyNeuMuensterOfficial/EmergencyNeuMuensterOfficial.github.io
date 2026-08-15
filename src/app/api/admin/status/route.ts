import { NextRequest, NextResponse } from 'next/server';
import { fetchControlCommands, hasAdminPanelAccess } from '../../../../lib/admin';
import { fetchBotStatus } from '../../../../lib/status';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (!hasAdminPanelAccess(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const [status, commands] = await Promise.all([fetchBotStatus(), fetchControlCommands()]);
    return NextResponse.json({ ok: true, data: { status, commands } });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Failed to load admin data' },
      { status: 500 }
    );
  }
}