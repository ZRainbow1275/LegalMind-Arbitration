# LegalMind 仲裁平台后端开发指南

**文档版本**: Version 2.0  
**更新日期**: 2025年9月3日  
**维护者**: LegalMind开发团队  

## 📋 概述

本文档为LegalMind仲裁平台后端开发提供全面的技术指南，包括技术栈介绍、开发环境搭建、模块开发规范、最佳实践等，帮助开发者快速上手并高效开发。

## 🛠️ 技术栈

### 核心技术
- **运行时**: Node.js 18+
- **框架**: Next.js 15 (App Router)
- **语言**: TypeScript 5.x
- **数据库**: PostgreSQL 17
- **ORM**: Prisma 5.x
- **缓存**: Redis 7.x
- **认证**: JWT + RBAC

### 开发工具
- **包管理**: npm/yarn/pnpm
- **代码格式**: Prettier + ESLint
- **类型检查**: TypeScript
- **测试框架**: Jest + Testing Library
- **API文档**: 自动生成
- **版本控制**: Git

### 部署技术
- **容器化**: Docker + Docker Compose
- **CI/CD**: GitHub Actions
- **监控**: 自建监控系统
- **日志**: 结构化日志
- **负载均衡**: Nginx

## 🚀 快速开始

### 环境要求
```bash
Node.js >= 18.0.0
PostgreSQL >= 17.0
Redis >= 7.0
Git >= 2.30
```

### 项目初始化
```bash
# 克隆项目
git clone <repository-url>
cd legalmind-arbitration/dev

# 安装依赖
npm install

# 环境配置
cp .env.example .env.local
# 编辑 .env.local 配置数据库连接等

# 数据库初始化
npx prisma generate
npx prisma migrate dev

# 启动开发服务器
npm run dev
```

### 环境变量配置
```env
# 数据库配置
DATABASE_URL="postgresql://postgres:6532282@localhost:5433/legalmind_arbitration"

# Redis配置
REDIS_URL="redis://localhost:6379"

# JWT配置
JWT_SECRET="your-super-secret-jwt-key"
JWT_EXPIRES_IN="7d"

# AI服务配置
OPENAI_API_KEY="your-openai-api-key"
TENCENT_OCR_SECRET_ID="your-tencent-secret-id"
TENCENT_OCR_SECRET_KEY="your-tencent-secret-key"

# 外部系统配置
COURT_SYSTEM_API_KEY="your-court-system-key"
NOTARY_SYSTEM_API_KEY="your-notary-system-key"

# SSO配置
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

## 📁 项目结构

```
dev/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API路由
│   │   │   ├── auth/          # 认证相关API
│   │   │   ├── cases/         # 案件管理API
│   │   │   ├── hearings/      # 庭审管理API
│   │   │   ├── mediations/    # 调解管理API
│   │   │   ├── documents/     # 文档管理API
│   │   │   ├── notifications/ # 通知管理API
│   │   │   ├── ai/           # AI服务API
│   │   │   ├── integrations/ # 外部系统集成API
│   │   │   └── system/       # 系统管理API
│   │   └── globals.css       # 全局样式
│   ├── lib/                   # 核心工具库
│   │   ├── api-response.ts    # API响应格式
│   │   ├── auth.ts           # 认证授权
│   │   ├── validation.ts     # 数据验证
│   │   ├── prisma.ts         # 数据库连接
│   │   ├── redis.ts          # Redis缓存
│   │   ├── middleware.ts     # 中间件系统
│   │   ├── ai-services.ts    # AI服务集成
│   │   ├── external-systems.ts # 外部系统集成
│   │   └── sso.ts            # SSO单点登录
│   └── components/           # 共享组件
├── prisma/                   # 数据库相关
│   ├── schema.prisma         # 数据模型定义
│   ├── migrations/           # 数据库迁移
│   └── seed.ts              # 种子数据
├── docs/                     # 项目文档
├── tests/                    # 测试文件
├── .env.example             # 环境变量模板
├── package.json             # 项目配置
└── tsconfig.json            # TypeScript配置
```

## 🔧 核心模块开发

### 1. API路由开发

#### 基础API模板
```typescript
// app/api/example/route.ts
import { NextRequest } from 'next/server';
import { getAuthenticatedUser, PermissionCheckers } from '@/lib/auth';
import { validateRequestBody } from '@/lib/validation';
import { createSuccessResponse, ErrorResponses } from '@/lib/api-response';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// 数据验证Schema
const createExampleSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  category: z.enum(['TYPE_A', 'TYPE_B', 'TYPE_C'])
});

