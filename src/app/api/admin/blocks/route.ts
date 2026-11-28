import { NextRequest, NextResponse } from 'next/server';
import { hasAdminPanelAccess } from '../../../../lib/admin';
import { addBotAccessBlock, listBotAccessBlocks, removeBotAccessBlock, type BotAccessBlockType } from '../../../../lib/mongo';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (!hasAdminPanelAccess(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    return NextResponse.json({ ok: true, data: await listBotAccessBlocks() });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Failed to load blocks.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!hasAdminPanelAccess(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json().catch(() => null) as { type?: unknown; targetId?: unknown } | null;
  const type = body?.type;
  const targetId = typeof body?.targetId === 'string' ? body.targetId.trim() : '';
  if ((type !== 'guild' && type !== 'user') || !/^\d{15,25}$/.test(targetId)) {
    return NextResponse.json({ error: 'Select Server or User and provide a valid Discord ID.' }, { status: 400 });
  }
  try {
    await addBotAccessBlock(type as BotAccessBlockType, targetId);
    return NextResponse.json({ ok: true, data: await listBotAccessBlocks() });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Failed to add block.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!hasAdminPanelAccess(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const id = new URL(request.url).searchParams.get('id') ?? '';
  try {
    const removed = await removeBotAccessBlock(id);
    if (!removed) return NextResponse.json({ error: 'Block was not found.' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Failed to remove block.' }, { status: 500 });
  }
}
