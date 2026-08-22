import { NextRequest, NextResponse } from 'next/server';
import { fetchBotStatus } from '../../../../lib/status';
import { recordUptimeSample, getUptimeSummary } from '../../../../lib/uptime';

export const dynamic = 'force-dynamic';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function GET(_request: NextRequest) {
  try {
    const [status, uptime] = await Promise.all([
      fetchBotStatus(),
      getUptimeSummary(30).catch(() => null),
    ]);

    // Track this observation for the 30-day uptime history.
    void recordUptimeSample(status.isOnline, {
      guilds: status.totalGuilds,
      users: status.totalUsers,
    }).catch(() => {});

    return NextResponse.json(
      {
        ok: true,
        data: {
          online: status.isOnline,
          state: status.state,
          guilds: status.totalGuilds,
          users: status.totalUsers,
          shards: { total: status.shardCount, ready: status.readyShards },
          clusters: { total: status.clusterCount, ready: status.readyClusters },
          averagePingMs: status.averagePing,
          maintenance: status.maintenance.enabled,
          uptime30dPct: uptime?.overallPct ?? null,
          lastUpdated: status.lastUpdated,
        },
      },
      { headers: CORS_HEADERS }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch status';
    return NextResponse.json(
      { ok: false, error: message, data: { online: false, state: 'unknown' } },
      { status: 503, headers: CORS_HEADERS }
    );
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