/**
 * 创建示例资源
 * POST /api/example
 */
export async function POST(request: NextRequest) {
  try {
    // 1. 认证检查
    const authUser = getAuthenticatedUser(request);
    if (!authUser) {
      return ErrorResponses.UNAUTHORIZED();
    }

    // 2. 权限检查
    if (!PermissionCheckers.canCreateExample(authUser)) {
      return ErrorResponses.FORBIDDEN('无权限创建示例资源');
    }

    // 3. 数据验证
    const validation = await validateRequestBody(request, createExampleSchema);
    if (!validation.success) {
      return ErrorResponses.VALIDATION_ERROR(validation.errors);
    }

    const { name, description, category } = validation.data;

    // 4. 业务逻辑
    const example = await prisma.example.create({
      data: {
        name,
        description,
        category,
        createdBy: authUser.id,
      },
      include: {
        creator: {
          select: {
            id: true,
            email: true,
            profile: {
              select: {
                realName: true
              }
            }
          }
        }
      }
    });

    // 5. 返回响应
    return createSuccessResponse(example, '创建成功');

  } catch (error) {
    console.error('创建示例资源失败:', error);
    return ErrorResponses.INTERNAL_ERROR();
  }
}

/**
 * 获取示例资源列表
 * GET /api/example
 */
export async function GET(request: NextRequest) {
  try {
    const authUser = getAuthenticatedUser(request);
    if (!authUser) {
      return ErrorResponses.UNAUTHORIZED();
    }

    // 解析查询参数
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const category = searchParams.get('category');
    const search = searchParams.get('search');

    // 构建查询条件
    const where: any = {};
    if (category) where.category = category;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    // 查询数据
    const [examples, total] = await Promise.all([
      prisma.example.findMany({
        where,
        include: {
          creator: {
            select: {
              id: true,
              email: true,
              profile: { select: { realName: true } }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.example.count({ where })
    ]);

    return createPaginatedResponse(examples, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    }, '获取列表成功');

  } catch (error) {
    console.error('获取示例资源列表失败:', error);
    return ErrorResponses.INTERNAL_ERROR();
  }
}
```

### 2. 数据验证开发

#### Zod Schema定义
```typescript
// lib/validation/schemas.ts
import { z } from 'zod';

// 用户相关Schema
export const userRegistrationSchema = z.object({
  email: z.string().email('邮箱格式不正确'),
  password: z.string().min(8, '密码至少8位').max(50, '密码最多50位'),
  userType: z.enum(['INDIVIDUAL', 'ENTERPRISE'], {
    errorMap: () => ({ message: '用户类型必须是个人或企业' })
  }),
  profile: z.object({
    realName: z.string().min(1, '真实姓名不能为空').max(50, '真实姓名最多50字符'),
    phone: z.string().regex(/^1[3-9]\d{9}$/, '手机号格式不正确').optional(),
    idCardNumber: z.string().regex(/^\d{17}[\dX]$/, '身份证号格式不正确').optional(),
  })
});

// 案件相关Schema
export const caseCreationSchema = z.object({
  title: z.string().min(1, '案件标题不能为空').max(200, '案件标题最多200字符'),
  caseType: z.enum(['CONTRACT_DISPUTE', 'PROPERTY_DISPUTE', 'LABOR_DISPUTE'], {
    errorMap: () => ({ message: '案件类型无效' })
  }),
  description: z.string().min(10, '案件描述至少10字符').max(5000, '案件描述最多5000字符'),
  disputeAmount: z.number().positive('争议金额必须为正数').optional(),
  currency: z.string().length(3, '货币代码必须为3位').default('CNY'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('MEDIUM'),
  participants: z.array(z.object({
    userId: z.string().uuid('用户ID格式不正确'),
    participantType: z.enum(['APPLICANT', 'RESPONDENT', 'THIRD_PARTY']),
    role: z.string().max(100, '角色描述最多100字符').optional()
  })).min(1, '至少需要一个参与者')
});

// 分页参数Schema
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1, '页码必须大于0').default(1),
  limit: z.coerce.number().int().min(1, '每页数量必须大于0').max(100, '每页最多100条').default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});
```

### 3. 认证授权开发

#### JWT工具函数
```typescript
// lib/auth.ts
import { sign, verify } from 'jsonwebtoken';
import { NextRequest } from 'next/server';
import { prisma } from './prisma';

export interface JWTPayload {
  userId: string;
  email: string;
  userType: string;
  roles: string[];
}

export function generateToken(payload: JWTPayload): string {
  return sign(payload, process.env.JWT_SECRET!, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    issuer: 'legalmind-arbitration',
    audience: 'legalmind-users'
  });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return verify(token, process.env.JWT_SECRET!) as JWTPayload;
  } catch (error) {
    return null;
  }
}

