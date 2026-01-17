# 任务计划（V2）：LegalMind「工作台 + 仲裁系统」全栈化与基座连通大型工程总计划

## 元信息
- 计划 ID：`plan_2026-01-12_fullstack_legalmind_workbench_arbitration_v2`
- 创建时间：2026-01-12
- 状态：待审批（仅规划；批准后使用 `/do-plan` 执行）
- 预估复杂度：极高（跨仓库/跨域/全栈/合规/数据迁移/协作与实时）
- 特别约束（已确认）
  - 工作台是插件（Plugin），非系统
  - 仲裁系统是系统（System），与 `D:/Desktop/LawClick_NEW/` 内系统为平等关系
  - `D:/Desktop/LawClick_NEW/` 只可读：绝不改动其中任何文件/代码/配置
- 计划范围（本次已核对到的真实目录）
  - 本仓库：
    - 工作台插件：`dev/`（Next.js 15 + React 19 + Prisma；含大量 UI 与 API，但存在 mock/未接入）
    - 仲裁系统前端：`Prototype/`（Vite + React 18 + Plait/Drawnix；前端依赖 `/api/*`，仅含少量 server 原型）
    - 文档：`docs/`（需求、API、DB、安全、SSO、缺口分析、对照矩阵等）
    - 大模型提示词：`prompts/`（含既有总计划与 system prompt/改善项）
    - 规则与参考：`rules/`、`resource/`
  - 基座系统（只读参照，用于生态一致性对齐）：`D:/Desktop/LawClick_NEW/`
    - Web（Next.js）：`D:/Desktop/LawClick_NEW/lawclick-next/`（ToolModule、NextAuth、Prisma 等）
    - API Gateway（Rust/Axum）：`D:/Desktop/LawClick_NEW/src/`（`/api/v1/*`，支持解析 Auth.js/NextAuth cookie token）
- 核心输入来源（本计划以“代码与可运行事实”为真源）
  - 对照矩阵：`docs/TRACEABILITY_MATRIX.md`
  - 缺口分析：`docs/GAP_ANALYSIS.md`
  - 既有计划（V1）：`prompts/PLAN_fullstack-legalmind-workbench-arbitration.md`、`.codex/plans/current/2026-01-12_fullstack-legalmind-workbench-arbitration.md`
  - 安全/SSO/DB/API：`docs/SECURITY_GUIDE.md`、`docs/SSO_GUIDE.md`、`docs/DATABASE_DESIGN.md`、`docs/API_REFERENCE.md`

---

## 0. 本计划输出物（Deliverables）

> 说明：规划阶段只产出“计划文档”；执行阶段才产出代码、迁移、CI/CD 等。

### 0.1 规划阶段（本文件）应当可直接驱动执行的内容
1) **端到端（E2E）可验收主线**：每条主线都明确“前端入口 → 后端契约 → DB/对象存储 → 审计 → 回读验证 → 错误语义”。
2) **跨仓库连通方案**：明确 `LawClick_NEW` 作为基座的连通策略（鉴权/租户/契约/网关/审计）。
3) **目录/仓库划分方案**：把 `dev/` 与 `Prototype/` 的职责边界、版本控制与部署形态拆清楚。
4) **可交互决策清单**：凡涉及不可逆/重构级决策，必须先确认（见“关键决策点”）。

### 0.2 执行阶段（批准后）预期产出物（按阶段）
- 合同（Contract-first）：OpenAPI/JSONSchema/Zod 契约、版本化策略、错误码与幂等规范
- 身份与权限：单点登录/信任链、租户上下文、RBAC、审计留痕
- 数据层：统一数据模型、迁移脚本、数据一致性与回滚策略
- 文件与证据：对象存储、上传意图、版本、哈希、权限、下载与审计
- 仲裁业务：案件状态机、组庭/排期/庭审/调解/文书/送达/归档闭环
- 画布与协作：画布持久化、版本、评论/批注、协作鉴权与回放导出
- 运维：CI 质量门禁、部署脚本、监控告警、备份灾备、容量治理

