import { MongoClient, type Db, type Filter, type Document } from 'mongodb';
import type { SessionData } from './session';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
const MONGODB_DATABASE = process.env.MONGODB_DATABASE || process.env.DB_NAME || 'OnboardX';

let client: MongoClient | null = null;
let db: Db | null = null;
let connectPromise: Promise<Db> | null = null;

function hasMongoTlsOption(uri: string) {
  const query = uri.split('?')[1] ?? '';
  return /(^|&)(tls|ssl)=/i.test(query);
}

function createMongoClient() {
  const isSrv = MONGODB_URI.startsWith('mongodb+srv://');
  const uriHasTlsOption = hasMongoTlsOption(MONGODB_URI);

  return new MongoClient(MONGODB_URI, {
    ignoreUndefined: true,
    retryWrites: process.env.MONGODB_RETRY_WRITES !== 'false',
    serverSelectionTimeoutMS: Number(process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS ?? '15000'),
    connectTimeoutMS: Number(process.env.MONGODB_CONNECT_TIMEOUT_MS ?? '15000'),
    socketTimeoutMS: Number(process.env.MONGODB_SOCKET_TIMEOUT_MS ?? '45000'),
    maxPoolSize: Number(process.env.MONGODB_MAX_POOL_SIZE ?? '20'),
    minPoolSize: Number(process.env.MONGODB_MIN_POOL_SIZE ?? '0'),
    family: Number(process.env.MONGODB_IP_FAMILY ?? '4'),
    directConnection: process.env.MONGODB_DIRECT_CONNECTION === 'true',
    ...(!uriHasTlsOption && {
      tls: process.env.MONGODB_TLS
        ? process.env.MONGODB_TLS === 'true'
        : isSrv,
    }),
    ...(process.env.MONGODB_TLS_ALLOW_INVALID_CERTIFICATES === 'true' && {
      tlsAllowInvalidCertificates: true,
    }),
    ...(process.env.MONGODB_TLS_ALLOW_INVALID_HOSTNAMES === 'true' && {
      tlsAllowInvalidHostnames: true,
    }),
    ...(process.env.MONGODB_TLS_CA_FILE && {
      tlsCAFile: process.env.MONGODB_TLS_CA_FILE,
    }),
    ...(process.env.MONGODB_TLS_SERVER_NAME && {
      servername: process.env.MONGODB_TLS_SERVER_NAME,
    }),
  });
}

async function connect(): Promise<Db> {
  if (db && client) {
    try {
      await db.command({ ping: 1 });
      return db;
    } catch {
      await client.close().catch(() => {});
      client = null;
      db = null;
      connectPromise = null;
    }
  }

  if (!connectPromise) {
    connectPromise = (async () => {
      client = createMongoClient();
      await client.connect();
      db = client.db(MONGODB_DATABASE);
      await db.command({ ping: 1 });
      return db;
    })().catch((error) => {
      connectPromise = null;
      client = null;
      db = null;
      throw error;
    });
  }

  return connectPromise;
}

export async function connectDb(): Promise<Db> {
  return connect();
}

export function getDb(): Db {
  if (!db) {
    throw new Error('Database not connected. Call connectDb() first.');
  }
  return db;
}

export async function disconnectDb() {
  if (client) {
    await client.close().catch(() => {});
  }
  client = null;
  db = null;
  connectPromise = null;
}

export const COLLECTIONS = {
  systemDocs: 'system_docs',
  clusterStatuses: 'cluster_statuses',
  shardStatuses: 'shard_statuses',
  guildConfigs: 'guild_configs',
  clusterControlCommands: 'cluster_control_commands',
  uptimeDaily: 'uptime_daily',
  incidents: 'incidents',
  maintenanceWindows: 'maintenance_windows',
  applicationForms: 'application_forms',
  formSubmissions: 'form_submissions',
  oauthSessions: 'oauth_sessions',
  botAccessBlocks: 'bot_access_blocks',
} as const;

