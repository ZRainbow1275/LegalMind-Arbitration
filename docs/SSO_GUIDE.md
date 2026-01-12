# LegalMind 仲裁平台 SSO 单点登录指南

**文档版本**: Version 2.0  
**更新日期**: 2025年9月3日  
**维护者**: LegalMind开发团队  

## 📋 概述

本文档详细介绍了LegalMind仲裁平台的SSO单点登录系统，包括OAuth2.0协议实现、多平台支持、用户管理等功能的配置和使用方法。

## 🔐 SSO架构

### 支持的SSO提供商
- **Google OAuth2.0**: 个人和企业Google账户
- **Microsoft Azure AD**: 企业Azure Active Directory
- **企业微信**: 企业微信工作账户
- **钉钉**: 钉钉企业账户

### 技术架构
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   前端应用      │───▶│   SSO管理器      │───▶│   SSO提供商     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌──────────────────┐
                       │   用户管理系统   │
                       └──────────────────┘
```

## 🛠️ SSO管理器

### 核心类结构
```typescript
// lib/sso.ts
class SSOManager {
  private configs: Map<string, SSOConfig>;
  
  // 生成授权URL
  generateAuthUrl(provider: string, state?: string): string;
  
  // 处理授权回调
  async handleCallback(provider: string, code: string, state?: string): Promise<{
    user: SSOUserInfo;
    token: string;
    isNewUser: boolean;
  }>;
  
  // 获取可用提供商
  getAvailableProviders(): Array<{ provider: string; name: string; enabled: boolean }>;
}
```

### 配置管理
```typescript
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
}
```

## 🌐 Google OAuth2.0 集成

### 配置设置
```env
# Google OAuth2.0 配置
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GOOGLE_REDIRECT_URI="http://localhost:3000/api/auth/sso/google/callback"
```

### 配置详情
```typescript
// Google OAuth2.0 配置
const googleConfig: SSOConfig = {
  provider: 'google',
  clientId: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  redirectUri: process.env.GOOGLE_REDIRECT_URI!,
  scope: ['openid', 'email', 'profile'],
  authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenUrl: 'https://oauth2.googleapis.com/token',
  userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
  enabled: true,
};
```

### 使用流程
```typescript
// 1. 生成授权URL
const authUrl = ssoManager.generateAuthUrl('google', state);

// 2. 用户授权后处理回调
const result = await ssoManager.handleCallback('google', code, state);

