// dev/src/lib/queue.ts
// BullMQ 队列基座：低延迟、可观测、可幂等（jobId）——用于通知投递、文件处理、存证等异步任务

import {
  Queue,
  QueueEvents,
  Worker,
  type JobsOptions,
} from 'bullmq';
import { z } from 'zod';
import crypto from 'crypto';
import archiver from 'archiver';
import { PassThrough, Transform } from 'stream';
import { PutObjectCommand } from '@aws-sdk/client-s3';

import { prisma } from '@/lib/prisma';
import { getEnv } from '@/lib/env-validator';
import { getTraceId } from '@/lib/case-events';
import { AuditEventType, AuditLevel, AuditLogger } from '@/lib/security/audit-logger';
import {
  ArchiveStatus,
  NotificationStatus,
  ServiceAttemptStatus,
  ServiceStatus,
  type Prisma,
} from '@/generated/prisma';
import { appendCaseEvent } from '@/lib/case-events';
import { logger } from '@/lib/logger';
import { sendEmail } from '@/lib/email';
import { sendSms } from '@/lib/sms';
import { getAIServiceManager } from '@/lib/ai-services';
import { buildServiceProof } from '@/lib/service-of-process';
import { HashUtil } from '@/lib/security/encryption';
import { sha256OfStableJson, stableJsonStringify } from '@/lib/manifest';       
import {
  notaryTaskPayloadSchema,
  type NotaryTaskPayload,
  processNotaryTask as processNotaryTaskCore,
} from '@/workers/notarization-worker';
import {
  createLazyObjectReadable,
  getObjectBuffer,
  getObjectStorageConfig,
  getS3Client,
  resolveStorageLocation,
} from '@/lib/object-storage';

export const QUEUE_NAMES = {
  NOTIFICATION_DELIVERY: 'notification_delivery',
  DOCUMENT_PROCESSING: 'document_processing',
  NOTARY_TASKS: 'notary_tasks',
  SERVICE_DELIVERY: 'service_delivery',
  ARCHIVE_GENERATION: 'archive_generation',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

type JobCounts = Record<string, number>;

const notificationDeliveryPayloadSchema = z.object({
  notificationId: z.string().uuid(),
  traceId: z.string().min(1),
});

export type NotificationDeliveryPayload = z.infer<typeof notificationDeliveryPayloadSchema>;

const documentProcessingPayloadSchema = z.object({
  documentId: z.string().uuid(),
  traceId: z.string().min(1),
});

export type DocumentProcessingPayload = z.infer<typeof documentProcessingPayloadSchema>;

const serviceDeliveryPayloadSchema = z.object({
  serviceId: z.string().uuid(),
  traceId: z.string().min(1),
});

export type ServiceDeliveryPayload = z.infer<typeof serviceDeliveryPayloadSchema>;

const archiveGenerationPayloadSchema = z.object({
  archivePackageId: z.string().uuid(),
  traceId: z.string().min(1),
});

export type ArchiveGenerationPayload = z.infer<typeof archiveGenerationPayloadSchema>;

type QueueRegistry = {
  queues: Map<QueueName, Queue>;
  events: Map<QueueName, QueueEvents>;
  workers: Map<QueueName, Worker>;
};

declare global {
  // eslint-disable-next-line no-var
  var __lmQueueRegistry: QueueRegistry | undefined;
}

function getQueuePrefix(): string {
  const env = getEnv();
  const base = env.REDIS_PREFIX || 'legalmind:';
  const normalized = base.endsWith(':') ? base.slice(0, -1) : base;
  return `${normalized}:bull`;
}

function getBullConnection() {
  const env = getEnv();
  const url = new URL(env.REDIS_URL);

  const isTls = url.protocol === 'rediss:';
  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    password: env.REDIS_PASSWORD || url.password || undefined,
    db: typeof env.REDIS_DB === 'number' ? env.REDIS_DB : 0,
    ...(isTls ? { tls: {} } : {}),
  };
}

function getRegistry(): QueueRegistry {
  if (!global.__lmQueueRegistry) {
    global.__lmQueueRegistry = {
      queues: new Map(),
      events: new Map(),
      workers: new Map(),
    };
  }
  return global.__lmQueueRegistry;
}

function getOrCreateQueue(name: QueueName): Queue {
  const registry = getRegistry();
  const existing = registry.queues.get(name);
  if (existing) return existing;

  const queue = new Queue(name, {
    connection: getBullConnection(),
    prefix: getQueuePrefix(),
    defaultJobOptions: {
      removeOnComplete: { age: 24 * 3600, count: 5000 },
      removeOnFail: { age: 7 * 24 * 3600, count: 20000 },
    },
  });

  registry.queues.set(name, queue);
  return queue;
}

function ensureEvents(name: QueueName): void {
  const registry = getRegistry();
  if (registry.events.has(name)) return;

  const events = new QueueEvents(name, {
    connection: getBullConnection(),
    prefix: getQueuePrefix(),
  });
  registry.events.set(name, events);
}

type MutableJsonObject = Record<string, Prisma.InputJsonValue>;

function asJsonObject(value: unknown): MutableJsonObject {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as MutableJsonObject;
}