export type BotAccessBlockType = 'guild' | 'user';
export interface BotAccessBlock {
  id: string;
  type: BotAccessBlockType;
  targetId: string;
  createdAt: Date | null;
}

export async function listBotAccessBlocks(): Promise<BotAccessBlock[]> {
  const dbHandle = await connectDb();
  const documents = await dbHandle.collection(COLLECTIONS.botAccessBlocks).find({}).sort({ createdAt: -1 }).toArray();
  return documents
    .map((document) => ({
      id: String(document._id),
      type: document.type === 'user' ? 'user' as const : document.type === 'guild' ? 'guild' as const : null,
      targetId: typeof document.targetId === 'string' ? document.targetId : '',
      createdAt: document.createdAt instanceof Date ? document.createdAt : null,
    }))
    .filter((block): block is BotAccessBlock => block.type !== null && /^\d{15,25}$/.test(block.targetId));
}

export async function addBotAccessBlock(type: BotAccessBlockType, targetId: string): Promise<void> {
  const dbHandle = await connectDb();
  await dbHandle.collection(COLLECTIONS.botAccessBlocks).updateOne(
    { type, targetId },
    { $setOnInsert: { type, targetId, createdAt: new Date() } },
    { upsert: true },
  );
}

export async function removeBotAccessBlock(id: string): Promise<boolean> {
  const dbHandle = await connectDb();
  const { ObjectId } = await import('mongodb');
  if (!ObjectId.isValid(id)) return false;
  const result = await dbHandle.collection(COLLECTIONS.botAccessBlocks).deleteOne({ _id: new ObjectId(id) });
  return result.deletedCount === 1;
}

function asSessionData(document: Document | null): SessionData | null {
  if (!document || typeof document.sessionId !== 'string' || typeof document.userId !== 'string' ||
    typeof document.username !== 'string' || typeof document.accessToken !== 'string' ||
    typeof document.refreshToken !== 'string') return null;
  return {
    sessionId: document.sessionId,
    userId: document.userId,
    username: document.username,
    avatar: typeof document.avatar === 'string' ? document.avatar : null,
    globalName: typeof document.globalName === 'string' ? document.globalName : null,
    discriminator: typeof document.discriminator === 'string' ? document.discriminator : '0',
    banner: typeof document.banner === 'string' ? document.banner : null,
    accentColor: typeof document.accentColor === 'number' ? document.accentColor : null,
    accessToken: document.accessToken,
    refreshToken: document.refreshToken,
  };
}

export async function storeOAuthSession(session: SessionData & { sessionId: string }): Promise<void> {
  const dbHandle = await connectDb();
  const now = new Date();
  await dbHandle.collection(COLLECTIONS.oauthSessions).updateOne(
    { _id: session.sessionId } as unknown as Filter<Document>,
    { $set: { ...session, expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), updatedAt: now }, $setOnInsert: { createdAt: now } },
    { upsert: true },
  );
}

export async function getOAuthSession(sessionId: string): Promise<SessionData | null> {
  const dbHandle = await connectDb();
  return asSessionData(await dbHandle.collection(COLLECTIONS.oauthSessions).findOne({ _id: sessionId, expiresAt: { $gt: new Date() } } as unknown as Filter<Document>));
}

/** Claim a short distributed lease before exchanging a rotating Discord refresh token. */
export async function claimOAuthRefresh(sessionId: string, refreshToken: string, lockId: string): Promise<boolean> {
  const dbHandle = await connectDb();
  const now = new Date();
  const result = await dbHandle.collection(COLLECTIONS.oauthSessions).updateOne(
    {
      _id: sessionId,
      refreshToken,
      $or: [{ refreshLockUntil: { $exists: false } }, { refreshLockUntil: { $lt: now } }],
    } as unknown as Filter<Document>,
    { $set: { refreshLockId: lockId, refreshLockUntil: new Date(now.getTime() + 15_000), updatedAt: now } },
  );
  return result.modifiedCount === 1;
}

