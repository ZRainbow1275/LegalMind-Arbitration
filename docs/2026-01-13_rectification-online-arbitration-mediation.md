# 任务计划：仲裁/调解全线上流程整改与续建（邀请/权限/会议室/证据存证/RTC/运维后台）

## 元信息
- 计划 ID：`plan_2026-01-13_rectification_online_arbitration_mediation`
- 创建时间：2026-01-13
- 状态：待审批（规划阶段只产出计划文档；批准后再执行）
- 预估复杂度：极高（全链路业务 + 合规 + 实时 + 多端 + 外部对接）
- 关联资料（以“代码与可运行事实”为准）
  - 缺口分析：`docs/GAP_ANALYSIS.md`
  - 对照矩阵：`docs/TRACEABILITY_MATRIX.md`
  - 安全/SSO/DB/API：`docs/SECURITY_GUIDE.md`、`docs/SSO_GUIDE.md`、`docs/DATABASE_DESIGN.md`、`docs/API_REFERENCE.md`
  - 既有总计划（跨系统/基座连通）：`.codex/plans/current/2026-01-12_fullstack-legalmind-workbench-arbitration_v2.md`
- 工具说明
  - 本次尝试使用 `ace-tool/search_context` 进行全仓语义分析多次超时；本计划的“现状核对”基于本地代码与文档对照完成。

---

## 1. 现状核对（已验证，不写猜测）

### 1.1 仓库结构与技术栈
- `Prototype/`：Vite + React + TypeScript（画布/流程/编辑器原型），并含一个 `Prototype/server/` 的 Express + Socket.IO 协作原型服务（内存态、无鉴权、无持久化）。
- `dev/`：Next.js（15.x）+ React（19.x）+ TypeScript + Prisma + Zod + Redis（ioredis）+ Socket.IO（代码存在但未初始化），作为“仲裁平台/工作台”工程。
- `docker-compose.yml`：提供 Postgres + Redis + MinIO（S3 兼容对象存储）基础设施。

### 1.2 关键事实（与“文档宣称完成度”可能不一致）
- `dev/` 侧存在较完整的 API 代码骨架（认证、案件、文档、庭审、调解、画布等），但多个核心 UI 入口仍大量使用 `mock`/`alert`，未形成 E2E 闭环：
  - 登录页已接入真实认证链路（邮箱密码 `/api/auth/login` + OIDC `/api/auth/oidc/*`）：`dev/src/app/(public)/login/page.tsx`
  - 消息中心仍走 `mock`：`dev/src/app/(private)/messages/page.tsx`
  - 仲裁员邀请详情页仍走 `mock`：`dev/src/app/(private)/arbitrator/invitations/[id]/page.tsx`
  - 在线庭审（含音视频/RTC/聊天）仍大量 `mock`：`dev/src/app/(private)/hearings/[id]/live/page.tsx`
  - 调解管理页仍走 `mock`：`dev/src/app/(private)/mediation/[id]/manage/page.tsx`
- 权限体系存在“多套并存/口径不一”的风险：
  - Prisma `Role` 枚举：`dev/prisma/schema.prisma`（APPLICANT/RESPONDENT/ARBITRATOR/MEDIATOR/ADMIN）
  - 代码 RBAC 权限枚举：`dev/src/lib/security/rbac.ts`（SUPER_ADMIN/CLERK/PARTY/AGENT/OBSERVER 等字符串角色）
  - API 层权限检查：`dev/src/lib/auth.ts` 的 `PermissionCheckers`（较粗粒度）
- 运维/管理员接口已加固为仅运维管理员（`OPS_ADMIN`，含 CSRF 校验）：
  - `dev/src/app/api/admin/cache/route.ts`
  - `dev/src/app/api/admin/performance/route.ts`
- 文件上传已对齐 MinIO/S3（上传=证据：sha256 + 审计 + 队列存证）；仍缺少分片/断点续传 UploadIntent：
  - `dev/src/app/api/documents/route.ts`
- WebSocket 管理器存在实现，但未初始化为可用服务：
  - `dev/src/lib/websocket.ts`（`initializeWebSocket`/`getWebSocketManager`）
- 外部系统（法院/公证/法律库）集成已禁 Mock：未配置/未实现显式返回 503/501：
  - `dev/src/app/api/integrations/external-systems/route.ts`

---

## 2. 目标（对应用户提出的 1-9 项问题）

### 2.1 总体目标（必须端到端可验收）
把“仲裁/调解案件的全流程”做成可线上闭环：**邀请/拒绝/双方合意 → 组庭/选定调解员 → 会议室/庭审 → 文书生成/签署 → 送达/公证/归档 → 全程留痕可追溯**，并保证严格的身份与权限控制、数据安全与证据效力。