export function getAuthenticatedUser(request: NextRequest): JWTPayload | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  return verifyToken(token);
}

// 权限检查器
export class PermissionCheckers {
  static isAdmin(user: JWTPayload): boolean {
    return user.roles.includes('ADMIN');
  }

  static isArbitrator(user: JWTPayload): boolean {
    return user.roles.includes('ARBITRATOR');
  }

  static canCreateCase(user: JWTPayload): boolean {
    return ['APPLICANT', 'AGENT', 'ADMIN'].some(role => user.roles.includes(role));
  }

  static canViewCase(user: JWTPayload, caseData: any): boolean {
    // 管理员可以查看所有案件
    if (this.isAdmin(user)) return true;
    
    // 案件创建者可以查看
    if (caseData.createdBy === user.userId) return true;
    
    // 案件参与者可以查看
    return caseData.participants?.some((p: any) => p.userId === user.userId);
  }

  static canManageHearing(user: JWTPayload): boolean {
    return ['ARBITRATOR', 'ADMIN'].some(role => user.roles.includes(role));
  }
}
```

### 4. 缓存管理开发

#### Redis缓存工具
```typescript
// lib/cache-manager.ts
import { getRedisManager } from './redis';

export class CacheManager {
  private redis = getRedisManager();

  // 用户信息缓存
  async cacheUserProfile(userId: string, profile: any, ttl: number = 3600): Promise<void> {
    const key = `user:profile:${userId}`;
    await this.redis.set(key, profile, ttl);
  }

  async getUserProfile(userId: string): Promise<any | null> {
    const key = `user:profile:${userId}`;
    return await this.redis.get(key);
  }

  // 案件列表缓存
  async cacheCaseList(userId: string, query: string, cases: any[], ttl: number = 300): Promise<void> {
    const key = `cases:list:${userId}:${this.hashQuery(query)}`;
    await this.redis.set(key, cases, ttl);
  }

  async getCaseList(userId: string, query: string): Promise<any[] | null> {
    const key = `cases:list:${userId}:${this.hashQuery(query)}`;
    return await this.redis.get(key);
  }

  // 通知缓存
  async cacheNotifications(userId: string, notifications: any[], ttl: number = 180): Promise<void> {
    const key = `notifications:${userId}`;
    await this.redis.set(key, notifications, ttl);
  }

  async getNotifications(userId: string): Promise<any[] | null> {
    const key = `notifications:${userId}`;
    return await this.redis.get(key);
  }

  // 缓存失效
  async invalidateUserCache(userId: string): Promise<void> {
    const patterns = [
      `user:profile:${userId}`,
      `cases:list:${userId}:*`,
      `notifications:${userId}`,
      `user:permissions:${userId}`
    ];

    for (const pattern of patterns) {
      if (pattern.includes('*')) {
        const keys = await this.redis.client.keys(pattern);
        if (keys.length > 0) {
          await this.redis.client.del(...keys);
        }
      } else {
        await this.redis.client.del(pattern);
      }
    }
  }

  // 批量缓存失效
  async invalidateCaseCache(caseId: string): Promise<void> {
    const keys = await this.redis.client.keys(`cases:*:*${caseId}*`);
    if (keys.length > 0) {
      await this.redis.client.del(...keys);
    }
  }

