import type { Filter, Document } from 'mongodb';
import { connectDb, COLLECTIONS } from './mongo';

const SYSTEM_STATUS_FILTER = { _id: 'clusterStatus' as unknown } as Filter<Document>;

export interface MaintenanceInfo {
  enabled: boolean;
  message: string | null;
  startedAt: string | null;
  estimatedEndAt: string | null;
}

export interface DiscordGatewayInfo {
  clusters: Record<string, unknown>;
  shards: Record<string, unknown>;
  avgPingMs: number;
  reconnectingClusters: number;
  disconnectedClusters: number;
  reconnectingShards: number;
  disconnectedShards: number;
  readyShards: number;
  totalShards: number;
}

export interface GuildPlacement {
  id: string;
  name: string;
  shardId: number | null;
  memberCount: number | null;
}

export interface ShardSubInfo {
  shardId: number;
  state: string;
  statusCode: number | null;
  ready: boolean;
  ping: number;
  sequence: number | null;
  guilds: number;
}

export interface ClusterStatusRecord {
  id: string | number;
  clusterId: number;
  state: string;
  processState: string;
  ready: boolean;
  online: boolean;
  stale: boolean;
  shardCount: number;
  shards: number[];
  shardStates: ShardSubInfo[];
  guilds: number;
  users: number;
  channels: number;
  ping: number;
  uptime: number;
  memoryMB: number;
  wsStatus: string;
  wsStatusLabel: string;
  guildPlacements: GuildPlacement[];
  lastHeartbeatAt: string | null;
  expiresAt: string | null;
}

export interface ShardStatusRecord {
  id: string | number;
  shardId: number;
  clusterId: number | null;
  state: string;
  ready: boolean;
  online: boolean;
  stale: boolean;
  statusCode: number | null;
  ping: number;
  guilds: number;
  users: number;
  channels: number;
  sequence: number | null;
  guildsList: GuildPlacement[];
  lastHeartbeatAt: string | null;
  expiresAt: string | null;
}

export interface HostDetails {
  host: string | null;
  platform: string | null;
  node: string | null;
  managerPid: number | null;
  bootedAt: string | null;
  stoppedAt: string | null;
  lastSnapshotAt: string | null;
  healthPort: number | null;
  statusSyncMs: number | null;
  memoryMB: number;
  state: string;
  online: boolean;
}

export interface StatusPayload {
  isOnline: boolean;
  state: string;
  stale: boolean;
  uptime: number;
  memoryUsage: { rss: number; heapTotal: number; heapUsed: number; external: number };
  shardCount: number;
  readyShards: number;
  clusterCount: number;
  readyClusters: number;
  averagePing: number;
  totalGuilds: number;
  totalUsers: number;
  host: string | null;
  lastSnapshotAt: string | null;
  maintenance: MaintenanceInfo;
  discordGateway: DiscordGatewayInfo;
  hostDetails: HostDetails;
  clusters: ClusterStatusRecord[];
  shards: ShardStatusRecord[];
  ok: boolean;
  database: 'connected' | 'unavailable';
  lastUpdated: string;
}

function parseDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'object' && value !== null && 'toDate' in value && typeof (value as { toDate: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate();
  }
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

function isExpired(expiresAt: unknown): boolean {
  const date = parseDate(expiresAt);
  return Boolean(date && date.getTime() <= Date.now());
}

function numberValue(value: unknown, fallback = 0): number {
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function textValue(value: unknown, fallback = 'unknown'): string {
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

function normalizeGuildPlacements(value: unknown): GuildPlacement[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is Record<string, unknown> => typeof entry === 'object' && entry !== null)
    .map((entry) => ({
      id: typeof entry.id === 'string' || typeof entry.id === 'number' ? String(entry.id) : '',
      name: textValue(entry.name, 'Unknown Server'),
      shardId: entry.shardId == null ? null : numberValue(entry.shardId),
      memberCount: entry.memberCount == null ? null : numberValue(entry.memberCount),
    }))
    .filter((entry) => entry.id.length > 0);
}

function normalizeShardStates(value: unknown): ShardSubInfo[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is Record<string, unknown> => typeof entry === 'object' && entry !== null)
    .map((entry) => ({
      shardId: numberValue(entry.shardId, -1),
      state: textValue(entry.state),
      statusCode: entry.statusCode == null ? null : numberValue(entry.statusCode),
      ready: entry.ready === true,
      ping: numberValue(entry.ping, -1),
      sequence: entry.sequence == null ? null : numberValue(entry.sequence),
      guilds: Array.isArray(entry.guildsList) ? entry.guildsList.length : numberValue(entry.guilds),
    }))
    .filter((entry) => entry.shardId >= 0);
}

function defaultMaintenance(doc?: { maintenance?: Partial<MaintenanceInfo> }): MaintenanceInfo {
  const enabled = doc?.maintenance?.enabled === true;
  return {
    enabled,
    message: enabled ? (doc?.maintenance?.message ?? 'Scheduled maintenance is active.') : null,
    startedAt: doc?.maintenance?.startedAt ?? null,
    estimatedEndAt: doc?.maintenance?.estimatedEndAt ?? null,
  };
}

function defaultDiscordGateway(doc?: { discordGateway?: Partial<DiscordGatewayInfo>; totalShards?: number }): DiscordGatewayInfo {
  return {
    clusters: (doc?.discordGateway?.clusters as Record<string, unknown>) ?? {},
    shards: (doc?.discordGateway?.shards as Record<string, unknown>) ?? {},
    avgPingMs: numberValue(doc?.discordGateway?.avgPingMs, -1),
    reconnectingClusters: numberValue(doc?.discordGateway?.reconnectingClusters),
    disconnectedClusters: numberValue(doc?.discordGateway?.disconnectedClusters),
    reconnectingShards: numberValue(doc?.discordGateway?.reconnectingShards),
    disconnectedShards: numberValue(doc?.discordGateway?.disconnectedShards),
    readyShards: numberValue(doc?.discordGateway?.readyShards),
    totalShards: numberValue(doc?.discordGateway?.totalShards, numberValue(doc?.totalShards)),
  };
}

function normalizeSystemStatus(doc: Record<string, unknown> | null | undefined) {
  const stale = isExpired(doc?.expiresAt);
  const maintenance = defaultMaintenance(doc as { maintenance?: Partial<MaintenanceInfo> });
  const online = !stale && doc?.state !== 'stopped' && doc?.state !== 'offline';

  return {
    id: 'clusterStatus',
    state: stale ? 'offline' : online ? textValue(doc?.state, 'running') : 'offline',
    online,
    stale,
    bootedAt: (doc?.bootedAt as string | undefined) ?? null,
    stoppedAt: (doc?.stoppedAt as string | undefined) ?? null,
    lastSnapshotAt: (doc?.lastSnapshotAt as string | undefined) ?? null,
    expiresAt: (doc?.expiresAt as string | undefined) ?? null,
    managerPid: doc?.managerPid != null ? numberValue(doc.managerPid) : null,
    host: (doc?.host as string | undefined) ?? null,
    platform: (doc?.platform as string | undefined) ?? null,
    node: (doc?.node as string | undefined) ?? null,
    healthPort: doc?.healthPort != null ? numberValue(doc.healthPort) : null,
    statusSyncMs: doc?.statusSyncMs != null ? numberValue(doc.statusSyncMs) : null,
    clusterCount: numberValue(doc?.clusterCount),
    readyClusters: numberValue(doc?.readyClusters),
    totalShards: numberValue(doc?.totalShards),
    readyShards: numberValue(doc?.readyShards),
    totalGuilds: numberValue(doc?.totalGuilds),
    totalUsers: numberValue(doc?.totalUsers),
    avgPingMs: numberValue(doc?.avgPingMs, -1),
    memoryMB: numberValue(doc?.memoryMB),
    maintenance,
    discordGateway: defaultDiscordGateway(doc as { discordGateway?: Partial<DiscordGatewayInfo>; totalShards?: number }),
  };
}

function normalizeClusterStatus(doc: Record<string, unknown>): ClusterStatusRecord {
  const stale = isExpired(doc.expiresAt);
  const ready = stale ? false : doc.ready === true;
  const ping = numberValue(doc.ping, -1);
  // A cluster is only "online" if it is fresh, ready, and actually reporting a
  // valid gateway ping. A disconnected gateway (ping -1, ready=false) must read
  // as offline rather than online.
  const online = !stale && ready && ping >= 0 && doc.state !== 'stopped' && doc.state !== 'offline';
  const clusterId = numberValue(doc.clusterId ?? doc._id);

  return {
    id: clusterId,
    clusterId,
    state: stale ? 'offline' : textValue(doc.state),
    processState: stale ? 'offline' : textValue(doc.processState, textValue(doc.state)),
    ready,
    online,
    stale,
    shardCount: numberValue(doc.shardCount, Array.isArray(doc.shards) ? doc.shards.length : 0),
    shards: Array.isArray(doc.shards) ? doc.shards.map((shard) => numberValue(shard)) : [],
    shardStates: normalizeShardStates(doc.shardStates),
    guilds: numberValue(doc.guilds),
    users: numberValue(doc.users),
    channels: numberValue(doc.channels),
    ping,
    uptime: Math.max(0, Math.floor(numberValue(doc.uptime) / 1000)),
    memoryMB: numberValue(doc.memoryMB),
    wsStatus: textValue(doc.wsStatus),
    wsStatusLabel: stale ? 'offline' : textValue(doc.wsStatusLabel, textValue(doc.wsStatus)),
    guildPlacements: normalizeGuildPlacements(doc.guildPlacements),
    lastHeartbeatAt: (doc.lastHeartbeatAt as string | undefined) ?? null,
    expiresAt: (doc.expiresAt as string | undefined) ?? null,
  };
}

function normalizeShardStatus(doc: Record<string, unknown>): ShardStatusRecord {
  const stale = isExpired(doc.expiresAt);
  const ready = stale ? false : doc.ready === true;
  const ping = numberValue(doc.ping, -1);
  const online = !stale && ready && ping >= 0 && doc.state !== 'stopped' && doc.state !== 'offline';
  const shardId = numberValue(doc.shardId ?? doc._id);

  return {
    id: shardId,
    shardId,
    clusterId: doc.clusterId == null ? null : numberValue(doc.clusterId),
    state: stale ? 'offline' : textValue(doc.state),
    ready,
    online,
    stale,
    statusCode: stale ? null : doc.statusCode == null ? null : numberValue(doc.statusCode),
    ping,
    guilds: numberValue(doc.guilds),
    users: numberValue(doc.users),
    channels: numberValue(doc.channels),
    sequence: doc.sequence == null ? null : numberValue(doc.sequence),
    guildsList: normalizeGuildPlacements(doc.guildsList),
    lastHeartbeatAt: (doc.lastHeartbeatAt as string | undefined) ?? null,
    expiresAt: (doc.expiresAt as string | undefined) ?? null,
  };
}

export async function fetchBotStatus(): Promise<StatusPayload> {
  const db = await connectDb();

  const [systemDoc, clusterDocs, shardDocs, configuredGuilds] = await Promise.all([
    db.collection(COLLECTIONS.systemDocs).findOne(SYSTEM_STATUS_FILTER),
    db.collection(COLLECTIONS.clusterStatuses).find({}).sort({ clusterId: 1 }).toArray(),
    db.collection(COLLECTIONS.shardStatuses).find({}).sort({ shardId: 1 }).toArray(),
    db.collection(COLLECTIONS.guildConfigs).countDocuments(),
  ]);

  const system = normalizeSystemStatus(systemDoc as Record<string, unknown> | null);
  const clusters = clusterDocs.map((doc) => normalizeClusterStatus(doc as Record<string, unknown>));
  const shards = shardDocs.map((doc) => normalizeShardStatus(doc as Record<string, unknown>));

  const freshCluster = clusters.find((cluster) => !cluster.stale);
  const isOnline = system.online || clusters.some((cluster) => cluster.online) || shards.some((shard) => shard.online);

  const totalClusterMemoryMB = clusters.reduce((total, cluster) => total + (cluster.memoryMB > 0 ? cluster.memoryMB : 0), 0);
  const botMemoryMB = totalClusterMemoryMB > 0 ? totalClusterMemoryMB : system.memoryMB;

  const lastUpdated =
    parseDate(system.lastSnapshotAt)
    ?? parseDate(freshCluster?.lastHeartbeatAt)
    ?? parseDate(shards.find((shard) => !shard.stale)?.lastHeartbeatAt)
    ?? new Date();

  const displayState = system.maintenance.enabled
    ? 'maintenance'
    : system.stale && !isOnline
      ? 'offline'
      : system.state;

  return {
    isOnline,
    state: displayState,
    stale: system.stale && !clusters.some((cluster) => !cluster.stale) && !shards.some((shard) => !shard.stale),
    uptime: freshCluster?.uptime ?? 0,
    memoryUsage: { rss: botMemoryMB, heapTotal: 0, heapUsed: botMemoryMB, external: 0 },
    shardCount: system.totalShards || shards.length,
    readyShards: system.readyShards || shards.filter((shard) => shard.ready).length,
    clusterCount: system.clusterCount || clusters.length,
    readyClusters: system.readyClusters || clusters.filter((cluster) => cluster.ready).length,
    averagePing: system.avgPingMs >= 0 ? system.avgPingMs : freshCluster?.ping ?? -1,
    totalGuilds: system.totalGuilds || configuredGuilds,
    totalUsers: system.totalUsers,
    host: system.host,
    lastSnapshotAt: system.lastSnapshotAt,
    maintenance: system.maintenance,
    discordGateway: system.discordGateway,
    hostDetails: {
      host: system.host,
      platform: system.platform,
      node: system.node,
      managerPid: system.managerPid,
      bootedAt: system.bootedAt,
      stoppedAt: system.stoppedAt,
      lastSnapshotAt: system.lastSnapshotAt,
      healthPort: system.healthPort,
      statusSyncMs: system.statusSyncMs,
      memoryMB: system.memoryMB,
      state: system.state,
      online: system.online,
    },
    clusters,
    shards,
    ok: isOnline,
    database: 'connected',
    lastUpdated: lastUpdated.toISOString(),
  };
}