async function processNotificationDelivery(payload: NotificationDeliveryPayload) {
  const notification = await prisma.notification.findUnique({
    where: { id: payload.notificationId },
    include: { user: { select: { email: true, phone: true, phoneVerified: true } } },
  });

  if (!notification) return { ok: true, skipped: true, reason: 'NOT_FOUND' };

  const now = new Date();
  const nowIso = now.toISOString();

  if (notification.scheduledAt && notification.scheduledAt > now) {
    return { ok: true, skipped: true, reason: 'NOT_DUE' };
  }

  if (notification.expiresAt && notification.expiresAt <= now) {
    await prisma.notification.update({
      where: { id: notification.id },
      data: { status: NotificationStatus.ARCHIVED, archivedAt: now },
    });
    return { ok: true, skipped: true, reason: 'EXPIRED' };
  }

  const channelsParsed = z.array(z.string()).safeParse(notification.channels);
  const channels = channelsParsed.success ? channelsParsed.data : [];
  const deliveryStatus = asJsonObject(notification.deliveryStatus);
  const meta = asJsonObject(deliveryStatus.meta);

  const nextDeliveryStatus: MutableJsonObject = {
    ...deliveryStatus,
    in_app: channels.includes('in_app') ? 'DELIVERED' : 'NOT_REQUIRED',
  };

  if (channels.includes('in_app')) {
    meta.in_app = { ...asJsonObject(meta.in_app), deliveredAt: nowIso };
  }

  let retryError: Error | null = null;

  for (const channel of ['email', 'sms', 'push'] as const) {
    if (!channels.includes(channel)) {
      nextDeliveryStatus[channel] = 'NOT_REQUIRED';
      continue;
    }

    const existingStatus = typeof deliveryStatus[channel] === 'string'
      ? String(deliveryStatus[channel])
      : null;
    if (existingStatus === 'DELIVERED') {
      nextDeliveryStatus[channel] = 'DELIVERED';
      continue;
    }

    if (channel === 'push') {
      nextDeliveryStatus.push = 'NOT_IMPLEMENTED';
      meta.push = { ...asJsonObject(meta.push), updatedAt: nowIso };
      continue;
    }

    if (channel === 'sms') {
      const to = notification.user?.phone;
      if (!to || !notification.user?.phoneVerified) {
        nextDeliveryStatus.sms = 'FAILED';
        meta.sms = {
          ...asJsonObject(meta.sms),
          updatedAt: nowIso,
          error: !to ? 'MISSING_RECIPIENT_PHONE' : 'PHONE_NOT_VERIFIED',
        };
        continue;
      }

      try {
        const env = getEnv();
        const templateCode = env.SMS_TEMPLATE_CODE_NOTIFICATION ?? env.SMS_TEMPLATE_CODE;
        const title = notification.title.slice(0, 20);
        const content = notification.content.slice(0, 180);
        const result = await sendSms({
          to,
          templateParams: { title, content },
          templateCode,
          outId: notification.id,
        });

        nextDeliveryStatus.sms = 'DELIVERED';
        meta.sms = {
          ...asJsonObject(meta.sms),
          deliveredAt: nowIso,
          provider: result.provider,
          requestId: result.requestId,
          bizId: result.bizId,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);

        meta.sms = {
          ...asJsonObject(meta.sms),
          updatedAt: nowIso,
          error: message,
        };

        if (message === 'SERVICE_NOT_CONFIGURED') {
          nextDeliveryStatus.sms = 'SERVICE_NOT_CONFIGURED';
          continue;
        }

        if (message === 'NOT_IMPLEMENTED') {
          nextDeliveryStatus.sms = 'NOT_IMPLEMENTED';
          continue;
        }

        nextDeliveryStatus.sms = 'RETRYING';
        retryError = error instanceof Error ? error : new Error(message);
      }

      continue;
    }

    const to = notification.user?.email;
    if (!to) {
      nextDeliveryStatus.email = 'FAILED';
      meta.email = { ...asJsonObject(meta.email), updatedAt: nowIso, error: 'MISSING_RECIPIENT_EMAIL' };
      continue;
    }

    try {
      const result = await sendEmail({
        to,
        subject: notification.title,
        text: notification.content,
        headers: {
          'X-LegalMind-TraceId': payload.traceId,
          'X-LegalMind-NotificationId': notification.id,
        },
      });

      nextDeliveryStatus.email = 'DELIVERED';
      meta.email = {
        ...asJsonObject(meta.email),
        deliveredAt: nowIso,
        messageId: result.messageId,
        accepted: result.accepted,
        rejected: result.rejected,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      meta.email = {
        ...asJsonObject(meta.email),
        updatedAt: nowIso,
        error: message,
      };

      if (message === 'SERVICE_NOT_CONFIGURED') {
        nextDeliveryStatus.email = 'SERVICE_NOT_CONFIGURED';
        continue;
      }

      nextDeliveryStatus.email = 'RETRYING';
      retryError = error instanceof Error ? error : new Error(message);
    }
  }

  nextDeliveryStatus.meta = meta;

  await prisma.notification.update({
    where: { id: notification.id },
    data: {
      status: notification.status === NotificationStatus.PENDING
        ? NotificationStatus.DELIVERED
        : notification.status,
      deliveryStatus: nextDeliveryStatus,
    },
  });

  if (retryError) {
    throw retryError;
  }

  await AuditLogger.log({
    level: AuditLevel.INFO,
    eventType: AuditEventType.QUEUE_JOB_COMPLETED,
    resource: 'queue',
    action: QUEUE_NAMES.NOTIFICATION_DELIVERY,
    details: {
      traceId: payload.traceId,
      notificationId: payload.notificationId,
      channels,
      deliveryStatus: nextDeliveryStatus,
    },
    result: 'SUCCESS',
  });

  return { ok: true };
}

async function processDocumentProcessing(payload: DocumentProcessingPayload) {
  const doc = await prisma.caseDocument.findUnique({
    where: { id: payload.documentId },
    select: {
      id: true,
      caseId: true,
      filePath: true,
      fileType: true,
      mimeType: true,
      metadata: true,
    },
  });
  if (!doc) return { ok: true, skipped: true, reason: 'NOT_FOUND' };

  const nowIso = new Date().toISOString();
  const metadata = asJsonObject(doc.metadata);
  const processing = asJsonObject(metadata.processing);

  const fileType = doc.fileType.toLowerCase();
  const mimeType = (doc.mimeType ?? '').toLowerCase();
  const needsOcr = fileType.startsWith('image/')
    || fileType === 'application/pdf'
    || mimeType.startsWith('image/')
    || mimeType === 'application/pdf';

  if (!needsOcr) {
    const nextMetadata = {
      ...metadata,
      processing: {
        ...processing,
        ocr: { status: 'SKIPPED', reason: 'UNSUPPORTED_TYPE', updatedAt: nowIso },
      },
    };

    await prisma.caseDocument.update({
      where: { id: doc.id },
      data: { metadata: nextMetadata },
    });

    await appendCaseEvent({
      caseId: doc.caseId,
      eventType: 'DOCUMENT_OCR_SKIPPED',
      actorUserId: null,
      traceId: payload.traceId,
      payload: {
        documentId: doc.id,
        reason: 'UNSUPPORTED_TYPE',
        fileType: doc.fileType,
        mimeType: doc.mimeType,
      },
    });

    await AuditLogger.log({
      level: AuditLevel.INFO,
      eventType: AuditEventType.QUEUE_JOB_COMPLETED,
      resource: 'queue',
      action: QUEUE_NAMES.DOCUMENT_PROCESSING,
      details: {
        traceId: payload.traceId,
        documentId: payload.documentId,
        needsOcr,
        ocrStatus: 'SKIPPED',
      },
      result: 'SUCCESS',
    });

    return { ok: true, skipped: true, reason: 'UNSUPPORTED_TYPE' };
  }

  const storageConfig = getObjectStorageConfig();
  if (!storageConfig) {
    const nextMetadata = {
      ...metadata,
      processing: {
        ...processing,
        ocr: {
          status: 'SERVICE_NOT_CONFIGURED',
          updatedAt: nowIso,
          error: 'OBJECT_STORAGE_NOT_CONFIGURED',
        },
      },
    };

    await prisma.caseDocument.update({
      where: { id: doc.id },
      data: { metadata: nextMetadata },
    });

    await appendCaseEvent({
      caseId: doc.caseId,
      eventType: 'DOCUMENT_OCR_FAILED',
      actorUserId: null,
      traceId: payload.traceId,
      payload: {
        documentId: doc.id,
        stage: 'storage',
        error: 'SERVICE_NOT_CONFIGURED',
      },
    });

    await AuditLogger.log({
      level: AuditLevel.WARNING,
      eventType: AuditEventType.EXTERNAL_SYSTEM_INVOCATION,
      resource: 'documents',
      action: 'ocr_worker',
      details: {
        traceId: payload.traceId,
        documentId: payload.documentId,
        provider: 'tencent',
        error: 'OBJECT_STORAGE_NOT_CONFIGURED',
      },
      result: 'FAILURE',
      errorMessage: 'OBJECT_STORAGE_NOT_CONFIGURED',
    });

    return { ok: true, skipped: false, reason: 'SERVICE_NOT_CONFIGURED' };
  }

  const { bucket, key } = resolveStorageLocation(doc, storageConfig.bucket);
  let buffer: Buffer;
  try {
    buffer = await getObjectBuffer({ client: getS3Client(storageConfig), bucket, key });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const nextMetadata = {
      ...metadata,
      processing: {
        ...processing,
        ocr: { status: 'FAILED', updatedAt: nowIso, error: message },
      },
    };

    await prisma.caseDocument.update({
      where: { id: doc.id },
      data: { metadata: nextMetadata },
    });

    await appendCaseEvent({
      caseId: doc.caseId,
      eventType: 'DOCUMENT_OCR_FAILED',
      actorUserId: null,
      traceId: payload.traceId,
      payload: { documentId: doc.id, stage: 'storage', error: message },
    });

    throw new Error(`OBJECT_STORAGE_READ_FAILED: ${message}`.slice(0, 800));
  }

  if (buffer.length === 0) {
    const nextMetadata = {
      ...metadata,
      processing: {
        ...processing,
        ocr: { status: 'FAILED', updatedAt: nowIso, error: 'EMPTY_OBJECT' },
      },
    };

    await prisma.caseDocument.update({
      where: { id: doc.id },
      data: { metadata: nextMetadata },
    });

    await appendCaseEvent({
      caseId: doc.caseId,
      eventType: 'DOCUMENT_OCR_FAILED',
      actorUserId: null,
      traceId: payload.traceId,
      payload: { documentId: doc.id, stage: 'storage', error: 'EMPTY_OBJECT' },
    });

    throw new Error('OBJECT_STORAGE_EMPTY_OBJECT');
  }

  const ai = getAIServiceManager();
  const result = await ai.performOCR(buffer, { language: 'zh' });

  if (!result.success) {
    const errorCode = result.error || 'OCR_FAILED';
    const status =
      errorCode === 'SERVICE_NOT_CONFIGURED' ? 'SERVICE_NOT_CONFIGURED' : 'FAILED';

    const nextMetadata = {
      ...metadata,
      processing: {
        ...processing,
        ocr: { status, updatedAt: nowIso, error: errorCode, provider: 'tencent' },
      },
    };

    await prisma.caseDocument.update({
      where: { id: doc.id },
      data: { metadata: nextMetadata },
    });

    await appendCaseEvent({
      caseId: doc.caseId,
      eventType: 'DOCUMENT_OCR_FAILED',
      actorUserId: null,
      traceId: payload.traceId,
      payload: { documentId: doc.id, provider: 'tencent', error: errorCode },
    });

    await AuditLogger.log({
      level: AuditLevel.WARNING,
      eventType: AuditEventType.EXTERNAL_SYSTEM_INVOCATION,
      resource: 'documents',
      action: 'ocr_worker',
      details: {
        traceId: payload.traceId,
        documentId: payload.documentId,
        provider: 'tencent',
        error: errorCode,
      },
      result: 'FAILURE',
      errorMessage: errorCode,
    });

    if (errorCode === 'SERVICE_NOT_CONFIGURED') {
      return { ok: true, skipped: false, reason: 'SERVICE_NOT_CONFIGURED' };
    }

    throw new Error(errorCode);
  }

  const ocr = result.data;
  if (!ocr) {
    const nextMetadata = {
      ...metadata,
      processing: {
        ...processing,
        ocr: { status: 'FAILED', updatedAt: nowIso, error: 'OCR_EMPTY_RESULT', provider: 'tencent' },
      },
    };

    await prisma.caseDocument.update({
      where: { id: doc.id },
      data: { metadata: nextMetadata },
    });

    await appendCaseEvent({
      caseId: doc.caseId,
      eventType: 'DOCUMENT_OCR_FAILED',
      actorUserId: null,
      traceId: payload.traceId,
      payload: { documentId: doc.id, provider: 'tencent', error: 'OCR_EMPTY_RESULT' },
    });

    throw new Error('OCR_EMPTY_RESULT');
  }
  const fullText = ocr.text || '';
  const maxStoredChars = 200_000;
  const truncated = fullText.length > maxStoredChars;
  const storedText = truncated ? fullText.slice(0, maxStoredChars) : fullText;

  const nextMetadata = {
    ...metadata,
    ocr: {
      text: storedText,
      truncated,
      fullTextLength: fullText.length,
      confidence: ocr.confidence,
      language: ocr.language,
      processedAt: nowIso,
      provider: 'tencent',
    },
    processing: {
      ...processing,
      ocr: {
        status: 'COMPLETED',
        updatedAt: nowIso,
        provider: 'tencent',
        confidence: ocr.confidence,
        truncated,
        fullTextLength: fullText.length,
      },
    },
  };

  await prisma.caseDocument.update({
    where: { id: doc.id },
    data: { metadata: nextMetadata },
  });

  await appendCaseEvent({
    caseId: doc.caseId,
    eventType: 'DOCUMENT_OCR_COMPLETED',
    actorUserId: null,
    traceId: payload.traceId,
    payload: {
      documentId: doc.id,
      provider: 'tencent',
      confidence: ocr.confidence,
      textLength: fullText.length,
      truncated,
    },
  });

  await AuditLogger.log({
    level: AuditLevel.INFO,
    eventType: AuditEventType.EXTERNAL_SYSTEM_INVOCATION,
    resource: 'documents',
    action: 'ocr_worker',
    details: {
      traceId: payload.traceId,
      documentId: payload.documentId,
      provider: 'tencent',
      confidence: ocr.confidence,
      truncated,
      fullTextLength: fullText.length,
    },
    result: 'SUCCESS',
  });

  await AuditLogger.log({
    level: AuditLevel.INFO,
    eventType: AuditEventType.QUEUE_JOB_COMPLETED,
    resource: 'queue',
    action: QUEUE_NAMES.DOCUMENT_PROCESSING,
    details: {
      traceId: payload.traceId,
      documentId: payload.documentId,
      needsOcr,
      ocrStatus: 'COMPLETED',
    },
    result: 'SUCCESS',
  });

  return { ok: true };
}

async function processNotaryTask(payload: NotaryTaskPayload) {
  const result = await processNotaryTaskCore(payload);

  await AuditLogger.log({
    level: AuditLevel.INFO,
    eventType: AuditEventType.QUEUE_JOB_COMPLETED,
    resource: 'queue',
    action: QUEUE_NAMES.NOTARY_TASKS,
    details: {
        traceId: payload.traceId,
        caseId: payload.caseId,
        documentId: payload.documentId,
        fileHash: payload.fileHash,
        result,
      },
    result: 'SUCCESS',
  });

  return result;
}

async function processServiceDelivery(payload: ServiceDeliveryPayload) {
  const service = await prisma.serviceOfProcess.findUnique({
    where: { id: payload.serviceId },
  });
  if (!service) return { ok: true, skipped: true, reason: 'NOT_FOUND' };

  if (service.status === ServiceStatus.DELIVERED || service.status === ServiceStatus.CANCELED) {
    return { ok: true, skipped: true, reason: 'ALREADY_FINAL' };
  }

  const attemptNumber =
    (await prisma.serviceAttempt.count({ where: { serviceId: service.id } })) + 1;
  const now = new Date();

  await prisma.serviceOfProcess.update({
    where: { id: service.id },
    data: { status: ServiceStatus.PROCESSING, traceId: payload.traceId },
  });

  const attempt = await prisma.serviceAttempt.create({
    data: {
      serviceId: service.id,
      attemptNumber,
      channel: service.channel,
      status: ServiceAttemptStatus.PENDING,
      startedAt: now,
    },
  });

  await appendCaseEvent({
    caseId: service.caseId,
    eventType: 'SERVICE_ATTEMPT_STARTED',
    actorUserId: service.requestedByUserId ?? null,
    traceId: payload.traceId,
    payload: {
      serviceId: service.id,
      attemptId: attempt.id,
      attemptNumber,
      channel: service.channel,
    },
  });

  let retryError: Error | null = null;
  let deliveredAt: Date | null = null;

  if (service.channel === 'PUSH') {
    await prisma.serviceAttempt.update({
      where: { id: attempt.id },
      data: {
        status: ServiceAttemptStatus.NOT_IMPLEMENTED,
        finishedAt: new Date(),
        errorCode: 'NOT_IMPLEMENTED',
        errorMessage: `Channel ${service.channel} not implemented`,
      },
    });

    await prisma.serviceOfProcess.update({
      where: { id: service.id },
      data: {
        status: ServiceStatus.FAILED,
        lastError: 'NOT_IMPLEMENTED',
      },
    });
  } else if (service.channel === 'SMS') {
    if (!service.recipientPhone) {
      await prisma.serviceAttempt.update({
        where: { id: attempt.id },
        data: {
          status: ServiceAttemptStatus.FAILED,
          finishedAt: new Date(),
          errorCode: 'MISSING_RECIPIENT_PHONE',
          errorMessage: 'Recipient phone missing',
        },
      });

      await prisma.serviceOfProcess.update({
        where: { id: service.id },
        data: {
          status: ServiceStatus.FAILED,
          lastError: 'MISSING_RECIPIENT_PHONE',
        },
      });
    } else {
      try {
        const env = getEnv();
        const templateCode = env.SMS_TEMPLATE_CODE_SERVICE ?? env.SMS_TEMPLATE_CODE;
        const subject = service.subject.slice(0, 20);
        const content = (service.message ?? '').slice(0, 180);
        const smsResult = await sendSms({
          to: service.recipientPhone,
          templateParams: { subject, content },
          templateCode,
          outId: attempt.id,
        });

        deliveredAt = new Date();

        await prisma.serviceAttempt.update({
          where: { id: attempt.id },
          data: {
            status: ServiceAttemptStatus.DELIVERED,
            finishedAt: deliveredAt,
            provider: smsResult.provider,
            providerMessageId: smsResult.bizId ?? smsResult.requestId,
            metadata: {
              requestId: smsResult.requestId,
              bizId: smsResult.bizId,
            },
          },
        });

        await prisma.serviceOfProcess.update({
          where: { id: service.id },
          data: {
            status: ServiceStatus.DELIVERED,
            deliveredAt,
            effectiveAt: deliveredAt,
            lastError: null,
          },
        });

        await AuditLogger.log({
          level: AuditLevel.INFO,
          eventType: AuditEventType.EXTERNAL_SYSTEM_INVOCATION,
          resource: 'service_of_process',
          action: 'deliver_sms',
          details: {
            traceId: payload.traceId,
            serviceId: service.id,
            attemptId: attempt.id,
            channel: service.channel,
            provider: smsResult.provider,
            requestId: smsResult.requestId,
            bizId: smsResult.bizId,
          },
          result: 'SUCCESS',
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const finishedAt = new Date();
        const isNotConfigured = message === 'SERVICE_NOT_CONFIGURED';
        const isNotImplemented = message === 'NOT_IMPLEMENTED';

        await prisma.serviceAttempt.update({
          where: { id: attempt.id },
          data: {
            status: isNotConfigured
              ? ServiceAttemptStatus.SERVICE_NOT_CONFIGURED
              : isNotImplemented
                ? ServiceAttemptStatus.NOT_IMPLEMENTED
                : ServiceAttemptStatus.RETRYING,
            finishedAt,
            provider: 'unknown',
            errorCode: isNotConfigured
              ? 'SERVICE_NOT_CONFIGURED'
              : isNotImplemented
                ? 'NOT_IMPLEMENTED'
                : 'DELIVERY_FAILED',
            errorMessage: message,
          },
        });

        await prisma.serviceOfProcess.update({
          where: { id: service.id },
          data: {
            status: isNotConfigured || isNotImplemented ? ServiceStatus.FAILED : ServiceStatus.PROCESSING,
            lastError: message,
          },
        });

        await AuditLogger.log({
          level: AuditLevel.WARNING,
          eventType: AuditEventType.EXTERNAL_SYSTEM_INVOCATION,
          resource: 'service_of_process',
          action: 'deliver_sms',
          details: {
            traceId: payload.traceId,
            serviceId: service.id,
            attemptId: attempt.id,
            channel: service.channel,
            provider: null,
            error: message,
          },
          result: 'FAILURE',
          errorMessage: message,
        });

        if (!isNotConfigured && !isNotImplemented) {
          retryError = error instanceof Error ? error : new Error(message);
        }
      }
    }
  } else if (!service.recipientEmail) {
    await prisma.serviceAttempt.update({
      where: { id: attempt.id },
      data: {
        status: ServiceAttemptStatus.FAILED,
        finishedAt: new Date(),
        errorCode: 'MISSING_RECIPIENT_EMAIL',
        errorMessage: 'Recipient email missing',
      },
    });

    await prisma.serviceOfProcess.update({
      where: { id: service.id },
      data: {
        status: ServiceStatus.FAILED,
        lastError: 'MISSING_RECIPIENT_EMAIL',
      },
    });
  } else {
    try {
      const emailResult = await sendEmail({
        to: service.recipientEmail,
        subject: service.subject,
        text: service.message ?? '',
        headers: {
          'X-LegalMind-TraceId': payload.traceId,
          'X-LegalMind-ServiceId': service.id,
          ...(service.documentId ? { 'X-LegalMind-DocumentId': service.documentId } : {}),
          'X-LegalMind-CaseId': service.caseId,
        },
      });

      deliveredAt = new Date();

      await prisma.serviceAttempt.update({
        where: { id: attempt.id },
        data: {
          status: ServiceAttemptStatus.DELIVERED,
          finishedAt: deliveredAt,
          provider: 'smtp',
          providerMessageId: emailResult.messageId,
          metadata: {
            accepted: emailResult.accepted,
            rejected: emailResult.rejected,
          },
        },
      });

      await prisma.serviceOfProcess.update({
        where: { id: service.id },
        data: {
          status: ServiceStatus.DELIVERED,
          deliveredAt,
          effectiveAt: deliveredAt,
          lastError: null,
        },
      });

      await AuditLogger.log({
        level: AuditLevel.INFO,
        eventType: AuditEventType.EXTERNAL_SYSTEM_INVOCATION,
        resource: 'service_of_process',
        action: 'deliver_email',
        details: {
          traceId: payload.traceId,
          serviceId: service.id,
          attemptId: attempt.id,
          channel: service.channel,
          provider: 'smtp',
          messageId: emailResult.messageId,
          accepted: emailResult.accepted,
          rejected: emailResult.rejected,
        },
        result: 'SUCCESS',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const finishedAt = new Date();
      const isNotConfigured = message === 'SERVICE_NOT_CONFIGURED';

      await prisma.serviceAttempt.update({
        where: { id: attempt.id },
        data: {
          status: isNotConfigured
            ? ServiceAttemptStatus.SERVICE_NOT_CONFIGURED
            : ServiceAttemptStatus.RETRYING,
          finishedAt,
          provider: 'smtp',
          errorCode: isNotConfigured ? 'SERVICE_NOT_CONFIGURED' : 'DELIVERY_FAILED',
          errorMessage: message,
        },
      });

      await prisma.serviceOfProcess.update({
        where: { id: service.id },
        data: {
          status: isNotConfigured ? ServiceStatus.FAILED : ServiceStatus.PROCESSING,
          lastError: message,
        },
      });

      await AuditLogger.log({
        level: AuditLevel.WARNING,
        eventType: AuditEventType.EXTERNAL_SYSTEM_INVOCATION,
        resource: 'service_of_process',
        action: 'deliver_email',
        details: {
          traceId: payload.traceId,
          serviceId: service.id,
          attemptId: attempt.id,
          channel: service.channel,
          provider: 'smtp',
          error: message,
        },
        result: 'FAILURE',
        errorMessage: message,
      });

      if (!isNotConfigured) {
        retryError = error instanceof Error ? error : new Error(message);
      }
    }
  }

  const latestService = await prisma.serviceOfProcess.findUnique({
    where: { id: service.id },
  });
  if (!latestService) return { ok: true };

  const attempts = await prisma.serviceAttempt.findMany({
    where: { serviceId: service.id },
    orderBy: { attemptNumber: 'asc' },
  });

  const { payload: proofPayload, proofHash, signature } = buildServiceProof({
    service: latestService,
    attempts,
  });

  await prisma.serviceOfProcess.update({
    where: { id: service.id },
    data: {
      proofHash,
      proofGeneratedAt: new Date(proofPayload.generatedAt),
    },
  });

  await appendCaseEvent({
    caseId: latestService.caseId,
    eventType: 'SERVICE_PROOF_GENERATED',
    actorUserId: latestService.requestedByUserId ?? null,
    traceId: payload.traceId,
    payload: {
      serviceId: latestService.id,
      status: latestService.status,
      deliveredAt: deliveredAt ? deliveredAt.toISOString() : null,
      proofHash,
      signature,
      generatedAt: proofPayload.generatedAt,
      attemptCount: attempts.length,
    },
  });

  if (retryError) throw retryError;

  return { ok: true, deliveredAt: deliveredAt ? deliveredAt.toISOString() : null };
}

type ArchiveFileEntry = {
  name: string;
  kind:
    | 'manifest'
    | 'case_snapshot'
    | 'case_events'
    | 'documents_metadata'
    | 'service_proof'
    | 'document_file';
  contentType: string;
  sha256: string | null;
  size?: number | null;
  meta?: Record<string, unknown>;
};

async function processArchiveGeneration(payload: ArchiveGenerationPayload) {
  const archivePackage = await prisma.archivePackage.findUnique({
    where: { id: payload.archivePackageId },
  });
  if (!archivePackage) return { ok: true, skipped: true, reason: 'NOT_FOUND' };

  if (archivePackage.status === ArchiveStatus.COMPLETED) {
    return { ok: true, skipped: true, reason: 'ALREADY_COMPLETED' };
  }

  const storageConfig = getObjectStorageConfig();
  if (!storageConfig) {
    const now = new Date();
    await prisma.archivePackage.update({
      where: { id: archivePackage.id },
      data: {
        status: ArchiveStatus.FAILED,
        error: 'OBJECT_STORAGE_NOT_CONFIGURED',
        failedAt: now,
      },
    });

    await appendCaseEvent({
      caseId: archivePackage.caseId,
      eventType: 'ARCHIVE_PACKAGE_FAILED',
      actorUserId: archivePackage.createdByUserId ?? null,
      traceId: payload.traceId,
      payload: { archivePackageId: archivePackage.id, error: 'SERVICE_NOT_CONFIGURED' },
    });

    await AuditLogger.log({
      level: AuditLevel.WARNING,
      eventType: AuditEventType.EXTERNAL_SYSTEM_INVOCATION,
      resource: 'archive_packages',
      action: 'generate',
      details: {
        traceId: payload.traceId,
        archivePackageId: archivePackage.id,
        caseId: archivePackage.caseId,
        error: 'OBJECT_STORAGE_NOT_CONFIGURED',
      },
      result: 'FAILURE',
      errorMessage: 'OBJECT_STORAGE_NOT_CONFIGURED',
    });

    return { ok: true, skipped: false, reason: 'SERVICE_NOT_CONFIGURED' };
  }

  const arbitrationCase = await prisma.arbitrationCase.findUnique({
    where: { id: archivePackage.caseId },
    include: {
      applicant: { select: { id: true, email: true, phone: true, userType: true, profile: true } },
      respondent: { select: { id: true, email: true, phone: true, userType: true, profile: true } },
      participants: {
        include: { user: { select: { id: true, email: true, phone: true, userType: true, profile: true } } },
        orderBy: { joinedAt: 'asc' },
      },
      paymentOrders: { orderBy: { createdAt: 'asc' } },
    },
  });
  if (!arbitrationCase) {
    const now = new Date();
    await prisma.archivePackage.update({
      where: { id: archivePackage.id },
      data: {
        status: ArchiveStatus.FAILED,
        error: 'CASE_NOT_FOUND',
        failedAt: now,
      },
    });
    return { ok: true, skipped: false, reason: 'CASE_NOT_FOUND' };
  }

  const documents = await prisma.caseDocument.findMany({
    where: { caseId: arbitrationCase.id },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  });

  const caseEvents = await prisma.caseEvent.findMany({
    where: { caseId: arbitrationCase.id },
    orderBy: { sequence: 'asc' },
  });

  const services = await prisma.serviceOfProcess.findMany({
    where: { caseId: arbitrationCase.id },
    include: {
      attempts: { orderBy: { attemptNumber: 'asc' } },
      document: { select: { id: true, originalName: true, fileHash: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  const generatedAt = new Date();

  function sanitizeZipPart(value: string): string {
    const trimmed = value.trim();
    if (!trimmed) return 'file';
    return trimmed
      .replace(/[\\/]/g, '_')
      .replace(/[\r\n\t"]/g, '_')
      .replace(/[^\p{L}\p{N}._()-]+/gu, '_')
      .replace(/_+/g, '_')
      .slice(0, 180);
  }

  function buildArchiveFileName(caseNumber: string, archiveId: string, date: Date): string {
    const datePart = date.toISOString().slice(0, 10).replace(/-/g, '');
    const safeCase = sanitizeZipPart(caseNumber).slice(0, 40);
    return `archive_${safeCase}_${datePart}_${archiveId}.zip`.slice(0, 240);
  }

  const caseSnapshot = {
    case: arbitrationCase,
    exportedAt: generatedAt.toISOString(),
  };
  const caseSnapshotFile = sha256OfStableJson(caseSnapshot);

  const documentsMetadata = documents.map((doc) => {
    const { bucket, key } = resolveStorageLocation(doc, storageConfig.bucket);
    return {
      id: doc.id,
      caseId: doc.caseId,
      documentType: doc.documentType,
      category: doc.category,
      description: doc.description,
      isPublic: doc.isPublic,
      accessLevel: doc.accessLevel,
      version: doc.version,
      parentDocumentId: doc.parentDocumentId,
      uploadedBy: doc.uploadedBy,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      file: {
        fileName: doc.fileName,
        originalName: doc.originalName,
        fileType: doc.fileType,
        mimeType: doc.mimeType,
        fileSize: doc.fileSize,
        fileHash: doc.fileHash,
        storage: { bucket, key },
      },
    };
  });
  const documentsMetadataFile = sha256OfStableJson({ documents: documentsMetadata });

  const caseEventsFile = sha256OfStableJson({
    events: caseEvents.map((event) => ({
      id: event.id,
      sequence: event.sequence,
      caseId: event.caseId,
      eventType: event.eventType,
      actorUserId: event.actorUserId,
      traceId: event.traceId,
      payload: event.payload,
      hash: event.hash,
      createdAt: event.createdAt,
    })),
  });

  const archiveBucket = storageConfig.bucket;
  const archiveKey = `cases/${arbitrationCase.id}/archives/${archivePackage.id}.zip`;
  const archiveFileName = buildArchiveFileName(arbitrationCase.caseNumber, archivePackage.id, generatedAt);

  const fileEntries: ArchiveFileEntry[] = [
    { name: 'case/case.json', kind: 'case_snapshot', contentType: 'application/json', sha256: caseSnapshotFile.sha256 },
    { name: 'case/documents.json', kind: 'documents_metadata', contentType: 'application/json', sha256: documentsMetadataFile.sha256 },
    { name: 'case/case-events.json', kind: 'case_events', contentType: 'application/json', sha256: caseEventsFile.sha256 },
  ];

  const serviceProofs = services.map((service) => {
    const { payload: proofPayload, proofHash, signature } = buildServiceProof({
      service,
      attempts: service.attempts,
      generatedAt,
    });
    const proofContent = stableJsonStringify(proofPayload);
    const name = `service-of-process/${service.id}.proof.json`;
    fileEntries.push({
      name,
      kind: 'service_proof',
      contentType: 'application/json',
      sha256: proofHash,
      meta: {
        serviceId: service.id,
        signatureAlgorithm: 'HMAC-SHA256(AUDIT_LOG_SECRET, proofHash.generatedAt)',
        signature,
      },
    });
    return { name, proofContent, proofHash, signature };
  });

  const documentEntries = documents.map((doc) => {
    const safeName = sanitizeZipPart(doc.originalName);
    const name = `documents/${doc.id}_${safeName}`;
    const { bucket, key } = resolveStorageLocation(doc, storageConfig.bucket);
    fileEntries.push({
      name,
      kind: 'document_file',
      contentType: doc.fileType || 'application/octet-stream',
      sha256: doc.fileHash ?? null,
      size: typeof doc.fileSize === 'bigint' ? Number(doc.fileSize) : Number(doc.fileSize),
      meta: {
        documentId: doc.id,
        originalName: doc.originalName,
        bucket,
        key,
      },
    });
    return { doc, name, bucket, key };
  });

  const manifestBody = {
    version: '1.0',
    type: 'CASE_ARCHIVE_MANIFEST',
    generatedAt: generatedAt.toISOString(),
    archive: {
      id: archivePackage.id,
      caseId: arbitrationCase.id,
      caseNumber: arbitrationCase.caseNumber,
      status: ArchiveStatus.COMPLETED,
      createdByUserId: archivePackage.createdByUserId ?? null,
      traceId: payload.traceId,
      createdAt: archivePackage.createdAt.toISOString(),
    },
    anchors: {
      caseEventCount: caseEvents.length,
      firstCaseEventHash: caseEvents[0]?.hash ?? null,
      lastCaseEventHash: caseEvents.length > 0 ? caseEvents[caseEvents.length - 1]?.hash ?? null : null,
      documentCount: documents.length,
      serviceCount: services.length,
    },
    output: {
      bucket: archiveBucket,
      objectKey: archiveKey,
      fileName: archiveFileName,
      contentType: 'application/zip',
    },
    files: fileEntries,
  };

  const manifestHash = sha256OfStableJson(manifestBody).sha256;
  const manifestSignature = HashUtil.hmac(`${manifestHash}.${manifestBody.generatedAt}`, getEnv().AUDIT_LOG_SECRET);
  const manifest = {
    ...manifestBody,
    integrity: {
      manifestHash,
      signature: manifestSignature,
      signatureAlgorithm: 'HMAC-SHA256(AUDIT_LOG_SECRET, manifestHash.generatedAt)',
    },
  };
  const manifestContent = stableJsonStringify(manifest);

  await prisma.archivePackage.update({
    where: { id: archivePackage.id },
    data: {
      status: ArchiveStatus.PROCESSING,
      bucket: archiveBucket,
      objectKey: archiveKey,
      fileName: archiveFileName,
      contentType: 'application/zip',
      manifestHash,
      error: null,
      failedAt: null,
    },
  });

  class Sha256CountingTransform extends Transform {
    private readonly hash = crypto.createHash('sha256');
    public bytes = 0;

    _transform(chunk: Buffer, _encoding: BufferEncoding, callback: (error?: Error | null, data?: Buffer) => void) {
      this.hash.update(chunk);
      this.bytes += chunk.length;
      callback(null, chunk);
    }

    digestHex(): string {
      return this.hash.digest('hex');
    }
  }

  const s3 = getS3Client(storageConfig);
  const uploadStream = new PassThrough();
  const hashing = new Sha256CountingTransform();
  const zip = archiver('zip', { zlib: { level: 9 } });

  zip.on('warning', (err) => {
    uploadStream.destroy(err);
  });
  zip.on('error', (err) => {
    uploadStream.destroy(err);
  });

  zip.pipe(hashing).pipe(uploadStream);

  const uploadPromise = s3.send(
    new PutObjectCommand({
      Bucket: archiveBucket,
      Key: archiveKey,
      Body: uploadStream,
      ContentType: 'application/zip',
      ...(storageConfig.serverSideEncryption
        ? { ServerSideEncryption: storageConfig.serverSideEncryption }
        : {}),
      Metadata: {
        legalmind_archive_id: archivePackage.id,
        legalmind_case_id: arbitrationCase.id,
        legalmind_manifest_hash: manifestHash,
      },
    })
  );

  zip.append(manifestContent, { name: 'manifest.json' });
  zip.append(JSON.stringify(manifest, null, 2), { name: 'manifest.pretty.json' });
  zip.append(caseSnapshotFile.canonical, { name: 'case/case.json' });
  zip.append(documentsMetadataFile.canonical, { name: 'case/documents.json' });
  zip.append(caseEventsFile.canonical, { name: 'case/case-events.json' });

  for (const proof of serviceProofs) {
    zip.append(proof.proofContent, { name: proof.name });
  }

  for (const entry of documentEntries) {
    const stream = createLazyObjectReadable({
      client: s3,
      bucket: entry.bucket,
      key: entry.key,
    });
    zip.append(stream, { name: entry.name });
  }

  try {
    await Promise.all([zip.finalize(), uploadPromise]);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const now = new Date();

    await prisma.archivePackage.update({
      where: { id: archivePackage.id },
      data: {
        status: ArchiveStatus.FAILED,
        error: message.slice(0, 2000),
        failedAt: now,
      },
    });

    await appendCaseEvent({
      caseId: arbitrationCase.id,
      eventType: 'ARCHIVE_PACKAGE_FAILED',
      actorUserId: archivePackage.createdByUserId ?? null,
      traceId: payload.traceId,
      payload: { archivePackageId: archivePackage.id, error: message },
    });

    await AuditLogger.log({
      level: AuditLevel.ERROR,
      eventType: AuditEventType.EXTERNAL_SYSTEM_INVOCATION,
      resource: 'archive_packages',
      action: 'generate',
      details: { traceId: payload.traceId, archivePackageId: archivePackage.id, caseId: arbitrationCase.id, error: message },
      result: 'FAILURE',
      errorMessage: message,
    });

    throw error instanceof Error ? error : new Error(message);
  }

  const zipSha256 = hashing.digestHex();
  const zipSize = hashing.bytes;

  await prisma.archivePackage.update({
    where: { id: archivePackage.id },
    data: {
      status: ArchiveStatus.COMPLETED,
      sha256: zipSha256,
      size: BigInt(zipSize),
      manifest: manifest as Prisma.InputJsonValue,
      completedAt: generatedAt,
      error: null,
      failedAt: null,
    },
  });

  await appendCaseEvent({
    caseId: arbitrationCase.id,
    eventType: 'ARCHIVE_PACKAGE_COMPLETED',
    actorUserId: archivePackage.createdByUserId ?? null,
    traceId: payload.traceId,
    payload: {
      archivePackageId: archivePackage.id,
      sha256: zipSha256,
      size: zipSize,
      bucket: archiveBucket,
      objectKey: archiveKey,
      manifestHash,
    },
  });

  await AuditLogger.log({
    level: AuditLevel.INFO,
    eventType: AuditEventType.EXTERNAL_SYSTEM_INVOCATION,
    resource: 'archive_packages',
    action: 'generate',
    details: {
      traceId: payload.traceId,
      archivePackageId: archivePackage.id,
      caseId: arbitrationCase.id,
      sha256: zipSha256,
      size: zipSize,
      bucket: archiveBucket,
      objectKey: archiveKey,
      manifestHash,
    },
    result: 'SUCCESS',
  });

  await AuditLogger.log({
    level: AuditLevel.INFO,
    eventType: AuditEventType.QUEUE_JOB_COMPLETED,
    resource: 'queue',
    action: QUEUE_NAMES.ARCHIVE_GENERATION,
    details: {
      traceId: payload.traceId,
      archivePackageId: archivePackage.id,
      caseId: arbitrationCase.id,
      sha256: zipSha256,
      size: zipSize,
    },
    result: 'SUCCESS',
  });

  return { ok: true, sha256: zipSha256, size: zipSize };
}

function ensureWorkers(): void {
  const registry = getRegistry();

  if (!registry.workers.has(QUEUE_NAMES.NOTIFICATION_DELIVERY)) {
    const worker = new Worker(
      QUEUE_NAMES.NOTIFICATION_DELIVERY,
      async (job) => {
        const parsed = notificationDeliveryPayloadSchema.safeParse(job.data);
        if (!parsed.success) {
          throw new Error('Invalid notification delivery payload');
        }
        return await processNotificationDelivery(parsed.data);
      },
      {
        connection: getBullConnection(),
        prefix: getQueuePrefix(),
        concurrency: 8,
      }
    );

    worker.on('failed', async (job, err) => {
      try {
        const traceId = job?.data?.traceId ? String(job.data.traceId) : getTraceId(new Headers());
        await AuditLogger.log({
          level: AuditLevel.ERROR,
          eventType: AuditEventType.QUEUE_JOB_FAILED,
          resource: 'queue',
          action: QUEUE_NAMES.NOTIFICATION_DELIVERY,
          details: {
            traceId,
            jobId: job?.id ?? null,
            data: job?.data ?? null,
            error: err?.message ?? String(err),
          },
          result: 'FAILURE',
          errorMessage: err?.message ?? String(err),
        });
      } catch {
        return;
      }
    });

    registry.workers.set(QUEUE_NAMES.NOTIFICATION_DELIVERY, worker);
  }

  if (!registry.workers.has(QUEUE_NAMES.DOCUMENT_PROCESSING)) {
    const worker = new Worker(
      QUEUE_NAMES.DOCUMENT_PROCESSING,
      async (job) => {
        const parsed = documentProcessingPayloadSchema.safeParse(job.data);
        if (!parsed.success) throw new Error('Invalid document processing payload');
        return await processDocumentProcessing(parsed.data);
      },
      {
        connection: getBullConnection(),
        prefix: getQueuePrefix(),
        concurrency: 4,
      }
    );
    worker.on('failed', async (job, err) => {
      try {
        const traceId = job?.data?.traceId ? String(job.data.traceId) : getTraceId(new Headers());
        await AuditLogger.log({
          level: AuditLevel.ERROR,
          eventType: AuditEventType.QUEUE_JOB_FAILED,
          resource: 'queue',
          action: QUEUE_NAMES.DOCUMENT_PROCESSING,
          details: { traceId, jobId: job?.id ?? null, data: job?.data ?? null },
          result: 'FAILURE',
          errorMessage: err?.message ?? String(err),
        });
      } catch {
        return;
      }
    });
    registry.workers.set(QUEUE_NAMES.DOCUMENT_PROCESSING, worker);
  }

  if (!registry.workers.has(QUEUE_NAMES.NOTARY_TASKS)) {
    const worker = new Worker(
      QUEUE_NAMES.NOTARY_TASKS,
      async (job) => {
        const parsed = notaryTaskPayloadSchema.safeParse(job.data);
        if (!parsed.success) throw new Error('Invalid notary task payload');
        return await processNotaryTask(parsed.data);
      },
      {
        connection: getBullConnection(),
        prefix: getQueuePrefix(),
        concurrency: 2,
      }
    );
    worker.on('failed', async (job, err) => {
      try {
        const traceId = job?.data?.traceId ? String(job.data.traceId) : getTraceId(new Headers());
        await AuditLogger.log({
          level: AuditLevel.ERROR,
          eventType: AuditEventType.QUEUE_JOB_FAILED,
          resource: 'queue',
          action: QUEUE_NAMES.NOTARY_TASKS,
          details: { traceId, jobId: job?.id ?? null, data: job?.data ?? null },
          result: 'FAILURE',
          errorMessage: err?.message ?? String(err),
        });
      } catch {
        return;
      }
    });
    registry.workers.set(QUEUE_NAMES.NOTARY_TASKS, worker);
  }

  if (!registry.workers.has(QUEUE_NAMES.SERVICE_DELIVERY)) {
    const worker = new Worker(
      QUEUE_NAMES.SERVICE_DELIVERY,
      async (job) => {
        const parsed = serviceDeliveryPayloadSchema.safeParse(job.data);
        if (!parsed.success) throw new Error('Invalid service delivery payload');
        return await processServiceDelivery(parsed.data);
      },
      {
        connection: getBullConnection(),
        prefix: getQueuePrefix(),
        concurrency: 4,
      }
    );
    worker.on('failed', async (job, err) => {
      try {
        const traceId = job?.data?.traceId ? String(job.data.traceId) : getTraceId(new Headers());
        await AuditLogger.log({
          level: AuditLevel.ERROR,
          eventType: AuditEventType.QUEUE_JOB_FAILED,
          resource: 'queue',
          action: QUEUE_NAMES.SERVICE_DELIVERY,
          details: { traceId, jobId: job?.id ?? null, data: job?.data ?? null },
          result: 'FAILURE',
          errorMessage: err?.message ?? String(err),
        });
      } catch {
        return;
      }
    });

    registry.workers.set(QUEUE_NAMES.SERVICE_DELIVERY, worker);
  }

  if (!registry.workers.has(QUEUE_NAMES.ARCHIVE_GENERATION)) {
    const worker = new Worker(
      QUEUE_NAMES.ARCHIVE_GENERATION,
      async (job) => {
        const parsed = archiveGenerationPayloadSchema.safeParse(job.data);
        if (!parsed.success) throw new Error('Invalid archive generation payload');
        return await processArchiveGeneration(parsed.data);
      },
      {
        connection: getBullConnection(),
        prefix: getQueuePrefix(),
        concurrency: 2,
      }
    );

    worker.on('failed', async (job, err) => {
      try {
        const traceId = job?.data?.traceId ? String(job.data.traceId) : getTraceId(new Headers());
        await AuditLogger.log({
          level: AuditLevel.ERROR,
          eventType: AuditEventType.QUEUE_JOB_FAILED,
          resource: 'queue',
          action: QUEUE_NAMES.ARCHIVE_GENERATION,
          details: { traceId, jobId: job?.id ?? null, data: job?.data ?? null },
          result: 'FAILURE',
          errorMessage: err?.message ?? String(err),
        });
      } catch {
        return;
      }
    });

    registry.workers.set(QUEUE_NAMES.ARCHIVE_GENERATION, worker);
  }
}

function shouldRunWorkers(): boolean {
  const env = getEnv();
  if (typeof env.BULLMQ_RUN_WORKERS === 'boolean') return env.BULLMQ_RUN_WORKERS;
  return env.NODE_ENV === 'development';
}

export function ensureQueueInfrastructure(): void {
  for (const name of Object.values(QUEUE_NAMES)) {
    getOrCreateQueue(name);
  }
}

export function ensureQueueWorkerInfrastructure(): void {
  ensureQueueInfrastructure();
  for (const name of Object.values(QUEUE_NAMES)) {
    ensureEvents(name);
  }
  ensureWorkers();
}

export async function enqueueNotificationDelivery(
  payload: NotificationDeliveryPayload,
  options?: { runAt?: Date }
) {
  ensureQueueInfrastructure();

  const queue = getOrCreateQueue(QUEUE_NAMES.NOTIFICATION_DELIVERY);

  const now = Date.now();
  const delay = options?.runAt ? Math.max(0, options.runAt.getTime() - now) : 0;

  const jobOptions: JobsOptions = {
    jobId: payload.notificationId,
    delay,
    attempts: 5,
    backoff: { type: 'exponential', delay: 1000 },
  };

  return queue.add('deliver', payload, jobOptions);
}

export async function enqueueDocumentProcessing(payload: DocumentProcessingPayload) {
  ensureQueueInfrastructure();
  const queue = getOrCreateQueue(QUEUE_NAMES.DOCUMENT_PROCESSING);
  const jobOptions: JobsOptions = {
    jobId: payload.documentId,
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
  };
  return queue.add('process', payload, jobOptions);
}

export async function enqueueNotaryTask(payload: NotaryTaskPayload) {
  ensureQueueInfrastructure();
  const queue = getOrCreateQueue(QUEUE_NAMES.NOTARY_TASKS);
  const jobOptions: JobsOptions = {
    jobId: `notary:${payload.documentId}`,
    attempts: 5,
    backoff: { type: 'exponential', delay: 5000 },
  };
  return queue.add('notary', payload, jobOptions);
}

export async function enqueueServiceDelivery(payload: ServiceDeliveryPayload) {
  ensureQueueInfrastructure();
  const queue = getOrCreateQueue(QUEUE_NAMES.SERVICE_DELIVERY);
  const jobOptions: JobsOptions = {
    jobId: payload.serviceId,
    attempts: 5,
    backoff: { type: 'exponential', delay: 2000 },
  };
  return queue.add('deliver', payload, jobOptions);
}

export async function enqueueArchiveGeneration(payload: ArchiveGenerationPayload) {
  ensureQueueInfrastructure();
  const queue = getOrCreateQueue(QUEUE_NAMES.ARCHIVE_GENERATION);
  const jobOptions: JobsOptions = {
    jobId: payload.archivePackageId,
    attempts: 3,
    backoff: { type: 'exponential', delay: 3000 },
  };
  return queue.add('generate', payload, jobOptions);
}

export async function getQueueJobCounts() {
  ensureQueueInfrastructure();

  const result: Record<string, JobCounts> = {};
  for (const name of Object.values(QUEUE_NAMES)) {
    const queue = getOrCreateQueue(name);
    result[name] = await queue.getJobCounts('waiting', 'active', 'delayed', 'failed', 'completed');
  }
  return result;
}

// 自动在 Worker 模式下启动队列消费者（避免在生产 Web 进程默认拉起）
try {
  if (shouldRunWorkers()) {
    ensureQueueWorkerInfrastructure();
  }
} catch (error) {
  logger.error({ err: error }, 'BullMQ worker 启动失败');
}