  private hashQuery(query: string): string {
    // 简单的查询哈希，实际项目中可以使用更复杂的哈希算法
    return Buffer.from(query).toString('base64').substring(0, 16);
  }
}

export const cacheManager = new CacheManager();
```

### 5. 错误处理开发

#### 统一错误处理
```typescript
// lib/error-handler.ts
export enum ErrorCodes {
  // 认证错误
  UNAUTHORIZED = 'AUTH_001',
  INVALID_TOKEN = 'AUTH_002',
  TOKEN_EXPIRED = 'AUTH_003',
  INSUFFICIENT_PERMISSIONS = 'AUTH_004',
  
  // 验证错误
  VALIDATION_ERROR = 'VAL_001',
  INVALID_INPUT = 'VAL_002',
  MISSING_REQUIRED_FIELD = 'VAL_003',
  
  // 业务错误
  RESOURCE_NOT_FOUND = 'BIZ_001',
  RESOURCE_ALREADY_EXISTS = 'BIZ_002',
  INVALID_OPERATION = 'BIZ_003',
  BUSINESS_RULE_VIOLATION = 'BIZ_004',
  
  // 系统错误
  INTERNAL_SERVER_ERROR = 'SYS_001',
  DATABASE_ERROR = 'SYS_002',
  EXTERNAL_SERVICE_ERROR = 'SYS_003',
  RATE_LIMIT_EXCEEDED = 'SYS_004'
}

