// dev/src/lib/document-signing.ts
// 电子签名/验签：基于服务器密钥对 documentHash 做签名（禁止返回 mock 签名）
import crypto from 'crypto';
import { getEnv } from '@/lib/env-validator';

export type DocumentSigningConfig = {
  algorithm: string;
  privateKeyPem: string;
  publicKeyPem?: string;
};

export function getDocumentSigningConfig(): DocumentSigningConfig | null {
  const env = getEnv();
  if (!env.DOCUMENT_SIGNING_PRIVATE_KEY_PEM || !env.DOCUMENT_SIGNING_PUBLIC_KEY_PEM) {
    return null;
  }
  return {
    algorithm: env.DOCUMENT_SIGNING_ALGORITHM || 'RSA-SHA256',
    privateKeyPem: env.DOCUMENT_SIGNING_PRIVATE_KEY_PEM,
    publicKeyPem: env.DOCUMENT_SIGNING_PUBLIC_KEY_PEM,
  };
}

export function signDocumentHash(params: {
  algorithm: string;
  privateKeyPem: string;
  documentHashHex: string;
}): {
  signatureBase64: string;
  signatureHashHex: string;
} {
  const payload = Buffer.from(params.documentHashHex, 'hex');
  const signature = crypto.sign(params.algorithm, payload, params.privateKeyPem);
  const signatureHashHex = crypto.createHash('sha256').update(signature).digest('hex');
  return { signatureBase64: signature.toString('base64'), signatureHashHex };
}

export function verifyDocumentSignature(params: {
  algorithm: string;
  publicKeyPem: string;
  documentHashHex: string;
  signatureBase64: string;
}): boolean {
  const payload = Buffer.from(params.documentHashHex, 'hex');
  const signature = Buffer.from(params.signatureBase64, 'base64');
  return crypto.verify(params.algorithm, payload, params.publicKeyPem, signature);
}
