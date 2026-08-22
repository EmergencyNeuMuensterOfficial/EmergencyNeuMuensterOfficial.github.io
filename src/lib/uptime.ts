import type { Document } from 'mongodb';
import { connectDb, COLLECTIONS } from './mongo';

const MAX_TRACKED_DAYS = 95; // keep a little history beyond the 30/90-day views
const DAY_MS = 86_400_000;

interface UptimeBucketDoc {
  _id: string;
  totalChecks?: number;
  onlineChecks?: number;
  guilds?: number;
  users?: number;
  lastCheckedAt?: Date;
  lastOnlineAt?: Date;
  createdAt?: Date;
}

function utcDateKey(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export interface UptimeDay {
  date: string;
  totalChecks: number;
  onlineChecks: number;
  uptimePct: number | null;
  lastOnlineAt: string | null;
}

export interface UptimeSummary {
  days: UptimeDay[];
  overallPct: number | null;
  lastOnlineAt: string | null;
}

/**
 * Record one liveness observation for today's bucket.
 * Samples come from status page loads and authenticated bot heartbeats.
 */
export async function recordUptimeSample(
  online: boolean,
  stats?: { guilds?: number; users?: number }
): Promise<void> {
  const db = await connectDb();
  const now = new Date();
  const collection = db.collection<UptimeBucketDoc>(COLLECTIONS.uptimeDaily);

  const setFields: Document = { lastCheckedAt: now };
  if (online) setFields.lastOnlineAt = now;
  if (typeof stats?.guilds === 'number' && stats.guilds >= 0) setFields.guilds = stats.guilds;
  if (typeof stats?.users === 'number' && stats.users >= 0) setFields.users = stats.users;

  await collection.updateOne(
    { _id: utcDateKey(now) },
    {
      $set: setFields,
      $inc: online ? { totalChecks: 1, onlineChecks: 1 } : { totalChecks: 1 },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true }
  );

  // Occasionally prune buckets older than the retention window.
  if (Math.random() < 0.05) {
    const cutoff = utcDateKey(new Date(now.getTime() - MAX_TRACKED_DAYS * DAY_MS));
    await collection.deleteMany({ _id: { $lt: cutoff } });
  }
}

/**
 * Aggregate per-day uptime for the last `days` days (default 30, max 90).
 */
export async function getUptimeSummary(days = 30): Promise<UptimeSummary> {
  const clamped = Math.min(Math.max(Math.floor(days) || 30, 1), 90);
  const db = await connectDb();
  const cutoff = utcDateKey(new Date(Date.now() - (clamped - 1) * DAY_MS));

  const docs = await db
    .collection<UptimeBucketDoc>(COLLECTIONS.uptimeDaily)
    .find({ _id: { $gte: cutoff } })
    .toArray();

  const byDate = new Map<string, { totalChecks: number; onlineChecks: number; lastOnlineAt: Date | null }>();
  for (const doc of docs) {
    byDate.set(doc._id, {
      totalChecks: Number(doc.totalChecks ?? 0),
      onlineChecks: Number(doc.onlineChecks ?? 0),
      lastOnlineAt: doc.lastOnlineAt instanceof Date ? doc.lastOnlineAt : null,
    });
  }

  let rangeTotal = 0;
  let rangeOnline = 0;
  let lastOnlineAt: Date | null = null;

  const out: UptimeDay[] = [];
  for (let i = 0; i < clamped; i++) {
    const date = utcDateKey(new Date(Date.now() - i * DAY_MS));
    const entry = byDate.get(date);
    const total = entry?.totalChecks ?? 0;
    const onlineCount = Math.min(entry?.onlineChecks ?? 0, total || (entry?.onlineChecks ?? 0));
    const pct = total > 0 ? Math.round((onlineCount / total) * 1000) / 10 : null;

    rangeTotal += total;
    rangeOnline += onlineCount;
    if (entry?.lastOnlineAt && (!lastOnlineAt || entry.lastOnlineAt > lastOnlineAt)) {
      lastOnlineAt = entry.lastOnlineAt;
    }

    out.push({
      date,
      totalChecks: total,
      onlineChecks: onlineCount,
      uptimePct: pct,
      lastOnlineAt: entry?.lastOnlineAt ? entry.lastOnlineAt.toISOString() : null,
    });
  }

  return {
    days: out,
    overallPct: rangeTotal > 0 ? Math.round((rangeOnline / rangeTotal) * 1000) / 10 : null,
    lastOnlineAt: lastOnlineAt ? lastOnlineAt.toISOString() : null,
  };
}
