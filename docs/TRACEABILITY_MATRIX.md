# 需求-实现对照矩阵（工作台 dev + 仲裁系统 Prototype）

> 生成时间：2026-01-18 05:12:49  
> 目标：把「文档/提示词中声称要有的能力」与「当前代码中真实存在的实现」做成可追溯矩阵，明确缺口、风险与优先级（以代码为准，不以“文档口径”直接认定完成度）。

---

## 0. 范围与输入来源（Source of Truth）

**范围**
- 工作台：`dev/`（Next.js 工程；已纳入本仓库版本控制）
- 仲裁系统：`Prototype/`（Vite + React 工程；本仓库重点纳入版本控制）

**输入来源（本次审计的文档/提示词）**
- 需求规格：`docs/REQUIREMENTS.md`
- API 参考：`docs/API_REFERENCE.md`
- 数据库设计：`docs/DATABASE_DESIGN.md`
- 安全指南：`docs/SECURITY_GUIDE.md`、`docs/SSO_GUIDE.md`
- 迭代问题单（改善项）：`prompts/system prompt.md`

---

## 1. 状态定义（统一判定标准）

为避免“主观争论”，本矩阵统一使用以下状态：

- `E2E`：前端交互可触发真实后端读写（DB/对象存储/队列等），可重复验证；异常有显式处理；关键写操作可审计  
- `UI(Mock)`：存在 UI/交互，但数据主要来自 `mock/demo/localStorage/sessionStorage/hardcode`，或未接入后端  
- `Backend(未接入)`：存在 API/DB/业务逻辑，但没有被当前 UI 调用（或缺少前端入口/鉴权跳转）  
- `Partial`：部分链路真实，部分仍为模拟/占位/写在 metadata；或仅实现子集  
- `Missing`：未发现实现  
- `N/A`：不适用于该子系统（例如某些“法律工作台画布”能力只属于 Prototype）

---

## 2. 功能需求对照（来自 `docs/REQUIREMENTS.md`）

### 2.1 用户管理

