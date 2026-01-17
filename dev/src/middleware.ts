import { NextRequest, NextResponse } from 'next/server';

function generateNonce(): string {
  const uuid = crypto.randomUUID();
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(uuid).toString('base64');
  }
  // Edge runtime fallback
  // eslint-disable-next-line no-undef
  return btoa(uuid);
}

function buildContentSecurityPolicy(nonce: string, isDev: boolean): string {
  const directives = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''}`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' blob: data:`,
    `font-src 'self' data:`,
    `connect-src 'self' https: wss:${isDev ? ' http: ws:' : ''}`,
    `media-src 'self' blob:`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    `upgrade-insecure-requests`,
  ];

  return directives.join('; ');
}

export function middleware(request: NextRequest) {
  const nonce = generateNonce();
  const isDev = process.env.NODE_ENV === 'development';
  const cspValue = buildContentSecurityPolicy(nonce, isDev);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', cspValue);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  response.headers.set('Content-Security-Policy', cspValue);
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

