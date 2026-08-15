'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { StatusPayload } from '../../lib/status';
import { Sidebar } from '../../components/Sidebar';

interface ControlCommand {
  id: string;
  action: string;
  clusterId: number | null;
  status: 'queued' | 'running' | 'done' | 'failed';
  requestedAt: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  error: string | null;
}

interface AccessInfo {
  loggedIn: boolean;
  allowed: boolean;
  whitelisted: boolean;
  adminToken: boolean;
  username?: string;
}

interface AdminData {
  status: StatusPayload | null;
  commands: ControlCommand[];
}

const ACTION_LABELS: Record<string, string> = {
  restart_all: 'Restart All',
  shutdown_all: 'Shutdown All',
  maintenance_on: 'Enable Maintenance',
  maintenance_off: 'Disable Maintenance',
  restart_cluster: 'Restart Cluster',
  shutdown_cluster: 'Shutdown Cluster',
};

const COMMAND_STATUS_META: Record<string, { label: string; cls: string; dot: string }> = {
  queued: { label: 'Queued', cls: 'text-discord-yellow', dot: 'bg-discord-yellow' },
  running: { label: 'Running', cls: 'text-discord-blue', dot: 'bg-discord-blue' },
  done: { label: 'Done', cls: 'text-discord-green', dot: 'bg-discord-green' },
  failed: { label: 'Failed', cls: 'text-discord-red', dot: 'bg-discord-red' },
};

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
}

function relativeTime(value: string | null | undefined): string {
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

function formatBigNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return String(value);
}

function shardTone(ready: boolean, state: string): { border: string; bg: string; text: string } {
  if (ready) return { border: 'border-discord-green/30', bg: 'bg-discord-green/10', text: 'text-discord-green' };
  if (['connecting', 'reconnecting', 'idle', 'nearly', 'waiting_for_guilds'].includes(state)) {
    return { border: 'border-discord-yellow/30', bg: 'bg-discord-yellow/10', text: 'text-discord-yellow' };
  }
  return { border: 'border-discord-red/30', bg: 'bg-discord-red/10', text: 'text-discord-red' };
}

