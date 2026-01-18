import webpush from 'web-push';
import { getEnv } from '@/lib/env-validator';
import { logger } from '@/lib/logger';

export type WebPushConfig = {
  subject: string;
  publicKey: string;
  privateKey: string;
  defaultTtlSeconds: number;
};

export type StoredWebPushSubscription = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

export type WebPushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  data?: Record<string, unknown>;
};

export type SendWebPushResult = {
  deliveredSubscriptionIds: string[];
  invalidSubscriptionIds: string[];
  failed: Array<{ id: string; statusCode?: number; error: string }>;
};

type WebPushErrorLike = {
  statusCode?: number;
  body?: unknown;
  endpoint?: string;
  message?: string;
};

function isWebPushErrorLike(value: unknown): value is WebPushErrorLike {
  return !!value && typeof value === 'object';
}

let cachedVapidKey: string | null = null;

export function getWebPushConfig(): WebPushConfig | null {
  const env = getEnv();

  if (!env.WEB_PUSH_VAPID_PUBLIC_KEY || !env.WEB_PUSH_VAPID_PRIVATE_KEY || !env.WEB_PUSH_VAPID_SUBJECT) {
    return null;
  }

  return {
    subject: env.WEB_PUSH_VAPID_SUBJECT,
    publicKey: env.WEB_PUSH_VAPID_PUBLIC_KEY,
    privateKey: env.WEB_PUSH_VAPID_PRIVATE_KEY,
    defaultTtlSeconds: env.WEB_PUSH_DEFAULT_TTL_SECONDS ?? 3600,
  };
}

function ensureVapidConfigured(config: WebPushConfig) {
  const key = JSON.stringify({
    subject: config.subject,
    publicKey: config.publicKey,
    privateKey: config.privateKey,
  });
  if (cachedVapidKey === key) return;

  webpush.setVapidDetails(config.subject, config.publicKey, config.privateKey);
  cachedVapidKey = key;
}

export async function sendWebPushToSubscriptions(input: {
  subscriptions: StoredWebPushSubscription[];
  payload: WebPushPayload;
  ttlSeconds?: number;
}): Promise<SendWebPushResult> {
  const config = getWebPushConfig();
  if (!config) {
    throw new Error('SERVICE_NOT_CONFIGURED');
  }

  ensureVapidConfigured(config);

  const ttlSeconds = input.ttlSeconds ?? config.defaultTtlSeconds;
  const payloadJson = JSON.stringify(input.payload);

  const deliveredSubscriptionIds: string[] = [];
  const invalidSubscriptionIds: string[] = [];
  const failed: Array<{ id: string; statusCode?: number; error: string }> = [];

  for (const subscription of input.subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh,
            auth: subscription.auth,
          },
        },
        payloadJson,
        {
          TTL: ttlSeconds,
        }
      );
      deliveredSubscriptionIds.push(subscription.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      if (isWebPushErrorLike(error)) {
        const statusCode = typeof error.statusCode === 'number' ? error.statusCode : undefined;
        if (statusCode === 404 || statusCode === 410) {
          invalidSubscriptionIds.push(subscription.id);
          continue;
        }

        failed.push({ id: subscription.id, statusCode, error: message });
        continue;
      }

      failed.push({ id: subscription.id, error: message });
    }
  }

  if (failed.length > 0) {
    logger.warn(
      {
        deliveredCount: deliveredSubscriptionIds.length,
        invalidCount: invalidSubscriptionIds.length,
        failed,
      },
      'WebPush 投递存在失败'
    );
  }

  return { deliveredSubscriptionIds, invalidSubscriptionIds, failed };
}