export async function completeOAuthRefresh(session: SessionData & { sessionId: string }, lockId: string): Promise<void> {
  const dbHandle = await connectDb();
  await dbHandle.collection(COLLECTIONS.oauthSessions).updateOne(
    { _id: session.sessionId, refreshLockId: lockId } as unknown as Filter<Document>,
    {
      $set: { accessToken: session.accessToken, refreshToken: session.refreshToken, updatedAt: new Date() },
      $unset: { refreshLockId: '', refreshLockUntil: '' },
    },
  );
}

export async function releaseOAuthRefresh(sessionId: string, lockId: string): Promise<void> {
  const dbHandle = await connectDb();
  await dbHandle.collection(COLLECTIONS.oauthSessions).updateOne(
    { _id: sessionId, refreshLockId: lockId } as unknown as Filter<Document>,
    { $unset: { refreshLockId: '', refreshLockUntil: '' } },
  );
}

export async function getGuildConfig(guildId: string): Promise<Document | null> {
  const dbHandle = await connectDb();
  const filter: Filter<Document> = { $or: [{ _id: guildId } as unknown as Filter<Document>, { guildId }] };
  return dbHandle.collection(COLLECTIONS.guildConfigs).findOne(filter);
}

export async function updateGuildConfig(
  guildId: string,
  updates: Record<string, unknown>
): Promise<void> {
  const dbHandle = await connectDb();
  const collection = dbHandle.collection(COLLECTIONS.guildConfigs);
  const filter: Filter<Document> = { $or: [{ _id: guildId } as unknown as Filter<Document>, { guildId }] };
  const existing = await collection.findOne(filter);

  const setFields: Document = { guildId, updatedAt: new Date() };
  for (const [path, value] of Object.entries(updates)) {
    setFields[path] = value;
  }

  const screen: Filter<Document> = ({ _id: existing?._id ?? guildId } as unknown) as Filter<Document>;
  await collection.updateOne(
    screen,
    { $set: setFields, $setOnInsert: { createdAt: new Date() } },
    { upsert: true }
  );
}

export interface ClosedBetaGuild {
  guildId: string;
  name: string | null;
  enabled: boolean;
}

/** List existing guild configuration documents for the closed-beta console. */
export async function listClosedBetaGuilds(): Promise<ClosedBetaGuild[]> {
  const dbHandle = await connectDb();
  const documents = await dbHandle.collection(COLLECTIONS.guildConfigs)
    .find({}, { projection: { guildId: 1, guildName: 1, serverName: 1, name: 1, closedBeta: 1 } })
    .toArray();

  return documents
    .map((document) => {
      const guildId = typeof document.guildId === 'string'
        ? document.guildId
        : typeof document._id === 'string' ? document._id : '';
      const name = [document.guildName, document.serverName, document.name]
        .find((value): value is string => typeof value === 'string' && value.trim().length > 0) ?? null;
      const closedBeta = document.closedBeta as { enabled?: unknown } | undefined;
      return { guildId, name, enabled: closedBeta?.enabled === true };
    })
    .filter((guild): guild is ClosedBetaGuild => /^\d{15,25}$/.test(guild.guildId))
    .sort((left, right) => (left.name ?? left.guildId).localeCompare(right.name ?? right.guildId));
}

/** Change only the closed-beta flag on an existing guild configuration. */
export async function setClosedBetaEnrollment(guildId: string, enabled: boolean): Promise<boolean> {
  const dbHandle = await connectDb();
  const result = await dbHandle.collection(COLLECTIONS.guildConfigs).updateOne(
    { $or: [{ guildId }, { _id: guildId } as unknown as Filter<Document>] },
    { $set: { 'closedBeta.enabled': enabled, updatedAt: new Date() } },
  );
  return result.matchedCount === 1;
}
