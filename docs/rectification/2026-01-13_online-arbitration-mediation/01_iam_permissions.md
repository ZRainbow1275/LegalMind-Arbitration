# 01｜统一身份与权限（D2B）：外部 IdP（OIDC）+ 本地授权（RBAC/ABAC）+ 运维后台

## 0. 目标
- **统一身份源**：所有端（Web/移动端/小程序）以 OIDC 为统一登录入口；后端按标准验证 token。
- **统一授权源**：权限由本地系统掌控（RBAC + 案件级 ABAC），禁止把“授权事实”完全交给 IdP。
- **界面随权限变化**：登录后 UI 由后端下发 capabilities 决定能看什么/能做什么。
- **运维后台独立**：运维账号、权限变更、审计日志、策略与密钥轮换均在后台完成。

## 1. 身份体系拆分（强制分层，避免越权）

### 1.1 平台身份（Platform Identity）
用于决定“你是谁/属于哪个机构/可在平台做哪些大类事情”：
- 普通用户（个人/企业）
- 律师（个人执业信息 + 律所/机构）
- 仲裁员/调解员（名册信息、回避披露义务）
- 法院（机构账号/接口账号）
- 公证机构（机构账号/接口账号）
- 运维/安全（OPS/SOC/审计管理员）

  ### 1.2 案件身份（Case Identity）
用于决定“在某个具体案件里你是什么角色/能看什么材料/能做哪些动作”：
- 当事方：申请人、被申请人
- 代理：律师/授权代理人（必须绑定到某个当事方，并记录授权范围）
- 中立者：仲裁员/调解员（与邀请/披露/回避/合意/任命状态机绑定）
- 程序相关：书记员、证人、观察员等（可选，但必须可扩展）
- 机构参与：法院/公证在案件中的“接口型参与”（用于司法确认、执行、存证）

关键点：平台身份≠案件身份。一个“律师（平台身份）”在某案件里可能是“申请人代理（案件身份）”；同一用户也可能在不同案件里扮演不同案件身份。

---

## 2. 外部 IdP（OIDC）与本地系统的职责边界（D2B 核心）

### 2.1 IdP 负责（Authentication）
- 登录（账号/密码/短信/企业 SSO 等）
- MFA/条件访问（尤其运维后台）
- 颁发 Token（`id_token`/`access_token`/`refresh_token`）
- 密钥轮换（JWKS）

### 2.2 本地系统负责（Authorization）
- 平台角色（PlatformRole）与权限点（Permission）定义、分配、回收
- 案件级授权（CaseRole/CaseParticipant/资源所有权）
- 业务状态机约束（例如：未完成双方合意不能任命；未披露不能接受邀请）
- 全量审计与业务事件（AuditLog + CaseEvent + EvidenceChain）

结论：IdP 解决“谁能登录”，本地系统解决“登录后能做什么”。

---

## 3. 推荐的认证架构（多端统一 + 可审计）

### 3.1 端类型与推荐 OIDC 流程
- Web（浏览器/Next.js）：Authorization Code + PKCE（推荐 BFF 模式，token 不落前端持久化）
- Android/iOS：Authorization Code + PKCE（refresh token 存 Keychain/Keystore）
- 小程序：建议走“前端 code → 后端换取会话/令牌”的桥接模式（后端做统一映射）
- 系统对系统（法院/公证/公安/内部服务）：Client Credentials + mTLS/签名（接口型账号）

### 3.2 BFF（Backend For Frontend）模式（推荐）
目标：避免前端持久化 access token，降低 XSS/泄露风险。
- Next.js 服务端完成 OIDC 回调与 token 交换
- 服务端把 session 写入 HttpOnly Cookie（或 Redis session）
- 前端仅通过 `/api/auth/me` 获取用户信息与 capabilities

### 3.3 Token 校验（资源服务器）
所有后端入口（REST/WebSocket/队列回调）统一做：
1) 按 IdP JWKS 校验签名（支持密钥轮换 + 缓存）
2) 校验时效（`exp/nbf/iat`）
3) 校验受众（`aud`，不同 client 的 token 不可混用）
4) 校验租户（`tenantId` 或等效 claim）
5) 拉取本地授权：根据 `sub` 映射本地 `userId`，加载平台角色/权限/案件授权

---

## 4. 授权模型（平台 RBAC + 案件级 ABAC）

### 4.1 平台角色（PlatformRole，建议最小集合）
> 对齐你要求的平台身份：普通用户、律师、仲裁员/调解员、法院、公证、运维。

- `END_USER`：普通用户（个人/企业）
- `LAWYER`：律师
- `ARBITRATOR`：仲裁员
- `MEDIATOR`：调解员
- `COURT`：法院（机构/接口账号）
- `NOTARY`：公证机关（机构/接口账号）
- `ADMIN`：业务管理员（仲裁机构管理员/平台管理员）
- `OPS_ADMIN`：运维管理员（仅管配置/日志/权限，不参与案件事实）
- `AUDITOR_READONLY`：审计只读（可选）