---

## 1. 事实核对（已验证，不写猜测）

### 1.1 本仓库现状（LegalMind-Arbitration）
- `dev/` 是独立 Next.js 工程（存在 `dev/package.json`、`dev/src/app/api/*`、`dev/prisma/schema.prisma`），但存在大量 `mock` 数据与“后端已写、UI 未接入”的缺口（以 `docs/TRACEABILITY_MATRIX.md`、`docs/GAP_ANALYSIS.md` 为准）。
- `Prototype/` 是 Vite + React 的画布型仲裁工作台原型，存在对后端的明确依赖（例如 `Prototype/src/lib/canvas-persistence.ts` 调用 `/api/cases/:id/canvas`），但本仓库未提供对应后端实现；仅有 `Prototype/server/collaboration-server.js` 原型服务。
- 已有“需求-实现对照矩阵”与“缺口分析”文档，明确指出：**文档口径≠实现口径**，必须以代码与可运行链路为准。

### 1.2 基座系统现状（LawClick_NEW）
> 这是本计划的关键新增：V2 明确区分 `lawclick-next`（Web）与 Rust API Gateway（`src/`）。

- `D:/Desktop/LawClick_NEW/lawclick-next/`
  - Next.js 16（`lawclick-next/package.json`：`next: 16.1.1`、`next-auth 5 beta` 等）
  - 数据模型：`lawclick-next/prisma/schema.prisma`（存在 `Case`、`Document`、`DocumentVersion`、`UploadIntent`、`ToolModule`、`ToolInvocation` 等）
  - 工具模块：`lawclick-next/src/actions/tool-actions.ts` 对 ToolModule 的 `url/webhookUrl` 强制 `https://`；`/documents/[id]/workbench` 会基于 ToolModule 拼接 `documentId` 与 `source=lawclick`（见 `lawclick-next/src/components/documents/DocumentDetailClient.tsx` 的 `buildWorkbenchHref`）
- `D:/Desktop/LawClick_NEW/src/`（Rust/Axum API Gateway）
  - 服务入口：`src/main.rs` 暴露 `/api/v1/auth|cases|documents|...`
  - 鉴权能力：`src/security/jwt.rs` 明确支持两类 token：
    1) Rust 自签 JWT（Bearer）
    2) Auth.js/NextAuth 的 cookie（JWE 解密 + 校验）
  - 说明：这使得“同域部署 + Cookie”成为外部模块最可控的 SSO 方式之一（见“关键决策点”）。

---

## 2. 目标状态（To-Be）

### 2.1 业务目标（必须可验收）
1) **工作台（dev）是插件（Plugin）**：可被生态内任一系统以 URL/工具模块方式打开，在给定业务对象上下文（如 `documentId`、`caseId`）下提供“工作区能力”（不定义主业务系统域）。
2) **仲裁系统（Prototype）是系统（System）**：与 `D:/Desktop/LawClick_NEW/` 内系统平等，拥有自有后端/数据域/部署生命周期；从“画布原型”升级为“可办理的仲裁业务系统”，至少打通：
   - 申请 → 受理 → 组庭 → 举证质证 → 调解/庭审 → 裁决文书 → 送达 → 归档
3) **生态一致性与连通**：在不修改 `D:/Desktop/LawClick_NEW/` 代码的前提下，通过“契约对齐 + 可选同步/适配 + 最小侵入配置（仅配置 ToolModule url/webhookUrl 等）”实现跨系统连通（至少完成 1 条可重复 E2E 主线）。

### 2.2 技术目标（硬约束）
- **拒绝空壳**：任何功能交付必须打通前后端与持久化，并且有可重复验证的方法。
- **拒绝 mock**：执行阶段必须逐步清除 `mock/demo/localStorage` 作为事实源的实现。
- **强校验**：所有入参/出参必须 Schema 校验（Zod/JSON Schema/OpenAPI），不信任外部输入。
- **可审计**：关键写操作必须落审计（含工具模块调用、文书生成、证据提交、状态流转等）。
- **连通性优先**：允许不同技术栈，但必须通过“契约 + 鉴权 + 数据边界”连通。

