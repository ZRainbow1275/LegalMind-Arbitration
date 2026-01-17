# 整改方案总览（2026-01-13）：仲裁/调解全线上化 + 身份权限 + 会议室 + 证据存证 + RTC + 运维后台

> 本目录用于沉淀“LegalMind-Arbitration”项目的整改与续建方案。所有结论以**代码与可运行事实**为准，文档宣称仅作参考。

## 0. 你已确认的关键决策（会直接影响后续落地）
- **D1A**：以 `dev/` 为主系统；`Prototype/` 作为模块收敛（通过统一 API 适配与嵌入）
- **D2B**：引入外部 IdP（OIDC）作为统一身份源
- **D3A**：RTC 采用云厂商方案（音视频/屏幕共享/录制/转写）
- **D4A**：MinIO（S3 兼容）+ 预签名 URL + 分片/断点续传
- **D5A**：先落地“哈希链 + 时间戳/公证任务队列 + 人工流转”，后续再对接真实公证/时间戳服务

补充说明：
- **IdP 具体产品/供应商留空**：按标准 OIDC 设计，进入实施/联调前再补齐接入参数
- **云 RTC 具体供应商留空**：按 `RTCProvider` 抽象设计，进入实施/联调前再补齐

## 1. 现状核对（摘要）
- `Prototype/`：画布/流程/编辑器原型 + `Prototype/server/` Socket.IO 协作原型（内存态、无鉴权、无持久化）
- `dev/`：Next.js + Prisma + Zod + Redis +（代码层存在 Socket.IO 管理器，但未形成可验收 E2E）
- 基础设施：根目录 `docker-compose.yml` 提供 Postgres + Redis + MinIO
- 关键缺口：消息、邀请 UI、庭审、调解等仍为 UI(mock)/占位，需按主线逐步 E2E 打通

> 更完整的核对与规划见：`.codex/plans/current/2026-01-13_rectification-online-arbitration-mediation.md`

## 1.1 问题清单（已核对，按“阻断 E2E/合规风险”优先级）
- 登录已为真实链路（邮箱密码 `/api/auth/login` + OIDC `/api/auth/oidc/*`）：`dev/src/app/(public)/login/page.tsx`
- 消息中心仍使用 mock：`dev/src/app/(private)/messages/page.tsx`
- 仲裁员邀请详情仍使用 mock：`dev/src/app/(private)/arbitrator/invitations/[id]/page.tsx`（Invitation DB 实体与 API 已存在，但 UI 未接入）
- 在线庭审核心交互大量 mock：`dev/src/app/(private)/hearings/[id]/live/page.tsx`
- 调解管理页大量 mock：`dev/src/app/(private)/mediation/[id]/manage/page.tsx`
- 管理端 API 已加固为仅运维管理员可访问（CSRF + `OPS_ADMIN`）：`dev/src/app/api/admin/cache/route.ts`、`dev/src/app/api/admin/performance/route.ts`
- 文件上传已对齐 MinIO/S3（上传=证据：sha256 + 队列存证 + 审计）：`dev/src/app/api/documents/route.ts`
- WebSocket 管理器存在但未初始化为可用服务：`dev/src/lib/websocket.ts`（`/api/websocket/status` 可能返回 `not_initialized`）
- 外部系统集成已禁 Mock：未配置/未实现显式返回 503/501：`dev/src/app/api/integrations/external-systems/route.ts`
- MFA 当前为“6 位码 + Redis 存储”形式（占位），与运维后台强制 MFA 目标不一致：`dev/src/lib/security/session-manager.ts`
- `Prototype/server/collaboration-server.js` 为内存态/无鉴权协作原型，不能直接用于生产/证据留痕

## 2. 本次整改要解决的 9 类问题（与你的原始需求对齐）
1) 仲裁/调解案件的邀请、拒绝、双方合意全线上化（含披露/回避/异议/任命）
2) 身份权限控制与管理（运维后台 + 登录后界面随权限变化）
3) 数据加密与安全（消息队列、区分平台、文件管理、减少信息误差、面向移动端/小程序/网页）
4) 文件上传与编辑器方案具体化（尽量复用现有最佳实践）
5) 单独开发“调解会议室”（文字版庭审 + 流程引擎推动）
6) 庭审音视频/语音/视频传输与同步演示（RTC + 证据演示同步）
7) 全过程留痕，全法律过程线上处理
8) 身份确定后续对接公安/法院接口
9) 上传资料作为证据，需接入公证（存证链路）

## 3. 里程碑（按可验收 E2E 主线拆分）

### M1｜统一身份与权限（D2B：外部 IdP + 本地授权）
- 交付：统一登录/会话/权限校验；能力点（capabilities）由后端下发；运维后台最小可用
- 详见：`01_iam_permissions.md`

### M2｜邀请/合意/任命闭环（仲裁员/调解员）
- 交付：邀请→响应（接受/拒绝/披露）→双方合意→任命生效（含审计与通知）
- 详见：`02_invitation_consent.md`

### M3｜调解会议室（文字版庭审：程序引擎推动）
- 交付：房间消息落库 + 实时同步 + 阶段推进 + 产物（笔录/协议）存证点
- 详见：`03_mediation_room.md`

### M4｜庭审 RTC（D3A：云 RTC）
- 交付：开庭→鉴权入庭→音视频/屏幕共享→录制/转写产物入库并进入证据链
- 详见：`04_rtc_recording_transcription.md`

### M5｜证据与文件全链路（D4A+D5A：MinIO + 哈希链 + 公证任务）
- 交付：上传即证据化；版本/权限/审计；公证/时间戳任务可追踪
- 详见：`05_evidence_file_notary.md`

## 4. 本目录文件导航
- `01_iam_permissions.md`：统一身份、权限、运维后台与多端登录策略（D2B）
- `02_invitation_consent.md`：邀请/拒绝/披露/回避/合意/任命的状态机与 API/权限模型
- `03_mediation_room.md`：调解会议室（文字版庭审）数据模型、流程引擎、留痕点
- `04_rtc_recording_transcription.md`：RTC 抽象、云厂商集成、录制/转写与证据链
- `05_evidence_file_notary.md`：上传=证据、MinIO、分片续传、哈希链、存证任务
- `06_ops_admin.md`：运维后台（身份/权限/日志/策略/外部对接）与安全基线
- `07_audit_traceability.md`：全程留痕、审计/事件、导出/取证与一致性校验
