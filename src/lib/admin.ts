import { createHmac, timingSafeEqual } from 'crypto';
import type { NextRequest } from 'next/server';
import { connectDb, COLLECTIONS } from './mongo';

export const ADMIN_COOKIE_NAME = 'onboardx_admin';

const ADMIN_KEY = process.env.OBNX_SECRECT_KEY ?? '';
const ADMIN_TTL_MS = 8 * 60 * 60 * 1000;

function base64UrlEncode(value: string): string {
  return Buffer.from(value).toString('base64url');
}

function sign(data: string): string {
  return createHmac('sha256', ADMIN_KEY).update(data).digest('base64url');
}

function passwordSafeEquals(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Compare a submitted password against OBNX_SECRECT_KEY (timing-safe). */
export function verifyAdminPassword(password: string): boolean {
  if (!ADMIN_KEY || typeof password !== 'string' || password.length === 0) return false;
  return passwordSafeEquals(password, ADMIN_KEY);
}

/** Issue a signed, short-lived admin token stored in an httpOnly cookie. */
export function createAdminToken(): string {
  const expiresAt = Date.now() + ADMIN_TTL_MS;
  const payload = base64UrlEncode(JSON.stringify({ role: 'admin', expiresAt }));
  return `${payload}.${sign(payload)}`;
}

export function hasAdminAccess(request: NextRequest): boolean {
  const token = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (!token || !ADMIN_KEY) return false;

  const dot = token.indexOf('.');
  if (dot === -1) return false;

  const payload = token.slice(0, dot);
  const signature = token.slice(dot + 1);
  if (!passwordSafeEquals(signature, sign(payload))) return false;

  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      role: string;
      expiresAt: number;
    };
    return data.role === 'admin' && typeof data.expiresAt === 'number' && data.expiresAt > Date.now();
  } catch {
    return false;
  }
}

// ── Cluster control commands ────────────────────────────────────────────────

export const CONTROL_ACTIONS = {
  restart_all: { label: 'Restart All Clusters', requiresCluster: false },
  shutdown_all: { label: 'Shutdown All Clusters', requiresCluster: false },
  maintenance_on: { label: 'Enable Maintenance', requiresCluster: false },
  maintenance_off: { label: 'Disable Maintenance', requiresCluster: false },
  restart_cluster: { label: 'Restart Cluster', requiresCluster: true },
  shutdown_cluster: { label: 'Shutdown Cluster', requiresCluster: true },
} as const;

export type ControlAction = keyof typeof CONTROL_ACTIONS;

export interface ControlCommand {
  id: string;
  action: string;
  clusterId: number | null;
  status: 'queued' | 'running' | 'done' | 'failed';
  requestedAt: Date | null;
  startedAt: Date | null;
  finishedAt: Date | null;
  error: string | null;
}

function toDateValue(value: unknown): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeCommand(doc: Record<string, unknown>): ControlCommand {
  return {
    id: String(doc._id ?? doc.id ?? ''),
    action: typeof doc.action === 'string' ? doc.action : 'unknown',
    clusterId: doc.clusterId == null ? null : Number(doc.clusterId),
    status: (doc.status === 'running' || doc.status === 'done' || doc.status === 'failed' ? doc.status : 'queued'),
    requestedAt: toDateValue(doc.requestedAt),
    startedAt: toDateValue(doc.startedAt),
    finishedAt: toDateValue(doc.finishedAt),
    error: typeof doc.error === 'string' ? doc.error : null,
  };
}

export async function fetchControlCommands(limit = 20): Promise<ControlCommand[]> {
  const db = await connectDb();
  const docs = await db
    .collection(COLLECTIONS.clusterControlCommands)
    .find({})
    .sort({ requestedAt: -1 })
    .limit(limit)
    .toArray();

  return docs.map((doc) => normalizeCommand(doc as Record<string, unknown>));
}

export async function enqueueControlCommand(action: string, clusterId: number | null): Promise<ControlCommand> {
  const db = await connectDb();
  const now = new Date();

  const doc: Record<string, unknown> = {
    action,
    clusterId: clusterId ?? null,
    status: 'queued',
    requestedAt: now,
    updatedAt: now,
  };

  const result = await db.collection(COLLECTIONS.clusterControlCommands).insertOne(doc);
  return {
    id: String(result.insertedId),
    action,
    clusterId: clusterId ?? null,
    status: 'queued',
    requestedAt: now,
    startedAt: null,
    finishedAt: null,
    error: null,
  };
}