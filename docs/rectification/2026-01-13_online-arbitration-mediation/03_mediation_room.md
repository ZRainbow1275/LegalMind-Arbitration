# 03｜调解会议室（文字版庭审）：房间消息 + 程序引擎推动 + 产物存证

## 0. 目标
实现一个“类似微信群聊，但由程序推动流程”的调解会议室：
- 聊天不是唯一事实源：关键节点必须结构化落库（阶段、待办、确认、签署）
- 过程可追溯：消息、阶段推进、证据引用、确认/签名均可回放与导出
- 可扩展：未来可与音视频庭审融合（RTC）

## 1. 核心概念

### 1.1 房间类型
- `MediationRoom`：与 `Mediation`/`Case` 绑定，所有参与人按授权进入
- 支持两类会话：
  - **公开会话**（全体可见）
  - **单独会话**（调解员与一方当事人/代理，需严格权限与留痕策略）

### 1.2 消息类型（必须结构化）
- `USER_MESSAGE`：普通文字消息（可引用证据/文书）
- `SYSTEM_MESSAGE`：系统提示/阶段宣示/规则提醒（由引擎生成）
- `ACTION_CARD`：待办卡片（确认身份、提交材料、确认笔录、签署协议等）
- `EVIDENCE_REF`：证据引用（指向证据编号/版本/哈希）
- `MINUTE_CONFIRMATION`：笔录确认（含签名/时间戳引用）

## 2. 程序引擎（MediationProcedureEngine）

### 2.1 状态机阶段（建议，需法务/业务确认最终口径）
`准备/身份核验 → 开始/宣示 → 陈述 → 争点梳理 → 证据交换 → 方案磋商（可单独沟通） → 协议草案 → 签署 → 司法确认/归档`

### 2.2 每个阶段定义（必须可配置）
- 允许发言主体（谁能发消息/谁能推进阶段）
- 必需产物（必须完成哪些 Action 才能进入下一阶段）
- 超时与提醒策略（自动催办/升级通知）
- 留痕点（该阶段结束时生成“阶段快照 hash”进入证据链）

## 3. 数据模型建议（执行阶段落库）
- `MediationRoom`：`roomId, caseId, mediationId, status, createdBy, createdAt`
- `RoomParticipant`：`roomId, userId, caseRole, permissions, joinedAt`
- `RoomMessage`：`roomId, messageId, type, senderId, payload(json), createdAt`
- `RoomAction`：`roomId, actionId, type, assignees, status, dueAt, resultRef`
- `RoomStage`：`roomId, stageKey, status, startedAt, endedAt, snapshotHash`

## 4. 实时通信与回放
- 实时：WebSocket/Socket.IO（房间频道 + 事件）
- 回放：客户端进入房间先拉取分页历史（消息 + 阶段 + 待办），再订阅实时流
- 断线重连：按 lastMessageId 补拉增量，保证不丢事件

## 5. 关键产物（必须进入证据链）
- 调解笔录（阶段性确认）
- 证据清单与引用
- 协议草案（版本化）
- 签署结果（签名/时间戳/公证任务）