---

## 3. 关键决策点（已确认：1B / 2B / 3B / 4B / D5B）

> 已确认：工作台=插件；仲裁=系统；`D:/Desktop/LawClick_NEW/` 只可读（不改其中任何文件/代码/配置）；生态连通深度：`D5B`（读基座、写自身）。

### 决策 1（已选 1B）：后端对齐基准（Rust/Axum 风格对齐）
- 结论：仲裁系统后端采用 **Rust/Axum**（对齐 `LawClick_NEW/src` 的路由组织、鉴权抽取器、错误模型、审计习惯），API 版本化统一使用 `/api/v1/*`。
- 原则：
  - 不修改 `D:/Desktop/LawClick_NEW/` 任意文件；其代码仅作为“参考实现/对照标准”，不作为本仓库的依赖包直接复用。
  - 工作台作为插件：后端只做“插件必须的薄能力”（偏好/布局/插件内数据、对基座/仲裁的 API 聚合），避免把插件做成第二个系统。

### 决策 2（已选 2B）：跨域 SSO/会话共享（短时效交换令牌，基座只读）
- 结论：采用 **SSO Broker（新增服务）** 完成交换令牌链路：不改基座代码，只在部署/网关层新增路由把 `/sso/*` 指向 Broker。
- 推荐落地流程（浏览器前通道，避免跨站 cookie 限制）：
  1. 模块（工作台/仲裁）发起跳转：`GET https://<lawclick-domain>/sso/start?client_id=...&redirect_uri=...&state=...&nonce=...`
  2. Broker 在同域读取并验证 Auth.js/NextAuth cookie（参考 `LawClick_NEW/src/security/jwt.rs` 解密与 Claims 抽取逻辑）
  3. Broker 生成 **一次性 code**（TTL ≤ 60s，单次使用，绑定 nonce+state+origin+PKCE），302 回跳模块回调地址
  4. 模块后端用 code 换取 **短期 access token**（TTL ≤ 5min），再建立模块自身 session（更短或同等 TTL）
- 安全红线：
  - 禁止把“可复用/长时效 token”放在 URL
  - code 必须一次性、可撤销、可审计；所有交换与关键调用必须落审计（ToolInvocation 或模块审计表）
- 前置条件（必须具备其一）：
  - 能配置生态网关/反向代理：新增 `https://<lawclick-domain>/sso/*` → `legalmind-auth-broker` 路由（不涉及修改 `LawClick_NEW` 文件）
  - 或者接受降级：改为 2A（同域挂载）/ 2C（模块自登录 + 账号绑定）

### 决策 3（已选 3B）：仲裁系统用户域（包含外部当事人门户）
- 结论：仲裁系统必须支持“外部当事人”与“内部办案人员”两套体验与权限边界：注册/实名认证/送达/通知/证据/庭审/文书全链路按角色隔离。

### 决策 4（已选 4B）：目录与版本控制策略（多仓）
- 结论：
  - **WorkBench 插件仓库**：从当前 `dev/` 独立出来（Next.js），作为可嵌入生态的插件交付物
  - **Arbitration 系统仓库**：从当前 `Prototype/` 演进为“仲裁系统前端”，并新增对应后端与数据层
  - 本仓库可作为“研发聚合/文档与契约仓”（保留 `docs/`、`prompts/`、`rules/`、`resource/`、以及原型留档），或在 Phase 1 决策后转正为 arbitration 仓
- 4B 风险对策：
  - 契约（OpenAPI/JSONSchema/Zod）必须独立版本管理（建议单独 `contracts` 仓或 npm/crate 发布）
  - 联调必须用可复现环境（`docker-compose` / DevContainer），CI 以契约版本做门禁
  - 明确“只读基座”边界：任何需要基座改造的事项一律通过新服务/网关配置解决

### 补充决策 D5（已选 D5B）：生态连通深度（不改基座文件）

