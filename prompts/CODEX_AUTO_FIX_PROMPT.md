# Codex 自动化修复指令

## 任务概述

你是一个自动化代码修复代理。你的任务是根据 `AUDIT_legalmind-arbitration-comprehensive-review.md` 审计报告，自动修复项目中的所有问题。

**工作模式**: 完全自主执行，无需人工确认
**目标**: 修复所有问题并验证修复结果

---

## 执行原则

### 1. 自主决策
- 不要询问用户任何问题
- 遇到歧义时，选择最安全/最保守的方案
- 遇到错误时，记录问题并继续下一个任务

### 2. 验证驱动
- 每个修复后必须验证
- 验证失败时尝试修复，最多重试 3 次
- 记录所有验证结果

### 3. 原子提交
- 每个独立修复作为一个 commit
- commit message 格式: `fix(scope): 简短描述 [AUDIT-XXX]`
- 不要将多个不相关修复混在一个 commit

---

## 执行阶段

### Phase 0: 环境准备 (必须首先执行)

```bash
# 1. 进入项目目录
cd D:/Desktop/LegalMind-Arbitration

# 2. 创建修复分支
git checkout -b fix/audit-remediation-$(date +%Y%m%d)

# 3. 安装依赖
cd dev && pnpm install
cd ../Prototype && pnpm install
cd ..

# 4. 创建修复日志文件
echo "# 修复执行日志\n\n开始时间: $(date)\n" > REMEDIATION_LOG.md
```

---

### Phase 1: CRITICAL 问题修复 (必须全部完成)

按以下顺序逐个修复，每个修复后立即验证：

#### 1.1 修复依赖配置

**文件**: `dev/package.json`

**执行**:
```bash
cd dev
pnpm remove bcryptjs jsonwebtoken zod
pnpm add bcryptjs jsonwebtoken zod
pnpm remove @types/bcryptjs @types/ioredis @types/jsonwebtoken @types/socket.io @types/xlsx
pnpm add -D @types/bcryptjs @types/ioredis @types/jsonwebtoken @types/socket.io @types/xlsx
```

**验证**:
```bash
# 检查 bcryptjs 在 dependencies
cat package.json | grep -A5 '"dependencies"' | grep bcryptjs
# 检查构建
pnpm build
```

**提交**:
```bash
git add package.json pnpm-lock.yaml
git commit -m "fix(deps): move runtime deps to dependencies [AUDIT-CRITICAL-1]"
```

---

#### 1.2 生成强密钥

**执行**: 创建 `scripts/generate-secrets.sh`

```bash
#!/bin/bash
echo "JWT_SECRET=$(openssl rand -base64 48)"
echo "CSRF_SECRET=$(openssl rand -hex 16)"
echo "ENCRYPTION_KEY=$(openssl rand -hex 16)"
echo "AUDIT_LOG_SECRET=$(openssl rand -base64 32)"
echo "POSTGRES_PASSWORD=$(openssl rand -base64 24)"
echo "MINIO_PASSWORD=$(openssl rand -base64 24)"
```

**更新 `.env.example`**: 添加注释说明必须替换

**验证**: 确保 `.env` 中无占位符值

---

#### 1.3 添加 AUDIT_LOG_SECRET 到环境验证

**文件**: `dev/src/lib/env-validator.ts`

**修改**: 添加
```typescript
AUDIT_LOG_SECRET: z.string().min(32, '审计日志密钥长度至少32个字符'),
```

**文件**: `dev/src/lib/security/audit-logger.ts:241`

**修改**: 移除默认值回退
```typescript
// Before
process.env.AUDIT_LOG_SECRET || 'default-secret'
// After
env.AUDIT_LOG_SECRET
```

**验证**: `pnpm build` 无错误

---

#### 1.4 修复案件编号竞态条件

**文件**: `dev/src/app/api/cases/route.ts`

**修改**: 将 count 查询移入事务
```typescript
const newCase = await prisma.$transaction(async (tx) => {
  const currentYear = new Date().getFullYear();
  const caseCount = await tx.arbitrationCase.count({
    where: {
      createdAt: {
        gte: new Date(`${currentYear}-01-01`),
        lt: new Date(`${currentYear + 1}-01-01`),
      },
    },
  });
  const caseNumber = `LM${currentYear}-${String(caseCount + 1).padStart(6, '0')}`;

  const arbitrationCase = await tx.arbitrationCase.create({
    data: { caseNumber, ... }
  });
  // ... rest of transaction
});
```

