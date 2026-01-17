// dev/src/app/api/mock-download/route.ts
// 兼容占位路由：禁止返回“模拟成功”。请使用 `/api/documents?downloadId=<documentId>` 获取预签名下载 URL。
import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '@/lib/auth';
import { ErrorResponses } from '@/lib/api-response';
import { z } from 'zod';

export async function GET(request: NextRequest) {
  const guard = await requireAuthenticatedUser(request, { csrf: false });
  if (!guard.ok) return guard.response;

  const { searchParams } = new URL(request.url);
  const downloadId =
    searchParams.get('downloadId')
    || searchParams.get('download')
    || searchParams.get('documentId')
    || searchParams.get('id');

  const parsed = z.string().uuid().safeParse(downloadId);
  if (!parsed.success) {
    return ErrorResponses.BAD_REQUEST_MESSAGE('缺少或无效的 documentId');
  }

  const targetUrl = new URL('/api/documents', request.url);
  targetUrl.searchParams.set('downloadId', parsed.data);
  targetUrl.searchParams.delete('download');
  targetUrl.searchParams.delete('documentId');
  targetUrl.searchParams.delete('id');

  return NextResponse.redirect(targetUrl, { status: 307 });
}