- **D5B｜读基座，写自身**：
  - 模块只读调用基座 `/api/v1/*` 获取文档/案件/任务等（基座为事实源）
  - 模块产生的结果（文书/事件/审计/画布/协作记录）优先落在自身系统
  - 与基座对齐方式：通过“事件投递/产物上传/引用链接”实现弱耦合一致（不改基座代码文件）

---

## 4. 总体推进策略：以“可验收主线”驱动（Tracer Bullet）

> 每条主线都要求：**前端入口 → 后端 → DB/对象存储/队列 → 审计 → 回读验证**。

### 主线 A（P0）：基座登录态 → 打开工作台（WorkBench）→ 拉取真实文档/案件数据
- 目标：从 `LawClick_NEW` 能打开工作台，并带上下文（例如 `documentId`），工作台可读取真实数据并可写回审计事件。

### 主线 B（P0）：创建仲裁案件（Case.serviceType=ARBITRATION）→ 上传证据 → 详情页操作目录可执行
- 目标：至少 1 个仲裁案件从创建到“证据上传/下载/预览”完全闭环，并具备权限与审计。

### 主线 C（P0）：Prototype 画布持久化 → 版本 → 协作鉴权与回放（最小可用）
- 目标：`Prototype` 画布可保存/加载（真实后端），协作有鉴权与持久化（至少评论/批注）。

---

## 5. 分阶段工程计划（可执行版）

> 说明：阶段内再按“步骤（Step）”推进；每个 Step 都包含：目标、涉及目录/文件、实施要点、验证方法。

### Phase 0：基线审计与对齐（不写代码也必须做）
**目标**：冻结“真相基线”，避免用“文档宣称”当作完成度。

- Step 0.1｜冻结当前对照矩阵与缺口清单
  - 输入：`docs/TRACEABILITY_MATRIX.md`、`docs/GAP_ANALYSIS.md`
  - 输出：执行阶段将把每个条目拆成可执行任务（含验收脚本）
  - 验证：每个 P0 条目都能指向“前端入口 + 目标 API + 目标表/字段 + 目标测试”

- Step 0.2｜清点 mock 事实源（禁止继续扩散）
  - 重点位置（示例）：
    - `dev/src/lib/mock-data.ts`
    - `Prototype/src/data/demoData.ts`
    - `Prototype/src/lib/*` 的本地缓存/IndexedDB/localforage 使用点
  - 输出：一份“mock 清理路线图”（执行阶段写入 docs）
  - 验证：后续每个垂直切片交付时都减少 mock 覆盖面

- Step 0.3｜确定“统一 API 命名与版本”策略
  - 推荐：统一对外使用 `/api/v1`（若选择决策 1B）
  - 兼容：在模块侧提供 `/api/*` → `/api/v1/*` 适配层（仅过渡期）
  - 验证：`Prototype` 中 `/api/cases/:id/*` 的依赖有明确落点（改前端或加适配）

### Phase 1：连通基础设施（鉴权/租户/契约/审计）
**目标**：让“打开模块 + 安全调用后端”成为可重复的标准能力。

- Step 1.1｜确定并实现模块鉴权方案（对应决策 2）
  - 主路径：2B（跨域 + 短时效交换令牌，基座只读）
    - 新增并部署 `legalmind-auth-broker`（独立服务）：由网关把 `https://<lawclick-domain>/sso/*` 路由到该服务（不改 `LawClick_NEW` 代码文件）
    - 交换流程（浏览器前通道）：
      - 模块 → `GET /sso/start`（带 state/nonce/redirect_uri/PKCE）
      - Broker 同域读取并验证 NextAuth/Auth.js cookie（参考 `LawClick_NEW/src/security/jwt.rs`）
      - Broker 生成一次性 code（TTL ≤ 60s，单次使用，绑定 origin/PKCE/nonce），302 回跳模块
      - 模块后端 `POST /sso/token` 换取短期 access token（TTL ≤ 5min），再建立模块自身 session
    - 审计：交换/签发/失败原因必须可追溯（写入 ToolInvocation 或模块审计表；与 D5 选择保持一致）
    - 可选增强（D5B）：若部署层允许共享 `JWT_SECRET`（配置层面，不改代码），Broker 可额外签发“基座可验”的短期 bearer token，使模块可直接调用基座 Rust `/api/v1/*`
  - 降级路径：2A / 2C（仅在 2B 的网关前置条件不具备时启用）
    - 2A（同域 + Cookie）：通过反向代理把模块挂载到与基座同域（HTTPS），复用 NextAuth cookie；Rust API 解析 cookie
    - 2C（模块自登录 + 账号绑定）：模块使用自身登录（或调用基座 `/api/v1/auth/login`），后续做账号绑定（体验与权限对齐成本高）
  - 验证：
    - 未授权访问模块 API 必须 401/403
    - 权限变更后立即生效（不能只信任 token 内字段）