| ID | 需求 | 工作台 dev 状态 | 仲裁系统 Prototype 状态 | 证据（示例，不穷举） |
|---|---|---|---|---|
| FR-1.1.1 | 支持邮箱/手机号注册 | UI(Mock)+Backend(未接入) | N/A | `dev/src/app/(public)/register/page.tsx`（未调用 API）；`dev/src/app/api/auth/register/route.ts` |
| FR-1.1.2 | 支持个人和企业用户 | UI(Mock)+Backend(未接入) | N/A | `dev/src/app/(public)/register/page.tsx`（企业勾选）；`dev/prisma/schema.prisma`（`UserType`/`ProfileType`） |
| FR-1.1.3 | 邮箱/手机号验证 | Partial（Email/Phone 后端已实现，UI 未接入） | N/A | Email：`dev/src/app/api/auth/verify-email/route.ts`；Phone：`dev/src/app/api/auth/verify-phone/route.ts`、`dev/src/app/api/auth/verify-phone/confirm/route.ts`；投递：`dev/src/lib/email.ts`、`dev/src/lib/sms.ts` |
| FR-1.1.4 | 密码强度要求 | Partial | N/A | `dev/src/lib/validation.ts`（`passwordSchema`）；注册 UI 未接入后端校验 |
| FR-1.2.1 | 个人认证：身份证 OCR + 人脸识别 | UI(Mock)/Partial | N/A | `dev/src/app/api/auth/verify-identity/route.ts`（提交并落库为 PENDING）；`dev/src/app/api/documents/ocr/route.ts`（OCR）；`dev/src/components/hearing/identity-verification-modal.tsx` |
| FR-1.2.2 | 企业认证：营业执照 OCR + 法人验证 | Partial | N/A | `dev/src/app/api/auth/verify-identity/route.ts`（business_license 分支 + PENDING）；外部工商/法人核验仍需对接第三方 |
| FR-1.2.3 | 认证状态管理 | Partial | N/A | `dev/prisma/schema.prisma`（`VerificationStatus` 等）；UI 侧仍多为原型 |
| FR-1.2.4 | 认证信息加密存储 | Partial | N/A | `dev/src/app/api/auth/verify-identity/route.ts`（落库 masked，并将原值加密写入 `verificationDocuments.encrypted`）；`dev/src/lib/security/encryption.ts` |
| FR-1.3.1 | TOTP（基于时间的一次性密码） | Partial（后端已实现，UI 未接入） | N/A | `dev/src/app/api/auth/mfa/totp/setup/route.ts`、`dev/src/app/api/auth/mfa/totp/confirm/route.ts`；`dev/src/lib/security/totp.ts`；`dev/prisma/schema.prisma`（`UserMfa`） |
| FR-1.3.2 | 管理员强制启用 | Partial（后端已实现，UI 未接入） | N/A | `dev/src/app/api/auth/login/route.ts`（`ADMIN/OPS_ADMIN` 未启用 MFA 则拒绝登录）；`dev/src/app/api/auth/mfa/totp/*` |
| FR-1.3.3 | 普通用户可选启用 | Partial（后端已实现，UI 未接入） | N/A | `dev/src/app/api/auth/mfa/totp/*` + `/api/auth/login` 的 `mfaCode` 验证 |
| FR-1.4.1 | 支持微信登录 | Partial(企业微信) | N/A | `dev/src/lib/sso.ts`（`wechat_work`）；不等同“微信登录” |
| FR-1.4.2 | 支持支付宝登录 | Partial（后端已实现，需配置 env 并接入 UI） | N/A | `dev/src/lib/sso.ts`（alipay provider）；`dev/src/app/api/auth/sso/[provider]/callback/route.ts`；`dev/src/app/api/external/sso/login/route.ts` |
| FR-1.4.3 | 支持钉钉登录 | Partial | N/A | `dev/src/lib/sso.ts`（`dingtalk`）+ `/api/auth/sso/*`（需环境变量） |

### 2.2 案件管理

| ID | 需求 | 工作台 dev 状态 | 仲裁系统 Prototype 状态 | 证据（示例，不穷举） |
|---|---|---|---|---|
| FR-2.1.1 | 引导式申请流程 | UI(Mock) | Missing | `dev/src/app/(private)/cases/page.tsx`（主要走 store/mock）；Prototype 未见“申请流程页面” |
| FR-2.1.2 | 智能表单验证 | Partial | Missing | 后端：`dev/src/lib/validation.ts`（Zod）；前端申请流程未端到端接入 |
| FR-2.1.3 | 文档上传和管理 | UI(Mock)+Backend(未接入/Partial) | UI(依赖 /api，未提供后端) | `dev/src/app/api/documents/route.ts`；`Prototype/src/lib/document-sync.ts`（调用 `/api/cases/:id/documents`） |
| FR-2.1.4 | 自动费用计算 | Partial（后端已有计算器+支付前校验，UI 未接入） | Missing | `dev/src/lib/arbitration-fee.ts`；`dev/src/app/api/external/payment/route.ts`（计算并写入 `arbitrationFee`，并校验支付金额） |
| FR-2.2.1 | 案件审核流程 | Backend(未接入) | Missing | `dev/src/app/api/cases/[id]/submit/route.ts`；`dev/src/app/api/cases/[id]/review/route.ts` |
| FR-2.2.2 | 自动分配案件编号 | Partial | N/A | `dev/src/app/api/cases/route.ts`（生成 `LMYYYY-xxxxxx`）与需求样式不一致 |
| FR-2.2.3 | 电子送达通知 | Backend(未接入) | Missing | `dev/src/app/api/cases/[id]/service/route.ts`（创建送达任务+入队）；`dev/src/app/api/service/[id]/proof/route.ts`（回执/证明）；`dev/src/lib/queue.ts`（投递队列） |
| FR-2.2.4 | 费用支付确认 | Backend(未接入)/Partial（需配置支付渠道） | Missing | `dev/src/app/api/external/payment/route.ts`（下单+金额校验）；`dev/src/app/api/external/payment/webhook/route.ts`（验签+回写订单/案件缴费状态） |
| FR-2.3.1 | 案件状态实时更新 | UI(Mock) | UI(Mock/Local) | `dev/src/lib/mock-data.ts`（进度）；Prototype 画布状态本地 demo/未连后端 |
| FR-2.3.2 | 时间轴可视化 | UI(Mock)/Partial | UI(已实现可视化) | `dev/src/lib/mock-data.ts`（阶段）；Prototype：`Prototype/src/components/TimelineVisualization.tsx` |
| FR-2.3.3 | 关键节点提醒 | UI(Mock)/Partial | Partial | dev：通知多为 mock；Prototype：存在 Toast/状态面板但无业务触发源 |
| FR-2.3.4 | 进度查询 | UI(Mock) | Partial | dev：案件列表/详情多为 mock；Prototype：可视化呈现但缺真实案件源 |

