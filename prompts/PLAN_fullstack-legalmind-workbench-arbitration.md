# 任务计划：LegalMind「工作台 + 仲裁系统」全栈化与基座连通工程总计划

## 元信息
- 计划 ID：`plan_2026-01-12_fullstack_legalmind_workbench_arbitration`
- 创建时间：2026-01-12
- 状态：待审批（规划阶段已完成，等待 `/do-plan`）
- 预估复杂度：高（跨仓库/跨域/全栈/合规）
- 预估周期：按“可验收主线”拆分 8–16 周（取决于选型与团队规模；详见分阶段里程碑）
- 覆盖仓库/目录：
  - 仲裁系统前端原型：`D:\Desktop\LegalMind-Arbitration\Prototype\`
  - 工作台前端原型：`D:\Desktop\LegalMind-Arbitration\dev\`
  - 文档：`D:\Desktop\LegalMind-Arbitration\docs\`
  - 提示词/规则：`D:\Desktop\LegalMind-Arbitration\prompts\`、`D:\Desktop\LegalMind-Arbitration\rules\`
  - 参考资料：`D:\Desktop\LegalMind-Arbitration\resource\`
  - 基座系统（参照并承载集成）：`D:\Desktop\LawClick_NEW\lawclick-next\`
- MCP 同步：本仓库使用 `.codex/plans/` 作为主计划载体；同时在对话中同步高层 TODO（见末尾“同步任务清单”）

> 说明：本计划主版本保存在 `.codex/plans/current/2026-01-12_fullstack-legalmind-workbench-arbitration.md`（便于计划索引/归档），并已镜像输出到本文件 `prompts/PLAN_fullstack-legalmind-workbench-arbitration.md` 供后续大模型执行与迭代使用。

---

## 任务目标（一句话）
在 **不牺牲安全与可审计性** 的前提下，将 LegalMind 的“工作台（dev）”与“仲裁系统（Prototype）”从“仅前端可运行”升级为 **可端到端验收** 的全栈系统，并通过 `D:\Desktop\LawClick_NEW` 的基座能力实现 **账号/权限/文档/事件/AI/审计** 等关键链路的连通与复用，同时完成仓库与目录的清晰划分。

---

## 背景与现状（As-Is）

### 1) 目录语义（你给出的口径）
- `dev/`：LegalMind 法律生态基座系统的“通用工作台”（计划嵌入生态内所有系统）
- `Prototype/`：LegalMind 基座系统中的“仲裁系统”（仲裁业务工作台/画布）
- `docs/`：开发文档（工作台 + 仲裁系统）
- `prompts/`、`rules/`：用于指挥大模型介入开发的规则与提示词
- `resource/`：参考资料（含大文件/视频等）

### 2) 已观测到的实现形态（以代码为准，非断言“已完成/未完成”）
- `Prototype/`：Vite + React 18 + TypeScript + Tailwind + shadcn(ui) + Plait/Drawnix（画布内核）；包含浮动面板、右键菜单、对齐辅助线、证据链、虚拟法庭面板、文档管理 UI 等工作台组件。
- `dev/`：Next.js 15 + React 19 + Prisma；但当前仓库根 `.gitignore` 默认忽略 `dev/`，且 `dev/` 内存在独立 `.git/`，实际属于“另一个仓库/另一个工程”。
- `docs/` 提供目标需求、API 参考、数据库设计、安全与 SSO 指引；但这些文档与基座系统 `LawClick_NEW/lawclick-next` 的真实落地存在版本差异，需要“对齐与迁移”，不能照搬。
- 基座系统 `LawClick_NEW/lawclick-next` 已具备：
  - Next.js 16 + Prisma + NextAuth（多租户/权限/审计/质量门禁脚本）
  - “工具模块（ToolModule）”机制：可登记外部模块 URL（强制 https）并在工作区打开；例如 `/documents/:id/workbench` 会基于 ToolModule 的 url 生成跳转链接，并带 query 参数 `documentId`、`source`。

---

## 目标状态（To-Be）

### A. 业务层目标
1) 仲裁系统从“画布原型”升级为“可办理的仲裁业务系统”：
   - 用户/角色：当事人、代理人、仲裁员、书记员、管理员（角色差异化体验与权限）
   - 案件全流程：申请→受理→组庭→举证质证→庭审→裁决→送达→归档
   - 文书与操作目录：与“文书生成/模板库/流程节点”闭环（文档与动作可追溯）
2) 工作台成为基座可复用能力：
   - 统一登录/统一权限/统一数据源（至少在“文档/案件/任务/消息/AI/审计”维度统一）
   - 能被基座系统中的任意对象（案件、文档、项目、任务）以“工作区”方式打开

### B. 技术层目标
1) 端到端可运行：前端交互 → API/Action → DB/对象存储 → 审计/错误处理 → UI反馈，全链路贯通（拒绝空壳）。
2) 强类型与强校验：所有输入输出以 Zod/Schema 驱动（含跨服务契约）。
3) 可审计/可观测：关键写操作有审计日志；错误有统一捕获；性能指标可见。
4) 连通性优先：允许工作台/仲裁保持不同技术栈，但必须通过清晰的“契约层 + 鉴权 + 数据流”连通。

---

## 关键决策点（需要你确认，避免“做一半推倒重来”）

### 决策 1：与基座系统的集成形态（推荐：B）
1. **A｜内置集成（强耦合）**：把 `dev/` 与 `Prototype/` 迁移/重构为 `LawClick_NEW/lawclick-next` 内的模块（同域同栈）
   - 优点：鉴权与数据访问最顺滑；统一运维；跨模块跳转/状态共享成本低
   - 风险：迁移成本高；对基座代码侵入大；阶段性交付压力大
2. **B｜外部模块（松耦合，推荐）**：保留 `dev/` 与 `Prototype/` 为独立应用，通过基座 `ToolModule(url)` + Webhook/HTTP API 进行连通
   - 优点：对基座侵入小；可渐进上线；不强求技术栈一致；符合“生态可嵌入”的目标
   - 风险：跨域鉴权、CORS/CSRF、会话共享需要设计；ToolModule 目前强制 https（本地开发要有方案）
3. **C｜混合**：工作台外部模块 + 仲裁内置（或反之）

> 你回复一个字母：`A` / `B` / `C`，我会在执行阶段按该路径落地。

### 决策 2：仲裁后端的“事实来源”优先级（推荐：复用基座 DB）
1. **A｜复用基座（LawClick）数据库**：仲裁作为 `ServiceType=ARBITRATION` 或独立模型挂在同一租户体系下
2. **B｜独立数据库**：仲裁独立 DB，通过基座调用仲裁服务（HTTP/gRPC）读取摘要并跳转

### 决策 3：本地开发如何满足 ToolModule 的 https 限制（必须选）
1. **A｜本地 https 反代（推荐）**：Caddy/Traefik/Nginx + mkcert，自签证书本机信任
2. **B｜修改基座校验（仅 dev 环境允许 http）**：需要改动 `LawClick_NEW/lawclick-next/src/actions/tool-actions.ts` 的 URL 校验规则
3. **C｜只在测试/预发布使用 https，开发阶段不走 ToolModule 跳转**：通过同域 proxy/iframe 临时绕过（成本高且容易与真实环境偏离）

---

## 第一大部分：需求与实现对照审计（覆盖工作台 + 仲裁）

> 本部分目标：把“文档/提示词里声称要有的功能”与“当前代码是否真实可运行”做成可追溯矩阵，明确缺口、风险与优先级。

### Step 1：建立“统一需求清单（Source of Truth）”
- **输入来源（必须逐条解析）**
  - `docs/REQUIREMENTS.md`（宏观功能需求 + 非功能需求）
  - `docs/API_REFERENCE.md`（目标 API 面）
  - `docs/DATABASE_DESIGN.md`（目标数据模型）
  - `docs/SECURITY_GUIDE.md`、`docs/SSO_GUIDE.md`（合规与身份）
  - `prompts/system prompt.md`（对工作台/仲裁 UI 的蓝图与改进项）
- **输出物（执行阶段创建）**
  - `docs/TRACEABILITY_MATRIX.md`：需求→页面/组件→API→表/字段→测试用例 的矩阵
  - `docs/GAP_ANALYSIS.md`：缺口清单（按“可验收主线”排序）

### Step 2：对照维度定义（统一判定标准，避免主观争论）
每个需求条目必须给出以下状态（执行阶段在矩阵中标注）：
- **E2E 已实现**：前端操作可触发真实后端写入/读取；可重复验证；有异常处理
- **仅 UI/原型**：存在页面/组件，但数据来自本地 state/mock/localStorage 或硬编码
- **后端已实现但 UI 未接入**：存在 API/Action/DB，但 UI 没有调用或缺少权限入口
- **未实现**：无 UI、无后端、无契约

### Step 3：审计重点（结合你在 prompts 中提出的“改进 1/2”）
必须额外审计并落到缺口清单：
- 工作台页面冲突/重复入口（如“两个新建申请按钮”“仪表盘两个详情界面冲突”）
- 个人头像页动画错误
- 左侧功能栏布局与可用性
- 仲裁案件详情页进度展示与信息密度不足
- “操作目录 + 文书目录 + 文书生成”的闭环是否存在真实实现
- 仲裁员 vs 当事人身份切分（权限/可见性/操作集差异）

---

## 第二大部分：全栈化总体架构（基座连通优先）

### 1) 总体策略（建议的默认架构）
在你确认“决策 1”后，执行阶段按以下方式落地：

#### 若选择 B（外部模块，推荐）
- `LawClick_NEW/lawclick-next` 作为：
  - 身份与租户中心（AuthN/AuthZ）
  - 统一数据源（文档/案件/任务/审计/AI）
  - 生态入口（ToolModule → 外部模块 URL）
- `LegalMind-Arbitration/dev`（工作台）与 `LegalMind-Arbitration/Prototype`（仲裁画布）作为：
  - 独立 Web 应用（可独立部署）
  - 通过 **短时效访问令牌** + **契约 API** 访问基座数据
  - 通过 **Webhook** 或 **事件投递** 向基座回写关键结果（例如：生成文书、更新节点状态、提交证据链分析结果）

### 2) “连通性”设计（不要求同栈，但要求同契约）

#### 2.1 契约层（Contract-first）
**目标**：任何跨应用交互都必须有“可版本化的契约”，否则会演变成不可维护的隐式耦合。
- 建议建立 `contracts/`（位置取决于决策 1/3）：
  - `contracts/http/`：OpenAPI / JSON Schema（用于跨服务）
  - `contracts/zod/`：Zod schema（用于 TS 端强校验）
  - `contracts/events/`：Webhook payload schema（用于工具模块调用审计）

#### 2.2 鉴权与会话（跨域可用、可撤销、可审计）
**问题**：基座 `ToolModule.url` 打开外部链接；外部模块需要安全地访问基座 API。
**推荐机制（执行阶段设计与实现）**
1) 基座侧提供“短时效一次性交换令牌（Exchange Token）”
2) 外部模块打开时携带 `exchangeToken`（或仅携带 `documentId`，由外部模块先调用基座的“交换端点”换取 access token）
3) 外部模块使用 `access token` 调用基座 API（带租户/权限上下文）
4) 所有调用写入 `ToolInvocation`（基座已具备模型），满足审计

> 注意：严禁把长期有效 JWT/refresh token 放在 URL query 中（泄漏风险极高）。

#### 2.3 数据边界（多租户 + 最小权限）
基座系统已有租户体系与权限检查（例如 `getActiveTenantContextWithPermissionOrThrow`）。
仲裁与工作台接入必须遵守：
- 任何数据读取/写入都要带 tenantId 并经过权限网关
- 对象存储（文档/证据）使用 presigned URL，避免直连凭据泄漏
- 全链路日志与错误处理：不能吞异常

---

## 第三大部分：仲裁系统（Prototype）后端补全路线

> 核心原则：以“可验收的垂直切片”推进，先打通最关键的 1 条业务主线，再扩展到全功能。

### Phase A（主线 1）：案件申请 → 文档上传 → 案件详情页可操作（E2E）
**目标验收**：当事人能创建仲裁案件、上传证据、在详情页看到真实进度与可执行操作目录，且所有操作写入 DB、可追溯。

1) 数据模型对齐（在基座 DB 中落地）
- 复用 `Case` 模型或新增 `ArbitrationCase`（决策 2）
- 建立“仲裁案件阶段/操作目录/文书目录”的结构化模型（避免把一切塞进 JSON）
- 文书模板复用基座 `DocumentTemplate`（或扩展字段以支持仲裁模板类型）

2) API/Action 对齐
- 以 `docs/API_REFERENCE.md` 为参考，但以 `lawclick-next` 的 action/route 规范为准
- 每个接口必须：
  - Zod 校验输入（拒绝隐式信任）
  - 权限检查（当事人/仲裁员/书记员差异）
  - 审计落盘（写操作）
  - 错误返回具备业务语义（非堆栈）

3) 前端接入（Prototype）
- 将当前“本地状态/假数据”替换为真实 API 数据
- 详情页二级侧边栏：操作目录 + 文书目录 + 文书生成入口（你在 prompts 中明确要求）

4) 验证
- 单元测试：schema 校验、权限边界、状态机变迁
- 集成测试：创建案件→上传证据→查询列表/详情
- E2E：优先复用基座系统的 Playwright（或在仲裁仓库落地等价门禁）

### Phase B（主线 2）：组庭 → 仲裁员选择/回避 → 庭审排期
**目标验收**：管理员/书记员可发起组庭；当事人可选择/回避；系统生成庭审排期并通知。

### Phase C（主线 3）：在线庭审（WebRTC）→ 证据展示 → 笔录/纪要
**关键决策**：WebRTC 自建 vs 第三方（Agora/Twilio/腾讯云等）。
- 如果基座已有视频能力：优先复用
- 否则：先选第三方 SDK 打通 E2E，再考虑自建

### Phase D：裁决书生成/协同编辑 → 电子签章/送达 → 归档
**重点**：与基座的模板库、文档中心、权限与审计联动；送达与签章需要合规评估。

---

## 第四大部分：工作台（dev）与基座连通路线

### 1) 工作台定位（生态“嵌入式工作区”）
基座系统已经有“页面工作区/浮窗/乐高化”思想与工具模块机制；工作台应对齐为：
- 任意对象的“工作区”（Case/Document/Project/Task）
- 支持模块化组件（卡片、面板、流程、画布）可配置可复用

### 2) 统一入口与权限
- 基座路由统一：从 `lawclick-next` 的对象详情页/列表页进入工作台
- 工作台内部根据角色渲染不同操作集（你要求仲裁员 vs 当事人切分）

### 3) 数据联动
- 以基座 DB 为单一事实源（推荐），工作台只做“呈现 + 交互 + 调用服务”
- 输出（工作台产生的结构化成果）必须可回写：
  - 例如：证据链分析结果、争点列表、时间线节点、任务拆解、文书生成请求

---

## 第五大部分：仓库与目录划分（避免“两个系统混在一起”）

> 目标：让任何新成员 5 分钟内理解“哪里是工作台、哪里是仲裁、哪里是文档/提示词/规则”。

### 执行阶段的划分步骤（规划阶段不改动）
1) 清点与标注（先不移动）
- 生成 `docs/REPO_MAP.md`：对现有目录给出“用途/负责人/是否可发布/是否含敏感文件”
- 列出嵌套 git：`dev/.git`、`Prototype/drawnix-reference/.git` 等，制定处理策略（submodule / subtree / 移除内部 .git）

2) 目标结构（示例）
```
LegalMind-Arbitration/
  apps/
    workbench/        # ← 原 dev（通用工作台）
    arbitration/      # ← 原 Prototype（仲裁系统）
  packages/
    contracts/        # Zod/OpenAPI/事件契约
    ui/               # 共享 UI 组件（若确定需要）
    utils/            # 共享工具（若确定需要）
  docs/
  prompts/
  rules/
  resource/
