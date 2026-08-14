'use client';

import { useCallback, useEffect, useState } from 'react';
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

export default function AdminPage() {
  const [auth, setAuth] = useState<'unknown' | 'authed' | 'denied'>('unknown');
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [data, setData] = useState<AdminData | null>(null);
  const [selectedCluster, setSelectedCluster] = useState<string>('');
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const loadAdmin = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch('/api/admin/status', { cache: 'no-store' });
      if (response.status === 401) {
        setAuth('denied');
        setData(null);
        return;
      }
      const payload = (await response.json()) as AdminData & { ok?: boolean; error?: string };
      if (!response.ok || payload.ok === false) {
        throw new Error(payload.error || 'Failed to load admin data');
      }
      setAuth('authed');
      setData(payload as AdminData);
    } catch (error) {
      setData(null);
      setMessage(error instanceof Error ? error.message : 'Failed to load admin data');
      setAuth((current) => (current === 'authed' ? 'authed' : 'denied'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAdmin();
  }, [loadAdmin]);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage(null);
    try {
      const response = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error || 'Invalid admin key.');
      setPassword('');
      await loadAdmin();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Login failed.');
    }
  };

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' }).catch(() => {});
    setAuth('denied');
    setData(null);
    setMessage(null);
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
            <form
              onSubmit={handleLogin}
              className="mx-auto max-w-md rounded-2xl border border-discord-gray/20 bg-discord-darker p-8"
            >
              <p className="text-lg font-semibold">Admin access</p>
              <p className="mt-2 text-sm text-discord-lightGray">
                This area is password protected. Enter the admin key to continue.
              </p>

              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Admin key"
                autoComplete="current-password"
                autoFocus
                className="mt-5 w-full rounded-lg border border-discord-gray/40 bg-discord-dark px-4 py-2.5 text-sm text-discord-white outline-none transition placeholder:text-discord-lightGray focus:border-discord-blue"
              />

              {message && (
                <p className="mt-3 text-xs text-discord-red">{message}</p>
              )}

              <button
                type="submit"
                disabled={password.length === 0}
                className="mt-5 w-full rounded-lg bg-discord-blue px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-discord-blue/80 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Unlock
              </button>
            </form>
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
                    className="rounded-lg border border-discord-gray/40 bg-discord-dark px-3 py-2 text-sm text-discord-white outline-none focus:border-discord-blue"
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
                </div>
                {clusters.length === 0 ? (
                  <p className="px-4 py-6 text-sm text-discord-lightGray">No cluster status records found.</p>
                ) : (
                  <div className="divide-y divide-discord-gray/10">
                    {clusters.map((cluster) => (
                      <div key={String(cluster.id)} className="flex items-center justify-between gap-4 px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span
                            className={`h-2 w-2 rounded-full ${
                              cluster.ready ? 'bg-discord-green' : cluster.online ? 'bg-discord-yellow' : 'bg-discord-red'
                            }`}
                          />
                          <span className="font-medium text-discord-white">Cluster #{cluster.id}</span>
                          <span className="text-xs text-discord-lightGray">
                            {cluster.shardCount} shards · {cluster.ping >= 0 ? `${Math.round(cluster.ping)}ms` : '—'}
                          </span>
                        </div>
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
                    ))}
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