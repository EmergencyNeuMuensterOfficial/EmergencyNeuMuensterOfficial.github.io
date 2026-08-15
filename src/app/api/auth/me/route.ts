import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '../../../../lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ authed: false, user: null });
  }
  return NextResponse.json({
    authed: true,
    user: { id: session.userId, username: session.username, avatar: session.avatar },
  });
}