```

3) 工程化一致性
- 统一包管理：优先 pnpm workspace（与 `LawClick_NEW` 对齐）
- 统一质量门禁：lint / type-check / build / test
- 统一 env 模板与密钥管理策略（禁止提交真实密钥）

> 注意：此步骤会触发大量移动/结构变更，属于“必须确认”的动作；执行前会给你交互式菜单确认迁移方案与边界。

---

## 第六大部分：质量门禁与验收标准（无差错、无遗漏的保障机制）

### 1) 验收分层（必须全部满足）
- **功能验收**：每条主线（申请/证据/组庭/庭审/裁决）端到端可演示，数据可追溯
- **安全验收**：租户隔离、权限校验、审计日志、密钥不落盘
- **性能验收**：关键列表/详情加载时间、画布大数据量下的交互延迟
- **兼容性验收**：目标浏览器矩阵
- **可运维验收**：日志、告警、备份、迁移

### 2) 质量门禁建议（对齐基座系统 best practice）
参考 `LawClick_NEW/lawclick-next` 的脚本与审计方式，在执行阶段补齐同等级门禁：
- `lint`
- `type-check`
- `build`
- `test`（单测 + e2e）
- `prisma:validate`（如使用 Prisma）
- 关键审计：API surface、permissions、tenant scope、action result shape 等（可按需裁剪）

---

## 风险评估（必须提前识别）

| 风险 | 可能性 | 影响 | 缓解措施 |
|------|--------|------|----------|
| 外部模块跨域鉴权（URL 透传风险、cookie 不共享） | 高 | 高 | 采用短时效 exchange token + 仅 https；禁止长期 token 入 URL；ToolInvocation 审计 |
| ToolModule 强制 https 导致本地开发阻塞 | 高 | 中 | 选择本地 https 反代（mkcert）或仅 dev 放行 http（需要改基座） |
| 当前前端存在 mock/本地状态，替换为真实数据会暴露大量边界问题 | 高 | 中 | Contract-first + Zod 全量校验 + 先做主线 1 垂直切片 |
| 仲裁角色/权限模型复杂（当事人/仲裁员/书记员/管理员） | 中 | 高 | 先定义 RBAC 矩阵与路由守卫；按角色验收用例驱动 |
| 文档/证据链/视频庭审依赖外部服务（存储/WebRTC） | 中 | 高 | 先选择可落地的供应商或复用基座；预留替换接口（Adapter） |
| 大规模目录重构导致回归风险 | 中 | 中 | 先做“清点与标注”，再分批迁移；每批迁移都跑全量门禁 |

---

## 验收标准（Definition of Done）

### 最小可验收主线（MVP，但必须 E2E）
- [ ] 基座系统可从对象页面进入外部工作台/仲裁模块（ToolModule 生效）
- [ ] 外部模块可安全拿到授权并调用基座 API（短时效 token 机制落地）
- [ ] 仲裁案件：创建→上传证据→详情页可操作目录（至少 3 个操作）可写入并可回看
- [ ] 文书生成：至少 1 种文书可从“操作目录/文书目录”触发生成并落入文档中心
- [ ] 权限：当事人与仲裁员看到的操作集不同，且后端强校验（不可绕过）
- [ ] 审计：关键写操作可追溯（ToolInvocation/业务审计表至少一条链路打通）
- [ ] 质量门禁：lint/type-check/build/test（至少覆盖仲裁主线相关）

---

## 同步任务清单（对话内 TODO，用于后续 `/do-plan` 拆分子计划）

> 执行阶段会按以下“父任务 → 子计划”分解，确保每一段都可独立验收，不会半途停摆。

1. 需求与实现对照审计（docs + prompts → traceability matrix）
2. 基座集成选型落定（A/B/C + 鉴权方案 + https 方案）
3. 契约层落地（OpenAPI/Zod/事件 schema + 版本化策略）
4. 仲裁主线 1（案件申请→证据→详情页操作目录→文书生成）E2E
5. 工作台嵌入与数据联动（workbench 作为 ToolModule + 关键对象工作区）
6. 质量门禁与回归（CI、E2E、审计脚本、性能基线）
7. 目录划分与工程化（apps/packages、去嵌套 git、统一脚本）

---

## 用户确认

- [ ] 我已审阅并批准此计划（回复：`/do-plan`）