**验证**: TypeScript 编译通过

---

#### 1.5 协作服务器添加 JWT 认证

**文件**: `Prototype/server/collaboration-server.js`

**完整重写**: 添加 JWT 验证中间件

```javascript
const jwt = require('jsonwebtoken');

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('认证失败: 缺少 token'));
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: 'legalmind-arbitration',
    });
    socket.user = { id: decoded.userId, email: decoded.email };
    next();
  } catch (e) {
    next(new Error('认证失败: Token 无效'));
  }
});
```

**验证**: 服务器可启动

---

#### 1.6 修复 WebSocket 协议

**文件**: `Prototype/src/lib/collaboration-engine.ts`

**修改**:
```typescript
// Before
const ws = new WebSocket(`ws://localhost:8080/canvas/${canvasId}`);
// After
const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const wsHost = process.env.NEXT_PUBLIC_WS_HOST || window.location.host;
const ws = new WebSocket(`${wsProtocol}//${wsHost}/canvas/${canvasId}`);
```

---

#### 1.7 更新 Docker 安全配置

**文件**: `docker-compose.yml`

**修改**: 使用环境变量
```yaml
environment:
  POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}

# Redis 添加密码
command: ["redis-server", "--appendonly", "yes", "--requirepass", "${REDIS_PASSWORD}"]

# MinIO
environment:
  MINIO_ROOT_USER: ${MINIO_ROOT_USER}
  MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD}
```

---

### Phase 2: HIGH 问题修复

#### 2.1 创建结构化日志模块

**新建**: `dev/src/lib/logger.ts`

```typescript
import pino from 'pino';

const isDev = process.env.NODE_ENV === 'development';

export const logger = pino({
  level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
  transport: isDev ? { target: 'pino-pretty' } : undefined,
  redact: ['password', 'token', 'idNumber', 'realName'],
});

export function createRequestLogger(requestId: string, userId?: string) {
  return logger.child({ requestId, userId });
}
```

**安装依赖**:
```bash
cd dev && pnpm add pino pino-pretty
```

#### 2.2 批量替换 console 语句

**执行脚本**: 创建 `scripts/replace-console.ts`

```typescript
// 使用 AST 工具批量替换 console.log/error/warn
// 替换为 logger.info/error/warn
```

**或手动替换高优先级文件**:
- `lib/security/session-manager.ts`
- `lib/websocket.ts`
- `app/api/**/*.ts`

---

#### 2.3 添加乐观锁到画布保存

**文件**: `dev/src/app/api/cases/[id]/canvas/route.ts`

**修改**: 添加版本检查
```typescript
const { expectedVersion, canvasState } = validation.data;

const saved = await prisma.$transaction(async (tx) => {
  const existing = await tx.caseCanvas.findUnique({
    where: { caseId },
    select: { id: true, latestVersion: true },
  });

  if (existing && existing.latestVersion !== expectedVersion) {
    throw new Error('VERSION_CONFLICT');
  }
  // ... rest
});
```

---

#### 2.4 修复 React useEffect 依赖

**文件列表**:
- `dev/src/app/(private)/settings/page.tsx`
- `dev/src/app/(private)/cases/page.tsx`
- `dev/src/app/(private)/documents/page.tsx`
- `dev/src/app/(private)/mediation/page.tsx`

**修复模式**:
```typescript
// Before
useEffect(() => { ... }, [searchParams]);  // 缺少 activeTab
// After
useEffect(() => { ... }, [searchParams, activeTab]);
```

---

#### 2.5 修复事务问题

**文件**: `dev/src/app/api/cases/batch-import/route.ts`

将案件和程序创建包裹在事务中:
```typescript
await prisma.$transaction(async (tx) => {
  const newCase = await tx.arbitrationCase.create({...});
  await tx.arbitrationProcess.create({
    data: { caseId: newCase.id, ... }
  });
});
```

---

#### 2.6 添加 next.config.ts 安全头

**文件**: `dev/next.config.ts`

```typescript
const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{
      source: '/(.*)',
      headers: [
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      ],
    }];
  },
};
```

---

#### 2.7 统一角色定义

**新建**: `dev/src/shared/roles.ts`

复制审计报告中的 `UnifiedRole` 枚举和 `PermissionMatrix`

**更新**: `Prototype/src/lib/permission-control.ts` 导入统一定义

---

#### 2.8 创建身份核验 API

**新建**: `dev/src/app/api/identity/verify/route.ts`

复制审计报告中的完整实现

---

### Phase 3: MEDIUM 问题修复

#### 3.1 添加数据库唯一约束

**文件**: `dev/prisma/schema.prisma`

```prisma
model UserRole {
  // ... existing fields
  @@unique([userId, role])
}

