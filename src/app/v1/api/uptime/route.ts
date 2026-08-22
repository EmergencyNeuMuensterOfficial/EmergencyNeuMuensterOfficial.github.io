import { NextRequest, NextResponse } from 'next/server';
import { getUptimeSummary } from '../../../../lib/uptime';

export const dynamic = 'force-dynamic';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function GET(request: NextRequest) {
  const daysParam = Number(request.nextUrl.searchParams.get('days') ?? '30');
  const days = Number.isFinite(daysParam) ? Math.min(Math.max(Math.floor(daysParam), 1), 90) : 30;

  try {
    const summary = await getUptimeSummary(days);
    return NextResponse.json(
      {
        ok: true,
        data: {
          windowDays: days,
          overallPct: summary.overallPct,
          lastOnlineAt: summary.lastOnlineAt,
          days: summary.days,
        },
      },
      {
        headers: {
          ...CORS_HEADERS,
          'Cache-Control': 's-maxage=60, stale-while-revalidate=300',
        },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load uptime';
    return NextResponse.json(
      { ok: false, error: message },
      { status: 503, headers: CORS_HEADERS }
    );
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