### 2.2 明确交付范围（P0 主线）
1) **仲裁员/调解员邀请与合意全线上化**：邀请、披露、回避/异议、接受/拒绝、双方合意、最终任命与生效。
2) **统一身份权限体系（IAM）+ 运维后台**：角色、权限、审计日志、策略配置、会话/设备/MFA、外部身份核验接入预留。
3) **证据与文档全链路**：上传/校验/哈希/版本/权限/审计/存证（公证/时间戳任务）。
4) **调解会议室（文字庭审）**：类微信群聊，但由“程序引擎”推动流程（阶段、规则、待办、产物、留痕）。
5) **庭审音视频/屏幕共享/录制/转写方案**：RTC 可插拔，满足多端（Web/Android/iOS/小程序）路线。
6) **全程留痕**：审计日志 + 业务事件（不可变）+ 导出/取证能力。

---

## 3. 不可妥协原则（执行阶段强制）

- **禁止继续扩散 Mock**：任何新增功能必须打通真实数据链路（前端 → API → DB/对象存储/队列 → 回读）。
- **Schema 先行**：所有输入输出严格 Zod 校验，拒绝隐式信任与“随手拼 JSON”。
- **权限即产品**：登录后界面与操作入口必须与权限一致（能力点/capabilities 由后端下发）。
- **证据不可篡改**：上传即生成哈希与证据编号；原件不可编辑，只允许“新版本/批注/标注/意见”。
- **留痕默认开启**：关键写操作产生审计与业务事件；重要产物（笔录/录制/协议）形成“存证点”。
- **可插拔外部对接**：公安/法院/公证接口以 Adapter/Provider 抽象封装，禁止业务代码直连。

---

## 4. 关键决策点（需要你选择，避免后续返工）

> 请选择每项的一个选项（回复如：`D1A D2B D3A ...`）。我在执行阶段会按你的选择落地。

### ✅ 已确认（2026-01-13）
- **D1A**｜以 `dev/` 为主系统，`Prototype/` 作为模块通过统一 API 适配与嵌入收敛
- **D2B**｜引入外部 IdP（OIDC）作为统一身份源（具体 IdP 产品/供应商：留空）
- **D3A**｜RTC 采用云厂商方案（具体供应商：留空；以 `RTCProvider` 抽象推进）
- **D4A**｜MinIO（S3 兼容）+ 预签名 URL + 分片/断点续传
- **D5A**｜先实现哈希链 + 时间戳/公证任务队列 + 人工流转，后续再对接真实公证/时间戳服务

### D1｜`dev/` 与 `Prototype/` 的收敛策略（影响后续目录与部署）
- A. **以 `dev/` 为主系统**：`Prototype/` 作为“画布/仲裁流程编辑器”模块，通过统一 API 适配与嵌入（推荐：最小重构、最快 E2E）。
- B. `Prototype/` 独立成单独前端系统：需要单独后端或网关适配，工作量更大。
- C. 两者都只是原型：将启动全新单体/微服务重建（风险最高，不建议）。

### D2｜身份认证与权限管理（IAM）路线

- A. **短期延用当前 JWT + Cookie + RBAC**，补齐租户/组织/案件级授权与运维后台（推荐：可渐进落地）。
- B. 直接引入外部 IdP（OIDC/Keycloak/自建 IAM）：更正规但集成与迁移成本更高。

### D3｜RTC（音视频/录制/小程序/移动端）方案

- A. **云 RTC（腾讯/声网等）**：多端成熟、弱网治理更稳；需供应商合规评估（推荐）。
- B. 自建 WebRTC + SFU（mediasoup/Janus/Jitsi）：可控但运维与稳定性压力大。

### D4｜对象存储与文件上传模式

- A. **MinIO（S3 兼容）+ 预签名 URL + 分片/断点续传**（与现有 `docker-compose.yml` 对齐，推荐）。
- B. 直接接入云 OSS/COS：上线更轻，但需要云资源与权限配置。

### D5｜“证据存证/公证/时间戳”接入策略
- A. 先实现“哈希链 + 时间戳任务队列 + 人工流转”，待确定供应商再接入（最快可验收）。
- B. 已有明确公证系统/时间戳服务供应商与接口文档，可直接做真实对接（请提供文档/沙箱）。

---

## 5. 目标架构（建议方案：可扩展到多端与合规）

### 5.1 服务边界（建议保持接口抽象，允许后续拆分）
- **API 核心**：案件/参与方/邀请与合意/会议室/庭审/文档/证据/审计（可先落在 `dev/`，后续可拆成独立服务）。
- **实时服务（建议独立）**：WebSocket/房间消息/状态同步/信令（与 Next 热更新/无状态部署解耦）。
- **异步任务（Worker）**：OCR/转写/公证/送达/通知/病毒扫描等，统一走队列。
- **运维后台（独立 UI）**：用户/角色/权限/日志/策略/外部对接配置。