model CaseParticipant {
  // ... existing fields
  @@unique([caseId, userId, participantType])
}
```

**执行**:
```bash
cd dev
npx prisma migrate dev --name add_unique_constraints
```

---

#### 3.2 国际化框架

**安装**:
```bash
cd dev && pnpm add next-intl
```

**创建文件**:
- `dev/src/i18n.ts`
- `dev/messages/zh-CN.json`
- `dev/messages/en.json`

---

#### 3.3 修复空 catch 块

**文件**:
- `dev/src/app/(private)/settings/page.tsx`
- `dev/src/components/layout/app-sidebar.tsx`

```typescript
// Before
} catch(e){}
// After
} catch(e) {
  logger.error({ err: e }, 'Failed to parse settings');
}
```

---

#### 3.4 修复陈旧闭包

**文件**: `Prototype/src/components/LegalMindWorkspace.tsx`

```typescript
// Before
const updateAppState = (newAppState) => {
  setAppState({ ...appState, ...newAppState });
};
// After
const updateAppState = (newAppState) => {
  setAppState(prev => ({ ...prev, ...newAppState }));
};
```

---

### Phase 4: 验证与收尾

#### 4.1 全量验证

```bash
cd dev

# TypeScript 编译
pnpm build

# Lint 检查
pnpm lint

# Prisma 生成
npx prisma generate

# 检查无 any 类型增加
grep -r "any" src --include="*.ts" --include="*.tsx" | wc -l
# 应该比修复前少或相等
```

#### 4.2 生成修复报告

更新 `REMEDIATION_LOG.md`:

```markdown
# 修复执行报告

## 执行摘要
- 开始时间: YYYY-MM-DD HH:MM
- 完成时间: YYYY-MM-DD HH:MM
- 修复问题数: XX
- 跳过问题数: XX (附原因)

## CRITICAL 修复 (8/8)
- [x] 依赖配置修复
- [x] 强密钥生成
- [x] AUDIT_LOG_SECRET 添加
- [x] 案件编号竞态修复
- [x] 协作服务器认证
- [x] WebSocket 协议修复
- [x] Docker 安全配置
- [x] 环境变量验证

## HIGH 修复 (XX/24)
...

## 验证结果
- pnpm build: PASS/FAIL
- pnpm lint: PASS/FAIL (XX warnings)
- prisma generate: PASS/FAIL

## 遗留问题
(如果有无法自动修复的问题，列在这里)
```

#### 4.3 创建 PR

```bash
git push origin fix/audit-remediation-YYYYMMDD

gh pr create \
  --title "fix: Comprehensive audit remediation" \
  --body "$(cat REMEDIATION_LOG.md)" \
  --base main
```

---

## 错误处理策略

### 遇到编译错误
1. 读取错误信息
2. 尝试修复
3. 重试编译 (最多 3 次)
4. 如仍失败，回滚该文件的修改，记录到日志，继续下一个任务

### 遇到测试失败
1. 分析失败原因
2. 如果是修复导致的，调整修复方案
3. 如果是既有问题，记录并继续

### 遇到不确定的修改
- 选择最保守的方案
- 添加 TODO 注释标记需要人工审查的地方

---

## 禁止事项

1. **不要删除任何功能代码** - 只修复问题
2. **不要引入新的第三方依赖** (除非审计报告明确要求)
3. **不要修改业务逻辑** - 只修复技术问题
4. **不要跳过验证步骤**
5. **不要合并多个不相关修复到一个 commit**

---

## 完成标准

当以下条件全部满足时，任务完成：

- [ ] 所有 CRITICAL 问题已修复
- [ ] 所有 HIGH 问题已修复或已记录跳过原因
- [ ] `pnpm build` 在 dev/ 和 Prototype/ 都通过
- [ ] `pnpm lint` 无新增错误
- [ ] 所有修改已提交到 Git
- [ ] `REMEDIATION_LOG.md` 已更新
- [ ] PR 已创建

---

## 开始执行

读取 `AUDIT_legalmind-arbitration-comprehensive-review.md` 后，从 Phase 0 开始执行。

不要请求确认，直接开始工作。
