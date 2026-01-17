// dev/src/lib/sso.ts
// SSO单点登录管理器 - 支持OAuth2.0和SAML协议

import crypto from 'crypto';
import { z } from 'zod';
import { prisma } from './prisma';
import { ProfileType, Role, UserStatus, UserType, type Prisma } from '@/generated/prisma';
import { generateToken, hashPassword } from '@/lib/auth';
import { logger } from './logger';

// SSO配置接口
interface SSOConfig {
  provider: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scope: string[];
  authUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  enabled: boolean;
  // Provider-specific（按需）
  agentId?: string;
  gatewayUrl?: string;
  privateKey?: string;
  publicKey?: string;
}

// SSO用户信息接口
interface SSOUserInfo {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  provider: string;
  providerUserId: string;
  metadata?: unknown;
}

// OAuth2.0授权码响应
interface OAuth2TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
}

type DbUser = Prisma.UserGetPayload<{ include: { profile: true; roles: true } }>;

const oauth2TokenResponseSchema: z.ZodType<OAuth2TokenResponse> = z.object({
  access_token: z.string().min(1),
  token_type: z.string().min(1),
  expires_in: z.number(),
  refresh_token: z.string().optional(),
  scope: z.string().optional(),
});

const googleUserInfoSchema = z
  .object({
    id: z.string().min(1),
    email: z.string().email(),
    name: z.string().min(1),
    picture: z.string().optional(),
    verified_email: z.boolean().optional(),
    locale: z.string().optional(),
  })
  .passthrough();

const azureUserInfoSchema = z
  .object({
    id: z.string().min(1),
    mail: z.string().email().optional().nullable(),
    userPrincipalName: z.string().optional(),
    displayName: z.string().min(1),
    jobTitle: z.string().optional().nullable(),
    department: z.string().optional().nullable(),
  })
  .passthrough();

const wechatWorkTokenSchema = z
  .object({
    errcode: z.number().optional(),
    errmsg: z.string().optional(),
    access_token: z.string().min(1).optional(),
    expires_in: z.number().optional(),
  })
  .passthrough();

const wechatWorkAuthGetUserInfoSchema = z
  .object({
    errcode: z.number().optional(),
    errmsg: z.string().optional(),
    UserId: z.string().optional(),
    OpenId: z.string().optional(),
    DeviceId: z.string().optional(),
    user_ticket: z.string().optional(),
    expires_in: z.number().optional(),
  })
  .passthrough();

const wechatWorkUserGetSchema = z
  .object({
    errcode: z.number().optional(),
    errmsg: z.string().optional(),
    userid: z.string().min(1),
    name: z.string().min(1),
    email: z.string().email().optional(),
    avatar: z.string().optional(),
    department: z.array(z.number()).optional(),
    position: z.string().optional(),
    mobile: z.string().optional(),
  })
  .passthrough();

const dingtalkTokenSchema = z
  .object({
    errcode: z.number().optional(),
    errmsg: z.string().optional(),
    access_token: z.string().min(1).optional(),
    expire_in: z.number().optional(),
  })
  .passthrough();

const dingtalkUserInfoSchema = z
  .object({
    errcode: z.number().optional(),
    errmsg: z.string().optional(),
    user_info: z
      .object({
        unionid: z.string().optional(),
        openid: z.string().optional(),
        nick: z.string().optional(),
        avatarUrl: z.string().optional(),
        email: z.string().optional(),
        mobile: z.string().optional(),
      })
      .optional(),
  })
  .passthrough();

const alipayOauthTokenResponseSchema = z
  .object({
    alipay_system_oauth_token_response: z
      .object({
        code: z.string().optional(),
        msg: z.string().optional(),
        sub_code: z.string().optional().nullable(),
        sub_msg: z.string().optional().nullable(),
        access_token: z.string().optional(),
        expires_in: z.union([z.number(), z.string()]).optional(),
        refresh_token: z.string().optional().nullable(),
        user_id: z.string().optional(),
        open_id: z.string().optional(),
        scope: z.string().optional(),
      })
      .passthrough(),
    sign: z.string().optional(),
  })
  .passthrough();