### 2.3 仲裁庭组建

| ID | 需求 | 工作台 dev 状态 | 仲裁系统 Prototype 状态 | 证据（示例，不穷举） |
|---|---|---|---|---|
| FR-3.1.1 | 仲裁员资质认证 | Backend(未接入) | Missing | `dev/src/app/api/arbitrators/profile/route.ts`；`dev/src/app/api/arbitrators/profile/submit/route.ts`；`dev/src/app/api/arbitrators/profiles/[id]/review/route.ts` |
| FR-3.1.2 | 专业领域标签 | UI(Mock)/Partial | Partial | dev 仲裁员页有筛选项；Prototype 节点标签能力存在 |
| FR-3.1.3 | 评分和评价系统 | Backend(未接入) | Missing | `dev/src/app/api/arbitrators/[id]/reviews/route.ts`；`dev/src/app/api/arbitrators/reviews/[reviewId]/moderate/route.ts` |
| FR-3.1.4 | 可用性管理 | Backend(未接入) | Missing | `dev/src/app/api/arbitrators/availability/route.ts`；`dev/src/app/api/arbitrators/availability/[slotId]/route.ts` |
| FR-3.2.1 | 智能推荐算法 | Missing/Partial | Partial(Mock AI) | dev 多为“占位推荐”；Prototype：`Prototype/src/services/AIService.ts`（MockAIService） |
| FR-3.2.2 | 交互式选择界面 | UI(Mock)/Partial | Partial | 需求在问题单中明确；现状多为原型弹窗/未闭环 |
| FR-3.2.3 | 回避申请处理 | Backend(未接入) | Missing | `dev/src/app/api/cases/[id]/recusals/route.ts`；`dev/src/app/api/cases/[id]/recusals/[recusalId]/route.ts` |
| FR-3.2.4 | 仲裁庭组建确认 | Partial（合意/任命已落库，可审计；仍缺前端验收闭环） | Missing | `dev/src/app/api/cases/[id]/neutrals/invitations/route.ts`；`dev/src/app/api/neutrals/invitations/[id]/respond/route.ts`；`dev/src/app/api/cases/[id]/neutrals/[userId]/consents/route.ts`；`dev/src/app/api/cases/[id]/neutrals/[userId]/appoint/route.ts` |

### 2.4 证据交换