### 5.2 数据与留痕（两条线并行）
- **业务事实源（CaseEvent）**：append-only（不可变），记录“谁在何时对什么资源做了什么”，用于还原流程与取证。
- **审计日志（AuditLog）**：安全审计（登录/权限变更/敏感访问），用于合规报表与告警。
- **证据链（EvidenceChain）**：对关键产物（文件、笔录、录制、协议）做哈希、签名与关联。

---

## 6. 核心流程设计（落地到可验收的业务闭环）

### 6.1 仲裁员/调解员邀请—拒绝—披露—双方合意—任命（线上闭环）

#### 6.1.1 需要新增的核心实体（执行阶段在 DB/Prisma 落地）
- `NeutralInvitation`：对仲裁员/调解员的邀请（含截止时间、邀请方、案件、候选人、邀请原因、状态机）。
- `NeutralResponse`：接受/拒绝/需补充披露/已披露/回避申请等响应。
- `ConflictDisclosure`：利益冲突披露（结构化字段 + 附件引用），支持后续双方异议。
- `PartyConsent`：双方当事人的合意记录（可撤回、需电子签名/时间戳）。
- `NeutralAppointment`：最终任命（生效条件、任命方式、任命时间、撤销条件）。
- `CaseParticipant` 扩展：把“律师/代理/机构人员”等作为案件级参与方纳入统一授权。

#### 6.1.2 状态机（示例）
- Invitation：`DRAFT → SENT → (ACCEPTED_WITH_DISCLOSURE | REJECTED | EXPIRED | WITHDRAWN)`
- Consent：`PENDING → CONSENTED_BOTH → EFFECTIVE`（可 `WITHDRAWN`，并记录原因与时间）
- Appointment：`PENDING → ACTIVE → TERMINATED`

#### 6.1.3 关键规则（权限 + 合规）
- 仲裁员/调解员 **接受邀请必须提交披露与确认**（电子签名/等效确认）。
- 当事双方对披露信息有 **异议/回避申请** 的窗口期（可配置）。
- “双方合意”必须可追溯、可撤回、可证明（签名/时间戳/审计）。
- 所有动作产生 `CaseEvent` + `AuditLog`（含 traceId），并触发通知（站内信/短信/邮件可后置）。

### 6.2 调解会议室（文字版庭审：程序推动的群聊）

#### 6.2.1 会议室能力（P0）
- 房间：`MediationRoom` 与 `Mediation`/`Case` 绑定；参与人基于案件授权自动加入。
- 消息：`RoomMessage`（用户消息/系统消息/证据引用/指令消息），全部落库并广播。
- 程序引擎：`MediationProcedureEngine`（状态机驱动阶段与待办），自动发送系统消息与提示。
- 产物：阶段产物（笔录确认、证据清单、协议草案、签署结果）进入“证据链”。

#### 6.2.2 阶段建议（需法务确认最终口径）
`准备/身份核验 → 开始/宣示 → 陈述 → 争点梳理 → 证据交换 → 方案磋商（可单独沟通） → 协议草案 → 签署 → 司法确认/归档`

> 注意：这里仅作为产品流程设计参考，执行落地前应由法务/业务专家确认与当地仲裁规则/调解规则一致。

### 6.3 庭审音视频/语音/屏幕共享/录制/转写（方案抽象）
- 抽象 `RTCProvider`：`createRoom`/`issueJoinToken`/`startRecord`/`stopRecord`/`getRecordingArtifacts`/`getStats`
- 信令与房间权限：由后端签发短期 token，绑定 hearingId、userId、角色、有效期与能力点。
- 同步演示：证据展示做“页码/批注/焦点同步”并记录操作事件；屏幕共享作为 RTC track（主持人控制）。
- 录制与转写：作为异步任务进入队列；完成后写入记录表并进入证据链。

---

## 7. 里程碑与任务清单（执行阶段将拆成子计划逐步落地）

> 说明：每个里程碑都必须达到“可验收 E2E”，并减少 mock 覆盖面。

### M0｜建立整改文档目录（满足“docs 下单开文件夹”要求）
- **目标**：在 `docs/` 下创建独立文件夹沉淀整改方案与后续执行记录。
- **输出建议结构（待你确认后执行创建）**：
  - `docs/rectification/2026-01-13_online-arbitration-mediation/00_overview.md`
  - `docs/rectification/2026-01-13_online-arbitration-mediation/01_iam_permissions.md`
  - `docs/rectification/2026-01-13_online-arbitration-mediation/02_invitation_consent.md`
  - `docs/rectification/2026-01-13_online-arbitration-mediation/03_mediation_room.md`
  - `docs/rectification/2026-01-13_online-arbitration-mediation/04_rtc_recording_transcription.md`
  - `docs/rectification/2026-01-13_online-arbitration-mediation/05_evidence_file_notary.md`
  - `docs/rectification/2026-01-13_online-arbitration-mediation/06_ops_admin.md`
  - `docs/rectification/2026-01-13_online-arbitration-mediation/07_audit_traceability.md`