- Step 1.2｜契约层（Contract-first）落地
  - 建议产出（执行阶段创建目录，位置依赖决策 4）：
    - `contracts/openapi/`：对外 REST 契约（给模块/移动端/第三方）
    - `contracts/zod/`：TS 运行时校验（前后端共享）
  - 验证：
    - 任一跨服务请求必须先过 schema 校验（拒绝“随手拼 JSON”）

- Step 1.3｜统一错误模型与错误码
  - 目标：前端不再依赖“字符串报错”；必须可国际化/可监控/可审计
  - 验证：错误码可用于告警聚合与审计报表

### Phase 2：数据模型与迁移（决定“事实源”在哪）
**目标**：让“案件/文档/事件/审计”拥有唯一事实源与可追溯模型，避免把关键字段塞入 JSON `metadata`。

- Step 2.1｜数据域划分与映射（dev Prisma ↔ 基座 Prisma/Rust Entity）
  - 输入：`dev/prisma/schema.prisma`、`lawclick-next/prisma/schema.prisma`、`LawClick_NEW/src/entity/*`
  - 输出：
    - 字段映射表（哪些复用、哪些扩展、哪些废弃）
    - 数据迁移策略：一次性迁移/双写过渡/只迁移增量
  - 验证：至少主线 A/B 所需表结构落地，且可回滚

- Step 2.2｜仲裁业务扩展模型（最小集合）
  - 必须结构化（不能塞 JSON）：
    - 仲裁案件阶段与状态机事件（可复用 `Case.currentStage` + 事件表）
    - 仲裁庭/仲裁员选择与回避
    - 举证质证：证据项、质证意见、时间戳
    - 调解：调解申请、调解过程、协议草案与签署
    - 文书：模板→生成→版本→送达→归档
  - 验证：支持“按阶段查询”“按角色过滤可见操作”“审计可导出”

### Phase 3：工作台（dev）全栈化与基座嵌入
**目标**：工作台成为“基座可打开的工具模块”；并在 `D5B` 下可读取真实数据（无 mock），结果写入自身系统并可审计。

- Step 3.1｜工作台入口对齐（基座 → workbench）
  - 参考：`lawclick-next/src/app/(dashboard)/documents/[id]/workbench/page.tsx`
  - 约束：ToolModule URL 需 https（`lawclick-next/src/actions/tool-actions.ts`）
  - 工作台需要支持：
    - 读取 query：`documentId`、`source`
    - 获取文档详情/文件预览链接/关联案件：通过基座（只读）契约 API 获取
  - 验证：从基座打开后，上下文可解析；`D5B` 下工作台能展示“真实文档信息”且无 mock

- Step 3.2｜替换工作台前端 mock 主线（按对照矩阵逐个击破）
  - 输入：`docs/TRACEABILITY_MATRIX.md` 的 P0 条目（例如 login/register/进入工作台链路）
  - 验证：登录/进入工作台/查看案件列表与详情均走真实 API（基座为事实源）

- Step 3.3｜工作台与仲裁系统的“共享组件/共享契约”策略
  - 目标：避免重复实现（API 客户端、schema、错误处理、审计埋点）
  - 验证：共享代码形成单一来源（单测覆盖）