| ID | 需求 | 工作台 dev 状态 | 仲裁系统 Prototype 状态 | 证据（示例，不穷举） |
|---|---|---|---|---|
| FR-4.1.1 | 文档上传（多格式） | Backend(未接入/Partial) | Missing/Partial | `dev/src/app/api/documents/route.ts`（支持 pdf/doc/docx/image）；Prototype 无同源后端 |
| FR-4.1.2 | 文档分类和标签 | Partial | Partial | dev：`CaseDocument` 有 `category/documentType`；Prototype：节点 tags/metadata 支持 |
| FR-4.1.3 | 版本控制 | Partial | Partial | dev：`version/parentDocumentId` 字段；Prototype：画布版本接口存在但无后端 |
| FR-4.1.4 | 权限管理 | Partial | UI(Local) | dev：JWT + PermissionCheckers；Prototype：`Prototype/src/lib/permission-manager.ts`（前端本地权限） |
| FR-4.2.1 | 证据清单管理 | UI(Mock)/Partial | Partial | dev：mock 案件/证据；Prototype：文档节点与证据链可视化 |
| FR-4.2.2 | 证据关联案件 | Partial | Partial | dev：`caseId` 关联；Prototype：`DocumentSync` 依赖 `/api/cases/:id/documents` |
| FR-4.2.3 | 证据真实性验证 | Backend(未接入) | Missing | `dev/src/app/api/documents/[id]/verify/route.ts`；`dev/src/workers/notarization-worker.ts` |
| FR-4.2.4 | 证据交换时间线 | UI(Mock)/Partial | Partial | Prototype 时间线/连接线能力具备；业务事件源缺失 |

### 2.5 在线庭审

| ID | 需求 | 工作台 dev 状态 | 仲裁系统 Prototype 状态 | 证据（示例，不穷举） |
|---|---|---|---|---|
| FR-5.1.1 | 多方视频通话 | Partial | Partial | dev 具备设备检测/设置组件；真实 WebRTC 多方能力未形成可验收闭环 |
| FR-5.1.2 | 屏幕共享 | Missing/Partial | Missing | 未见可验收屏幕共享实现 |
| FR-5.1.3 | 实时字幕 | Partial(Mock) | Missing/Partial | dev “实时转写/字幕”更多为占位；缺真实 STT 服务接入 |
| FR-5.1.4 | 会议录制 | Partial(Mock) | Missing | dev 在 hearing API 中宣称录制；缺真实录制/存储/权限/水印链路 |
| FR-5.2.1 | 庭审排期 | Partial | Missing | dev 有 hearing 创建 API（部分数据写入 `case.metadata`）；Prototype 未见排期模块 |
| FR-5.2.2 | 参与者管理 | Partial | Partial | dev hearing API 维护 participants（写入 metadata）；Prototype 协作参与者为 demo 数据 |
| FR-5.2.3 | 发言权控制 | Missing/Partial | Missing | 未见角色化发言权控制（仲裁员主导）落地 |
| FR-5.2.4 | 庭审记录 | UI(Mock)/Partial | Partial | dev 有庭审记录页面原型；Prototype 有笔记/ChatNote 等组件但缺业务闭环 |
| FR-5.3.1 | 实时证据展示 | UI(Mock)/Partial | Partial | dev hearing UI 有证据区；Prototype 文档节点/画布展示能力强 |
| FR-5.3.2 | 标注和批注 | Partial | Partial | Prototype 画布标注/评论（协作 server 支持 comment）；dev 侧多为原型 |
| FR-5.3.3 | 证据对比 | Missing/Partial | Missing/Partial | 未见可验收对比工具 |
| FR-5.3.4 | 证据归档 | Backend(未接入) | Missing | `dev/src/app/api/cases/[id]/archive/route.ts`（归档任务+入队）；`dev/src/app/api/cases/[id]/archive/download/route.ts`（归档包下载/留痕）；归档元数据含 `sha256`/`manifestHash` |

### 2.6 裁决管理

