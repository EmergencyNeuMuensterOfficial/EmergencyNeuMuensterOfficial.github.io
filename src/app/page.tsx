'use client';

import { useCallback, useEffect, useState } from 'react';
import type { StatusPayload } from '@/lib/status';

function formatUptime(seconds: number) {
  if (!seconds || seconds <= 0) return '—';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return [days && `${days}d`, hours && `${hours}h`, minutes && `${minutes}m`].filter(Boolean).join(' ') || '< 1m';
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
}

function relativeTime(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value).getTime();
  if (Number.isNaN(date)) return '—';
  const diff = Math.max(0, Math.floor((Date.now() - date) / 1000));
  if (diff < 5) return 'just now';
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

type OverallState = 'operational' | 'maintenance' | 'degraded' | 'outage';

function overallState(status: StatusPayload | null): OverallState {
  if (!status) return 'outage';
  if (status.maintenance.enabled) return 'maintenance';
  if (status.isOnline) return status.readyShards < status.shardCount || status.database !== 'connected' ? 'degraded' : 'operational';
  return 'outage';
}

const STATE_META: Record<OverallState, { label: string; text: string; badge: string; dot: string }> = {
  operational: {
    label: 'All Systems Operational',
    text: 'The OnboardX bot is fully online and processing commands normally.',
    badge: 'text-discord-green bg-discord-green/10 ring-discord-green/40',
    dot: 'bg-discord-green',
  },
  maintenance: {
    label: 'Maintenance in Progress',
    text: 'The bot is currently undergoing scheduled maintenance. Some features may be unavailable.',
    badge: 'text-discord-yellow bg-discord-yellow/10 ring-discord-yellow/40',
    dot: 'bg-discord-yellow',
  },
  degraded: {
    label: 'Degraded Performance',
    text: 'Some services are experiencing issues. We are working to restore full functionality.',
    badge: 'text-discord-yellow bg-discord-yellow/10 ring-discord-yellow/40',
    dot: 'bg-discord-yellow',
  },
  outage: {
    label: 'Service Outage',
    text: 'The bot is currently offline or its status could not be determined.',
    badge: 'text-discord-red bg-discord-red/10 ring-discord-red/40',
    dot: 'bg-discord-red',
  },
};

function ServiceRow({ name, ok, detail }: { name: string; ok: 'operational' | 'degraded' | 'outage'; detail?: string }) {
  const meta = {
    operational: { label: 'Operational', cls: 'text-discord-green', dot: 'bg-discord-green' },
    degraded: { label: 'Degraded', cls: 'text-discord-yellow', dot: 'bg-discord-yellow' },
    outage: { label: 'Unavailable', cls: 'text-discord-red', dot: 'bg-discord-red' },
  }[ok];

  return (
    <div className="flex items-center justify-between gap-4 border-b border-discord-gray/20 px-4 py-3 last:border-0">
      <div className="flex items-center gap-3">
        <span className={`h-2 w-2 shrink-0 rounded-full ${meta.dot}`} />
        <span className="font-medium text-discord-lighterGray">{name}</span>
      </div>
      <div className="text-right">
        <span className={`text-sm font-semibold ${meta.cls}`}>{meta.label}</span>
        {detail && <p className="text-xs text-discord-lightGray">{detail}</p>}
      </div>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl border border-discord-gray/20 bg-discord-darker p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-discord-lightGray">{label}</p>
      <p className="mt-2 text-2xl font-bold text-discord-white">{value}</p>
      {sub && <p className="mt-1 text-xs text-discord-lightGray">{sub}</p>}
    </div>
  );
}

