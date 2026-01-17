// dev/src/app/api/ping/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const start = Date.now();
  return NextResponse.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    latencyMs: Date.now() - start,
  });
}

export async function HEAD(request: NextRequest) {
  return new NextResponse(null, { 
    status: 200,
    headers: {
      'Content-Type': 'application/json'
    }
  });
}
