# 02｜邀请/拒绝/披露/回避/双方合意/任命：全线上闭环设计（仲裁员/调解员）

## 0. 目标
把“中立者（仲裁员/调解员）参与案件”的全过程线上化，并做到：
- 可追溯：每一步可回放（业务事件 + 审计日志）
- 可证明：合意与关键确认具备签名/时间戳（D5A）
- 可控权：不同身份在不同阶段能做的事严格受控（RBAC + 案件级 ABAC）

## 1. 参与角色与权责边界

### 1.1 参与主体
- 当事方：申请人、被申请人（含企业/个人）
- 代理：律师/授权代理人（需案件授权）
- 中立者：仲裁员、调解员（受邀请/回避披露约束）
- 机构：仲裁机构（或平台管理员）、法院、公证机关（对接/存证/确认）
- 运维：只管理配置与日志，不参与案件事实判断

### 1.2 基本原则
- **中立者接受邀请前必须披露**（利益冲突/关联关系/曾代理或任职等），并可被双方异议/回避。
- **双方合意是任命生效的前置条件**（可撤回，记录原因与时间）。
- **任何拒绝/撤回/异议都必须结构化记录**，避免只留“聊天内容”。

## 2. 数据模型（执行阶段落库；这里只给结构与字段方向）

> 说明：`dev/prisma/schema.prisma` 已包含邀请/披露/合意/任命相关实体与 `CaseEvent`（可用于留痕）；当前缺口主要在 UI 接入与“双方合意→任命生效”接口闭环（执行阶段补齐）。

### 2.1 核心实体
- `NeutralInvitation`
  - `id`
  - `caseId`
  - `neutralType`：`ARBITRATOR | MEDIATOR`
  - `invitedUserId`（或 invitedProfileId）
  - `invitedByUserId`（仲裁机构管理员/案件管理员）
  - `expiresAt`
  - `status`：`DRAFT | SENT | ACCEPTED | REJECTED | EXPIRED | WITHDRAWN`
  - `requirements`：如是否必须披露、是否必须签名确认等
  - `createdAt/updatedAt`
- `ConflictDisclosure`
  - `id`
  - `invitationId`
  - `disclosureText`（结构化字段建议拆分：关系类型、对象、时间范围、影响评估）
  - `attachments`：引用证据/材料（走证据链）
  - `signedAt` / `signatureRef`（D5A：时间戳/签名）
- `NeutralResponse`
  - `id`
  - `invitationId`
  - `action`：`ACCEPT | REJECT | REQUEST_MORE_TIME | UPDATE_DISCLOSURE`
  - `reason`（拒绝/延期理由）
  - `respondedAt`
- `PartyConsent`
  - `id`
  - `caseId`
  - `targetType`：`ARBITRATOR | MEDIATOR`
  - `targetUserId`
  - `applicantConsent`：状态/时间/签名引用
  - `respondentConsent`：状态/时间/签名引用
  - `status`：`PENDING | CONSENTED_BOTH | WITHDRAWN | EFFECTIVE`
- `NeutralAppointment`
  - `id`
  - `caseId`
  - `targetType`
  - `targetUserId`
  - `effectiveAt`
  - `terminatedAt`（解除任命/更换）
  - `terminateReason`

### 2.2 事件与审计
- `CaseEvent`（业务事件，append-only）：邀请发出/接受/拒绝/披露提交/合意确认/任命生效/撤回等
- `AuditLog`（安全审计）：登录、权限变更、敏感访问、关键写操作（已有表）

## 3. 状态机（必须服务端强制）

### 3.1 邀请状态机
`DRAFT → SENT → (ACCEPTED_WITH_DISCLOSURE | REJECTED | EXPIRED | WITHDRAWN)`
- `ACCEPTED_WITH_DISCLOSURE` 必须满足：披露提交 + 签名/确认

### 3.2 合意状态机
`PENDING → CONSENTED_BOTH → EFFECTIVE`
- 任一方可在窗口期 `WITHDRAWN`（必须记录原因，产生事件）

### 3.3 任命状态机
`PENDING → ACTIVE → TERMINATED`
- `ACTIVE` 触发：写入案件级参与关系、授予案件级权限、通知全体参与人

## 4. API 契约（建议，以 Contract-first 产出为准）

> 执行阶段会统一到版本化 API（例如 `/api/v1/...`），并产出 OpenAPI/Zod。

### 4.1 邀请
- `POST /cases/{caseId}/neutrals/invitations`
- `GET  /neutrals/invitations/{invitationId}`
- `POST /neutrals/invitations/{invitationId}/respond`（接受/拒绝/延期）
- `POST /neutrals/invitations/{invitationId}/disclosure`

### 4.2 合意与任命
- `POST /cases/{caseId}/neutrals/{userId}/consents`（双方各自确认）
- `POST /cases/{caseId}/neutrals/{userId}/appoint`（满足条件后由机构/系统执行）

## 5. 权限矩阵（摘要）
- 只有“案件管理员/仲裁机构管理员”可发出邀请
- 只有“被邀请中立者”可响应与提交披露
- 只有“申请人/被申请人（或其代理且已授权）”可对披露提出异议/确认合意
- 只有“系统/案件管理员”可使任命生效（且必须验证合意已满足）

## 6. 留痕与存证点（D5A）
每个关键节点必须形成“存证点”：
- 邀请发出（含截止时间、邀请材料版本）
- 披露提交（含附件 hash 列表）
- 双方合意（签名/时间戳）
- 任命生效（事件链 + 权限授予快照）
