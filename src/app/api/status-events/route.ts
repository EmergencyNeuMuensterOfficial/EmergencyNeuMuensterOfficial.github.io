import { NextResponse } from 'next/server';
import { connectDb, COLLECTIONS } from '../../../lib/mongo';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = await connectDb();
    const [incidents, maintenance] = await Promise.all([
      db.collection(COLLECTIONS.incidents)
        .find({})
        .sort({ createdAt: -1 })
        .limit(50)
        .toArray(),
      db.collection(COLLECTIONS.maintenanceWindows)
        .find({})
        .sort({ createdAt: -1 })
        .limit(50)
        .toArray(),
    ]);

    return NextResponse.json({
      ok: true,
      data: {
        incidents: incidents.map((doc) => ({
          id: String(doc._id),
          title: doc.title ?? '',
          service: doc.service ?? '',
          status: doc.status ?? 'Investigating',
          summary: doc.summary ?? '',
          impact: doc.impact ?? '',
          cause: doc.cause ?? '',
          date: doc.date ?? '',
          duration: doc.duration ?? '',
          timeline: Array.isArray(doc.timeline) ? doc.timeline : [],
          createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : null,
          updated: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : null,
        })),
        maintenance: maintenance.map((doc) => ({
          id: String(doc._id),
          title: doc.title ?? '',
          when: doc.when ?? '',
          status: doc.status ?? 'Scheduled',
          services: doc.services ?? '',
          summary: doc.summary ?? '',
          impact: doc.impact ?? '',
          work: doc.work ?? '',
          notes: doc.notes ?? '',
          createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : null,
        })),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Failed to load events' },
      { status: 500 },
    );
  }
}
