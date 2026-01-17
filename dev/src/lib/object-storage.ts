// dev/src/lib/object-storage.ts
// MinIO/S3（S3 兼容）对象存储工具：用于下载对象内容（OCR/归档等）
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Readable } from 'stream';

import { getEnv } from '@/lib/env-validator';

export type ObjectStorageConfig = {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;
  presignExpiresSeconds: number;
  serverSideEncryption?: 'AES256' | 'aws:kms';
};

type DocumentMetadata = {
  storage?: { bucket?: string; key?: string };
  [key: string]: unknown;
};

let cachedS3Client: S3Client | null = null;

export function getObjectStorageConfig(): ObjectStorageConfig | null {
  const env = getEnv();
  if (!env.S3_ENDPOINT || !env.S3_BUCKET || !env.S3_ACCESS_KEY_ID || !env.S3_SECRET_ACCESS_KEY) {
    return null;
  }

  return {
    endpoint: env.S3_ENDPOINT,
    region: env.S3_REGION,
    bucket: env.S3_BUCKET,
    accessKeyId: env.S3_ACCESS_KEY_ID,
    secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    forcePathStyle: env.S3_FORCE_PATH_STYLE,
    presignExpiresSeconds: env.S3_PRESIGNED_URL_EXPIRES_SECONDS,
    serverSideEncryption: env.S3_SERVER_SIDE_ENCRYPTION,
  };
}

export function getS3Client(config: ObjectStorageConfig): S3Client {
  if (cachedS3Client) return cachedS3Client;
  cachedS3Client = new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    forcePathStyle: config.forcePathStyle,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
  return cachedS3Client;
}

export function resolveStorageLocation(
  document: { filePath: string; metadata: unknown },
  defaultBucket: string
) {
  const metadata: DocumentMetadata =
    document.metadata && typeof document.metadata === 'object' && !Array.isArray(document.metadata)
      ? (document.metadata as DocumentMetadata)
      : {};

  const bucket =
    typeof metadata?.storage?.bucket === 'string' ? String(metadata.storage.bucket) : defaultBucket;
  const key = typeof metadata?.storage?.key === 'string' ? String(metadata.storage.key) : document.filePath;
  return { bucket, key };
}

async function bodyToBuffer(body: unknown): Promise<Buffer> {
  if (!body) return Buffer.from([]);
  if (body instanceof Readable) {
    const chunks: Buffer[] = [];
    for await (const chunk of body) {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : (chunk as Buffer));
    }
    return Buffer.concat(chunks);
  }

  if (typeof body === 'object' && body !== null) {
    const maybe = body as { transformToByteArray?: () => Promise<Uint8Array> };
    if (typeof maybe.transformToByteArray === 'function') {
      const bytes = await maybe.transformToByteArray();
      return Buffer.from(bytes);
    }
  }

  throw new Error('UNSUPPORTED_S3_BODY');
}

export async function getObjectBuffer(params: {
  client: S3Client;
  bucket: string;
  key: string;
}): Promise<Buffer> {
  const object = await params.client.send(new GetObjectCommand({ Bucket: params.bucket, Key: params.key }));
  return bodyToBuffer(object.Body);
}

export function createLazyObjectReadable(params: {
  client: S3Client;
  bucket: string;
  key: string;
}): Readable {
  return Readable.from(
    (async function* createLazy() {
      const object = await params.client.send(
        new GetObjectCommand({ Bucket: params.bucket, Key: params.key })
      );
      const body = object.Body;
      if (!body) return;

      if (body instanceof Readable) {
        for await (const chunk of body) {
          yield chunk;
        }
        return;
      }

      if (typeof body === 'object' && body !== null) {
        const maybe = body as { transformToByteArray?: () => Promise<Uint8Array> };
        if (typeof maybe.transformToByteArray === 'function') {
          const bytes = await maybe.transformToByteArray();
          yield Buffer.from(bytes);
          return;
        }
      }

      throw new Error('UNSUPPORTED_S3_BODY');
    })()
  );
}
