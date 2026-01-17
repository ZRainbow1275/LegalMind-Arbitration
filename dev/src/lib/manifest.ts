import { HashUtil } from '@/lib/security/encryption';

function normalizeForJson(value: unknown): unknown {
  if (value === null) return null;
  if (value === undefined) return undefined;
  if (typeof value === 'bigint') return value.toString();
  if (value instanceof Date) return value.toISOString();

  if (Array.isArray(value)) {
    return value.map((item) => normalizeForJson(item));
  }

  if (typeof value === 'object') {
    const maybeToJson = value as { toJSON?: () => unknown };
    if (typeof maybeToJson.toJSON === 'function') {
      try {
        return normalizeForJson(maybeToJson.toJSON());
      } catch {
        // ignore and fallback to best-effort normalization
      }
    }

    const record = value as Record<string, unknown>;
    const keys = Object.keys(record).sort((a, b) => a.localeCompare(b));
    const out: Record<string, unknown> = {};
    for (const key of keys) {
      const normalized = normalizeForJson(record[key]);
      if (normalized === undefined) continue;
      out[key] = normalized;
    }
    return out;
  }

  return value;
}

export function stableJsonStringify(value: unknown): string {
  return JSON.stringify(normalizeForJson(value));
}

export function sha256OfStableJson(value: unknown): { canonical: string; sha256: string } {
  const canonical = stableJsonStringify(value);
  return { canonical, sha256: HashUtil.sha256(canonical) };
}

export function hmacSha256OfStableJson(value: unknown, secret: string): { canonical: string; signature: string } {
  const canonical = stableJsonStringify(value);
  return { canonical, signature: HashUtil.hmac(canonical, secret) };
}