### Phase 4：仲裁系统（Prototype）后端补全与主线闭环
**目标**：把 Prototype 依赖的后端接口补齐，并与基座事实源打通。

- Step 4.1｜补齐 Prototype 依赖的最小 API 集合
  - 现有依赖（已扫描到）：
    - `Prototype/src/lib/case-data-sync.ts`：`GET /api/cases/:id`
    - `Prototype/src/lib/document-sync.ts`：`GET /api/cases/:id/documents`、`/api/documents/:id/preview|download`
    - `Prototype/src/lib/canvas-persistence.ts`：`PUT/GET /api/cases/:id/canvas`、`GET /api/cases/:id/canvas/versions`
    - `Prototype/src/lib/realtime-sync.ts`：`GET /api/cases/:id/events`（SSE）
  - 实施策略（执行阶段根据决策 1/2 选其一）：
    - 方案 A：改前端统一指向仲裁系统后端 `/api/v1/*`（与基座风格对齐）
    - 方案 B：仲裁系统侧加适配层（保持 `/api/*`，内部转发 `/api/v1/*`）
  - 验证：Prototype 的“保存/加载画布、文档同步、事件流”全部可用

- Step 4.2｜协作服务工程化（从“原型 server”到“可审计协作”）
  - 现状：`Prototype/server/collaboration-server.js` 存在但未绑定统一身份
  - 目标：
    - 协作房间模型：以 caseId/canvasId 绑定
    - 鉴权：必须基于统一 token/cookie
    - 持久化：至少评论/批注持久化 + 审计
  - 验证：多用户协作可重连、可回放、可导出审计

### Phase 5：合规硬链路补齐（通知/支付/送达/归档）
**目标**：把“无法验收/无法上线”的合规硬链路补齐，形成完整业务闭环。

- Step 5.1｜通知中心（站内信/短信/邮件/第三方 IM）
  - 必须具备：模板化、重试、回执、可见性、权限联动、审计
  - 验证：案件状态机关键节点都能触达并可追溯

- Step 5.2｜支付与对账（若仲裁费/服务费为必需）
  - 必须具备：订单、回调验签、对账、退款、开票（按需）
  - 验证：支付结果能驱动案件状态机（例如缴费完成才进入下一阶段）

- Step 5.3｜电子送达与归档
  - 必须具备：送达渠道、失败重试、法律效力时间戳、归档不可篡改策略
  - 验证：可导出“送达证明链”与“归档包”

### Phase 6：质量门禁与运维工程化（上线必备）
**目标**：避免“能跑但不敢上线”，形成可持续交付能力。

- Step 6.1｜CI 质量门禁（至少：类型检查、lint、测试、审计脚本）
  - 基座已有多项 audit script（见 `lawclick-next/package.json` 的 `audit:*`）
  - 验证：合并前自动跑；失败阻断

- Step 6.2｜部署与环境对齐（Postgres/Redis/对象存储/队列）
  - 输出：Docker Compose（本地对齐生产）、环境变量规范、密钥管理策略
  - 验证：一键启动可复现；数据可备份/可恢复

### Phase 7：仓库与目录划分（工作台 vs 仲裁系统）
**目标**：让“代码归属、发布边界、责任边界”清晰，避免后续协作混乱。

- Step 7.1｜产出仓库地图与发布单元定义
  - 输出（执行阶段创建/更新文档）：
    - `docs/REPO_MAP.md`：每个目录用途、是否可发布、是否含敏感信息
    - `docs/DEPLOYMENT_TOPOLOGY.md`：域名/子路径/反向代理拓扑

- Step 7.2｜处理嵌套 git 与忽略规则（高风险但必须）
  - 现状风险：
    - `dev/` 存在独立 `.git/` 且根 `.gitignore` 可能忽略 `dev/`，会导致“工作台代码无法在本仓库追踪变更”
    - `Prototype/drawnix-reference/.git` 等引用仓库会污染根仓库
  - 目标：
    - 按 4B（多仓）制定 submodule/subtree 的标准做法，并明确“本仓库聚合边界 vs 各子仓发布边界”
  - 验证：CI 能在单一入口拉起全量检查；目录归属明确

