import { NextRequest, NextResponse } from 'next/server';
import { CONTROL_ACTIONS, enqueueControlCommand, hasAdminPanelAccess } from '../../../../lib/admin';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  if (!hasAdminPanelAccess(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const action = body && typeof body.action === 'string' ? body.action : '';

  if (!action || !(action in CONTROL_ACTIONS)) {
    return NextResponse.json({ error: 'Unknown control action.' }, { status: 400 });
  }

  const definition = CONTROL_ACTIONS[action as keyof typeof CONTROL_ACTIONS];
  const clusterId = body && body.clusterId != null ? Number(body.clusterId) : null;

  if (definition.requiresCluster && (clusterId == null || Number.isNaN(clusterId))) {
    return NextResponse.json({ error: 'A cluster ID is required for this action.' }, { status: 400 });
  }

  try {
    const command = await enqueueControlCommand(action, clusterId);
    return NextResponse.json({ ok: true, command });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Failed to queue command' },
      { status: 500 }
    );
  }
}