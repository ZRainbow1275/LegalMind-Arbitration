import crypto from 'crypto';
import { z } from 'zod';

const recoveryCodesSchema = z
  .object({
    salt: z.string().min(1),
    codes: z
      .array(
        z
          .object({
            hash: z.string().min(1),
            usedAt: z.string().nullable(),
          })
          .strict()
      )
      .min(1),
  })
  .strict();

export type StoredRecoveryCodes = z.infer<typeof recoveryCodesSchema>;

function normalizeRecoveryCode(value: string): string {
  return value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

function hashRecoveryCode(salt: string, code: string): string {
  const normalized = normalizeRecoveryCode(code);
  return crypto.createHash('sha256').update(`${salt}:${normalized}`).digest('hex');
}

export function generateRecoveryCodes(count: number = 10): {
  recoveryCodes: string[];
  stored: StoredRecoveryCodes;
} {
  const salt = crypto.randomBytes(16).toString('hex');
  const recoveryCodes: string[] = [];
  const storedCodes: Array<{ hash: string; usedAt: string | null }> = [];

  for (let idx = 0; idx < count; idx++) {
    const raw = crypto.randomBytes(8).toString('hex').toUpperCase();
    const formatted = `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}`;
    recoveryCodes.push(formatted);
    storedCodes.push({ hash: hashRecoveryCode(salt, formatted), usedAt: null });
  }

  return {
    recoveryCodes,
    stored: { salt, codes: storedCodes },
  };
}

export function parseStoredRecoveryCodes(value: unknown): StoredRecoveryCodes | null {
  if (!value) return null;
  const parsed = recoveryCodesSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function verifyAndConsumeRecoveryCode(params: {
  stored: StoredRecoveryCodes;
  code: string;
  now?: Date;
}):
  | { ok: true; updated: StoredRecoveryCodes }
  | { ok: false; reason: 'MISMATCH' | 'ALREADY_USED' } {
  const nowIso = (params.now ?? new Date()).toISOString();
  const candidateHash = hashRecoveryCode(params.stored.salt, params.code);
  const updated = {
    ...params.stored,
    codes: params.stored.codes.map((c) => ({ ...c })),
  };

  const idx = updated.codes.findIndex((c) => c.hash === candidateHash);
  if (idx === -1) return { ok: false, reason: 'MISMATCH' };
  if (updated.codes[idx].usedAt) return { ok: false, reason: 'ALREADY_USED' };

  updated.codes[idx].usedAt = nowIso;
  return { ok: true, updated };
}

