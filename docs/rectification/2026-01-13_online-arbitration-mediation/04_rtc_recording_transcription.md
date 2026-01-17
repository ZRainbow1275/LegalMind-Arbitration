# 04｜庭审音视频/录制/转写（D3A 云 RTC）：Provider 抽象 + 鉴权 + 证据链

## 0. 目标
- 兼容多端（Web/Android/iOS/小程序）优先，弱网与多方能力优先
- 庭审过程可“同步演示证据/共享屏幕”，并把关键动作留痕
- 录制与转写产物可追溯并进入证据链（D5A）

## 1. 方案原则
- **RTCProvider 抽象**：业务代码不直接依赖具体厂商 SDK
- **短期 token**：加入房间 token 必须短时效、绑定 hearingId/userId/角色/能力
- **录制/转写异步化**：进入队列处理，失败可重试与人工介入

## 2. RTCProvider 接口（建议）
```ts
interface RTCProvider {
  createRoom(input: { hearingId: string; mode: 'hearing' | 'mediation' }): Promise<{ roomId: string }>;
  issueJoinToken(input: { roomId: string; userId: string; role: string; ttlSeconds: number; capabilities: string[] }): Promise<{ token: string }>;
  startRecording(input: { roomId: string }): Promise<{ recordingId: string }>;
  stopRecording(input: { roomId: string; recordingId: string }): Promise<{ artifacts: Array<{ url: string; sha256?: string }> }>;
  requestTranscription(input: { roomId: string; artifacts: Array<{ url: string }> }): Promise<{ jobId: string }>;
}
```

## 3. 同步演示（证据/文档）
- 先实现“证据演示同步”而不是强依赖屏幕共享：
  - 主持人选择证据 → 全体同步显示同一份文档/页码/缩放/批注焦点
  - 每次切换/批注形成事件（CaseEvent + AuditLog），用于回放与取证
- 屏幕共享作为增强：由主持人控制开关，记录开始/结束时间与参与人可见性

## 4. 录制/转写与证据链（D5A）
- 录制产物（音频/视频/聊天记录）写入“庭审记录实体”并生成 hash
- 转写文本（逐字稿/摘要）作为独立产物版本化
- 关键时间点（开庭、身份核验完成、证据展示、休庭、闭庭）形成“存证点”

## 5. 待确认（需要你决定厂商）
你已确认采用云 RTC（D3A），但**具体供应商当前留空**。本方案保持厂商无关：先以 `RTCProvider` 抽象推进设计与数据模型，进入实施/联调前再补齐供应商信息即可。

进入实施/联调前需要补齐的最小信息清单（供后续填写）：
- 供应商名称与产品形态（RTC/会议/录制/转写）
- 多端支持范围（Web/Android/iOS/小程序）与限制
- 鉴权方式（token/签名/mTLS）与回调验签要求
- 录制与转写产物的获取方式与保留策略
- 合规要求（数据落地地域、存储周期、导出取证能力）
