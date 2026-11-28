import { NextResponse } from 'next/server';
import { fetchDashboardControls } from '../../../lib/admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const controls = await fetchDashboardControls();
    return NextResponse.json({ inviteLock: controls.inviteLock });
  } catch {
    // Keep the public invite visible if the database is temporarily unavailable.
    return NextResponse.json({ inviteLock: false });
  }
}