### 4.2 案件角色（CaseRole，建议）
- `APPLICANT`：申请人
- `RESPONDENT`：被申请人
- `AGENT`：代理（含律师代理/授权代理）
- `TRIBUNAL_ARBITRATOR`：仲裁庭成员
- `TRIBUNAL_PRESIDING`：首席仲裁员
- `CASE_MEDIATOR`：本案调解员
- `CLERK`：书记员
- `WITNESS`：证人
- `OBSERVER`：观察员（只读）

### 4.3 权限点（Permission）
权限点用于后端强制校验与前端 capabilities 下发，必须细粒度到“动作”，并按域划分：
- 身份与组织：用户查看/变更、资质审核（律师/仲裁员/机构）
- 案件：立案/受理/排期/组庭/变更阶段/关闭
- 邀请/合意：发起邀请/撤回/响应/披露提交/回避申请/合意确认/任命生效
- 文档与证据：上传/查看/下载/版本/批注/证据展示
- 调解会议室：发言/推进阶段/创建待办/生成协议草案/发起签署
- 庭审 RTC：创建庭审房间/签发入庭 token/开始录制/结束录制/发起转写/证据演示同步
- 运维：系统配置、密钥轮换、审计导出、队列管理

现状提示：代码里存在 `dev/src/lib/security/rbac.ts` 与 `dev/src/lib/auth.ts` 的权限口径差异；执行阶段必须收敛为“单一权限源”。

### 4.4 ABAC（属性规则）
RBAC 决定“你大概能做什么”，ABAC 决定“你能对哪个资源做什么”，至少包含：
- `tenantId`：跨机构隔离
- `caseId`：案件范围
- `caseRole`：你在本案中的身份
- `processStage`：当前阶段（立案/受理/组庭/庭审/调解/裁决/送达/归档）
- `resourceOwnerId`：资源归属（证据/文书/消息）
- `invitation/consent/appointment` 状态：决定能否推进下一步

---

## 5. capabilities 下发（让“权限体现在登录后界面中”）

### 5.1 capabilities 的作用
- 后端根据平台角色 + 权限点 +（可选）案件授权，计算用户能力集合
- 前端按 capabilities 渲染导航、按钮、可操作入口
- 前端路由守卫仅做体验优化；最终权限以服务端校验为准

### 5.2 建议返回结构（示例）
```json
{
  "user": { "id": "...", "displayName": "...", "platformRoles": ["LAWYER"] },
  "capabilities": {
    "nav": ["cases", "documents", "mediation", "messages"],
    "actions": ["case:create", "evidence:upload", "mediation:join_room"],
    "admin": { "canAccessOps": false }
  }
}
```

---

## 6. 运维后台（与 D2B 强绑定）

### 6.1 运维后台必须单独 client 与策略
- 单独 OIDC Client：`ops-console`
- 强制 MFA（TOTP/硬件令牌/条件访问）
- 建议：IP 白名单/设备信任
- 高危操作二次确认（并写审计）

### 6.2 运维与业务隔离（职责分离）
- 运维：系统配置/权限/日志/外部对接参数
- 业务管理员：案件流程配置/仲裁员名册/规则模板
- 审计只读：只能查询导出，不可改配置

---

## 7. 身份确定与外部核验（公安/法院/公证接口预留）

### 7.1 统一“资质/实名认证”状态机（建议）
- `PENDING → VERIFIED → REJECTED → REVOKED`
- 每次状态变化必须写 `AuditLog` + 业务事件（用于取证）

### 7.2 律师/仲裁员/机构核验（建议拆适配层）
- `IdentityVerificationProvider`（接口抽象）：`submit`/`queryStatus`/`revoke`/`getArtifacts`
- 未来接入：公安实名、法院接口、律师协会/公证系统等

---

## 8. 实施落地信息（当前留空）

### 8.1 IdP 选型与接入信息（留空）
你已确认采用外部 IdP（D2B），但**具体 IdP 当前留空**。本整改方案按标准 OIDC 设计，先完成接口抽象与本地授权收敛；进入实施/联调前再补齐如下信息即可：
- `issuer`（OIDC Issuer URL）
- `jwks_uri`（JWKS 地址）与密钥轮换策略
- `client_id`（Web/移动端/运维后台分别的 client）
- 回调域名与路径（redirect_uri）
- claim 约定（`sub`/`tenantId`/`orgId`/`roles` 等）

### 8.2 登录方式范围（留空）
默认按“账号密码 + MFA（TOTP）”作为基线，并预留扩展：短信/邮件、企业微信/钉钉/政务统一身份等，等你后续确定后再落入具体实施清单。