---

## 6. 风险评估（必须提前写进计划，避免返工）

| 风险 | 可能性 | 影响 | 缓解措施 |
|---|---:|---:|---|
| 身份域/角色模型与“仲裁当事人门户”不匹配 | 高 | 高 | 先确认决策 3；若 3B，单独拆“外部身份域”子计划 |
| 跨域 SSO 导致 cookie/CORS/CSRF 问题 | 高 | 高 | 采用 2B：SSO Broker + 浏览器前通道跳转；code 单次 + 短 TTL + 绑定 origin/PKCE；若无法配置网关路由则降级 2A/2C |
| 数据模型割裂（dev 自建 DB vs 基座 DB） | 中 | 高 | 决策 1/2 先定；先打通主线 A/B 再扩展 |
| 把关键字段写入 JSON metadata 导致无法审计/查询 | 高 | 高 | Phase 2 强制结构化建模；审计脚本阻断 |
| 协作/实时与审计要求冲突（性能 vs 留痕） | 中 | 中 | 事件溯源/采样策略；分层存储；压测与 SLO |
| 大规模目录重构导致回归 | 中 | 中 | 先做 REPO_MAP/标注，再分批迁移；每批迁移跑门禁 |

---

## 7. 验收标准（Definition of Done）

### P0 验收（必须完成）
- [ ] 主线 A：基座可打开工作台并传上下文（如 `documentId`）；`D5B` 下工作台可读取真实文档/案件数据（无 mock）且关键操作可审计
- [ ] 主线 B：创建仲裁案件 → 上传证据 → 详情页“操作目录”至少 3 个操作可执行并可回读验证
- [ ] 主线 C：Prototype 画布保存/加载/版本可用；协作具备鉴权与持久化（至少评论/批注）
- [ ] 安全：未授权访问全部 401/403；输入校验全覆盖；关键写操作可审计

### P1/P2 验收（后续扩展）
- [ ] 支付/送达/归档闭环（若业务必需）
- [ ] AI/检索增强接入真实数据源（无 mock）
- [ ] 压测基线与告警（SLO/SLI）

---

## 8. 附录：Prototype ↔ 基座 API 对齐表（P0）

> 目的：把 `Prototype` 里已经写死的 `/api/*` 依赖，映射到 `LawClick_NEW` 已存在的 `/api/v1/*`，并标出缺口（需要补齐的 endpoint）。

### 8.1 已存在（可直接复用/轻改前端即可对接）
- 案件详情
  - Prototype：`GET /api/cases/:caseId`
  - 基座 Rust：`GET /api/v1/cases/:id`（`D:/Desktop/LawClick_NEW/src/routes/cases.rs` 的 `router()`）
- 文档列表（按案件）
  - Prototype：`GET /api/cases/:caseId/documents`
  - 基座 Rust：`GET /api/v1/documents?caseId=:caseId`（`D:/Desktop/LawClick_NEW/src/routes/documents.rs` 的 `list_documents`，Query 使用 `camelCase`）
- 文档详情
  - Prototype：隐含（通过列表拿到 `document.id` 后需要更多字段）
  - 基座 Rust：`GET /api/v1/documents/:id`
- 文档下载/预览（合并为“受控文件流”）
  - Prototype：`/api/documents/:id/preview`、`/api/documents/:id/download`
  - 基座 Rust：`GET /api/v1/documents/:id/file`（可在执行阶段扩展 `?download=1|0` 或 `Content-Disposition` 策略以同时支持预览/下载）
- 文档上传
  - Prototype：未直接列出，但工作台/仲裁主线必需
  - 基座 Rust：`POST /api/v1/documents/upload`（Multipart 上传；对齐 DB 写入与对象存储）

### 8.2 缺口（需在基座 Rust 或模块侧适配层补齐）
- 画布持久化（Prototype Canvas）
  - Prototype：`GET/PUT /api/cases/:caseId/canvas`
  - 目标：新增 `GET/PUT /api/v1/cases/:id/canvas`
  - 数据要求：结构化表（不可把关键字段塞入 JSON metadata），至少含版本、hash、updatedBy、updatedAt、审计事件
