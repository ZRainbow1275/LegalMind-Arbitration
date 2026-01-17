import crypto from 'crypto';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function normalizeBase32(input: string): string {
  return input.replace(/[\s=]/g, '').toUpperCase();
}

function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';

  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;

    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

function base32Decode(input: string): Buffer {
  const normalized = normalizeBase32(input);
  let bits = 0;
  let value = 0;
  const output: number[] = [];

  for (const char of normalized) {
    const idx = BASE32_ALPHABET.indexOf(char);
    if (idx === -1) {
      throw new Error('INVALID_BASE32');
    }

    value = (value << 5) | idx;
    bits += 5;

    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(output);
}

function counterToBuffer(counter: number): Buffer {
  const buf = Buffer.alloc(8);
  const high = Math.floor(counter / 0x100000000);
  const low = counter >>> 0;
  buf.writeUInt32BE(high >>> 0, 0);
  buf.writeUInt32BE(low, 4);
  return buf;
}

export type TotpConfig = {
  stepSeconds?: number;
  digits?: number;
  algorithm?: 'sha1' | 'sha256' | 'sha512';
};

export function generateTotpSecretBase32(byteLength: number = 20): string {
  return base32Encode(crypto.randomBytes(byteLength));
}

export function buildTotpOtpauthUri(params: {
  issuer: string;
  accountName: string;
  secretBase32: string;
  config?: TotpConfig;
}): string {
  const issuer = params.issuer.trim() || 'LegalMind';
  const accountName = params.accountName.trim();
  const secret = normalizeBase32(params.secretBase32);
  const stepSeconds = params.config?.stepSeconds ?? 30;
  const digits = params.config?.digits ?? 6;
  const algorithm = (params.config?.algorithm ?? 'sha1').toUpperCase();

  const label = `${encodeURIComponent(issuer)}:${encodeURIComponent(accountName)}`;
  const query = new URLSearchParams({
    secret,
    issuer,
    algorithm,
    digits: String(digits),
    period: String(stepSeconds),
  });

  return `otpauth://totp/${label}?${query.toString()}`;
}

export function generateTotpCode(params: {
  secretBase32: string;
  timestampMs?: number;
  config?: TotpConfig;
}): string {
  const stepSeconds = params.config?.stepSeconds ?? 30;
  const digits = params.config?.digits ?? 6;
  const algorithm = params.config?.algorithm ?? 'sha1';

  const timestampMs = params.timestampMs ?? Date.now();
  const counter = Math.floor(timestampMs / 1000 / stepSeconds);
  const key = base32Decode(params.secretBase32);
  const msg = counterToBuffer(counter);
  const hmac = crypto.createHmac(algorithm, key).update(msg).digest();

  const offset = hmac[hmac.length - 1] & 0x0f;
  const bin =
    ((hmac[offset] & 0x7f) << 24)
    | ((hmac[offset + 1] & 0xff) << 16)
    | ((hmac[offset + 2] & 0xff) << 8)
    | (hmac[offset + 3] & 0xff);

  const otp = (bin % 10 ** digits).toString();
  return otp.padStart(digits, '0');
}

export function verifyTotpCode(params: {
  secretBase32: string;
  code: string;
  timestampMs?: number;
  window?: number;
  config?: TotpConfig;
}): { ok: true } | { ok: false; reason: 'INVALID_FORMAT' | 'MISMATCH' } {
  const normalized = params.code.replace(/\s/g, '');
  const digits = params.config?.digits ?? 6;
  if (!new RegExp(`^\\d{${digits}}$`).test(normalized)) {
    return { ok: false, reason: 'INVALID_FORMAT' };
  }

  const window = Math.max(0, Math.min(10, params.window ?? 1));
  const stepSeconds = params.config?.stepSeconds ?? 30;
  const baseTime = params.timestampMs ?? Date.now();

  for (let offset = -window; offset <= window; offset++) {
    const candidate = generateTotpCode({
      secretBase32: params.secretBase32,
      timestampMs: baseTime + offset * stepSeconds * 1000,
      config: params.config,
    });
    if (candidate === normalized) return { ok: true };
  }

  return { ok: false, reason: 'MISMATCH' };
}