- **需要确认**：属于“创建新文件夹/新文件”，执行前需要你 `y/n` 批准。
- **验收**：目录与文档可打开、结构清晰，且与本计划内容一致。

### M1｜统一身份/角色/权限（IAM）+ 运维后台（最小可用）
- **目标**：权限体系收敛为单一来源，前端基于 capabilities 渲染；提供运维后台管理身份、权限、日志。
- **涉及改造要点**：
  - 角色体系补齐：普通用户、律师、仲裁员/调解员、法院、公证、运维（以及案件级角色）。
  - API 统一鉴权：服务端强制校验（禁止仅靠前端守卫）。
  - 管理端强制 MFA（现有 `MFAManager` 为短信/6位码式，占位；需升级到 TOTP/硬件令牌策略）。
- **验收**：
  - 未授权访问私有路由与敏感 API 统一 401/403。
  - 登录后界面功能入口随权限实时变化（禁止“看得到点不了/点得了不该点”）。
  - 运维后台可审计：权限变更、登录、敏感查询均落库可追溯。

### M2｜邀请/拒绝/披露/合意/任命闭环（仲裁员/调解员）
- **目标**：从“创建邀请 → 响应 → 双方合意 → 任命生效”形成可验收闭环。
- **验收**：
  - UI 不再使用邀请 mock 数据；后端有实体与状态机；审计/通知可追踪。
  - 权限：只有案件相关方/被邀请中立者可见与可操作对应资源。

### M3｜调解会议室（文字庭审）闭环
- **目标**：房间消息落库 + 实时同步 + 程序引擎推动阶段 + 产物存证点。
- **验收**：
  - 多端（至少 Web）可实时收发消息；断线重连可回放历史。
  - 阶段推进有明确权限与产物要求；关键节点可导出记录。

### M4｜庭审 RTC（音视频/屏幕/录制/转写）闭环（先最小可用）
- **目标**：选定 RTC 方案并完成“开庭 → 加入 → 同步证据演示 → 录制/转写入库/存证”闭环。
- **验收**：
  - 能证明“同一案件的庭审”中：参与者鉴权、角色、录制产物与证据链关联正确。

### M5｜证据与文件全链路（MinIO + 哈希 + 版本 + 公证任务）
- **目标**：上传即证据化；对象存储落地；支持断点续传；生成 hash；触发存证流程。
- **验收**：
  - 文件不再写本地 FS；MinIO/S3 可用；下载权限严格受控；所有下载/查看可审计。

---

## 8. 风险评估

| 风险 | 可能性 | 影响 | 缓解措施 |
|------|--------|------|----------|
| 角色/权限多套并存导致越权 | 高 | 高 | 先做 M1：权限单一来源 + capabilities 下发 + 服务端强校验 |
| RTC 选型影响多端与合规 | 中 | 高 | D3 决策先定；抽象 Provider，避免锁死实现 |
| 外部公证/法院/公安接口不确定 | 高 | 高 | 先走 D5A：任务队列 + 人工流转 + 可替换 Adapter |
| 证据不可篡改要求落地复杂 | 中 | 高 | 哈希链/时间戳/审计三件套先落地；再上签名/公证 |
| `dev/` 目录目前默认不纳入根仓库版控 | 高 | 中 | 在执行前确认 D1，并明确代码归属与 CI/CD 方案 |

---

## 9. 验收标准（最终完成条件）

- [ ] 仲裁员/调解员邀请-响应-合意-任命全线上闭环（无 mock）
- [ ] 统一身份权限体系 + 运维后台可用（含日志与策略）
- [ ] 调解会议室（文字庭审）可用，过程可追溯、可导出
- [ ] 庭审 RTC 最小闭环可用（鉴权、录制/转写产物入库并入证据链）
- [ ] 文件上传/证据链路落地（对象存储、哈希、版本、审计、公证任务）

---

## 10. 执行记录

| 时间 | 操作 | 结果 |
|------|------|------|
| 2026-01-13 | 生成整改与续建计划 | 待审批 |
| 2026-01-13 | 用户确认决策 D1A/D2B/D3A/D4A/D5A；并批准在 `docs/` 创建整改目录 | 已确认 |

---

## 11. 用户确认

- [ ] 我已审阅并批准此计划

批准后下一步（执行阶段）：
1) 先按你的决策（D1-D5）固化工程路径
2) 我将把本计划拆成可执行子计划并逐步落地（每步含可重复验证方法）