if (result.isNewUser) {
  console.log('新用户注册成功');
} else {
  console.log('用户登录成功');
}
```

### 用户信息标准化
```typescript
// Google用户信息标准化
private normalizeGoogleUserInfo(rawUserInfo: any): SSOUserInfo {
  return {
    id: rawUserInfo.id,
    email: rawUserInfo.email,
    name: rawUserInfo.name,
    avatar: rawUserInfo.picture,
    provider: 'google',
    providerUserId: rawUserInfo.id,
    metadata: {
      verified_email: rawUserInfo.verified_email,
      locale: rawUserInfo.locale,
    },
  };
}
```

## 🏢 Microsoft Azure AD 集成

### 配置设置
```env
# Azure AD 配置
AZURE_CLIENT_ID="your-azure-client-id"
AZURE_CLIENT_SECRET="your-azure-client-secret"
AZURE_TENANT_ID="your-azure-tenant-id"
AZURE_REDIRECT_URI="http://localhost:3000/api/auth/sso/azure/callback"
```

### 配置详情
```typescript
// Azure AD 配置
const azureConfig: SSOConfig = {
  provider: 'azure',
  clientId: process.env.AZURE_CLIENT_ID!,
  clientSecret: process.env.AZURE_CLIENT_SECRET!,
  redirectUri: process.env.AZURE_REDIRECT_URI!,
  scope: ['openid', 'email', 'profile'],
  authUrl: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/oauth2/v2.0/authorize`,
  tokenUrl: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/oauth2/v2.0/token`,
  userInfoUrl: 'https://graph.microsoft.com/v1.0/me',
  enabled: true,
};
```

### 用户信息标准化
```typescript
// Azure AD用户信息标准化
private normalizeAzureUserInfo(rawUserInfo: any): SSOUserInfo {
  return {
    id: rawUserInfo.id,
    email: rawUserInfo.mail || rawUserInfo.userPrincipalName,
    name: rawUserInfo.displayName,
    avatar: null,
    provider: 'azure',
    providerUserId: rawUserInfo.id,
    metadata: {
      jobTitle: rawUserInfo.jobTitle,
      department: rawUserInfo.department,
      officeLocation: rawUserInfo.officeLocation,
    },
  };
}
```

## 💼 企业微信集成

### 配置设置
```env
# 企业微信配置
WECHAT_WORK_CORP_ID="your-corp-id"
WECHAT_WORK_SECRET="your-corp-secret"
WECHAT_WORK_REDIRECT_URI="http://localhost:3000/api/auth/sso/wechat/callback"
```

### 配置详情
```typescript
// 企业微信配置
const wechatWorkConfig: SSOConfig = {
  provider: 'wechat_work',
  clientId: process.env.WECHAT_WORK_CORP_ID!,
  clientSecret: process.env.WECHAT_WORK_SECRET!,
  redirectUri: process.env.WECHAT_WORK_REDIRECT_URI!,
  scope: ['snsapi_base'],
  authUrl: 'https://open.weixin.qq.com/connect/oauth2/authorize',
  tokenUrl: 'https://qyapi.weixin.qq.com/cgi-bin/gettoken',
  userInfoUrl: 'https://qyapi.weixin.qq.com/cgi-bin/user/getuserinfo',
  enabled: true,
};
```

### 用户信息标准化
```typescript
// 企业微信用户信息标准化
private normalizeWechatWorkUserInfo(rawUserInfo: any): SSOUserInfo {
  return {
    id: rawUserInfo.UserId,
    email: rawUserInfo.email,
    name: rawUserInfo.name,
    avatar: rawUserInfo.avatar,
    provider: 'wechat_work',
    providerUserId: rawUserInfo.UserId,
    metadata: {
      department: rawUserInfo.department,
      position: rawUserInfo.position,
      mobile: rawUserInfo.mobile,
    },
  };
}
```

## 📱 钉钉集成

### 配置设置
```env
# 钉钉配置
DINGTALK_APP_ID="your-app-id"
DINGTALK_APP_SECRET="your-app-secret"
DINGTALK_REDIRECT_URI="http://localhost:3000/api/auth/sso/dingtalk/callback"
```

### 配置详情
```typescript
// 钉钉配置
const dingtalkConfig: SSOConfig = {
  provider: 'dingtalk',
  clientId: process.env.DINGTALK_APP_ID!,
  clientSecret: process.env.DINGTALK_APP_SECRET!,
  redirectUri: process.env.DINGTALK_REDIRECT_URI!,
  scope: ['openid'],
  authUrl: 'https://oapi.dingtalk.com/connect/oauth2/sns_authorize',
  tokenUrl: 'https://oapi.dingtalk.com/sns/gettoken',
  userInfoUrl: 'https://oapi.dingtalk.com/sns/getuserinfo',
  enabled: true,
};
```

### 用户信息标准化
```typescript
// 钉钉用户信息标准化
private normalizeDingtalkUserInfo(rawUserInfo: any): SSOUserInfo {
  return {
    id: rawUserInfo.unionid,
    email: rawUserInfo.email,
    name: rawUserInfo.nick,
    avatar: rawUserInfo.avatarUrl,
    provider: 'dingtalk',
    providerUserId: rawUserInfo.unionid,
    metadata: {
      openid: rawUserInfo.openid,
      mobile: rawUserInfo.mobile,
    },
  };
}
```

## 🔄 SSO登录流程

### 完整登录流程
```typescript
// 1. 前端发起SSO登录请求
POST /api/auth/sso
{
  "provider": "google",
  "returnUrl": "/dashboard"
}