- 画布版本列表
  - Prototype：`GET /api/cases/:caseId/canvas/versions`
  - 目标：新增 `GET /api/v1/cases/:id/canvas/versions`
- 案件事件流（SSE）
  - Prototype：`GET /api/cases/:caseId/events`（EventSource）
  - 现状：基座 Next 有 `GET /api/realtime/signals`（租户级 SSE），Rust `events` 为 REST
  - 目标（执行阶段二选一）：
    - 方案 A：新增 `GET /api/v1/cases/:id/events/stream`（case 维度 SSE）
    - 方案 B：扩展 `tenant signals` 支持 case 维度事件，并在 Prototype 侧适配

---

## 9. 附录：建议最终目录结构（用于“工作台 vs 仲裁系统”划分）

> 说明：这是执行阶段的目标结构；规划阶段不动现有目录，先以 REPO_MAP 标注。

### 9.1（备选）4A｜monorepo
```text
LegalMind-Arbitration/
  apps/
    workbench-next/              # 由 dev/ 收敛而来（Next.js）
    arbitration-prototype/       # 由 Prototype/ 收敛而来（Vite/React）
    arbitration-collaboration/   # 协作服务（可选：Node/Rust，取决于最终选型）
  packages/
    contracts/                   # OpenAPI + JSONSchema + Zod（跨应用强校验）
    ui/                          # 可选：shadcn/ui 主题与共享组件（避免重复）
    api-client/                  # 可选：生成/封装的强类型 API client
  docs/
    workbench/                   # 工作台专用文档
    arbitration/                 # 仲裁专用文档
    integration/                 # 与基座连通/网关/鉴权/契约
  prompts/
  rules/
  resource/
  .codex/plans/
```

### 9.2（已选）4B｜多仓/子模块
```text
LegalMind-Arbitration/
  Prototype/                     # 仲裁前端（本仓库重点）
  docs/                          # 文档（含跨仓库集成文档）
  prompts/                       # 总计划/执行提示词
  rules/
  resource/
  .codex/plans/

WorkBench Repo（单独）:
  dev/ or workbench-next/
```

---

## 10. 附录：里程碑建议（8–16 周拆解示例）

> 说明：按“最小可验收主线”推进；团队规模不同会影响并行度与周期。

- W1–W2：Phase 0 + Phase 1（对齐基线、定决策、打通 SSO/契约骨架）
- W3–W6：Phase 2 + Phase 3（数据模型/迁移最小集合 + 工作台嵌入与真实数据）
- W7–W10：Phase 4（Prototype 后端补齐：画布/文档/事件/协作）
- W11–W14：Phase 5（通知/支付/送达/归档闭环，按需裁剪）
- W15–W16：Phase 6 + Phase 7（质量门禁、部署拓扑、目录重构与收尾）

---

## 11. 执行方式（与本仓库的 /do-plan 配合）

### 11.1 本计划存放位置
- 主计划（本文件）：`.codex/plans/current/2026-01-12_fullstack-legalmind-workbench-arbitration_v2.md`

### 11.2 你要求的“放入 prompts/ 供后续执行”（执行入口）
- 镜像入口（建议后续大模型优先读这个）：`prompts/PLAN_fullstack-legalmind-workbench-arbitration.md`
- 权威主文档：`.codex/plans/current/2026-01-12_fullstack-legalmind-workbench-arbitration_v2.md`
- 原则：两者内容保持一致；如未来只能维护一个，以 `.codex/plans/current/*_v2.md` 为准。

---

## 12. 用户确认（请回复选项）

已确认：`1B；2B；3B；4B`（工作台=插件；仲裁=系统；基座只读）。  
已确认：`D5B`（生态连通深度，见第 3 节）。

确认后，我会把本总计划拆成可执行子计划（按 Phase/主线拆分），再进入执行阶段。
