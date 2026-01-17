# LegalMind-Arbitration 深度综合审计报告

> **审计日期**: 2026-01-16
> **审计范围**: 全栈代码审查 (dev/ + Prototype/)
> **审计方法**: MCP 工具深度探索 + 静态分析 + 模式匹配
> **审计目标**: 识别所有安全、性能、一致性、可维护性问题

---

## 目录

1. [执行摘要](#1-执行摘要)
2. [安全漏洞审查](#2-安全漏洞审查)
3. [事务与并发问题](#3-事务与并发问题)
4. [代码质量问题](#4-代码质量问题)
5. [前端问题](#5-前端问题)
6. [配置与环境安全](#6-配置与环境安全)
7. [数据库设计问题](#7-数据库设计问题)
8. [API 设计问题](#8-api-设计问题)
9. [依赖项问题](#9-依赖项问题)
10. [类型安全问题](#10-类型安全问题)
11. [国际化问题](#11-国际化问题)
12. [可访问性问题](#12-可访问性问题)
13. [功能实现缺口](#13-功能实现缺口)
14. [实施优先级矩阵](#14-实施优先级矩阵)

---

## 1. 执行摘要

### 1.1 项目技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| 前端框架 | Next.js (App Router) | 15.4.6 |
| UI 库 | React | 19.1.0 (dev) / 18.3.1 (Prototype) |
| 状态管理 | Zustand | 5.0.7 (dev) / 4.5.7 (Prototype) |
| 后端 ORM | Prisma | 6.15.0 |
| 数据库 | PostgreSQL | 15/17 |
| 缓存 | Redis + BullMQ | 7.x |
| 实时通信 | Socket.io | 4.8.1 |
| 类型检查 | TypeScript | 5.x |

### 1.2 审计结论总览

| 维度 | 评分 | 状态 | 关键问题数 |
|------|------|------|------------|
| 安全性 | 60/100 | **严重** | 15 |
| 事务/并发 | 55/100 | **严重** | 12 |
| 代码质量 | 50/100 | **严重** | 25+ |
| 前端质量 | 55/100 | **严重** | 20+ |
| 配置安全 | 40/100 | **危险** | 9 |
| 数据库设计 | 80/100 | 良好 | 5 |
| API 一致性 | 70/100 | 需改进 | 8 |
| 依赖健康度 | 60/100 | **严重** | 6 |
| 类型安全 | 65/100 | 需改进 | 354 处 any |
| 国际化 | 20/100 | **严重缺失** | 完全缺失 |
| 可访问性 | 30/100 | **严重** | 广泛缺失 |

### 1.3 问题严重程度分布

| 严重程度 | 数量 | 说明 |
|----------|------|------|
| **CRITICAL** | 8 | 必须立即修复，影响安全或数据完整性 |
| **HIGH** | 24 | 高优先级，一周内修复 |
| **MEDIUM** | 35+ | 中优先级，两周内修复 |
| **LOW** | 20+ | 低优先级，按计划修复 |

---

## 2. 安全漏洞审查

### 2.1 已实现的安全措施 ✅

项目在安全设计上投入了相当努力，已实现：

- ✅ JWT + RBAC 认证授权体系
- ✅ CSRF 双重提交防护
- ✅ XSS 防护 (DOMPurify)
- ✅ 文件上传类型/大小限制
- ✅ Redis 分布式限流
- ✅ AES-256-GCM 加密
- ✅ bcrypt 密码哈希
- ✅ 安全响应头设置
- ✅ 数据脱敏工具
- ✅ IP 黑白名单

### 2.2 安全漏洞清单

#### 2.2.1 协作服务器无身份认证 (CRITICAL)

**文件**: `Prototype/server/collaboration-server.js`

```javascript
// 当前实现 - 无任何认证
io.on('connection', (socket) => {
  socket.on('join-room', (roomId) => {
    socket.join(roomId);  // 任何人可加入任何房间
  });
});
```

**风险**: 任何人可连接并窃听/篡改案件协作数据

**修复方案**:
```javascript
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('认证失败'));
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded;
    next();
  } catch (e) {
    next(new Error('Token无效'));
  }
});
```

---

#### 2.2.2 WebSocket 使用不安全协议 (CRITICAL)

**文件**: `Prototype/src/lib/collaboration-engine.ts:144`

```typescript
const ws = new WebSocket(`ws://localhost:8080/canvas/${canvasId}`);
// 问题1: 使用 ws:// 而非 wss://
// 问题2: 硬编码 localhost
// 问题3: 无认证令牌
```

**风险**: 中间人攻击、数据窃取

---

#### 2.2.3 审计日志密钥回退到默认值 (CRITICAL)

**文件**: `dev/src/lib/security/audit-logger.ts:241`

```typescript
return HashUtil.hmac(data, process.env.AUDIT_LOG_SECRET || 'default-secret');
```

**风险**: 审计日志签名可被伪造

---

#### 2.2.4 敏感数据可能泄露到日志 (HIGH)

**统计**: 308 个 console 语句分布在 dev/src

**示例位置**:
| 文件 | 行号 | 问题 |
|------|------|------|
| `lib/security/session-manager.ts` | 71, 87, 102, 125, 146, 200, 317, 333, 338, 345 | 会话管理日志 |
| `lib/websocket.ts` | 115, 144, 193, 216, 269, 285, 473 | WebSocket日志 |
| `app/(private)/hearings/[id]/live/page.tsx` | 761, 764, 794, 801, 802, 909-925 | 庭审操作日志 |

---

#### 2.2.5 CSP 策略过于宽松 (MEDIUM)

**文件**: `dev/src/lib/security/middleware.ts:155`

```typescript
"script-src 'self' 'unsafe-inline' 'unsafe-eval'"
```

**风险**: `'unsafe-inline'` 和 `'unsafe-eval'` 削弱 XSS 防护

---

#### 2.2.6 生产环境可能显示错误详情 (MEDIUM)

**文件**: `Prototype/src/components/ErrorBoundary.tsx:113`

```tsx
const { showDetails = process.env.NODE_ENV === 'development' } = this.props;
// showDetails 可通过 props 覆盖，生产环境可能显示堆栈
```

---

#### 2.2.7 错误消息直接暴露给客户端 (MEDIUM)

**示例**: 多个 API 路由

```typescript
errorMessage: error instanceof Error ? error.message : '未知错误',
// 可能泄露内部实现细节
```

---

### 2.3 安全问题汇总表

| # | 问题 | 严重程度 | 文件 | 行号 |
|---|------|----------|------|------|
| 1 | 协作服务器无身份认证 | CRITICAL | `Prototype/server/collaboration-server.js` | - |
| 2 | WebSocket 使用 ws:// | CRITICAL | `Prototype/src/lib/collaboration-engine.ts` | 144 |
| 3 | 审计日志密钥回退默认值 | CRITICAL | `dev/src/lib/security/audit-logger.ts` | 241 |
| 4 | 308个 console 语句 | HIGH | 多个文件 | - |
| 5 | CSP 使用 unsafe-inline/eval | MEDIUM | `dev/src/lib/security/middleware.ts` | 155 |
| 6 | ErrorBoundary 可显示详情 | MEDIUM | `Prototype/src/components/ErrorBoundary.tsx` | 113 |
| 7 | API 错误消息暴露 | MEDIUM | 多个 API 路由 | - |

---

## 3. 事务与并发问题

### 3.1 案件编号生成竞态条件 (CRITICAL)

**文件**: `dev/src/app/api/cases/route.ts:36-46`

```typescript
// 事务外查询计数
const caseCount = await prisma.arbitrationCase.count({
  where: { createdAt: { gte: new Date(`${currentYear}-01-01`) } },
});
const caseNumber = `LM${currentYear}-${String(caseCount + 1).padStart(6, '0')}`;

// 事务内创建
const newCase = await prisma.$transaction(async (tx) => {
  const arbitrationCase = await tx.arbitrationCase.create({
    data: { caseNumber, ... }
  });
});
```

**问题**: 高并发时两个请求可能获取相同的 `caseCount`，生成重复案件号

**修复方案**: 使用数据库序列或将 count 移入事务
```typescript
const newCase = await prisma.$transaction(async (tx) => {
  const caseCount = await tx.arbitrationCase.count({...});
  const caseNumber = `LM${currentYear}-${String(caseCount + 1).padStart(6, '0')}`;
  return tx.arbitrationCase.create({ data: { caseNumber, ... } });
});
```

---

### 3.2 批量导入非原子操作 (HIGH)

**文件**: `dev/src/app/api/cases/batch-import/route.ts:270-315`

```typescript
// 创建案件
const newCase = await prisma.arbitrationCase.create({ data: {...} });
// 创建仲裁程序 - 分开执行，不在事务中
await prisma.arbitrationProcess.create({ data: { caseId: newCase.id, ... } });
```

**问题**: 如果 `ArbitrationProcess` 创建失败，会导致孤立案件记录

---

### 3.3 画布保存缺乏乐观锁 (HIGH)

**文件**: `dev/src/app/api/cases/[id]/canvas/route.ts:220-259`

```typescript
const existing = await tx.caseCanvas.findUnique({ where: { caseId } });
const canvas = await tx.caseCanvas.update({
  data: { latestVersion: existing.latestVersion + 1, ... }
});
```

**问题**: 两个用户同时编辑，后保存的覆盖先保存的，无冲突提示

**修复方案**: 客户端提交预期版本号，服务端验证
```typescript
if (existing.latestVersion !== expectedVersion) {
  throw new Error('版本冲突，请刷新后重试');
}
```

---

### 3.4 合意状态更新竞态 (HIGH)

**文件**: `dev/src/app/api/cases/[id]/neutrals/[userId]/consents/route.ts:96-148`

```typescript
// 先查后改模式 - 典型竞态
const consent = await prisma.partyConsent.findUnique({ where: {...} });
// ... 状态校验 ...
const updated = await prisma.$transaction(async (tx) => {
  return tx.partyConsent.update({ where: { id: consent.id }, data: {...} });
});
```

**问题**: 申请人和被申请人同时提交合意，可能基于相同状态计算

---

### 3.5 用户注册检查非原子 (HIGH)

**文件**: `dev/src/app/api/auth/register/route.ts:31-49`

```typescript
// 事务外检查
const existingUserByEmail = await prisma.user.findUnique({ where: { email } });
if (existingUserByEmail) return ErrorResponses.DUPLICATE_RESOURCE('邮箱已被注册');

// 事务内创建
const user = await prisma.$transaction(async (tx) => {
  return tx.user.create({ data: {...} });
});
```

**问题**: 并发注册相同邮箱时，两个请求可能都通过检查

---

### 3.6 庭审状态更新分散 (HIGH)

**文件**: `dev/src/app/api/hearings/[id]/route.ts:353-373`

```typescript
// 第一次更新
await prisma.arbitrationCase.update({ where: { id }, data: { metadata } });
// 第二次更新 - 独立操作
await prisma.arbitrationCase.update({ where: { id }, data: { status } });
```

**问题**: 两次更新不在事务中，可能导致不一致状态

---

### 3.7 事务/并发问题汇总表

| # | 问题 | 严重程度 | 文件 | 行号 |
|---|------|----------|------|------|
| 1 | 案件编号生成竞态 | CRITICAL | `api/cases/route.ts` | 36-46 |
| 2 | 批量导入非原子 | HIGH | `api/cases/batch-import/route.ts` | 270-315 |
| 3 | 画布保存无乐观锁 | HIGH | `api/cases/[id]/canvas/route.ts` | 220-259 |
| 4 | 合意状态更新竞态 | HIGH | `api/cases/[id]/neutrals/[userId]/consents/route.ts` | 96-148 |
| 5 | 用户注册检查非原子 | HIGH | `api/auth/register/route.ts` | 31-49 |
| 6 | 庭审状态更新分散 | HIGH | `api/hearings/[id]/route.ts` | 353-373 |
| 7 | 邀请响应竞态窗口 | MEDIUM | `api/neutrals/invitations/[id]/respond/route.ts` | 59-106 |
| 8 | 案件更新无版本控制 | MEDIUM | `api/cases/[id]/route.ts` | 246-315 |

---

## 4. 代码质量问题

### 4.1 死代码 - 过滤逻辑未实现 (HIGH)

**文件**: `dev/src/app/(private)/cases/page.tsx:342-346`

```typescript
const roleCases = allCases.filter(case_ => {
  if (currentRole === 'arbitrator') {
    void case_;  // 死代码 - 变量未使用
    return true;
  }
  void case_;    // 死代码
  return true;
});
```

**问题**: 过滤逻辑未实现，所有角色返回所有案件

---

### 4.2 空 catch 块 (HIGH)

**位置**:
| 文件 | 行号 |
|------|------|
| `dev/src/app/(private)/settings/page.tsx` | 126, 130 |
| `dev/src/components/layout/app-sidebar.tsx` | 68, 74 |

```typescript
try {
  const p = localStorage.getItem('settings_profile');
  if(p){ const parsed = JSON.parse(p); }
} catch(e){}  // 错误被完全忽略
```

---

### 4.3 N+1 查询问题 (HIGH)

**位置**:
| 文件 | 行号 | 问题 |
|------|------|------|
| `lib/middleware.ts` | 369-371 | 循环中逐个删除日志 |
| `lib/security/session-manager.ts` | 138-144 | 循环遍历删除会话 |
| `lib/security/session-manager.ts` | 283-284 | 循环获取会话数据 |
| `api/system/metrics/route.ts` | 337-338, 405-406, 446-447 | 循环中多次 Redis 查询 |
| `lib/redis.ts` | 598-599 | 循环删除模式匹配的键 |

```typescript
// 问题示例
for (const key of keys) {
  const session = await this.redis.get<SessionData>(key);  // N次查询
  if (session && session.userId === userId) {
    await this.redis.del(key);  // N次删除
  }
}
```

**修复**: 使用 `Promise.all()` 或 Redis pipeline

---

### 4.4 调试日志残留 (HIGH)

**统计**: dev/src 目录发现 **200+ 处** console 语句

**高频文件**:
| 文件 | console 数量 |
|------|-------------|
| `store/ai-messages.ts` | 2 |
| `components/ai/smart-suggestions.tsx` | 3 |
| `lib/websocket.ts` | 7 |
| `lib/redis.ts` | 多处 |
| `lib/security/session-manager.ts` | 10 |
| `app/(private)/schedule/page.tsx` | 7 |
| `app/(private)/hearings/[id]/live/page.tsx` | 10+ |

---

### 4.5 模拟数据回退 (HIGH)

**文件**: `dev/src/app/(private)/cases/page.tsx:337`

```typescript
const allCases = storeCases.length > 0 ? storeCases : mockCases;
// 生产环境可能显示假数据
```

---

### 4.6 ESLint 禁用注释 (MEDIUM)

| 文件 | 行号 | 禁用类型 |
|------|------|----------|
| `app/(private)/cases/page.tsx` | 309 | `react-hooks/exhaustive-deps` |
| `lib/redis.ts` | 115 | `no-var` |
| `lib/queue.ts` | 60 | `no-var` |
| `app/(private)/documents/page.tsx` | 164 | `react-hooks/exhaustive-deps` |
| `app/(private)/mediation/page.tsx` | 234 | `react-hooks/exhaustive-deps` |

---

### 4.7 JSON.parse 无 try-catch (MEDIUM)

| 文件 | 行号 |
|------|------|
| `lib/redis.ts` | 202, 264, 375, 392, 434 |
| `lib/ai-services.ts` | 461, 466 |
| `lib/sso.ts` | 583 |

---

### 4.8 TODO 未完成 (LOW)

| 文件 | 行号 | TODO 内容 |
|------|------|-----------|
| `hooks/useSessionTimeout.ts` | 49 | `// TODO: 实现自定义会话警告对话框` |
| `hooks/useSessionTimeout.ts` | 68 | `// TODO: 实现自定义超时通知` |

---

## 5. 前端问题

### 5.1 状态管理问题

#### 5.1.1 陈旧闭包 (HIGH)

**文件**: `Prototype/src/components/LegalMindWorkspace.tsx:98-103`

```tsx
const updateAppState = (newAppState: Partial<LegalMindState>) => {
  setAppState({
    ...appState,  // 捕获的 appState 是陈旧的闭包引用
    ...newAppState
  });
};
```

**修复**:
```tsx
setAppState(prev => ({ ...prev, ...newAppState }));
```

---

#### 5.1.2 用户ID硬编码 (MEDIUM)

**文件**: `Prototype/src/stores/workspaceStore.ts:607-611`

```tsx
addComment: (nodeId, content) => {
  const newComment = {
    id: `comment-${Date.now()}`,
    userId: 'current-user', // 硬编码用户ID
  };
};
```

---

### 5.2 React 反模式

#### 5.2.1 useEffect 依赖缺失 (HIGH)

**文件**: `dev/src/app/(private)/settings/page.tsx:50-58`

```tsx
useEffect(() => {
  const t = searchParams.get('tab') || 'profile';
  if(t !== activeTab) setActiveTab(t);
}, [searchParams]);  // 缺少 activeTab 依赖

useEffect(() => {
  router.replace(`/settings${params}`);
}, [activeTab]);  // 缺少 router 依赖
```

---

#### 5.2.2 setTimeout 未清理 (MEDIUM)

**文件**: `Prototype/src/components/AIAssistant.tsx:231-244`

```tsx
setTimeout(() => {
  const aiResponse = generateIntelligentResponse(messageContent, node.type);
  setMessages(prev => [...prev, aiResponse]);  // 组件卸载后可能执行
  setIsLoading(false);
}, 1500 + Math.random() * 2000);
```

---

### 5.3 性能问题

#### 5.3.1 缺少 memoization (MEDIUM)

**文件**: `Prototype/src/components/canvas/InfiniteCanvas.tsx:213-280`

```tsx
const renderConnections = () => {
  return connections.map(connection => {
    return <svg key={connection.id} ... />;  // 每次渲染都创建新元素
  });
};
// 应使用 useMemo 缓存
```

---

#### 5.3.2 大量内联样式 (LOW)

**统计**: 整个 src 目录有 **560 处** `style={` 使用

**高频文件**:
| 文件 | 内联样式数量 |
|------|-------------|
| `dialogs/NodeEditDialog.tsx` | 32 |
| `ai/SmartDocumentGenerator.tsx` | 27 |
| `ai/EnhancedAIAssistant.tsx` | 24 |
| `canvas/ElementRenderer.tsx` | 33 |

---

### 5.4 表单验证缺失

**文件**: `Prototype/src/components/editors/HearingEditor.tsx:228-234`

```tsx
<input
  type="text"
  value={formData.title}
  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
  // 无最大长度限制
  // 无必填字段验证
  // 无特殊字符过滤
/>
```

---

## 6. 配置与环境安全

### 6.1 危险的默认值 (CRITICAL)

**文件**: `dev/.env`

```properties
# 弱数据库密码
DATABASE_URL=postgresql://legalmind:legalmind@127.0.0.1:55433/legalmind
SHADOW_DATABASE_URL=postgresql://postgres:password@127.0.0.1:55433/legalmind_shadow

# 不安全的密钥占位符
JWT_SECRET=your-super-secret-jwt-key-change-in-production
NEXTAUTH_SECRET=your-nextauth-secret-change-in-production
CSRF_SECRET=0123456789abcdef0123456789abcdef
ENCRYPTION_KEY=0123456789abcdef0123456789abcdef

# MinIO 默认凭证
S3_ACCESS_KEY_ID=minioadmin
S3_SECRET_ACCESS_KEY=minioadmin
```

---

### 6.2 Docker 容器安全问题 (CRITICAL)

**文件**: `docker-compose.yml`

```yaml
# PostgreSQL 默认密码
environment:
  POSTGRES_USER: postgres
  POSTGRES_PASSWORD: password

# MinIO 默认凭证
environment:
  MINIO_ROOT_USER: minioadmin
  MINIO_ROOT_PASSWORD: minioadmin

# Redis 无密码保护
command: ["redis-server", "--appendonly", "yes"]
```

---

### 6.3 next.config.ts 缺失安全配置 (HIGH)

**文件**: `dev/next.config.ts`

**缺失**:
- 无安全头 (`headers()`)
- 无 `poweredByHeader: false`
- 无 HTTPS 重定向
- 无图像域名白名单
- 无 CSP 配置

**修复方案**:
```typescript
const nextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{
      source: '/(.*)',
      headers: [
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      ],
    }];
  },
};
```

---

### 6.4 CORS 回退到 localhost (MEDIUM)

**文件**: `dev/src/lib/websocket.ts:54-59`

```typescript
this.io = new SocketIOServer(server, {
  cors: {
    origin: process.env.NEXTAUTH_URL || "http://localhost:3000",
    // 生产环境如未设置环境变量，会使用 localhost
  },
});
```

---

### 6.5 缺失的环境变量 (MEDIUM)

| 变量 | 状态 | 影响 |
|------|------|------|
| `AUDIT_LOG_SECRET` | 未定义 | 回退到 `default-secret` |
| `LIVEKIT_URL` | 未定义 | WebRTC 无法工作 |
| `LIVEKIT_API_KEY` | 未定义 | LiveKit 认证失败 |
| `LIVEKIT_API_SECRET` | 未定义 | LiveKit 认证失败 |

---

## 7. 数据库设计问题

### 7.1 Prisma Schema 优点 ✅

- 完整的 1073 行定义
- 合理的索引设计 (`@@index`)
- 级联删除配置
- UUID 主键
- 完整的枚举类型

### 7.2 缺失的唯一约束 (MEDIUM)

#### 7.2.1 UserRole 缺少唯一约束

**文件**: `dev/prisma/schema.prisma:297-313`

```prisma
model UserRole {
  id          String    @id
  userId      String
  role        Role
  // 缺少 @@unique([userId, role])
}
```

**问题**: 同一用户可能有重复的角色记录

---

#### 7.2.2 CaseParticipant 缺少唯一约束

```prisma
model CaseParticipant {
  caseId          String
  userId          String
  participantType ParticipantType
  // 缺少 @@unique([caseId, userId, participantType])
}
```

---

### 7.3 庭审数据存储在 JSON 中 (MEDIUM)

**问题**: API 实现将庭审数据存储在 `ArbitrationCase.metadata` JSON 字段中，而不是使用 `Hearing` 模型

**文件**: `dev/src/app/api/hearings/route.ts:120-158`

```typescript
const updatedMetadata = {
  ...caseMetadata,
  currentHearing: hearingData,  // 应使用 Hearing 表
  hearingHistory: [...],
};
```

---

### 7.4 状态机验证不完整 (MEDIUM)

**问题**: 调解阶段可以任意跳转，无顺序验证

**文件**: `dev/src/app/api/cases/[id]/mediation-room/stage/route.ts:103-125`

```typescript
// 可以从 PREPARE 直接跳到 SIGNING
// 无状态机验证合法转换
```

---

## 8. API 设计问题

### 8.1 API 端点问题清单

| 端点 | 方法 | 问题 | 严重程度 |
|------|------|------|----------|
| `/api/hearings` | POST | 使用 metadata 而非 Hearing 模型 | HIGH |
| `/api/hearings/[id]` | GET/PATCH | 同上 | HIGH |
| `/api/integrations/external-systems` | ALL | 返回 NOT_IMPLEMENTED | HIGH |
| `/api/documents` | DELETE | 端点缺失 | MEDIUM |
| `/api/identity/verify` | POST | 端点不存在 | HIGH |

---

### 8.2 前后端角色不匹配 (HIGH)

**后端角色** (`dev/prisma/schema.prisma`):
```
END_USER, LAWYER, ARBITRATOR, MEDIATOR, COURT, NOTARY,
ADMIN, OPS_ADMIN, AUDITOR_READONLY, APPLICANT, RESPONDENT
```
(共 11 个)

**前端角色** (`Prototype/src/lib/permission-control.ts`):
```
admin, arbitrator, applicant, respondent, observer
```
(共 5 个)

---

## 9. 依赖项问题

### 9.1 package.json 配置错误 (CRITICAL)

**文件**: `dev/package.json`

| 问题 | 当前位置 | 正确位置 |
|------|----------|----------|
| `bcryptjs` | devDependencies | **dependencies** |
| `jsonwebtoken` | devDependencies | **dependencies** |
| `zod` | devDependencies | **dependencies** |
| `@types/bcryptjs` | dependencies | devDependencies |
| `@types/ioredis` | dependencies | devDependencies |
| `@types/jsonwebtoken` | dependencies | devDependencies |

**风险**: 生产构建可能缺失运行时依赖

**修复命令**:
```bash
cd dev
pnpm remove bcryptjs jsonwebtoken zod
pnpm add bcryptjs jsonwebtoken zod
pnpm remove @types/bcryptjs @types/ioredis @types/jsonwebtoken
pnpm add -D @types/bcryptjs @types/ioredis @types/jsonwebtoken
```

---

### 9.2 版本不一致 (HIGH)

| 库 | dev/ | Prototype/ | 影响 |
|---|------|------------|------|
| React | 19.1.0 | 18.3.1 | 共享组件行为不一致 |
| Zustand | 5.0.7 | 4.5.7 | API 有重大变更 |

---

### 9.3 缺失的关键依赖 (HIGH)

| 依赖 | 用途 | 状态 |
|------|------|------|
| `livekit-server-sdk` | WebRTC 服务端 | 缺失 |
| `@livekit/components-react` | WebRTC 前端 | 缺失 |
| `socket.io-client` | WebSocket 客户端 | 缺失 |
| `pino` | 结构化日志 | 缺失 |
| `next-intl` | 国际化 | 缺失 |

---

## 10. 类型安全问题

### 10.1 `any` 类型泛滥 (HIGH)

**统计**:
- 总计 **354 个** `any` 类型使用
- 分布在 **81 个文件** 中
- 平均每文件 4.4 个 `any`

**问题代码示例**:
```typescript
const where: any = {};  // 应使用 Prisma.ArbitrationCaseWhereInput
function handleData(data: any) { ... }  // 应定义接口
const result: any = await response.json();  // 应使用 Zod 推断
```

---

### 10.2 修复方案

```typescript
// 1. 使用 Prisma 生成的类型
import { Prisma } from '@/generated/prisma';
const where: Prisma.ArbitrationCaseWhereInput = {};

// 2. 使用 Zod 推断类型
import { z } from 'zod';
const ResponseSchema = z.object({ success: z.boolean(), data: z.unknown() });
type ApiResponse = z.infer<typeof ResponseSchema>;

// 3. 启用严格模式
// tsconfig.json
{ "compilerOptions": { "strict": true, "noImplicitAny": true } }
```

---

## 11. 国际化问题

### 11.1 完全缺失 i18n 支持 (CRITICAL)

**现状**:
- ❌ 无 `i18next` 或 `next-intl` 依赖
- ❌ 无语言文件 (locales/*.json)
- ❌ 所有 UI 文本硬编码中文
- ❌ 无语言切换机制
- ❌ 日期/货币格式未本地化

**影响**: 涉外仲裁案件需要多语言支持，国际当事人无法使用

---

### 11.2 硬编码文本示例

```typescript
// dev/src/app/api/cases/route.ts
return createSuccessResponse(responseData, '案件创建成功');

// dev/src/lib/api-response.ts
'请求参数错误'
'服务器内部错误'
'未授权访问'
```

---

### 11.3 修复方案

```bash
cd dev && pnpm add next-intl
```

```json
// dev/messages/zh-CN.json
{
  "cases": { "createSuccess": "案件创建成功" },
  "errors": { "badRequest": "请求参数错误" }
}

// dev/messages/en.json
{
  "cases": { "createSuccess": "Case created successfully" },
  "errors": { "badRequest": "Invalid request parameters" }
}
```

---

## 12. 可访问性问题

### 12.1 覆盖率极低 (CRITICAL)

**统计**: 整个 `Prototype/src` 目录仅有 **19 处** 使用 `aria-`/`role`/`tabIndex`/键盘事件，相对于 **79 个组件文件**

---

### 12.2 具体问题

#### 12.2.1 按钮缺少可访问性属性

**文件**: `Prototype/src/components/LegalMindWorkspace.tsx:284-347`

```tsx
<button onClick={() => createNode('case')} style={{...}}>
  📋 案件
</button>
// 缺少: aria-label, aria-pressed
// 问题: emoji 对屏幕阅读器不友好
```

---

#### 12.2.2 画布区域缺少键盘导航

**文件**: `Prototype/src/components/canvas/InfiniteCanvas.tsx:282-378`

```tsx
<div
  ref={canvasRef}
  className="relative w-full h-full"
  onMouseDown={handleCanvasMouseDown}
  // 缺少: tabIndex, role, onKeyDown, aria-label
>
```

---

### 12.3 修复方案

```tsx
<button
  onClick={() => createNode('case')}
  aria-label="创建案件节点"
  aria-pressed={selectedTool === 'case'}
>
  <span aria-hidden="true">📋</span>
  <span>案件</span>
</button>

<div
  ref={canvasRef}
  role="application"
  aria-label="案件协作画布"
  tabIndex={0}
  onKeyDown={handleKeyNavigation}
>
```

---

## 13. 功能实现缺口

### 13.1 WebRTC 未实现 (CRITICAL)

**现状**: 仅有配置占位符，无实际实现

**需要**:
1. 添加 LiveKit 容器到 docker-compose.yml
2. 安装 livekit-server-sdk
3. 实现 Token 生成 API
4. 前端集成 @livekit/components-react

---

### 13.2 外部系统集成未实现 (HIGH)

**文件**: `dev/src/app/api/integrations/external-systems/route.ts`

所有外部系统调用返回 `NOT_IMPLEMENTED`:
- 法院系统
- 公证系统
- 法律数据库

---

### 13.3 身份核验 API 缺失 (HIGH)

**需要创建**: `/api/identity/verify`

用于公安身份核验接口集成

---

### 13.4 公证 Worker 缺失 (MEDIUM)

**现状**: 存在 `enqueueNotaryTask` 但无处理器

**需要**: `dev/src/workers/notarization-worker.ts`

---

### 13.5 合意自动任命缺失 (MEDIUM)

**问题**: PartyConsent 达到 `CONSENTED_BOTH` 后无自动触发任命

---

## 14. 实施优先级矩阵

### 14.1 CRITICAL - 立即修复 (今日)

| # | 问题 | 文件 | 修复时间 |
|---|------|------|----------|
| 1 | bcryptjs/jsonwebtoken 移至 dependencies | `dev/package.json` | 5分钟 |
| 2 | 添加 AUDIT_LOG_SECRET 到环境变量 | `.env`, `env-validator.ts` | 10分钟 |
| 3 | 协作服务器添加 JWT 认证 | `Prototype/server/collaboration-server.js` | 2小时 |
| 4 | 案件编号生成移入事务 | `api/cases/route.ts` | 30分钟 |
| 5 | 生成强密钥替换占位符 | `.env`, `docker-compose.yml` | 15分钟 |

---

### 14.2 HIGH - 高优先级 (本周)

| # | 问题 | 文件 | 修复时间 |
|---|------|------|----------|
| 1 | 引入 pino 替换 console | 多个文件 | 4小时 |
| 2 | 画布/合意添加乐观锁 | 多个 API | 4小时 |
| 3 | 批量导入包裹事务 | `api/cases/batch-import/route.ts` | 2小时 |
| 4 | 修复 React useEffect 依赖 | 多个组件 | 2小时 |
| 5 | 添加 LiveKit 容器和集成 | `docker-compose.yml`, `lib/livekit.ts` | 8小时 |
| 6 | 统一前后端角色定义 | `shared/roles.ts` | 3小时 |
| 7 | 创建身份核验 API | `api/identity/verify/route.ts` | 3小时 |
| 8 | next.config.ts 添加安全头 | `next.config.ts` | 30分钟 |

---

### 14.3 MEDIUM - 中优先级 (两周内)

| # | 问题 | 文件 | 修复时间 |
|---|------|------|----------|
| 1 | 国际化框架引入 | `i18n.ts`, `messages/*.json` | 8小时 |
| 2 | 可访问性改进 | 多个组件 | 8小时 |
| 3 | 高风险 any 类型替换 | 多个文件 | 8小时 |
| 4 | N+1 查询优化 | `lib/middleware.ts`, `lib/redis.ts` | 4小时 |
| 5 | 状态机验证完善 | `api/mediations/route.ts` | 4小时 |
| 6 | UserRole 添加唯一约束 | `schema.prisma` | 1小时 |
| 7 | 创建公证 Worker | `workers/notarization-worker.ts` | 4小时 |
| 8 | 添加合意自动任命钩子 | `lib/consent-hooks.ts` | 2小时 |

---

### 14.4 LOW - 低优先级 (按计划)

| # | 问题 | 文件 | 修复时间 |
|---|------|------|----------|
| 1 | 内联样式提取到 CSS | 多个组件 | 8小时 |
| 2 | ESLint 禁用注释清理 | 多个文件 | 2小时 |
| 3 | TODO 项完成 | `hooks/useSessionTimeout.ts` | 2小时 |
| 4 | React/Zustand 版本统一 | `package.json` | 2小时 |
| 5 | Docker 健康检查完善 | `docker-compose.yml` | 30分钟 |

---

## 附录 A: 检测命令

```bash
# 统计 any 类型
grep -r "any" dev/src --include="*.ts" --include="*.tsx" | wc -l

# 统计 console 语句
grep -rE "console\.(log|error|warn|debug)" dev/src --include="*.ts" --include="*.tsx" | wc -l

# 检查循环依赖
npx madge --circular dev/src

# 检查过时依赖
cd dev && pnpm outdated

# 检查安全漏洞
cd dev && pnpm audit

# 检查 ESLint 禁用
grep -r "eslint-disable" dev/src --include="*.ts" --include="*.tsx"

# 统计内联样式
grep -r "style={" Prototype/src --include="*.tsx" | wc -l
```

---

## 附录 B: 文件变更清单

| 操作 | 文件路径 | 优先级 |
|------|----------|--------|
| 修改 | `docker-compose.yml` | CRITICAL |
| 修改 | `dev/.env` | CRITICAL |
| 修改 | `dev/package.json` | CRITICAL |
| 修改 | `dev/next.config.ts` | HIGH |
| 修改 | `dev/prisma/schema.prisma` | MEDIUM |
| 修改 | `dev/src/lib/env-validator.ts` | HIGH |
| 修改 | `dev/src/app/api/cases/route.ts` | CRITICAL |
| 修改 | `dev/src/app/api/hearings/route.ts` | HIGH |
| 修改 | `Prototype/server/collaboration-server.js` | CRITICAL |
| 修改 | `Prototype/src/lib/collaboration-engine.ts` | CRITICAL |
| 新建 | `dev/src/app/api/identity/verify/route.ts` | HIGH |
| 新建 | `dev/src/lib/livekit.ts` | HIGH |
| 新建 | `dev/src/lib/logger.ts` | HIGH |
| 新建 | `dev/src/lib/consent-hooks.ts` | MEDIUM |
| 新建 | `dev/src/workers/notarization-worker.ts` | MEDIUM |
| 新建 | `dev/src/shared/roles.ts` | HIGH |
| 新建 | `dev/src/i18n.ts` | MEDIUM |
| 新建 | `dev/messages/zh-CN.json` | MEDIUM |
| 新建 | `dev/messages/en.json` | MEDIUM |
| 新建 | `config/livekit.yaml` | HIGH |

---

## 附录 C: 依赖安装命令

```bash
cd dev

# 1. 修复依赖位置
pnpm remove bcryptjs jsonwebtoken zod
pnpm add bcryptjs jsonwebtoken zod

pnpm remove @types/bcryptjs @types/ioredis @types/jsonwebtoken @types/socket.io @types/xlsx
pnpm add -D @types/bcryptjs @types/ioredis @types/jsonwebtoken @types/socket.io @types/xlsx

# 2. 添加缺失依赖
pnpm add livekit-server-sdk @livekit/components-react livekit-client
pnpm add socket.io-client
pnpm add pino pino-pretty
pnpm add next-intl

# 3. 数据库迁移
npx prisma migrate dev --name add_unique_constraints
npx prisma generate
```

---

## 附录 D: 强密钥生成

```bash
# JWT_SECRET (64字符)
openssl rand -base64 48

# CSRF_SECRET (32字符)
openssl rand -hex 16

# ENCRYPTION_KEY (32字符)
openssl rand -hex 16

# AUDIT_LOG_SECRET (32字符)
openssl rand -base64 32

# PostgreSQL 密码
openssl rand -base64 24

# MinIO 密码
openssl rand -base64 24
```

---

**审计完成**

本报告由 Claude 使用 MCP 工具深度探索生成，涵盖了安全、事务并发、代码质量、前端、配置、数据库、API、依赖、类型安全、国际化、可访问性等多个维度。所有问题均提供了具体的文件位置、行号和修复方案，供 Codex 自动化实施。

**问题总数**: 100+ 处
**CRITICAL 问题**: 8 个
**HIGH 问题**: 24 个
**预计修复工时**: 80+ 小时