// 2. 后端生成授权URL
{
  "success": true,
  "data": {
    "provider": "google",
    "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?client_id=...",
    "state": "encoded_state_parameter"
  }
}

// 3. 用户在SSO提供商完成授权

// 4. SSO提供商回调到后端
GET /api/auth/sso/google/callback?code=auth_code&state=state_parameter

// 5. 后端处理回调并返回结果
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "用户姓名"
    },
    "token": "jwt_token",
    "isNewUser": false,
    "returnUrl": "/dashboard"
  }
}
```

### 状态参数管理
```typescript
// 生成状态参数
private generateState(returnUrl?: string): string {
  return Buffer.from(JSON.stringify({
    timestamp: Date.now(),
    returnUrl: returnUrl || '/',
    random: Math.random().toString(36).substring(2),
  })).toString('base64url');
}

// 验证状态参数
validateState(state: string): boolean {
  try {
    const decoded = JSON.parse(Buffer.from(state, 'base64url').toString());
    const now = Date.now();
    const stateTime = decoded.timestamp;
    
    // 状态参数有效期5分钟
    return (now - stateTime) < 5 * 60 * 1000;
  } catch (error) {
    return false;
  }
}
```

## 👤 用户管理

### 自动用户创建
```typescript
// 查找或创建用户
private async findOrCreateUser(userInfo: SSOUserInfo): Promise<{ user: any; isNewUser: boolean }> {
  // 首先尝试通过邮箱查找现有用户
  let user = await prisma.user.findUnique({
    where: { email: userInfo.email },
    include: {
      profile: true,
      roles: true,
    },
  });

  if (user) {
    // 更新用户的SSO信息
    await prisma.user.update({
      where: { id: user.id },
      data: {
        metadata: {
          ...user.metadata,
          sso: {
            ...user.metadata?.sso,
            [userInfo.provider]: {
              providerUserId: userInfo.providerUserId,
              lastLogin: new Date().toISOString(),
              userInfo: userInfo.metadata,
            },
          },
        },
      },
    });

    return { user, isNewUser: false };
  }

  // 创建新用户
  user = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        email: userInfo.email,
        userType: 'INDIVIDUAL',
        status: 'ACTIVE',
        metadata: {
          sso: {
            [userInfo.provider]: {
              providerUserId: userInfo.providerUserId,
              lastLogin: new Date().toISOString(),
              userInfo: userInfo.metadata,
            },
          },
        },
      },
    });

    // 创建用户档案
    await tx.userProfile.create({
      data: {
        userId: newUser.id,
        realName: userInfo.name,
        avatar: userInfo.avatar,
        isVerified: true, // SSO用户默认已验证
      },
    });

    // 分配默认角色
    await tx.userRole.create({
      data: {
        userId: newUser.id,
        role: 'APPLICANT',
        isActive: true,
        assignedBy: newUser.id, // 自动分配
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

  return { user: user!, isNewUser: true };
}
```

### JWT令牌生成
```typescript
// 生成JWT令牌
private generateJWT(user: any): string {
  const payload = {
    userId: user.id,
    email: user.email,
    userType: user.userType,
    roles: user.roles.map((r: any) => r.role),
    loginMethod: 'sso',
  };

  return sign(payload, this.jwtSecret, {
    expiresIn: '7d',
    issuer: 'legalmind-arbitration',
    audience: 'legalmind-users',
  });
}
```

## 🔒 安全机制

### CSRF防护
```typescript
// 状态参数防CSRF攻击
const state = this.generateState(returnUrl);
const authUrl = `${config.authUrl}?${params.toString()}&state=${state}`;

// 回调时验证状态参数
if (!this.validateState(state)) {
  throw new Error('无效的状态参数，可能存在CSRF攻击');
}
```

### 会话管理
```typescript
// 设置安全的Cookie
response.cookies.set('auth-token', token, {
  httpOnly: true,                    // 防止XSS攻击
  secure: process.env.NODE_ENV === 'production', // HTTPS环境下启用
  sameSite: 'lax',                  // CSRF防护
  maxAge: 7 * 24 * 60 * 60,         // 7天有效期
  path: '/',                        // 全站有效
});
```

### 权限映射
```typescript
// SSO用户权限映射
class SSOPermissionMapper {
  static mapGoogleUser(userInfo: any): string[] {
    // Google用户默认为申请人角色
    return ['APPLICANT'];
  }

  static mapAzureUser(userInfo: any): string[] {
    // 根据Azure AD中的角色信息映射
    const roles = ['APPLICANT'];
    
    if (userInfo.jobTitle?.includes('律师')) {
      roles.push('AGENT');
    }
    
    if (userInfo.jobTitle?.includes('仲裁员')) {
      roles.push('ARBITRATOR');
    }
    
    return roles;
  }

  static mapWechatWorkUser(userInfo: any): string[] {
    // 根据企业微信中的部门和职位映射
    const roles = ['APPLICANT'];
    
    if (userInfo.department?.includes('法务')) {
      roles.push('AGENT');
    }
    
    return roles;
  }
}
```

## 📊 监控和统计

### SSO使用统计
```typescript
// 获取SSO统计信息
async getSSOStats(): Promise<any> {
  try {
    const stats = await prisma.user.groupBy({
      by: [],
      _count: {
        id: true,
      },
      where: {
        metadata: {
          path: ['sso'],
          not: null,
        },
      },
    });

    return {
      totalSSOUsers: stats[0]?._count.id || 0,
      availableProviders: this.getAvailableProviders().filter(p => p.enabled).length,
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    return {
      totalSSOUsers: 0,
      availableProviders: 0,
      error: '获取SSO统计失败',
    };
  }
}
```

### 登录日志
```typescript
// 记录SSO登录日志
private async logSSOLogin(userId: string, provider: string, providerUserId: string): Promise<void> {
  try {
    // 记录登录事件
    await prisma.user.update({
      where: { id: userId },
      data: {
        lastLoginAt: new Date(),
        metadata: {
          ...user.metadata,
          sso: {
            ...user.metadata?.sso,
            [provider]: {
              ...user.metadata?.sso?.[provider],
              lastLogin: new Date().toISOString(),
            },
          },
        },
      },
    });

    console.log(`SSO登录记录: 用户 ${userId} 通过 ${provider} (${providerUserId}) 登录`);
  } catch (error) {
    console.error('记录SSO登录日志失败:', error);
  }
}
```

## 🚀 扩展和定制

### 添加新的SSO提供商
1. 在`SSOManager`中添加新的配置
2. 实现用户信息标准化方法
3. 添加权限映射逻辑
4. 创建对应的回调路由
5. 更新前端SSO选择界面

### 自定义SSO流程
```typescript
// 自定义SSO处理器
class CustomSSOHandler extends SSOManager {
  async handleCustomProvider(code: string, state: string): Promise<any> {
    // 自定义SSO处理逻辑
    const tokenResponse = await this.exchangeCustomToken(code);
    const userInfo = await this.fetchCustomUserInfo(tokenResponse.access_token);
    const normalizedUser = this.normalizeCustomUserInfo(userInfo);
    
    return await this.findOrCreateUser(normalizedUser);
  }
}
```

## 🔧 故障排除

### 常见问题
1. **授权失败**: 检查客户端ID和密钥配置
2. **回调错误**: 验证回调URL配置
3. **用户信息获取失败**: 检查API权限和作用域
4. **状态参数验证失败**: 检查时间同步和参数编码

### 调试工具
```typescript
// SSO调试信息
export function debugSSO(provider: string, step: string, data: any): void {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[SSO Debug] ${provider} - ${step}:`, data);
  }
}
```

---

**📚 相关文档**:
- [API设计指南](./API_DESIGN_GUIDE.md)
- [后端开发指南](./BACKEND_DEVELOPMENT_GUIDE.md)
- [用户认证指南](./AUTH_GUIDE.md)
- [安全最佳实践](./SECURITY_GUIDE.md)