| ID | 需求 | 工作台 dev 状态 | 仲裁系统 Prototype 状态 | 证据（示例，不穷举） |
|---|---|---|---|---|
| FR-6.1.1 | 在线编辑器 | UI(Mock)/Partial | Partial | dev 有裁决编辑页面原型；Prototype 有编辑器组件（Hearing/Mediation 等） |
| FR-6.1.2 | 模板管理 | Backend(Partial) | Partial | dev：`/api/documents/templates` + `documentTemplate` 模型；Prototype：模板相关组件存在 |
| FR-6.1.3 | 协同编辑 | Missing/Partial | Partial | Prototype 有协作 server，但未与“文书编辑”形成可验收协同 |
| FR-6.1.4 | 版本控制 | Partial | Partial | 字段/接口存在；缺端到端版本回溯 |
| FR-6.2.1 | 电子签名 | Backend(未接入) | Missing | `dev/src/app/api/documents/[id]/signature-requests/route.ts`；`dev/src/app/api/documents/[id]/signature-requests/[requestId]/sign/route.ts`；`dev/src/lib/document-signing.ts` |
| FR-6.2.2 | 电子印章 | Backend(未接入) | Missing | `dev/src/app/api/seals/route.ts`；`dev/src/app/api/documents/[id]/seals/apply/route.ts` |
| FR-6.2.3 | 自动送达 | Backend(未接入) | Missing | `dev/src/app/api/cases/[id]/service/route.ts`（送达任务创建+入队）；`dev/src/app/api/service/[id]/proof/route.ts`（送达证明） |
| FR-6.2.4 | 归档管理 | Backend(未接入) | Missing | `dev/src/app/api/cases/[id]/archive/route.ts`；`dev/src/app/api/cases/[id]/archive/download/route.ts`（归档包生成/下载） |

### 2.7 AI 智能助手

| ID | 需求 | 工作台 dev 状态 | 仲裁系统 Prototype 状态 | 证据（示例，不穷举） |
|---|---|---|---|---|
| FR-7.1.1 | 证据链分析 | UI(Mock)/Partial | Partial(Mock AI + 可视化) | Prototype：`EvidenceChainVisualization.tsx` + `AIService.ts`（mock） |
| FR-7.1.2 | 人物关系图 | UI(Mock)/Partial | Partial | Prototype：`LegalRelationshipGraph.tsx`、`RelationshipGraph.tsx` |
| FR-7.1.3 | 时间轴可视化 | UI(Mock)/Partial | Partial | Prototype：`TimelineVisualization.tsx` |
| FR-7.1.4 | 争议焦点识别 | Missing/Partial | Missing/Partial | 未见真实模型/规则；多为“占位建议” |
| FR-7.2.1 | 仲裁员推荐 | Missing/Partial | Missing/Partial | 多为占位；缺数据源与可解释性 |
| FR-7.2.2 | 相似案例推荐 | Missing | Missing | 未见案例库接入 |
| FR-7.2.3 | 法律条文推荐 | Partial | Partial | Prototype 有法条引用组件 `LegalArticleCitation.tsx`；但缺真实检索服务 |
| FR-7.2.4 | 文书模板推荐 | Partial | Partial | dev 有模板模型；推荐逻辑仍为占位 |
| FR-7.3.1 | 自动生成裁决书 | Backend(Partial/模拟) | Partial(Mock) | dev：`/api/documents/generate`（含“模拟文件生成”）；Prototype：AIService mock |
| FR-7.3.2 | 自动生成通知书 | Missing/Partial | Missing/Partial | 模板可做但未见可验收流程 |
| FR-7.3.3 | 自动生成报告 | Missing/Partial | Missing/Partial | 同上 |
| FR-7.3.4 | 智能校对 | Missing/Partial | Missing/Partial | 同上 |

### 2.8 法律工作台

