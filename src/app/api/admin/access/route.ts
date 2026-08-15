import { NextRequest, NextResponse } from 'next/server';
import { hasAdminAccess, hasAdminPanelAccess, isWhitelistedAdminUser } from '../../../../lib/admin';
import { getSessionFromRequest } from '../../../../lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (hasAdminAccess(request)) {
    return NextResponse.json({ loggedIn: true, allowed: true, whitelisted: true, adminToken: true });
  }

  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ loggedIn: false, allowed: false, whitelisted: false, adminToken: false });
  }

  const whitelisted = isWhitelistedAdminUser(session.userId);
  return NextResponse.json({
    loggedIn: true,
    allowed: hasAdminPanelAccess(request),
    whitelisted,
    adminToken: false,
    username: session.username,
  });
}