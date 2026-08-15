import { readFile } from 'fs/promises';
import { join } from 'path';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const ICON_PATH = join(process.cwd(), 'src', 'assets', 'onboardx.ico');

export async function GET() {
  try {
    const file = await readFile(ICON_PATH);
    return new NextResponse(new Uint8Array(file), {
      headers: {
        'Content-Type': 'image/x-icon',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return new NextResponse('Not Found', { status: 404 });
  }
}