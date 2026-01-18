import { NextRequest } from 'next/server';
import { createSuccessResponse, ErrorResponses } from '@/lib/api-response';
import { getWebPushConfig } from '@/lib/web-push';

/**
 * WebPush VAPID 公钥
 * GET /api/push/vapid-public-key
 *
 * 说明：公钥可公开，用于浏览器侧调用 PushManager.subscribe。
 */
export async function GET(_request: NextRequest) {
  const config = getWebPushConfig();
  if (!config) {
    return ErrorResponses.SERVICE_NOT_CONFIGURED('WebPush VAPID');
  }

  return createSuccessResponse(
    {
      publicKey: config.publicKey,
    },
    'OK'
  );
}