const alipayUserInfoShareResponseSchema = z
  .object({
    alipay_user_info_share_response: z
      .object({
        code: z.string().optional(),
        msg: z.string().optional(),
        sub_code: z.string().optional().nullable(),
        sub_msg: z.string().optional().nullable(),
        user_id: z.string().optional(),
        open_id: z.string().optional(),
        nick_name: z.string().optional(),
        avatar: z.string().optional(),
        login_id: z.string().optional(),
        email: z.string().optional(),
      })
      .passthrough(),
    sign: z.string().optional(),
  })
  .passthrough();

function toPrismaInputJsonValue(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined || value === null) return undefined;
  try {
    return JSON.parse(
      JSON.stringify(value, (_key, v) => (typeof v === 'bigint' ? v.toString() : v))
    ) as Prisma.InputJsonValue;
  } catch {
    return undefined;
  }
}

function getExternalIssuer(provider: string): string {
  return `legalmind:${provider}`;
}

class SSOManager {
  private configs: Map<string, SSOConfig> = new Map();

  constructor() {
    this.initializeConfigs();
  }

  /**
   * 初始化SSO配置
   */
  private initializeConfigs() {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const alipayGatewayUrl =
      process.env.ALIPAY_GATEWAY || 'https://openapi.alipay.com/gateway.do';
    const dingtalkAppId = process.env.DINGTALK_APP_ID || process.env.DINGTALK_APP_KEY;

    // Google OAuth2.0配置
    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
      this.configs.set('google', {
        provider: 'google',
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        redirectUri:
          process.env.GOOGLE_REDIRECT_URI
          || process.env.GOOGLE_CALLBACK_URL
          || `${appUrl}/api/auth/sso/google/callback`,
        scope: ['openid', 'email', 'profile'],
        authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
        enabled: true,
      });
    }

    // Microsoft Azure AD配置
    if (process.env.AZURE_CLIENT_ID && process.env.AZURE_CLIENT_SECRET && process.env.AZURE_TENANT_ID) {
      this.configs.set('azure', {
        provider: 'azure',
        clientId: process.env.AZURE_CLIENT_ID,
        clientSecret: process.env.AZURE_CLIENT_SECRET,
        redirectUri:
          process.env.AZURE_REDIRECT_URI
          || process.env.AZURE_CALLBACK_URL
          || `${appUrl}/api/auth/sso/azure/callback`,
        scope: ['openid', 'email', 'profile'],
        authUrl: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/oauth2/v2.0/authorize`,
        tokenUrl: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/oauth2/v2.0/token`,
        userInfoUrl: 'https://graph.microsoft.com/v1.0/me',
        enabled: true,
      });
    }

    // 企业微信配置
    if (
      process.env.WECHAT_WORK_CORP_ID
      && process.env.WECHAT_WORK_SECRET
      && process.env.WECHAT_WORK_AGENT_ID
    ) {
      this.configs.set('wechat_work', {
        provider: 'wechat_work',
        clientId: process.env.WECHAT_WORK_CORP_ID,
        clientSecret: process.env.WECHAT_WORK_SECRET,
        redirectUri:
          process.env.WECHAT_WORK_REDIRECT_URI
          || process.env.WECHAT_WORK_CALLBACK_URL
          || `${appUrl}/api/auth/sso/wechat_work/callback`,
        scope: ['snsapi_base'],
        authUrl: 'https://open.weixin.qq.com/connect/oauth2/authorize',
        tokenUrl: 'https://qyapi.weixin.qq.com/cgi-bin/gettoken',
        userInfoUrl: 'https://qyapi.weixin.qq.com/cgi-bin/auth/getuserinfo',    
        agentId: process.env.WECHAT_WORK_AGENT_ID,
        enabled: true,
      });
    }

    // 支付宝配置（OAuth2 授权码；需 RSA2 签名）
    if (
      process.env.ALIPAY_APP_ID
      && process.env.ALIPAY_PRIVATE_KEY
      && process.env.ALIPAY_PUBLIC_KEY
    ) {
      this.configs.set('alipay', {
        provider: 'alipay',
        clientId: process.env.ALIPAY_APP_ID,
        clientSecret: '',
        redirectUri:
          process.env.ALIPAY_REDIRECT_URI
          || process.env.ALIPAY_CALLBACK_URL
          || `${appUrl}/api/auth/sso/alipay/callback`,
        scope: [process.env.ALIPAY_SCOPE || 'auth_user'],
        authUrl: 'https://openauth.alipay.com/oauth2/publicAppAuthorize.htm',   
        tokenUrl: alipayGatewayUrl,
        userInfoUrl: alipayGatewayUrl,
        gatewayUrl: alipayGatewayUrl,
        privateKey: process.env.ALIPAY_PRIVATE_KEY,
        publicKey: process.env.ALIPAY_PUBLIC_KEY,
        enabled: true,
      });
    }

