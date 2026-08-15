'use client';

import { useCallback, useEffect, useState } from 'react';
import type { StatusPayload } from '../../lib/status';
import { Sidebar } from '../../components/Sidebar';
import { Reveal } from '../../components/Reveal';

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

function DetailItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-discord-gray/10 px-3 py-2">
      <p className="text-[11px] font-medium uppercase tracking-wider text-discord-lightGray">{label}</p>
      <p className="mt-0.5 truncate text-sm font-semibold text-discord-white" title={typeof value === 'string' ? value : undefined}>
        {value}
      </p>
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
      <Sidebar />
      <div className="ml-60">
        <div className="flex items-center justify-between border-b border-discord-gray/20 bg-discord-darker/80 px-6 py-4 animate-fade-in-up">
          <div>
            <h1 className="text-sm font-bold leading-tight">Status</h1>
            <p className="text-xs text-discord-lightGray">Live cluster, shard &amp; gateway health</p>
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

        <main className="mx-auto max-w-5xl px-6 py-10">
        <Reveal>
        <section className="animate-fade-in-up rounded-2xl border border-discord-gray/20 bg-discord-darker p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <span className={`h-3 w-3 rounded-full ${STATE_META[state].dot} ${status ? '' : 'animate-pulse'}`} />
            <h2 className={`text-lg font-bold sm:text-xl ${STATE_META[state].badge.split(' ')[0]}`}>
              {STATE_META[state].label}
            </h2>
          </div>
          <p className="mt-2 text-sm text-discord-lightGray">{STATE_META[state].text}</p>

          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-discord-lightGray">
            {status?.maintenance.enabled && status.maintenance.message && (
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
        </Reveal>

        {status?.maintenance.enabled && status.maintenance.estimatedEndAt && (
          <Reveal delay={80}>
          <section className="animate-fade-in-up mt-6 rounded-2xl border border-discord-yellow/40 bg-discord-yellow/5 p-5">
            <p className="text-sm text-discord-yellow">
              Estimated completion: <span className="font-semibold">{formatDate(status.maintenance.estimatedEndAt)}</span>
              <span className="ml-2 text-discord-lightGray">({relativeTime(status.maintenance.estimatedEndAt)})</span>
            </p>
          </section>
          </Reveal>
        )}

        <Reveal delay={120}>
        <section className="animate-fade-in-up mt-6 overflow-hidden rounded-2xl border border-discord-gray/20 bg-discord-darker">
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
        </Reveal>

        <Reveal delay={160}>
        <section className="animate-fade-in-up mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
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
        </Reveal>

        <Reveal delay={200}>
        <section className="animate-fade-in-up mt-6 overflow-hidden rounded-2xl border border-discord-gray/20 bg-discord-darker">
          <div className="flex items-center justify-between border-b border-discord-gray/20 px-4 py-3">
            <h3 className="text-sm font-semibold text-discord-lighterGray">Host Details</h3>
            {status?.hostDetails && (
              <span className={`text-xs font-semibold ${status.hostDetails.online ? 'text-discord-green' : 'text-discord-red'}`}>
                {status.hostDetails.online ? 'Manager online' : 'Manager offline'}
              </span>
            )}
          </div>
          {status?.hostDetails ? (
            <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 lg:grid-cols-5">
              <DetailItem label="Host" value={status.hostDetails.host || '—'} />
              <DetailItem label="Platform" value={status.hostDetails.platform || '—'} />
              <DetailItem label="Node.js" value={status.hostDetails.node || '—'} />
              <DetailItem label="Manager PID" value={status.hostDetails.managerPid ?? '—'} />
              <DetailItem label="Health Port" value={status.hostDetails.healthPort ?? '—'} />
              <DetailItem label="Status Sync" value={status.hostDetails.statusSyncMs ? `${status.hostDetails.statusSyncMs}ms` : '—'} />
              <DetailItem label="Memory" value={status.hostDetails.memoryMB ? `${status.hostDetails.memoryMB} MB` : '—'} />
              <DetailItem label="Booted" value={status.hostDetails.bootedAt ? formatDate(status.hostDetails.bootedAt) : '—'} />
              <DetailItem label="Last Snapshot" value={status.hostDetails.lastSnapshotAt ? relativeTime(status.hostDetails.lastSnapshotAt) : '—'} />
              <DetailItem label="State" value={status.hostDetails.state} />
            </div>
          ) : (
            <p className="px-4 py-6 text-sm text-discord-lightGray">No system status record found in the database.</p>
          )}
        </section>
        </Reveal>

        {status && (status.clusters.length > 0 || status.shards.length > 0) && (
          <Reveal delay={240}>
          <section className="animate-fade-in-up mt-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-discord-lighterGray">Clusters</h3>
              <span className="text-xs text-discord-lightGray">
                {status.clusters.length} total · {status.readyClusters} ready · {status.shards.length} shards
              </span>
            </div>
            {status.clusters.length === 0 ? (
              <p className="rounded-2xl border border-discord-gray/20 bg-discord-darker px-4 py-6 text-sm text-discord-lightGray">
                No cluster status records found.
              </p>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {status.clusters
                  .slice()
                  .sort((a, b) => a.clusterId - b.clusterId)
                  .map((cluster) => {
                    const shardRecords = cluster.shards
                      .map((shardId) => status.shards.find((s) => s.shardId === shardId))
                      .filter((shard): shard is typeof status.shards[number] => Boolean(shard));

                    return (
                      <div
                        key={String(cluster.id)}
                        className="rounded-2xl border border-discord-gray/20 bg-discord-darker"
                      >
                        <div className="rounded-t-2xl border-b border-discord-gray/20 px-4 py-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <span
                                className={`h-2.5 w-2.5 rounded-full ${
                                  cluster.ready ? 'bg-discord-green' : cluster.online ? 'bg-discord-yellow' : 'bg-discord-red'
                                }`}
                              />
                              <span className="font-semibold text-discord-white">Cluster #{cluster.id}</span>
                              <span
                                className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                                  cluster.ready
                                    ? 'bg-discord-green/10 text-discord-green'
                                    : cluster.online
                                      ? 'bg-discord-yellow/10 text-discord-yellow'
                                      : 'bg-discord-red/10 text-discord-red'
                                }`}
                              >
                                {cluster.wsStatusLabel}
                              </span>
                            </div>
                            <span className="text-xs text-discord-lighterGray">
                              {cluster.ping >= 0 ? `${Math.round(cluster.ping)}ms` : '—'}
                            </span>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-discord-lightGray">
                            <span>{cluster.shardCount} shards</span>
                            <span>{cluster.memoryMB} MB</span>
                          </div>
                        </div>

                        <div className="p-4">
                          <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-discord-lightGray">
                            Shards
                          </p>
                          {shardRecords.length === 0 ? (
                            <p className="text-xs text-discord-lightGray">No shard sub-records for this cluster.</p>
                          ) : (
                            <div className="grid grid-cols-5 gap-2 sm:grid-cols-6 lg:grid-cols-7">
                              {shardRecords.map((shard) => (
                                <div
                                  key={String(shard.id)}
                                  className={`group relative flex aspect-square cursor-help items-center justify-center rounded-lg border ${
                                    shard.ready
                                      ? 'border-discord-green/30 bg-discord-green/10'
                                      : shard.online
                                        ? 'border-discord-yellow/30 bg-discord-yellow/10'
                                        : 'border-discord-red/30 bg-discord-red/10'
                                  }`}
                                >
                                  <p
                                    className={`text-xs font-bold leading-none sm:text-sm ${
                                      shard.ready
                                        ? 'text-discord-green'
                                        : shard.online
                                          ? 'text-discord-yellow'
                                          : 'text-discord-red'
                                    }`}
                                  >
                                    {shard.shardId}
                                  </p>
                                  <div className="pointer-events-none absolute -top-2 left-1/2 z-50 hidden -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg border border-discord-gray/40 bg-discord-darkest px-3 py-2 text-left text-xs shadow-2xl group-hover:block">
                                    <p className="font-semibold text-discord-white">Shard #{shard.shardId}</p>
                                    <p className="mt-0.5 text-discord-lighterGray">
                                      State: <span className="font-semibold text-discord-white">{shard.state}</span>
                                    </p>
                                    <p className="text-discord-lighterGray">
                                      Ping:{' '}
                                      <span className="font-semibold text-discord-white">
                                        {shard.ping >= 0 ? `${Math.round(shard.ping)}ms` : '—'}
                                      </span>
                                    </p>
                                    <p className="text-discord-lighterGray">
                                      Cluster:{' '}
                                      <span className="font-semibold text-discord-white">
                                        {shard.clusterId == null ? 'unassigned' : `#${shard.clusterId}`}
                                      </span>
                                    </p>
                                    <p className="text-discord-lighterGray">
                                      Heartbeat:{' '}
                                      <span className="font-semibold text-discord-white">
                                        {relativeTime(shard.lastHeartbeatAt)}
                                      </span>
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </section>
          </Reveal>
        )}

        {status?.stale && !status.isOnline && (
          <p className="mt-6 rounded-lg border border-discord-yellow/40 bg-discord-yellow/5 px-4 py-3 text-sm text-discord-yellow">
            Status records are stale or missing. The cluster manager may be stopped or not writing to the database.
          </p>
        )}

        <footer className="mt-10 animate-fade-in-up border-t border-discord-gray/20 pt-6 text-center text-xs text-discord-lightGray">
          <p>
            This status page reads directly from the OnboardX MongoDB database — it does not depend on the bot&apos;s API.
          </p>
          <p className="mt-1">
            Last successful poll: {formatDate(status?.lastUpdated ?? null)} · checks every 30 seconds
          </p>
        </footer>
        </main>
      </div>
    </div>
  );
}