| ID | 需求 | 工作台 dev 状态 | 仲裁系统 Prototype 状态 | 证据（示例，不穷举） |
|---|---|---|---|---|
| FR-8.1.1 | 案件关系图 | UI(Mock)/Partial | Partial(可视化已落地) | Prototype：`RelationshipGraph.tsx`、`LegalRelationshipGraph.tsx` |
| FR-8.1.2 | 证据链图 | UI(Mock)/Partial | Partial | Prototype：`EvidenceChainVisualization.tsx` |
| FR-8.1.3 | 人物关系图 | UI(Mock)/Partial | Partial | Prototype：同上 |
| FR-8.1.4 | 时间轴图 | UI(Mock)/Partial | Partial | Prototype：`TimelineVisualization.tsx` |
| FR-8.2.1 | 多用户实时协作 | UI(Mock)/Partial | Partial(协作 server + 前端) | `Prototype/server/collaboration-server.js`；`Prototype/src/components/collaboration/*` |
| FR-8.2.2 | 评论和批注 | UI(Mock)/Partial | Partial | 协作 server 支持 comment；前端有 Chat/Note 组件 |
| FR-8.2.3 | 任务分配 | Backend(未接入) | Missing/Partial | `dev/src/app/api/cases/[id]/tasks/route.ts`；`dev/src/app/api/cases/[id]/tasks/[taskId]/assign/route.ts`；`dev/src/app/api/cases/[id]/tasks/[taskId]/comments/route.ts` |
| FR-8.2.4 | 进度跟踪 | UI(Mock) | Partial | dev：mock 进度；Prototype：可视化但缺业务事件源 |

---

## 3. 非功能需求对照（来自 `docs/REQUIREMENTS.md`）

| 类别 | 需求 | 工作台 dev 状态 | 仲裁系统 Prototype 状态 | 备注 |
|---|---|---|---|---|
| 性能 | API < 500ms、1000+并发 | Missing/未验证 | Missing/未验证 | 代码中未见可重复压测与指标基线；dev 有缓存/限流框架但未形成验收 |
| 视频 | 1080p 通话、录制 | Partial/未验证 | Missing/未验证 | dev 有设备检测与部分 WebRTC 配置占位 |
| 上传 | 100MB+ 文件上传 | Backend(未接入) | Missing | `dev/src/app/api/documents/multipart/initiate/route.ts`；`dev/src/app/api/documents/multipart/[sessionId]/part-url/route.ts`；`dev/src/app/api/documents/multipart/[sessionId]/complete/route.ts` |
| 安全 | 等保三级、AES-256-GCM、TLS1.3、审计日志 | Partial/文档口径多 | Partial/文档口径多 | dev 为 JWT（Header Bearer）+ Zod；多项仍为占位；Prototype 有 XSS 工具但无身份体系 |
| 可用性 | 99.9%、备份、灾备 | Missing | Missing | 未见生产级部署与演练脚本落地 |
| 兼容性 | 浏览器/移动端 | Partial/未验证 | Partial/未验证 | 需以真实设备与自动化用例验证 |
| 可扩展性 | 模块化独立部署 | Partial | Partial | Prototype/Dev 均可独立部署；但与基座的“契约+鉴权”尚未落地 |

---

## 4. 提示词“改善项”对照（来自 `prompts/system prompt.md`）

> 这部分属于“产品验收反馈/问题单”，不等同于 `docs/REQUIREMENTS.md` 的原始需求，但对实现完整性与 UX 质量有强约束。

| ID | 改善项（摘录） | 现状判定 | 证据/备注 |
|---|---|---|---|
| P-1 | 工作台存在重复入口（两个新建申请按钮等） | UI 问题存在风险（需以实际页面核对） | `prompts/system prompt.md`（改善1/2/3） |
| P-2 | 个人头像/消息等下拉动画异常 | UI 问题存在风险 | `prompts/system prompt.md`（改善1/2/3/5） |
| P-3 | 左侧功能栏需要更大/更美观/更合理布局 | UI 问题存在风险 | 同上 |
| P-4 | 仲裁案件详情：进度显示与“操作目录+文书目录+文书生成”闭环 | Missing/Partial | 需求清单很明确，但目前多为原型与占位；需在 E2E 主线里落地 |
| P-5 | 仲裁员 vs 当事人角色切分需在登录前完成 | Missing/Partial | 当前为原型：`dev/src/app/(public)/login/page.tsx`（登录后跳 role-selection；且使用 mockUser） |
| P-6 | 小铃铛“消息”应为浮动窗口而非跳转页 | Missing/Partial | 需统一交互模式（浮层/遮罩/可关闭） |
| P-7 | 在线庭审的“三通道进入、先设备后身份核验、仲裁员主导” | Partial | dev 有设备/身份组件，但流程编排与权限主导仍缺“可验收主线” |

