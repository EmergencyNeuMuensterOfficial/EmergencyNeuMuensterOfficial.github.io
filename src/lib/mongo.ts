import { MongoClient, type Db, type Filter, type Document } from 'mongodb';

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
} as const;

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