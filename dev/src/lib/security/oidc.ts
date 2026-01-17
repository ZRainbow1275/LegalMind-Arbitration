// dev/src/lib/security/oidc.ts
// OIDC (D2B) 登录支持：Discovery + PKCE + 状态存储 + ID Token 验签

import crypto from 'crypto';
import { z } from 'zod';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import { getRedisManager } from '../redis';

export type OidcClientKind = 'app' | 'ops';

export interface OidcDiscoveryDocument {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  jwks_uri: string;
  end_session_endpoint?: string;
}

export interface OidcStateRecord {
  clientKind: OidcClientKind;
  returnTo: string;
  codeVerifier: string;
  nonce: string;
  createdAt: number;
}

const OIDC_STATE_TTL_SECONDS = 5 * 60;
const OIDC_STATE_KEY_PREFIX = 'oidc_state:'; // 会自动加上 Redis keyPrefix

const oidcClientConfigSchema = z.object({
  issuerUrl: z.string().url(),
  clientId: z.string().min(1),
  clientSecret: z.string().min(1).optional(),
  redirectUri: z.string().url(),
  scopes: z.string().min(1).default('openid profile email'),
});

function getOidcEnv(kind: OidcClientKind) {
  const issuerUrl = process.env.OIDC_ISSUER_URL || '';
  if (kind === 'ops') {
    return {
      issuerUrl: process.env.OIDC_OPS_ISSUER_URL || issuerUrl,
      clientId: process.env.OIDC_OPS_CLIENT_ID || '',
      clientSecret: process.env.OIDC_OPS_CLIENT_SECRET || undefined,
      redirectUri: process.env.OIDC_OPS_REDIRECT_URI || '',
      scopes: process.env.OIDC_OPS_SCOPES || process.env.OIDC_SCOPES || 'openid profile email',
    };
  }

  return {
    issuerUrl,
    clientId: process.env.OIDC_CLIENT_ID || '',
    clientSecret: process.env.OIDC_CLIENT_SECRET || undefined,
    redirectUri: process.env.OIDC_REDIRECT_URI || '',
    scopes: process.env.OIDC_SCOPES || 'openid profile email',
  };
}

export function getOidcClientConfig(kind: OidcClientKind) {
  const parsed = oidcClientConfigSchema.safeParse(getOidcEnv(kind));
  if (!parsed.success) {
    const details = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`OIDC 配置不完整：${details}`);
  }
  return parsed.data;
}

let cachedDiscovery: { issuerUrl: string; fetchedAt: number; doc: OidcDiscoveryDocument } | null = null;

export async function getOidcDiscovery(issuerUrl: string): Promise<OidcDiscoveryDocument> {
  if (cachedDiscovery && cachedDiscovery.issuerUrl === issuerUrl && Date.now() - cachedDiscovery.fetchedAt < 10 * 60 * 1000) {
    return cachedDiscovery.doc;
  }

  const url = new URL('.well-known/openid-configuration', issuerUrl.endsWith('/') ? issuerUrl : `${issuerUrl}/`);
  const res = await fetch(url.toString(), { method: 'GET' });
  if (!res.ok) {
    throw new Error(`OIDC Discovery 获取失败: ${res.status} ${res.statusText}`);
  }

  const json = (await res.json()) as Partial<OidcDiscoveryDocument>;
  const schema = z.object({
    issuer: z.string().min(1),
    authorization_endpoint: z.string().url(),
    token_endpoint: z.string().url(),
    jwks_uri: z.string().url(),
    end_session_endpoint: z.string().url().optional(),
  });
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    throw new Error('OIDC Discovery 文档校验失败');
  }

  cachedDiscovery = { issuerUrl, fetchedAt: Date.now(), doc: parsed.data };
  return parsed.data;
}

