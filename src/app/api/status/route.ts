import { NextResponse } from 'next/server';
import { fetchBotStatus } from '@/lib/status';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await fetchBotStatus();
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch status';

    return NextResponse.json(
      {
        ok: false,
        error: message,
        data: {
          isOnline: false,
          state: 'degraded',
          stale: true,
          uptime: 0,
          memoryUsage: { rss: 0, heapTotal: 0, heapUsed: 0, external: 0 },
          shardCount: 0,
          readyShards: 0,
          clusterCount: 0,
          readyClusters: 0,
          averagePing: -1,
          totalGuilds: 0,
          totalUsers: 0,
          host: null,
          lastSnapshotAt: null,
          maintenance: {
            enabled: false,
            message: null,
            startedAt: null,
            estimatedEndAt: null,
          },
          discordGateway: {
            clusters: {},
            shards: {},
            avgPingMs: -1,
            reconnectingClusters: 0,
            disconnectedClusters: 0,
            reconnectingShards: 0,
            disconnectedShards: 0,
            readyShards: 0,
            totalShards: 0,
          },
          clusters: [],
          shards: [],
          ok: false,
          database: 'unavailable',
          lastUpdated: new Date().toISOString(),
        },
      },
      { status: 503 },
    );
  }
}