# 05｜文件上传=证据：MinIO（D4A）+ 分片续传 + 哈希链 + 公证/时间戳任务（D5A）

## 0. 目标
- 上传的任何资料都视为证据：**生成证据编号、哈希、版本、权限、审计**
- 存储与访问：MinIO（S3）+ 预签名 URL + 最小权限 + 断点续传
- 存证：先实现“哈希链 + 时间戳/公证任务队列 + 人工流转”（D5A），后续接真实公证接口

## 1. 上传链路（建议：UploadIntent 模式）
1) `POST /evidence/upload-intents` 创建上传意图（校验案件权限、文件类型、大小、用途）
2) 返回：
   - `evidenceId`
   - 分片信息（chunkSize、partUrls 或者 multipart upload id）
   - 预签名上传 URL（短有效期）
3) 客户端分片上传到 MinIO
4) `POST /evidence/upload-intents/{id}/complete` 完成合并与校验（服务端计算 sha256）
5) 写库：
   - `EvidenceItem`（证据主记录）
   - `EvidenceVersion`（版本）
   - `EvidenceChain`（哈希链条）
6) 入队：
   - 病毒扫描（如需）
   - OCR/转写（如需）
   - 时间戳/公证任务（D5A）

## 2. 文件类型与编辑器策略
- **原件不可编辑**：只允许生成“新版本/批注/标注/意见书”作为新证据或同证据新版本
- 编辑器：
  - 文书编辑（裁决书/协议等）：采用现有编辑器组件（现状需从 mock 接入真实存储与版本）
  - PDF/图片标注：建议采用“批注层”而非改原文件（批注落库，导出时合成）

## 3. 权限模型
- 证据访问=案件访问 + 证据级策略（如仅仲裁庭可见、仅一方可见、庭审中展示可见）
- 下载必须审计：谁、何时、下载了哪个版本、用于什么目的

## 4. 存证策略（D5A）
- 每个 EvidenceVersion 生成：
  - `sha256`
  - `size/mime/filename`
  - `uploader`
  - `timestamp`
- `EvidenceChain`：对同一案件的证据/笔录/录制产物形成链式哈希（可导出校验）
- 公证/时间戳任务：
  - 任务入队（待处理/处理中/成功/失败）
  - 人工流转记录（操作人、时间、结果附件）

## 5. 与现状代码的差距提示
当前 `dev/src/app/api/documents/route.ts` 已对齐 MinIO/S3（上传=证据：sha256 + 审计 + 队列存证）；仍缺少“UploadIntent 分片/断点续传”与证据链导出校验工具（执行阶段补齐）。