function base64UrlEncode(input: Buffer): string {
  return input.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function sha256Base64Url(input: string): string {
  const digest = crypto.createHash('sha256').update(input).digest();
  return base64UrlEncode(digest);
}

function oidcStateKey(state: string): string {
  return `${OIDC_STATE_KEY_PREFIX}${state}`;
}

export async function saveOidcState(state: string, record: OidcStateRecord): Promise<void> {
  const redis = getRedisManager();
  const ok = await redis.set(oidcStateKey(state), record, OIDC_STATE_TTL_SECONDS);
  if (!ok) {
    throw new Error('OIDC state 写入 Redis 失败');
  }
}

export async function consumeOidcState(state: string): Promise<OidcStateRecord | null> {
  const redis = getRedisManager();
  const key = oidcStateKey(state);
  const record = await redis.get<OidcStateRecord>(key);
  if (!record) return null;
  await redis.del(key);
  return record;
}

export async function createAuthorizationUrl(input: {
  clientKind: OidcClientKind;
  returnTo: string;
}): Promise<{ authorizationUrl: string; state: string }> {
  const state = crypto.randomUUID();
  const nonce = crypto.randomUUID();
  const codeVerifier = base64UrlEncode(crypto.randomBytes(32));
  const codeChallenge = sha256Base64Url(codeVerifier);

  const config = getOidcClientConfig(input.clientKind);
  const discovery = await getOidcDiscovery(config.issuerUrl);

  await saveOidcState(state, {
    clientKind: input.clientKind,
    returnTo: input.returnTo,
    nonce,
    codeVerifier,
    createdAt: Date.now(),
  });

  const url = new URL(discovery.authorization_endpoint);
  url.searchParams.set('client_id', config.clientId);
  url.searchParams.set('redirect_uri', config.redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', config.scopes);
  url.searchParams.set('state', state);
  url.searchParams.set('nonce', nonce);
  url.searchParams.set('code_challenge', codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');

  return { authorizationUrl: url.toString(), state };
}

export async function exchangeCodeForTokens(input: {
  clientKind: OidcClientKind;
  code: string;
  codeVerifier: string;
}): Promise<{ idToken: string; accessToken?: string; refreshToken?: string; expiresIn?: number }> {
  const config = getOidcClientConfig(input.clientKind);
  const discovery = await getOidcDiscovery(config.issuerUrl);

  const body = new URLSearchParams();
  body.set('grant_type', 'authorization_code');
  body.set('client_id', config.clientId);
  body.set('redirect_uri', config.redirectUri);
  body.set('code', input.code);
  body.set('code_verifier', input.codeVerifier);
  if (config.clientSecret) {
    body.set('client_secret', config.clientSecret);
  }

  const res = await fetch(discovery.token_endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`OIDC Token 交换失败: ${res.status} ${res.statusText}${text ? `; ${text}` : ''}`);
  }

  const json = (await res.json()) as unknown;
  const schema = z.object({
    id_token: z.string().min(1),
    access_token: z.string().optional(),
    refresh_token: z.string().optional(),
    expires_in: z.number().optional(),
  });
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    throw new Error('OIDC Token 响应校验失败');
  }

  return {
    idToken: parsed.data.id_token,
    accessToken: parsed.data.access_token,
    refreshToken: parsed.data.refresh_token,
    expiresIn: parsed.data.expires_in,
  };
}

export async function verifyIdToken(input: {
  clientKind: OidcClientKind;
  idToken: string;
  expectedNonce: string;
}): Promise<JWTPayload> {
  const config = getOidcClientConfig(input.clientKind);
  const discovery = await getOidcDiscovery(config.issuerUrl);
  const jwks = createRemoteJWKSet(new URL(discovery.jwks_uri));

  const { payload } = await jwtVerify(input.idToken, jwks, {
    issuer: discovery.issuer,
    audience: config.clientId,
  });

  if (payload.nonce !== input.expectedNonce) {
    throw new Error('OIDC nonce 校验失败');
  }

  return payload;
}