    // 钉钉配置
    if (dingtalkAppId && process.env.DINGTALK_APP_SECRET) {
      this.configs.set('dingtalk', {
        provider: 'dingtalk',
        clientId: dingtalkAppId,
        clientSecret: process.env.DINGTALK_APP_SECRET,
        redirectUri:
          process.env.DINGTALK_REDIRECT_URI
          || process.env.DINGTALK_CALLBACK_URL
          || `${appUrl}/api/auth/sso/dingtalk/callback`,
        scope: ['snsapi_login'],
        authUrl: 'https://oapi.dingtalk.com/connect/oauth2/sns_authorize',      
        tokenUrl: 'https://oapi.dingtalk.com/sns/gettoken',
        userInfoUrl: 'https://oapi.dingtalk.com/sns/getuserinfo_bycode',
        enabled: true,
      });
    }
  }

  private normalizeProviderKey(provider: string): string {
    const normalized = provider.trim().toLowerCase();
    if (normalized === 'wechat') return 'wechat_work';
    return normalized;
  }

  /**
   * 生成授权URL
   */
  generateAuthUrl(provider: string, state?: string): string {
    const normalizedProvider = this.normalizeProviderKey(provider);
    const config = this.configs.get(normalizedProvider);
    if (!config || !config.enabled) {
      throw new Error(`SSO提供商 ${provider} 未配置或已禁用`);
    }

    const resolvedState = state || this.generateState();

    if (config.provider === 'wechat_work') {
      if (!config.agentId) {
        throw new Error('企业微信 SSO 缺少 WECHAT_WORK_AGENT_ID 配置');
      }
      const params = new URLSearchParams({
        appid: config.clientId,
        redirect_uri: config.redirectUri,
        response_type: 'code',
        scope: config.scope[0] || 'snsapi_base',
        state: resolvedState,
        agentid: config.agentId,
        connect_redirect: '1',
      });
      return `${config.authUrl}?${params.toString()}#wechat_redirect`;
    }

    if (config.provider === 'dingtalk') {
      const params = new URLSearchParams({
        appid: config.clientId,
        redirect_uri: config.redirectUri,
        response_type: 'code',
        scope: config.scope[0] || 'snsapi_login',
        state: resolvedState,
      });
      return `${config.authUrl}?${params.toString()}`;
    }

    if (config.provider === 'alipay') {
      const params = new URLSearchParams({
        app_id: config.clientId,
        scope: config.scope[0] || 'auth_user',
        redirect_uri: config.redirectUri,
        state: resolvedState,
      });
      return `${config.authUrl}?${params.toString()}`;
    }

    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: 'code',
      scope: config.scope.join(' '),
      state: resolvedState,
    });

    // 特殊处理不同提供商的参数
    if (config.provider === 'google') {
      params.set('access_type', 'offline');
      params.set('prompt', 'consent');
    } else if (config.provider === 'azure') {
      params.set('response_mode', 'query');
    }

    return `${config.authUrl}?${params.toString()}`;
  }

  /**
   * 处理授权码回调
   */
  async handleCallback(provider: string, code: string, _state?: string): Promise<{
    user: SSOUserInfo;
    token: string;
    tokenId: string;
    expiresIn: string;
    isNewUser: boolean;
  }> {
    const normalizedProvider = this.normalizeProviderKey(provider);
    const config = this.configs.get(normalizedProvider);
    if (!config || !config.enabled) {
      throw new Error(`SSO提供商 ${provider} 未配置或已禁用`);
    }

    try {
      const userInfo = await this.fetchUserInfoFromAuthorizationCode(config, code);
      
      // 3. 查找或创建用户
      const { user, isNewUser } = await this.findOrCreateUser(userInfo);        

      // 4. 生成统一会话 JWT（与 /api/auth/login 口径一致）
      const sessionToken = this.generateSessionToken(user);

      // 5. 记录登录日志
      await this.logSSOLogin(user.id, config.provider, userInfo.providerUserId);

      return {
        user: userInfo,
        token: sessionToken.token,
        tokenId: sessionToken.tokenId,
        expiresIn: sessionToken.expiresIn,
        isNewUser,
      };
  } catch (error) {
      logger.error({ err: error, provider: config.provider }, 'SSO回调处理失败');
      throw new Error(`SSO登录失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 根据回调 code 获取统一用户信息（按 provider 分流）
   */
  private async fetchUserInfoFromAuthorizationCode(
    config: SSOConfig,
    code: string
  ): Promise<SSOUserInfo> {
    switch (config.provider) {
      case 'google':
      case 'azure': {
        const tokenResponse = await this.exchangeCodeForToken(config, code);
        return this.fetchUserInfo(config, tokenResponse.access_token);
      }
      case 'wechat_work':
        return this.fetchWechatWorkUserInfo(config, code);
      case 'dingtalk':
        return this.fetchDingtalkUserInfo(config, code);
      case 'alipay':
        return this.fetchAlipayUserInfo(config, code);
      default:
        throw new Error(`不支持的SSO提供商: ${config.provider}`);
    }
  }

  /**
   * 交换授权码获取访问令牌
   */
  private async exchangeCodeForToken(config: SSOConfig, code: string): Promise<OAuth2TokenResponse> {
    const params = new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: config.redirectUri,
    });

    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Token exchange failed: ${response.status} ${errorText}`);
    }

    const json: unknown = await response.json().catch(() => null);
    const parsed = oauth2TokenResponseSchema.safeParse(json);
    if (!parsed.success) {
      throw new Error('Token 响应格式不正确');
    }
    return parsed.data;
  }

  /**
   * 获取用户信息
   */
  private async fetchUserInfo(config: SSOConfig, accessToken: string): Promise<SSOUserInfo> {
    const response = await fetch(config.userInfoUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch user info: ${response.status}`);
    }

    const rawUserInfo = await response.json();
    
    // 根据不同提供商转换用户信息格式
    return this.normalizeUserInfo(config.provider, rawUserInfo);
  }

  /**
   * 标准化用户信息
   */
  private normalizeUserInfo(provider: string, rawUserInfo: unknown): SSOUserInfo {
    switch (provider) {
      case 'google': {
        const parsed = googleUserInfoSchema.safeParse(rawUserInfo);
        if (!parsed.success) {
          throw new Error('Google 用户信息格式不正确');
        }
        const u = parsed.data;
        return {
          id: u.id,
          email: u.email,
          name: u.name,
          avatar: u.picture,
          provider,
          providerUserId: u.id,
          metadata: {
            verified_email: u.verified_email,
            locale: u.locale,
          },
        };
      }

      case 'azure': {
        const parsed = azureUserInfoSchema.safeParse(rawUserInfo);
        if (!parsed.success) {
          throw new Error('Azure AD 用户信息格式不正确');
        }
        const u = parsed.data;
        const email = u.mail ?? u.userPrincipalName;
        if (!email) {
          throw new Error('Azure AD 用户缺少邮箱字段');
        }
        return {
          id: u.id,
          email,
          name: u.displayName,
          avatar: undefined,
          provider,
          providerUserId: u.id,
          metadata: {
            jobTitle: u.jobTitle,
            department: u.department,
          },
        };
      }

      default:
        throw new Error(`不支持的SSO提供商: ${provider}`);
    }
  }

  private async fetchWechatWorkUserInfo(
    config: SSOConfig,
    code: string
  ): Promise<SSOUserInfo> {
    const accessToken = await this.getWechatWorkAccessToken(config);

    const authUrl = new URL(config.userInfoUrl);
    authUrl.searchParams.set('access_token', accessToken);
    authUrl.searchParams.set('code', code);

    const authRes = await fetch(authUrl.toString(), {
      headers: { Accept: 'application/json' },
    });
    if (!authRes.ok) {
      const body = await authRes.text().catch(() => '');
      throw new Error(
        `WECHAT_WORK_GETUSERINFO_FAILED_${authRes.status}: ${body}`.slice(0, 800)
      );
    }

    const authJson: unknown = await authRes.json().catch(() => null);
    const authParsed = wechatWorkAuthGetUserInfoSchema.safeParse(authJson);
    if (!authParsed.success) throw new Error('企业微信 getuserinfo 响应格式不正确');
    const authData = authParsed.data;
    if (typeof authData.errcode === 'number' && authData.errcode !== 0) {
      throw new Error(
        `WECHAT_WORK_GETUSERINFO_ERROR_${authData.errcode}: ${authData.errmsg || 'unknown'}`
      );
    }

    const userId = authData.UserId;
    if (!userId) {
      throw new Error('企业微信授权未返回 UserId（可能返回 OpenId，当前未支持）');
    }

    const detailUrl = new URL('https://qyapi.weixin.qq.com/cgi-bin/user/get');
    detailUrl.searchParams.set('access_token', accessToken);
    detailUrl.searchParams.set('userid', userId);

    const detailRes = await fetch(detailUrl.toString(), {
      headers: { Accept: 'application/json' },
    });
    if (!detailRes.ok) {
      const body = await detailRes.text().catch(() => '');
      throw new Error(
        `WECHAT_WORK_USER_GET_FAILED_${detailRes.status}: ${body}`.slice(0, 800)
      );
    }

    const detailJson: unknown = await detailRes.json().catch(() => null);
    const detailParsed = wechatWorkUserGetSchema.safeParse(detailJson);
    if (!detailParsed.success) throw new Error('企业微信 user/get 响应格式不正确');
    const detail = detailParsed.data;
    if (typeof detail.errcode === 'number' && detail.errcode !== 0) {
      throw new Error(
        `WECHAT_WORK_USER_GET_ERROR_${detail.errcode}: ${detail.errmsg || 'unknown'}`
      );
    }

    if (!detail.email) {
      throw new Error('企业微信未返回 email 字段，无法创建/绑定账号');
    }

    return {
      id: userId,
      email: detail.email,
      name: detail.name,
      avatar: detail.avatar,
      provider: config.provider,
      providerUserId: userId,
      metadata: {
        department: detail.department,
        position: detail.position,
        mobile: detail.mobile,
      },
    };
  }

  private async getWechatWorkAccessToken(config: SSOConfig): Promise<string> {
    const tokenUrl = new URL(config.tokenUrl);
    tokenUrl.searchParams.set('corpid', config.clientId);
    tokenUrl.searchParams.set('corpsecret', config.clientSecret);

    const response = await fetch(tokenUrl.toString(), {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(
        `WECHAT_WORK_TOKEN_FAILED_${response.status}: ${body}`.slice(0, 800)
      );
    }

    const json: unknown = await response.json().catch(() => null);
    const parsed = wechatWorkTokenSchema.safeParse(json);
    if (!parsed.success) throw new Error('企业微信 token 响应格式不正确');
    const data = parsed.data;
    if (typeof data.errcode === 'number' && data.errcode !== 0) {
      throw new Error(
        `WECHAT_WORK_TOKEN_ERROR_${data.errcode}: ${data.errmsg || 'unknown'}`
      );
    }
    if (!data.access_token) throw new Error('企业微信 token 响应缺少 access_token');
    return data.access_token;
  }

  private async fetchDingtalkUserInfo(
    config: SSOConfig,
    code: string
  ): Promise<SSOUserInfo> {
    const accessToken = await this.getDingtalkSnsAccessToken(config);

    const userInfoUrl = new URL(config.userInfoUrl);
    userInfoUrl.searchParams.set('access_token', accessToken);

    const response = await fetch(userInfoUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ tmp_auth_code: code }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`DINGTALK_USERINFO_FAILED_${response.status}: ${body}`.slice(0, 800));
    }

    const json: unknown = await response.json().catch(() => null);
    const parsed = dingtalkUserInfoSchema.safeParse(json);
    if (!parsed.success) throw new Error('钉钉 userinfo 响应格式不正确');
    const data = parsed.data;
    if (typeof data.errcode === 'number' && data.errcode !== 0) {
      throw new Error(
        `DINGTALK_USERINFO_ERROR_${data.errcode}: ${data.errmsg || 'unknown'}`
      );
    }

    const user = data.user_info;
    const unionid = user?.unionid;
    if (!unionid) throw new Error('钉钉未返回 unionid，无法创建/绑定账号');

    const emailCandidate = user?.email;
    const email =
      emailCandidate && z.string().email().safeParse(emailCandidate).success
        ? emailCandidate
        : null;
    if (!email) {
      throw new Error('钉钉未返回 email 字段，无法创建/绑定账号');
    }

    return {
      id: unionid,
      email,
      name: user?.nick || '钉钉用户',
      avatar: user?.avatarUrl,
      provider: config.provider,
      providerUserId: unionid,
      metadata: {
        openid: user?.openid,
        mobile: user?.mobile,
      },
    };
  }

  private async getDingtalkSnsAccessToken(config: SSOConfig): Promise<string> {
    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        appid: config.clientId,
        appsecret: config.clientSecret,
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`DINGTALK_TOKEN_FAILED_${response.status}: ${body}`.slice(0, 800));
    }

    const json: unknown = await response.json().catch(() => null);
    const parsed = dingtalkTokenSchema.safeParse(json);
    if (!parsed.success) throw new Error('钉钉 token 响应格式不正确');
    const data = parsed.data;
    if (typeof data.errcode === 'number' && data.errcode !== 0) {
      throw new Error(
        `DINGTALK_TOKEN_ERROR_${data.errcode}: ${data.errmsg || 'unknown'}`
      );
    }
    if (!data.access_token) throw new Error('钉钉 token 响应缺少 access_token');
    return data.access_token;
  }

  private async fetchAlipayUserInfo(config: SSOConfig, code: string): Promise<SSOUserInfo> {
    const { accessToken } = await this.exchangeAlipayAuthorizationCode(config, code);
    return this.fetchAlipayUserInfoShare(config, accessToken);
  }

  private normalizePemKey(value: string, label: 'PRIVATE KEY' | 'PUBLIC KEY'): string {
    const trimmed = value.trim().replace(/\\n/g, '\n');
    if (trimmed.includes('-----BEGIN')) return trimmed;

    const base64 = trimmed.replace(/\s+/g, '');
    const chunks = base64.match(/.{1,64}/g) ?? [base64];
    return `-----BEGIN ${label}-----\n${chunks.join('\n')}\n-----END ${label}-----`;
  }

  private formatAlipayTimestamp(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  }

  private signAlipayParams(params: Record<string, string>, privateKey: string): string {
    const signContent = Object.keys(params)
      .sort()
      .map((key) => `${key}=${params[key]}`)
      .join('&');

    const signer = crypto.createSign('RSA-SHA256');
    signer.update(signContent, 'utf8');
    signer.end();
    return signer.sign(this.normalizePemKey(privateKey, 'PRIVATE KEY'), 'base64');
  }

  private async callAlipayGateway(config: SSOConfig, params: Record<string, string>): Promise<unknown> {
    if (!config.gatewayUrl || !config.privateKey) {
      throw new Error('ALIPAY_NOT_CONFIGURED');
    }

    const requestParams: Record<string, string> = {
      app_id: config.clientId,
      method: params.method,
      format: 'JSON',
      charset: 'utf-8',
      sign_type: 'RSA2',
      timestamp: this.formatAlipayTimestamp(new Date()),
      version: '1.0',
      ...Object.fromEntries(Object.entries(params).filter(([key]) => key !== 'method')),
    };

    const sign = this.signAlipayParams(requestParams, config.privateKey);
    const body = new URLSearchParams({ ...requestParams, sign }).toString();

    const response = await fetch(config.gatewayUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`ALIPAY_GATEWAY_FAILED_${response.status}: ${text}`.slice(0, 800));
    }

    return response.json().catch(() => null);
  }

  private async exchangeAlipayAuthorizationCode(
    config: SSOConfig,
    code: string
  ): Promise<{ accessToken: string; userId: string | null; openId: string | null }> {
    const json = await this.callAlipayGateway(config, {
      method: 'alipay.system.oauth.token',
      grant_type: 'authorization_code',
      code,
    });

    const parsed = alipayOauthTokenResponseSchema.safeParse(json);
    if (!parsed.success) throw new Error('支付宝 token 响应格式不正确');

    const resp = parsed.data.alipay_system_oauth_token_response;
    if (resp.code && resp.code !== '10000') {
      throw new Error(`ALIPAY_TOKEN_ERROR_${resp.code}: ${resp.sub_msg || resp.msg || 'unknown'}`);
    }
    if (!resp.access_token) {
      throw new Error(`ALIPAY_TOKEN_ERROR: ${resp.sub_msg || resp.msg || 'missing access_token'}`);
    }

    return {
      accessToken: resp.access_token,
      userId: resp.user_id ?? null,
      openId: resp.open_id ?? null,
    };
  }

  private async fetchAlipayUserInfoShare(config: SSOConfig, accessToken: string): Promise<SSOUserInfo> {
    const json = await this.callAlipayGateway(config, {
      method: 'alipay.user.info.share',
      auth_token: accessToken,
    });

    const parsed = alipayUserInfoShareResponseSchema.safeParse(json);
    if (!parsed.success) throw new Error('支付宝 user.info.share 响应格式不正确');

    const resp = parsed.data.alipay_user_info_share_response;
    if (resp.code && resp.code !== '10000') {
      throw new Error(`ALIPAY_USERINFO_ERROR_${resp.code}: ${resp.sub_msg || resp.msg || 'unknown'}`);
    }

    const providerUserId = resp.user_id || resp.open_id;
    if (!providerUserId) throw new Error('支付宝未返回 user_id/open_id，无法创建/绑定账号');

    const emailCandidate = resp.email || resp.login_id;
    const email =
      emailCandidate && z.string().email().safeParse(emailCandidate).success
        ? emailCandidate
        : null;
    if (!email) {
      throw new Error('支付宝未返回 email 字段，无法创建/绑定账号');
    }

    return {
      id: providerUserId,
      email,
      name: resp.nick_name || providerUserId,
      avatar: resp.avatar,
      provider: config.provider,
      providerUserId,
      metadata: {
        open_id: resp.open_id ?? null,
        user_id: resp.user_id ?? null,
        login_id: resp.login_id ?? null,
      },
    };
  }

  /**
   * 查找或创建用户
   */
  private async findOrCreateUser(userInfo: SSOUserInfo): Promise<{ user: DbUser; isNewUser: boolean }> {
    const now = new Date();
    const issuer = getExternalIssuer(userInfo.provider);
    const subject = userInfo.providerUserId;
    const rawClaims = toPrismaInputJsonValue(userInfo.metadata);

    // 1) 优先按外部身份映射查找（避免邮箱变更导致账号错配）
    const identity = await prisma.externalIdentity.findUnique({
      where: { issuer_subject: { issuer, subject } },
      include: {
        user: {
          include: {
            profile: true,
            roles: true,
          },
        },
      },
    });

    if (identity) {
      const user = identity.user;

      await prisma.externalIdentity.update({
        where: { id: identity.id },
        data: {
          providerType: userInfo.provider,
          email: userInfo.email,
          emailVerified: true,
          rawClaims,
          lastLoginAt: now,
        },
      });

      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: now, emailVerified: true },
      });

      return { user, isNewUser: false };
    }

    // 2) 其次按邮箱查找并绑定外部身份（首次绑定）
    const user = await prisma.user.findUnique({
      where: { email: userInfo.email },
      include: {
        profile: true,
        roles: true,
      },
    });

    if (user) {
      await prisma.$transaction(async (tx) => {
        await tx.externalIdentity.create({
          data: {
            userId: user.id,
            providerType: userInfo.provider,
            issuer,
            subject,
            email: userInfo.email,
            emailVerified: true,
            rawClaims,
            lastLoginAt: now,
          },
        });

        await tx.user.update({
          where: { id: user.id },
          data: { lastLoginAt: now, emailVerified: true },
        });
      });

      return { user, isNewUser: false };
    }

    // 3) 创建新用户 + 外部身份
    const created = await prisma.$transaction(async (tx) => {
      const randomPassword = crypto.randomBytes(32).toString('hex');
      const passwordHash = await hashPassword(randomPassword);

      const newUser = await tx.user.create({
        data: {
          email: userInfo.email,
          passwordHash,
          userType: UserType.INDIVIDUAL,
          status: UserStatus.ACTIVE,
          emailVerified: true,
          lastLoginAt: now,
        },
      });

      await tx.userProfile.create({
        data: {
          userId: newUser.id,
          profileType: ProfileType.INDIVIDUAL,
          realName: userInfo.name,
        },
      });

      await tx.externalIdentity.create({
        data: {
          userId: newUser.id,
          providerType: userInfo.provider,
          issuer,
          subject,
          email: userInfo.email,
          emailVerified: true,
          rawClaims,
          lastLoginAt: now,
        },
      });

      await tx.userRole.create({
        data: {
          userId: newUser.id,
          role: Role.END_USER,
          isActive: true,
          assignedBy: newUser.id,
        },
      });

      return await tx.user.findUnique({
        where: { id: newUser.id },
        include: {
          profile: true,
          roles: true,
        },
      });
    });

    if (!created) {
      throw new Error('创建用户失败：用户记录读取为空');
    }

    return { user: created, isNewUser: true };
  }

  /**
   * 生成统一会话 JWT（用于 Cookie 会话与 Bearer 调用）
   */
  private generateSessionToken(user: DbUser) {
    const roles = user.roles.filter((r) => r.isActive).map((r) => r.role);
    return generateToken({
      userId: user.id,
      email: user.email,
      userType: user.userType,
      roles,
      status: user.status,
    });
  }

  /**
   * 记录SSO登录日志
   */
  private async logSSOLogin(userId: string, provider: string, providerUserId: string): Promise<void> {
    try {
      // 这里可以记录到专门的登录日志表
      logger.info({ userId, provider, providerUserId }, 'SSO登录记录');
    } catch (error) {
      logger.error({ err: error }, '记录SSO登录日志失败');
    }
  }

  /**
   * 生成状态参数
   */
  private generateState(): string {
    return Buffer.from(JSON.stringify({
      timestamp: Date.now(),
      nonce: crypto.randomUUID(),
    })).toString('base64url');
  }

  /**
   * 验证状态参数
   */
  validateState(state: string): boolean {
    try {
      const decoded = JSON.parse(Buffer.from(state, 'base64url').toString());
      const now = Date.now();
      const stateTime = decoded.timestamp;
      
      // 状态参数有效期5分钟
      return (now - stateTime) < 5 * 60 * 1000;
    } catch {
      return false;
    }
  }

  /**
   * 获取可用的SSO提供商
   */
  getAvailableProviders(): Array<{ provider: string; name: string; enabled: boolean }> {
    const providers = [
      { provider: 'google', name: 'Google', enabled: this.configs.get('google')?.enabled || false },
      { provider: 'azure', name: 'Microsoft Azure AD', enabled: this.configs.get('azure')?.enabled || false },
      { provider: 'wechat', name: '企业微信', enabled: this.configs.get('wechat_work')?.enabled || false },
      { provider: 'dingtalk', name: '钉钉', enabled: this.configs.get('dingtalk')?.enabled || false },
      { provider: 'alipay', name: '支付宝', enabled: this.configs.get('alipay')?.enabled || false },
    ];

    return providers;
  }

  /**
   * 获取SSO统计信息
   */
  async getSSOStats(): Promise<{
    totalSSOUsers: number;
    availableProviders: number;
    lastUpdated: string;
    error?: string;
    }> {
      try {
        const users = await prisma.externalIdentity.groupBy({
          by: ['userId'],
          where: { issuer: { startsWith: 'legalmind:' } },
          _count: { _all: true },
        });
        const totalSSOUsers = users.length;

        return {
          totalSSOUsers,
          availableProviders: this.getAvailableProviders().filter((p) => p.enabled).length,
          lastUpdated: new Date().toISOString(),
        };
      } catch {
        return {
          totalSSOUsers: 0,
          availableProviders: 0,
          lastUpdated: new Date().toISOString(),
          error: '获取SSO统计失败',
        };
      }
    }
  }

// 创建全局SSO管理器实例
let ssoManager: SSOManager | null = null;

export function getSSOManager(): SSOManager {
  if (!ssoManager) {
    ssoManager = new SSOManager();
  }
  return ssoManager;
}

export { SSOManager };
export type { SSOConfig, SSOUserInfo, OAuth2TokenResponse };
