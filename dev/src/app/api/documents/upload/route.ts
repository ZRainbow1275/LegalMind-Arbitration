// dev/src/app/api/documents/upload/route.ts
// 兼容 docs/API_REFERENCE.md：POST /api/documents/upload
import type { NextRequest } from 'next/server';
import { POST as uploadViaDocuments } from '../route';

export async function POST(request: NextRequest) {
  return uploadViaDocuments(request);
}