export default function StatusPage() {
  const [status, setStatus] = useState<StatusPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastAuto, setLastAuto] = useState<number>(Date.now());

  const loadStatus = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch('/api/status', { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok || !payload.data) {
        throw new Error(payload.error || 'Unable to load status');
      }
      setStatus(payload.data as StatusPayload);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to load status');
      setStatus((current) => current);
    } finally {
      setLoading(false);
      setLastAuto(Date.now());
    }
  }, []);

  useEffect(() => {
    void loadStatus();
    const interval = window.setInterval(() => void loadStatus(), 30000);
    return () => window.clearInterval(interval);
  }, [loadStatus]);

  const state = overallState(status);

  return (
    <div className="min-h-screen bg-discord-darkest text-white">
      <header className="border-b border-discord-gray/20 bg-discord-darker/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-discord-blue font-bold">
              OX
            </div>
            <div>
              <h1 className="text-sm font-bold leading-tight">OnboardX</h1>
              <p className="text-xs text-discord-lightGray">Status</p>
            </div>
          </div>
          <button
            onClick={() => {
              setLoading(true);
              void loadStatus();
            }}
            className="rounded-lg border border-discord-gray/40 px-3 py-1.5 text-xs font-semibold text-discord-lighterGray transition hover:bg-discord-gray/40"
          >
            Refresh
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <section className="rounded-2xl border border-discord-gray/20 bg-discord-darker p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <span className={`h-3 w-3 rounded-full ${STATE_META[state].dot} ${status ? '' : 'animate-pulse'}`} />
            <h2 className={`text-lg font-bold sm:text-xl ${STATE_META[state].badge.split(' ')[0]}`}>
              {STATE_META[state].label}
            </h2>
          </div>
          <p className="mt-2 text-sm text-discord-lightGray">{STATE_META[state].text}</p>

          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-discord-lightGray">
            {status?.maintenance.message && (
              <p className="w-full rounded-lg bg-discord-yellow/10 px-3 py-2 text-discord-yellow">
                {status.maintenance.message}
              </p>
            )}
            <span>
              Uptime: <span className="font-semibold text-discord-white">{formatUptime(status?.uptime ?? 0)}</span>
            </span>
            <span>
              Host: <span className="font-semibold text-discord-white">{status?.host || '—'}</span>
            </span>
            <span>
              Last updated: <span className="font-semibold text-discord-white">{formatDate(status?.lastUpdated ?? null)}</span>
            </span>
          </div>

          {loading && <p className="mt-4 text-xs text-discord-lightGray">Refreshing status data…</p>}
          {error && !status && (
            <p className="mt-4 text-xs text-discord-red">
              {error} — check that the website can reach MongoDB.
            </p>
          )}
        </section>

        {status?.maintenance.enabled && status.maintenance.estimatedEndAt && (
          <section className="mt-6 rounded-2xl border border-discord-yellow/40 bg-discord-yellow/5 p-5">
            <p className="text-sm text-discord-yellow">
              Estimated completion: <span className="font-semibold">{formatDate(status.maintenance.estimatedEndAt)}</span>
              <span className="ml-2 text-discord-lightGray">({relativeTime(status.maintenance.estimatedEndAt)})</span>
            </p>
          </section>
        )}

        <section className="mt-6 overflow-hidden rounded-2xl border border-discord-gray/20 bg-discord-darker">
          <h3 className="border-b border-discord-gray/20 px-4 py-3 text-sm font-semibold text-discord-lighterGray">
            Services
          </h3>
          <ServiceRow
            name="Bot"
            ok={status && status.isOnline ? 'operational' : 'outage'}
            detail={status ? `state: ${status.state}` : undefined}
          />
          <ServiceRow
            name="Discord Gateway"
            ok={status && status.discordGateway.totalShards > 0 && status.discordGateway.reconnectingShards === 0 ? 'operational' : status && status.discordGateway.totalShards > 0 ? 'degraded' : 'outage'}
            detail={status ? `${status.discordGateway.readyShards}/${status.discordGateway.totalShards} shards ready` : undefined}
          />
          <ServiceRow
            name="Database"
            ok={status?.database === 'connected' ? 'operational' : 'outage'}
            detail={status ? status.database : undefined}
          />
          <ServiceRow
            name="Website"
            ok="operational"
            detail="this page"
          />
        </section>

        <section className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Guilds" value={status?.totalGuilds.toLocaleString() ?? '—'} />
          <StatCard label="Users" value={status?.totalUsers.toLocaleString() ?? '—'} />
          <StatCard label="Shards" value={status ? `${status.readyShards}/${status.shardCount}` : '—'} />
          <StatCard
            label="Avg Ping"
            value={status && status.averagePing >= 0 ? `${Math.round(status.averagePing)}ms` : '—'}
          />
          <StatCard label="Clusters" value={status ? `${status.readyClusters}/${status.clusterCount}` : '—'} />
          <StatCard label="Memory" value={status ? `${Math.round(status.memoryUsage.heapUsed)} MB` : '—'} />
          <StatCard label="Last Snapshot" value={relativeTime(status?.lastSnapshotAt ?? null)} />
          <StatCard label="Auto-refresh" value="30s" />
        </section>

        {status && (status.clusters.length > 0 || status.shards.length > 0) && (
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <section className="overflow-hidden rounded-2xl border border-discord-gray/20 bg-discord-darker">
              <div className="flex items-center justify-between border-b border-discord-gray/20 px-4 py-3">
                <h3 className="text-sm font-semibold text-discord-lighterGray">Clusters</h3>
                <span className="text-xs text-discord-lightGray">{status.clusters.length} total</span>
              </div>
              {status.clusters.length === 0 ? (
                <p className="px-4 py-6 text-sm text-discord-lightGray">No cluster status records found.</p>
              ) : (
                <ul className="divide-y divide-discord-gray/20">
                  {status.clusters.map((cluster) => (
                    <li key={String(cluster.id)} className="flex items-center justify-between gap-4 px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className={`h-2 w-2 rounded-full ${cluster.ready ? 'bg-discord-green' : cluster.online ? 'bg-discord-yellow' : 'bg-discord-red'}`} />
                        <span className="font-medium text-discord-white">Cluster #{cluster.id}</span>
                        <span className="text-xs text-discord-lightGray">{cluster.wsStatusLabel}</span>
                      </div>
                      <div className="text-right text-xs text-discord-lightGray">
                        <p>
                          {cluster.shardCount} shards · {cluster.guilds.toLocaleString()} guilds ·{' '}
                          {cluster.users.toLocaleString()} users
                        </p>
                        <p>
                          {cluster.ping >= 0 ? `${Math.round(cluster.ping)}ms` : '—'} · {cluster.memoryMB} MB ·{' '}
                          {relativeTime(cluster.lastHeartbeatAt)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="overflow-hidden rounded-2xl border border-discord-gray/20 bg-discord-darker">
              <div className="flex items-center justify-between border-b border-discord-gray/20 px-4 py-3">
                <h3 className="text-sm font-semibold text-discord-lighterGray">Shards</h3>
                <span className="text-xs text-discord-lightGray">{status.shards.length} total</span>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {status.shards.length === 0 ? (
                  <p className="px-4 py-6 text-sm text-discord-lightGray">No shard status records found.</p>
                ) : (
                  <ul className="divide-y divide-discord-gray/20">
                    {status.shards.map((shard) => (
                      <li key={String(shard.id)} className="flex items-center justify-between gap-4 px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className={`h-2 w-2 rounded-full ${shard.ready ? 'bg-discord-green' : shard.online ? 'bg-discord-yellow' : 'bg-discord-red'}`} />
                          <span className="font-medium text-discord-white">Shard #{shard.id}</span>
                          <span className="text-xs text-discord-lightGray">
                            {shard.clusterId == null ? 'unassigned' : `cluster #${shard.clusterId}`}
                          </span>
                        </div>
                        <div className="text-right text-xs text-discord-lightGray">
                          <p>
                            {shard.guilds.toLocaleString()} guilds · {shard.state}
                          </p>
                          <p>{shard.ping >= 0 ? `${Math.round(shard.ping)}ms` : '—'} · {relativeTime(shard.lastHeartbeatAt)}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          </div>
        )}

        {status?.stale && !status.isOnline && (
          <p className="mt-6 rounded-lg border border-discord-yellow/40 bg-discord-yellow/5 px-4 py-3 text-sm text-discord-yellow">
            Status records are stale or missing. The cluster manager may be stopped or not writing to the database.
          </p>
        )}

        <footer className="mt-10 border-t border-discord-gray/20 pt-6 text-center text-xs text-discord-lightGray">
          <p>
            This status page reads directly from the OnboardX MongoDB database — it does not depend on the bot&apos;s API.
          </p>
          <p className="mt-1">
            Last successful poll: {formatDate(status?.lastUpdated ?? null)} · checks every 30 seconds
          </p>
        </footer>
      </main>
    </div>
  );
}