---

## 5. API 参考对照（来自 `docs/API_REFERENCE.md`）

> 结论：`docs/API_REFERENCE.md` 的 API 面向“目标系统”；`dev/` 当前实现的路由存在命名与覆盖差异，且前端未系统性接入。

| API（文档） | dev 是否有对应实现 | 备注 |
|---|---|---|
| POST `/api/auth/register` | ✅ | `dev/src/app/api/auth/register/route.ts` |
| POST `/api/auth/login` | ✅ | `dev/src/app/api/auth/login/route.ts` |
| POST `/api/auth/logout` | ✅ | `dev/src/app/api/auth/logout/route.ts` |
| GET `/api/auth/me` | ✅ | `dev/src/app/api/auth/me/route.ts` |
| POST `/api/auth/verify-identity` | ✅ | `dev/src/app/api/auth/verify-identity/route.ts` |
| GET `/api/users` | ✅ | `dev/src/app/api/users/route.ts` |
| GET `/api/users/:id` | ✅ | `dev/src/app/api/users/[id]/route.ts` |
| PUT `/api/users/:id` | ✅ | `dev/src/app/api/users/[id]/route.ts` |
| POST `/api/cases` | ✅ | `dev/src/app/api/cases/route.ts` |
| GET `/api/cases` | ✅ | `dev/src/app/api/cases/route.ts` |
| GET `/api/cases/:id` | ✅ | `dev/src/app/api/cases/[id]/route.ts` |
| PUT `/api/cases/:id` | ✅ | `dev/src/app/api/cases/[id]/route.ts` |
| DELETE `/api/cases/:id` | ✅ | `dev/src/app/api/cases/[id]/route.ts` |
| POST `/api/documents/upload` | ✅ | `dev/src/app/api/documents/upload/route.ts`（同时保留 POST `/api/documents`） |
| GET `/api/documents/:id` | ✅ | `dev/src/app/api/documents/[id]/route.ts` |
| POST `/api/documents/ocr` | ✅ | `dev/src/app/api/documents/ocr/route.ts` |
| POST `/api/hearings` | ✅ | `dev/src/app/api/hearings/route.ts` |
| GET `/api/hearings/:id` | ✅ | `dev/src/app/api/hearings/[id]/route.ts` |
| POST `/api/hearings/:id/start` | ✅ | `dev/src/app/api/hearings/[id]/start/route.ts` |
| POST `/api/hearings/:id/end` | ✅ | `dev/src/app/api/hearings/[id]/end/route.ts` |
| POST `/api/ai/analyze` | ✅ | `dev/src/app/api/ai/analyze/route.ts`（并保留 `/api/ai/assistant`） |
| POST `/api/ai/generate` | ✅ | `dev/src/app/api/ai/generate/route.ts`（并落库 `GeneratedDocument`；下载/预览：`/api/documents/generated/:id/*`） |
| POST `/api/external/*` | ✅ | `dev/src/app/api/external/sso/login/route.ts`、`dev/src/app/api/external/payment/route.ts`（系统集成另见 `/api/integrations/external-systems`） |

---

## 6. 数据库设计对照（来自 `docs/DATABASE_DESIGN.md`）

| 项 | 现状 | 证据/备注 |
|---|---|---|
| Prisma Schema 是否存在 | ✅ | `dev/prisma/schema.prisma` |
| 关键实体（User/Case/Document 等） | ✅（模型/枚举齐全） | `dev/prisma/schema.prisma` |
| 关键实体是否被业务代码使用 | ✅（核心已落库） | hearing/mediation/payment/service/archive 等已使用独立模型落库；仍需持续对齐查询/报表/审计口径 |
