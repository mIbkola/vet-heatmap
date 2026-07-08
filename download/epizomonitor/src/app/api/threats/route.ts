import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

let cachedData: string | null = null;
let cacheTime = 0;
const CACHE_TTL = 60 * 1000; // 1 minute

export async function GET() {
  try {
    const now = Date.now();

    // Return cached if fresh
    if (cachedData && (now - cacheTime) < CACHE_TTL) {
      return new NextResponse(cachedData, {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, s-maxage=60',
        },
      });
    }

    // Read from public/data/threats.json
    const filePath = join(process.cwd(), 'public', 'data', 'threats.json');
    const raw = await readFile(filePath, 'utf-8');

    cachedData = raw;
    cacheTime = now;

    return new NextResponse(raw, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=60',
      },
    });
  } catch (error) {
    console.error('Failed to load threats:', error);
    return NextResponse.json({ error: 'Failed to load threats data' }, { status: 500 });
  }
}