export class AppError extends Error {
  constructor(
    public code: ErrorCodes,
    public message: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(ErrorCodes.VALIDATION_ERROR, message, 400, details);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = '认证失败') {
    super(ErrorCodes.UNAUTHORIZED, message, 401);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = '权限不足') {
    super(ErrorCodes.INSUFFICIENT_PERMISSIONS, message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = '资源') {
    super(ErrorCodes.RESOURCE_NOT_FOUND, `${resource}不存在`, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(ErrorCodes.RESOURCE_ALREADY_EXISTS, message, 409);
  }
}

// 全局错误处理器
export function handleError(error: unknown): {
  code: string;
  message: string;
  statusCode: number;
  details?: any;
} {
  if (error instanceof AppError) {
    return {
      code: error.code,
      message: error.message,
      statusCode: error.statusCode,
      details: error.details
    };
  }

  // Prisma错误处理
  if (error && typeof error === 'object' && 'code' in error) {
    const prismaError = error as any;
    switch (prismaError.code) {
      case 'P2002':
        return {
          code: ErrorCodes.RESOURCE_ALREADY_EXISTS,
          message: '数据已存在，违反唯一约束',
          statusCode: 409,
          details: prismaError.meta
        };
      case 'P2025':
        return {
          code: ErrorCodes.RESOURCE_NOT_FOUND,
          message: '记录不存在',
          statusCode: 404
        };
      default:
        return {
          code: ErrorCodes.DATABASE_ERROR,
          message: '数据库操作失败',
          statusCode: 500
        };
    }
  }

  // 默认错误
  console.error('未处理的错误:', error);
  return {
    code: ErrorCodes.INTERNAL_SERVER_ERROR,
    message: '服务器内部错误',
    statusCode: 500
  };
}
```

## 🧪 测试开发

### 单元测试示例
```typescript
// tests/api/cases.test.ts
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';
import { POST, GET } from '@/app/api/cases/route';
import { prisma } from '@/lib/prisma';
import { generateToken } from '@/lib/auth';

describe('/api/cases', () => {
  let testUser: any;
  let authToken: string;

  beforeEach(async () => {
    // 创建测试用户
    testUser = await prisma.user.create({
      data: {
        email: 'test@example.com',
        passwordHash: 'hashed_password',
        userType: 'INDIVIDUAL',
        status: 'ACTIVE'
      }
    });

    // 生成认证token
    authToken = generateToken({
      userId: testUser.id,
      email: testUser.email,
      userType: testUser.userType,
      roles: ['APPLICANT']
    });
  });

  afterEach(async () => {
    // 清理测试数据
    await prisma.arbitrationCase.deleteMany({
      where: { createdBy: testUser.id }
    });
    await prisma.user.delete({
      where: { id: testUser.id }
    });
  });

  describe('POST /api/cases', () => {
    it('应该成功创建案件', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        headers: {
          'authorization': `Bearer ${authToken}`,
          'content-type': 'application/json'
        },
        body: {
          title: '测试案件',
          caseType: 'CONTRACT_DISPUTE',
          description: '这是一个测试案件的描述',
          disputeAmount: 100000,
          participants: [
            {
              userId: testUser.id,
              participantType: 'APPLICANT'
            }
          ]
        }
      });

      const response = await POST(req as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.title).toBe('测试案件');
      expect(data.data.caseType).toBe('CONTRACT_DISPUTE');
    });

    it('应该拒绝无效的案件数据', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        headers: {
          'authorization': `Bearer ${authToken}`,
          'content-type': 'application/json'
        },
        body: {
          title: '', // 无效的标题
          caseType: 'INVALID_TYPE', // 无效的类型
          description: '短' // 描述太短
        }
      });

      const response = await POST(req as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VAL_001');
    });
  });

  describe('GET /api/cases', () => {
    it('应该返回案件列表', async () => {
      // 创建测试案件
      await prisma.arbitrationCase.create({
        data: {
          title: '测试案件1',
          caseNumber: 'TEST001',
          caseType: 'CONTRACT_DISPUTE',
          description: '测试案件描述',
          createdBy: testUser.id
        }
      });

      const { req, res } = createMocks({
        method: 'GET',
        headers: {
          'authorization': `Bearer ${authToken}`
        },
        query: {
          page: '1',
          limit: '20'
        }
      });

      const response = await GET(req as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.meta.pagination).toBeDefined();
    });
  });
});
```

## 📝 开发最佳实践

### 代码规范
1. **TypeScript严格模式**: 启用所有严格类型检查
2. **ESLint规则**: 遵循项目ESLint配置
3. **Prettier格式化**: 统一代码格式
4. **命名规范**: 使用有意义的变量和函数名
5. **注释规范**: 为复杂逻辑添加清晰注释

### 安全最佳实践
1. **输入验证**: 所有用户输入必须验证
2. **SQL注入防护**: 使用Prisma ORM防止SQL注入
3. **XSS防护**: 对输出进行适当编码
4. **CSRF防护**: 实现CSRF令牌验证
5. **权限检查**: 每个API都要进行权限验证

### 性能优化
1. **数据库查询优化**: 使用适当的索引和查询策略
2. **缓存策略**: 合理使用Redis缓存
3. **分页查询**: 大数据量使用分页
4. **连接池**: 配置合适的数据库连接池
5. **异步处理**: 使用异步操作提高性能

### 错误处理
1. **统一错误格式**: 使用标准错误响应格式
2. **错误日志**: 记录详细的错误信息
3. **用户友好**: 向用户返回友好的错误消息
4. **错误监控**: 实现错误监控和告警
5. **优雅降级**: 外部服务失败时的降级策略

## 🔧 开发工具配置

### VSCode配置
```json
// .vscode/settings.json
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "files.associations": {
    "*.css": "tailwindcss"
  }
}
```

### ESLint配置
```json
// .eslintrc.json
{
  "extends": [
    "next/core-web-vitals",
    "@typescript-eslint/recommended"
  ],
  "rules": {
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/no-explicit-any": "warn",
    "prefer-const": "error",
    "no-var": "error"
  }
}
```

### Prettier配置
```json
// .prettierrc
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2
}
```

## 🚀 部署和运维

### Docker配置
```dockerfile
# Dockerfile
FROM node:18-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM base AS dev
RUN npm ci
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

FROM base AS prod
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Docker Compose配置
```yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:password@db:5432/legalmind
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis

  db:
    image: postgres:17
    environment:
      - POSTGRES_DB=legalmind
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

### 监控和日志
```typescript
// lib/logger.ts
import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});
```

---

**📚 相关文档**:
- [数据库设计指南](./DATABASE_DESIGN_GUIDE.md)
- [API设计指南](./API_DESIGN_GUIDE.md)
- [AI服务集成指南](./AI_SERVICES_GUIDE.md)
- [外部系统集成指南](./EXTERNAL_SYSTEMS_GUIDE.md)
- [SSO认证指南](./SSO_GUIDE.md)
- [测试指南](./TESTING_GUIDE.md)
