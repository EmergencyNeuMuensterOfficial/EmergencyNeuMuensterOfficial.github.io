import { NextRequest, NextResponse } from 'next/server';
import { fetchDashboardControls, hasAdminPanelAccess, updateDashboardControls } from '../../../../lib/admin';

export const dynamic = 'force-dynamic';

export async function PATCH(request: NextRequest) {
  if (!hasAdminPanelAccess(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Invalid body.' }, { status: 400 });
  const source = body as Record<string, unknown>;
  const updates = {
    ...(typeof source.readOnly === 'boolean' ? { readOnly: source.readOnly } : {}),
    ...(typeof source.inviteLock === 'boolean' ? { inviteLock: source.inviteLock } : {}),
  };
  if (Object.keys(updates).length === 0) return NextResponse.json({ error: 'No valid controls supplied.' }, { status: 400 });

  try {
    return NextResponse.json({ ok: true, data: await updateDashboardControls(updates) });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Failed to update controls.' }, { status: 500 });
  }
}