export default function AdminPage() {
  const [auth, setAuth] = useState<'unknown' | 'authed' | 'denied' | 'forbidden'>('unknown');
  const [loading, setLoading] = useState(true);
  const [access, setAccess] = useState<AccessInfo | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [data, setData] = useState<AdminData | null>(null);
  const [selectedCluster, setSelectedCluster] = useState<string>('');
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [expandedCluster, setExpandedCluster] = useState<number | null>(null);
  const accessRef = useRef<AccessInfo | null>(null);

  const checkAccess = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/access', { cache: 'no-store' });
      const payload = (await response.json()) as AccessInfo;
      accessRef.current = payload;
      setAccess(payload);
      return payload;
    } catch {
      accessRef.current = null;
      setAccess(null);
      return null;
    }
  }, []);

  const loadAdmin = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch('/api/admin/status', { cache: 'no-store' });
      if (response.status === 401) {
        const info = accessRef.current;
        setAuth(info?.allowed ? 'authed' : info?.loggedIn ? 'forbidden' : 'denied');
        setData(null);
        return;
      }
      const payload = (await response.json()) as { ok?: boolean; error?: string; data: AdminData };
      if (!response.ok || payload.ok === false) {
        throw new Error(payload.error || 'Failed to load admin data');
      }
      setAuth('authed');
      setData(payload.data as AdminData);
    } catch (error) {
      setData(null);
      setMessage(error instanceof Error ? error.message : 'Failed to load admin data');
      setAuth((current) => (current === 'authed' ? 'authed' : 'denied'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const info = await checkAccess();
      if (cancelled) return;
      if (info?.allowed) {
        await loadAdmin();
      } else if (info) {
        setAuth(info.loggedIn ? 'forbidden' : 'denied');
        setLoading(false);
      } else {
        setAuth('denied');
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [checkAccess, loadAdmin]);

  const handleLogout = async () => {
    await Promise.all([
      fetch('/api/admin/logout', { method: 'POST' }).catch(() => {}),
      fetch('/api/auth/logout', { method: 'POST', redirect: 'manual' }).catch(() => {}),
    ]);
    window.location.href = '/';
  };

  const sendCommand = async (action: string, clusterId?: number) => {
    const label = ACTION_LABELS[action] ?? action;
    if (action.startsWith('restart') || action.startsWith('shutdown')) {
      if (!window.confirm(`Are you sure you want to run "${label}"${clusterId != null ? ` for cluster #${clusterId}` : ''}?`)) {
        return;
      }
    }

    setBusyAction(action);
    setMessage(null);
    try {
      const response = await fetch('/api/admin/commands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, clusterId }),
      });
      const payload = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!response.ok || payload?.ok !== true) throw new Error(payload?.error || 'Command failed.');
      setMessage(`Command "${label}" queued.`);
      await loadAdmin();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Command failed.');
    } finally {
      setBusyAction(null);
    }
  };

  const status = data?.status ?? null;
  const maintenance = status?.maintenance.enabled ?? false;
  const clusters = (status?.clusters ?? []).slice().sort((a, b) => a.clusterId - b.clusterId);

  return (
    <div className="min-h-screen bg-discord-darkest text-white">
      <Sidebar />
      <div className="ml-60">
        <div className="flex items-center justify-between border-b border-discord-gray/20 bg-discord-darker/80 px-6 py-4">
          <div>
            <h1 className="text-sm font-bold leading-tight">Admin</h1>
            <p className="text-xs text-discord-lightGray">Cluster control &amp; bot maintenance</p>
          </div>
          {auth === 'authed' && (
            <button
              onClick={handleLogout}
              className="rounded-lg border border-discord-gray/40 px-3 py-1.5 text-xs font-semibold text-discord-lighterGray transition hover:bg-discord-gray/40"
            >
              Log out
            </button>
          )}
        </div>

        <main className="mx-auto max-w-5xl px-6 py-10">
          {auth === 'unknown' && (
            <p className="text-sm text-discord-lightGray">Checking access…</p>
          )}

          {auth === 'denied' && (
            <div className="mx-auto max-w-md rounded-2xl border border-discord-gray/20 bg-discord-darker p-8 text-center">
              <p className="text-lg font-semibold">Admin access</p>
              <p className="mt-2 text-sm text-discord-lightGray">
                Log in with a whitelisted Discord account to open the admin panel.
              </p>
              <a
                href="/api/auth/discord?next=/admin"
                className="mt-6 inline-flex items-center gap-2 rounded-lg bg-discord-blue px-6 py-3 text-sm font-semibold text-white transition hover:bg-discord-blue/80"
              >
                Log in with Discord
              </a>
              {message && (
                <p className="mt-4 text-xs text-discord-red">{message}</p>
              )}
            </div>
          )}

          {auth === 'forbidden' && (
            <div className="mx-auto max-w-md rounded-2xl border border-discord-red/40 bg-discord-darker p-8 text-center">
              <p className="text-lg font-semibold">Access denied</p>
              <p className="mt-2 text-sm text-discord-lightGray">
                {access?.username ? `You are logged in as ${access.username}, but ` : ''}this account is not whitelisted
                for admin access.
              </p>
              <Link
                href="/dashboard"
                className="mt-6 inline-block rounded-lg border border-discord-gray/40 px-6 py-3 text-sm font-semibold text-discord-lighterGray transition hover:bg-discord-gray/40"
              >
                Go to dashboard
              </Link>
            </div>
          )}

          {auth === 'authed' && (
            <>
              {message && (
                <p
                  className={`mb-6 rounded-lg border px-4 py-3 text-sm ${
                    message.includes('queued')
                      ? 'border-discord-green/40 bg-discord-green/10 text-discord-green'
                      : 'border-discord-red/40 bg-discord-red/10 text-discord-red'
                  }`}
                >
                  {message}
                </p>
              )}

              {loading && <p className="text-sm text-discord-lightGray">Refreshing…</p>}

              {/* Overview */}
              <section className="rounded-2xl border border-discord-gray/20 bg-discord-darker p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold">Bot Overview</h2>
                    <p className="mt-1 text-sm text-discord-lightGray">
                      Live data read directly from the OnboardX database.
                    </p>
                  </div>
                  <button
                    onClick={() => void loadAdmin()}
                    className="rounded-lg border border-discord-gray/40 px-3 py-1.5 text-xs font-semibold text-discord-lighterGray transition hover:bg-discord-gray/40"
                  >
                    Refresh
                  </button>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-xl border border-discord-gray/20 bg-discord-dark p-4">
                    <p className="text-xs font-medium uppercase tracking-wider text-discord-lightGray">State</p>
                    <p
                      className={`mt-2 text-xl font-bold ${
                        maintenance ? 'text-discord-yellow' : status?.isOnline ? 'text-discord-green' : 'text-discord-red'
                      }`}
                    >
                      {maintenance ? 'Maintenance' : status?.isOnline ? 'Online' : 'Offline'}
                    </p>
                  </div>
                  <div className="rounded-xl border border-discord-gray/20 bg-discord-dark p-4">
                    <p className="text-xs font-medium uppercase tracking-wider text-discord-lightGray">Clusters</p>
                    <p className="mt-2 text-xl font-bold text-discord-white">
                      {status ? `${status.readyClusters}/${status.clusterCount}` : '—'}
                    </p>
                  </div>
                  <div className="rounded-xl border border-discord-gray/20 bg-discord-dark p-4">
                    <p className="text-xs font-medium uppercase tracking-wider text-discord-lightGray">Shards</p>
                    <p className="mt-2 text-xl font-bold text-discord-white">
                      {status ? `${status.readyShards}/${status.shardCount}` : '—'}
                    </p>
                  </div>
                  <div className="rounded-xl border border-discord-gray/20 bg-discord-dark p-4">
                    <p className="text-xs font-medium uppercase tracking-wider text-discord-lightGray">Last Snapshot</p>
                    <p className="mt-2 text-xl font-bold text-discord-white">
                      {relativeTime(status?.lastSnapshotAt ?? null)}
                    </p>
                  </div>
                </div>
              </section>

              {/* Maintenance */}
              <section className="mt-6 rounded-2xl border border-discord-gray/20 bg-discord-darker p-6">
                <h3 className="text-sm font-semibold text-discord-lighterGray">Maintenance Mode</h3>
                <p className="mt-1 text-sm text-discord-lightGray">
                  {maintenance
                    ? `Maintenance is currently enabled${status?.maintenance.message ? ` — ${status.maintenance.message}` : ''}.`
                    : 'Maintenance is currently disabled. The bot is operating normally.'}
                </p>
                <button
                  onClick={() =>
                    void sendCommand(maintenance ? 'maintenance_off' : 'maintenance_on')
                  }
                  disabled={busyAction !== null}
                  className={`mt-4 rounded-lg px-5 py-2 text-sm font-semibold text-white transition disabled:opacity-50 ${
                    maintenance
                      ? 'bg-discord-green hover:bg-discord-green/80'
                      : 'bg-discord-yellow hover:bg-discord-yellow/80'
                  }`}
                >
                  {busyAction === (maintenance ? 'maintenance_off' : 'maintenance_on')
                    ? 'Sending…'
                    : maintenance
                      ? 'Disable Maintenance'
                      : 'Enable Maintenance'}
                </button>
              </section>

              {/* Global actions */}
              <section className="mt-6 rounded-2xl border border-discord-gray/20 bg-discord-darker p-6">
                <h3 className="text-sm font-semibold text-discord-lighterGray">Global Actions</h3>
                <p className="mt-1 text-sm text-discord-lightGray">
                  These commands are queued and executed by the cluster manager.
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    onClick={() => void sendCommand('restart_all')}
                    disabled={busyAction !== null}
                    className="rounded-lg border border-discord-yellow/40 bg-discord-yellow/10 px-5 py-2 text-sm font-semibold text-discord-yellow transition hover:bg-discord-yellow/20 disabled:opacity-50"
                  >
                    {busyAction === 'restart_all' ? 'Sending…' : 'Restart All Clusters'}
                  </button>
                  <button
                    onClick={() => void sendCommand('shutdown_all')}
                    disabled={busyAction !== null}
                    className="rounded-lg border border-discord-red/40 bg-discord-red/10 px-5 py-2 text-sm font-semibold text-discord-red transition hover:bg-discord-red/20 disabled:opacity-50"
                  >
                    {busyAction === 'shutdown_all' ? 'Sending…' : 'Shutdown All Clusters'}
                  </button>
                </div>
              </section>

              {/* Per-cluster actions */}
              <section className="mt-6 rounded-2xl border border-discord-gray/20 bg-discord-darker p-6">
                <h3 className="text-sm font-semibold text-discord-lighterGray">Cluster Actions</h3>
                <p className="mt-1 text-sm text-discord-lightGray">Target a single cluster by ID.</p>

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <select
                      value={selectedCluster}
                      onChange={(event) => setSelectedCluster(event.target.value)}
                      className="discord-select"
                    >
                    <option value="">Select a cluster…</option>
                    {clusters.map((cluster) => (
                      <option key={String(cluster.id)} value={String(cluster.clusterId)}>
                        Cluster #{cluster.clusterId} ({cluster.wsStatusLabel})
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() =>
                      selectedCluster !== '' && void sendCommand('restart_cluster', Number(selectedCluster))
                    }
                    disabled={selectedCluster === '' || busyAction !== null}
                    className="rounded-lg border border-discord-yellow/40 bg-discord-yellow/10 px-5 py-2 text-sm font-semibold text-discord-yellow transition hover:bg-discord-yellow/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {busyAction === 'restart_cluster' ? 'Sending…' : 'Restart Cluster'}
                  </button>
                  <button
                    onClick={() =>
                      selectedCluster !== '' && void sendCommand('shutdown_cluster', Number(selectedCluster))
                    }
                    disabled={selectedCluster === '' || busyAction !== null}
                    className="rounded-lg border border-discord-red/40 bg-discord-red/10 px-5 py-2 text-sm font-semibold text-discord-red transition hover:bg-discord-red/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {busyAction === 'shutdown_cluster' ? 'Sending…' : 'Shutdown Cluster'}
                  </button>
                </div>
              </section>

              {/* Cluster list */}
              <section className="mt-6 overflow-hidden rounded-2xl border border-discord-gray/20 bg-discord-darker">
                <div className="border-b border-discord-gray/20 px-4 py-3">
                  <h3 className="text-sm font-semibold text-discord-lighterGray">Clusters</h3>
                  <p className="mt-1 text-xs text-discord-lightGray">
                    Click a cluster to view its shard tokens and assigned servers.
                  </p>
                </div>
                {clusters.length === 0 ? (
                  <p className="px-4 py-6 text-sm text-discord-lightGray">No cluster status records found.</p>
                ) : (
                  <div className="divide-y divide-discord-gray/10">
                    {clusters.map((cluster) => {
                      const expanded = expandedCluster === cluster.clusterId;
                      const shardStates = (cluster.shardStates ?? []).slice().sort((a, b) => a.shardId - b.shardId);
                      const placements = (cluster.guildPlacements ?? [])
                        .slice()
                        .sort((a, b) => (a.shardId ?? -1) - (b.shardId ?? -1) || a.name.localeCompare(b.name));
                      const serverCount = placements.length || cluster.guilds;

                      return (
                        <div key={String(cluster.id)}>
                          <button
                            type="button"
                            onClick={() => setExpandedCluster(expanded ? null : cluster.clusterId)}
                            className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition hover:bg-discord-gray/10"
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <span
                                className={`h-2 w-2 shrink-0 rounded-full ${
                                  cluster.ready ? 'bg-discord-green' : cluster.online ? 'bg-discord-yellow' : 'bg-discord-red'
                                }`}
                              />
                              <span className="font-medium text-discord-white">Cluster #{cluster.id}</span>
                              <span className="text-xs text-discord-lightGray">
                                {cluster.shardCount} shards · {formatBigNumber(serverCount)} servers ·{' '}
                                {cluster.ping >= 0 ? `${Math.round(cluster.ping)}ms` : '—'}
                              </span>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
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
                              <span className={`text-xs text-discord-lightGray transition-transform ${expanded ? 'rotate-180' : ''}`}>
                                ▾
                              </span>
                            </div>
                          </button>

                          {expanded && (
                            <div className="border-t border-discord-gray/10 px-4 py-4">
                              <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                                <div className="rounded-xl border border-discord-gray/20 bg-discord-dark p-3">
                                  <p className="text-[11px] font-medium uppercase tracking-wider text-discord-lightGray">Guilds</p>
                                  <p className="mt-1 text-lg font-bold text-discord-white">{formatBigNumber(cluster.guilds)}</p>
                                </div>
                                <div className="rounded-xl border border-discord-gray/20 bg-discord-dark p-3">
                                  <p className="text-[11px] font-medium uppercase tracking-wider text-discord-lightGray">Users</p>
                                  <p className="mt-1 text-lg font-bold text-discord-white">{formatBigNumber(cluster.users)}</p>
                                </div>
                                <div className="rounded-xl border border-discord-gray/20 bg-discord-dark p-3">
                                  <p className="text-[11px] font-medium uppercase tracking-wider text-discord-lightGray">Channels</p>
                                  <p className="mt-1 text-lg font-bold text-discord-white">{formatBigNumber(cluster.channels)}</p>
                                </div>
                                <div className="rounded-xl border border-discord-gray/20 bg-discord-dark p-3">
                                  <p className="text-[11px] font-medium uppercase tracking-wider text-discord-lightGray">Memory</p>
                                  <p className="mt-1 text-lg font-bold text-discord-white">{cluster.memoryMB} MB</p>
                                </div>
                              </div>

                              <div className="mb-4">
                                <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-discord-lightGray">
                                  Shard tokens ({shardStates.length || cluster.shardCount})
                                </p>
                                {shardStates.length === 0 ? (
                                  <p className="text-xs text-discord-lightGray">
                                    No per-shard sub-records found. The cluster may not have reported yet.
                                  </p>
                                ) : (
                                  <div className="grid grid-cols-5 gap-2 sm:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10">
                                    {shardStates.map((shard) => {
                                      const tone = shardTone(shard.ready, shard.state);
                                      return (
                                        <div
                                          key={String(shard.shardId)}
                                          className={`rounded-lg border ${tone.border} ${tone.bg} px-2 py-2 text-center`}
                                        >
                                          <p className={`text-sm font-bold leading-none ${tone.text}`}>{shard.shardId}</p>
                                          <p className="mt-1 text-[11px] text-discord-lighterGray">
                                            {shard.ready ? 'ready' : shard.state}
                                          </p>
                                          <p className="text-[11px] text-discord-lighterGray">
                                            {shard.guilds > 0 ? `${formatBigNumber(shard.guilds)} guilds` : '—'}
                                          </p>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>

                              <div>
                                <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-discord-lightGray">
                                  Assigned servers ({placements.length})
                                </p>
                                {placements.length === 0 ? (
                                  <p className="text-xs text-discord-lightGray">No server assignments recorded for this cluster.</p>
                                ) : (
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                      <thead>
                                        <tr className="border-b border-discord-gray/20 text-xs uppercase tracking-wider text-discord-lightGray">
                                          <th className="px-3 py-2 font-medium">Server</th>
                                          <th className="px-3 py-2 font-medium">ID</th>
                                          <th className="px-3 py-2 font-medium">Shard</th>
                                          <th className="px-3 py-2 font-medium">Members</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {placements.map((guild) => (
                                          <tr key={guild.id} className="border-b border-discord-gray/10 last:border-0">
                                            <td className="px-3 py-2 font-medium text-discord-white">{guild.name}</td>
                                            <td className="px-3 py-2 text-xs text-discord-lighterGray">{guild.id}</td>
                                            <td className="px-3 py-2 text-xs text-discord-lighterGray">
                                              {guild.shardId != null ? `#${guild.shardId}` : '—'}
                                            </td>
                                            <td className="px-3 py-2 text-xs text-discord-lighterGray">
                                              {guild.memberCount != null ? formatBigNumber(guild.memberCount) : '—'}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* Command history */}
              <section className="mt-6 overflow-hidden rounded-2xl border border-discord-gray/20 bg-discord-darker">
                <div className="border-b border-discord-gray/20 px-4 py-3">
                  <h3 className="text-sm font-semibold text-discord-lighterGray">Recent Control Commands</h3>
                </div>
                {(data?.commands ?? []).length === 0 ? (
                  <p className="px-4 py-6 text-sm text-discord-lightGray">No control commands have been run yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-discord-gray/20 text-xs uppercase tracking-wider text-discord-lightGray">
                          <th className="px-4 py-3 font-medium">Action</th>
                          <th className="px-4 py-3 font-medium">Target</th>
                          <th className="px-4 py-3 font-medium">Status</th>
                          <th className="px-4 py-3 font-medium">Requested</th>
                          <th className="px-4 py-3 font-medium">Details</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(data?.commands ?? []).map((command) => {
                          const meta = COMMAND_STATUS_META[command.status] ?? COMMAND_STATUS_META.queued;
                          return (
                            <tr key={command.id} className="border-b border-discord-gray/10 last:border-0">
                              <td className="px-4 py-3 font-medium text-discord-white">
                                {ACTION_LABELS[command.action] ?? command.action}
                              </td>
                              <td className="px-4 py-3 text-discord-lighterGray">
                                {command.clusterId != null ? `Cluster #${command.clusterId}` : '—'}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${meta.cls}`}>
                                  <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                                  {meta.label}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-xs text-discord-lightGray">
                                {relativeTime(command.requestedAt)}
                                <span className="block">{formatDate(command.requestedAt)}</span>
                              </td>
                              <td className="max-w-[16rem] truncate px-4 py-3 text-xs text-discord-lightGray" title={command.error ?? undefined}>
                                {command.error ?? (command.finishedAt ? `Finished ${formatDate(command.finishedAt)}` : '—')}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}