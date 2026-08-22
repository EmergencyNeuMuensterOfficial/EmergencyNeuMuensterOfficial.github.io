import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { connectDb, COLLECTIONS } from '../../../../lib/mongo';
import { hasAdminPanelAccess } from '../../../../lib/admin';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  if (!hasAdminPanelAccess(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body.' }, { status: 400 });
  }

  const { kind } = body as { kind?: string };
  if (kind !== 'incident' && kind !== 'maintenance') {
    return NextResponse.json({ error: 'kind must be "incident" or "maintenance".' }, { status: 400 });
  }

  try {
    const db = await connectDb();
    const now = new Date();

    if (kind === 'incident') {
      const { title, service, status, summary, impact, cause, date, duration, timeline } = body;
      if (!title || typeof title !== 'string') {
        return NextResponse.json({ error: 'title is required.' }, { status: 400 });
      }
      const doc = {
        title: String(title).trim(),
        service: String(service ?? 'Bot'),
        status: String(status ?? 'Investigating'),
        summary: String(summary ?? ''),
        impact: String(impact ?? ''),
        cause: String(cause ?? ''),
        date: String(date ?? ''),
        duration: String(duration ?? ''),
        timeline: Array.isArray(timeline) ? timeline : [],
        createdAt: now,
        updatedAt: now,
      };
      const result = await db.collection(COLLECTIONS.incidents).insertOne(doc);
      return NextResponse.json({ ok: true, id: String(result.insertedId) });
    }

    // maintenance
    const { title, when, status, services, summary, impact, work, notes } = body;
    if (!title || typeof title !== 'string') {
      return NextResponse.json({ error: 'title is required.' }, { status: 400 });
    }
    const doc = {
      title: String(title).trim(),
      when: String(when ?? ''),
      status: String(status ?? 'Scheduled'),
      services: String(services ?? ''),
      summary: String(summary ?? ''),
      impact: String(impact ?? ''),
      work: String(work ?? ''),
      notes: String(notes ?? ''),
      createdAt: now,
      updatedAt: now,
    };
    const result = await db.collection(COLLECTIONS.maintenanceWindows).insertOne(doc);
    return NextResponse.json({ ok: true, id: String(result.insertedId) });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Failed to create event' },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  if (!hasAdminPanelAccess(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body.' }, { status: 400 });
  }

  const { id, kind, ...updates } = body as { id?: string; kind?: string; [key: string]: unknown };
  if (!id || typeof id !== 'string') {
    return NextResponse.json({ error: 'id is required.' }, { status: 400 });
  }

  let oid: ObjectId;
  try {
    oid = new ObjectId(id);
  } catch {
    return NextResponse.json({ error: 'Invalid id.' }, { status: 400 });
  }

  try {
    const db = await connectDb();
    const collection = kind === 'maintenance'
      ? db.collection(COLLECTIONS.maintenanceWindows)
      : db.collection(COLLECTIONS.incidents);

    const setFields: Record<string, unknown> = { updatedAt: new Date() };
    const allowed = ['title', 'service', 'status', 'summary', 'impact', 'cause', 'date', 'duration', 'timeline', 'when', 'services', 'work', 'notes'];
    for (const key of allowed) {
      if (key in updates) setFields[key] = updates[key];
    }

    const result = await collection.updateOne({ _id: oid }, { $set: setFields });
    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Not found.' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Failed to update event' },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  if (!hasAdminPanelAccess(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  const kind = url.searchParams.get('kind');

  if (!id || !kind) {
    return NextResponse.json({ error: 'id and kind are required.' }, { status: 400 });
  }

  let oid: ObjectId;
  try {
    oid = new ObjectId(id);
  } catch {
    return NextResponse.json({ error: 'Invalid id.' }, { status: 400 });
  }

  try {
    const db = await connectDb();
    const collection = kind === 'maintenance'
      ? db.collection(COLLECTIONS.maintenanceWindows)
      : db.collection(COLLECTIONS.incidents);

    await collection.deleteOne({ _id: oid });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Failed to delete event' },
      { status: 500 },
    );
  }
}
