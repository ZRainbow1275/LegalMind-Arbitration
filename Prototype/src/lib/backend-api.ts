export type ApiError = {
  code: string;
  message: string;
  details?: unknown;
};

export type ApiEnvelope<T> = {
  success: boolean;
  data?: T;
  message?: string;
  error?: ApiError;
  meta?: unknown;
};

export type ApiResult<T> =
  | { ok: true; status: number; data: T; message?: string; meta?: unknown }
  | { ok: false; status: number; error: ApiError; raw?: unknown };

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function getCookieValue(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const cookies = document.cookie ? document.cookie.split(';') : [];
  for (const rawCookie of cookies) {
    const [rawKey, ...rawValueParts] = rawCookie.trim().split('=');
    if (!rawKey) continue;
    if (rawKey === name) {
      const rawValue = rawValueParts.join('=');
      try {
        return decodeURIComponent(rawValue);
      } catch {
        return rawValue;
      }
    }
  }
  return null;
}

function isCsrfRequired(method: string): boolean {
  const normalized = method.toUpperCase();
  return normalized !== 'GET' && normalized !== 'HEAD' && normalized !== 'OPTIONS';
}

function coerceApiError(response: Response, parsed: unknown): ApiError {
  if (isPlainObject(parsed) && isPlainObject(parsed.error)) {
    const code = isNonEmptyString(parsed.error.code) ? parsed.error.code : 'UNKNOWN_ERROR';
    const message = isNonEmptyString(parsed.error.message)
      ? parsed.error.message
      : (response.statusText || '请求失败');
    return {
      code,
      message,
      details: parsed.error.details,
    };
  }

  return {
    code: response.ok ? 'UNKNOWN_ERROR' : 'HTTP_ERROR',
    message: response.statusText || '请求失败',
    details: parsed,
  };
}

export async function apiRequest<T>(
  input: string | URL,
  init: RequestInit = {}
): Promise<ApiResult<T>> {
  const method = (init.method || 'GET').toUpperCase();
  const headers = new Headers(init.headers);

  if (isCsrfRequired(method) && !headers.has('x-csrf-token')) {
    const csrfToken = getCookieValue('csrf-token');
    if (csrfToken) headers.set('x-csrf-token', csrfToken);
  }

  const response = await fetch(input, {
    ...init,
    method,
    headers,
    credentials: 'include',
  });

  const contentType = response.headers.get('content-type') || '';
  const parsed = contentType.includes('application/json')
    ? await response.json().catch(() => null)
    : await response.text().catch(() => null);

  if (isPlainObject(parsed) && typeof parsed.success === 'boolean') {
    const envelope = parsed as ApiEnvelope<T>;
    if (envelope.success) {
      return {
        ok: true,
        status: response.status,
        data: (envelope.data as T)!,
        message: envelope.message,
        meta: envelope.meta,
      };
    }

    return {
      ok: false,
      status: response.status,
      error: coerceApiError(response, envelope),
      raw: parsed,
    };
  }

  if (response.ok) {
    return {
      ok: true,
      status: response.status,
      data: parsed as T,
    };
  }

  return {
    ok: false,
    status: response.status,
    error: coerceApiError(response, parsed),
    raw: parsed,
  };
}

