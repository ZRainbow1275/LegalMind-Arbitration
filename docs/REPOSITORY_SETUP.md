# 仓库上传与必要配置说明

本文档说明 `D:\Desktop\LegalMind-Arbitration` 如何同步到私有仓库 `https://github.com/ZRainbow1275/LegalMind-Arbitration`，以及本仓库已补齐的基础配置项（`README.md`、`.gitignore` 等）。

---

## 1. 上传范围与目录语义

- `Prototype/`：仲裁系统前端原型（本仓库重点纳入版本控制的部分）
- `docs/`：工作台与仲裁系统的开发文档
- `prompts/`、`rules/`：大模型介入开发的提示词与规则
- `resource/`：参考资料（可能包含大文件）
- `dev/`：工作台工程目录（当前作为本地独立工程使用，未纳入本仓库版本控制；后续是否合并/拆分见 `prompts/` 内工程计划）

> 注：`Prototype/drawnix-reference/` 为上游参考仓库（自带 `.git`），已在 `.gitignore` 中忽略，避免被当作嵌套仓库提交。

---

## 2. 必要配置项

### 2.1 `README.md`

- 根 `README.md`：仓库概览与 `Prototype/` 快速启动指引
- `Prototype/README.md`：仲裁系统原型更详细的说明（含依赖/运行方式等）

### 2.2 `.gitignore`

已按“前端项目 + 文档仓库”的常见需求补齐忽略规则，重点包括：

- 依赖与构建产物：`node_modules/`、`dist/`、`build/`、`.next/`、`out/`、`coverage/` 等
- 环境与敏感信息：`.env`、`.env.*`（保留 `!.env.example`）
- 工具目录：`.augment/`、`.ace-tool/`、`.codex/`
- 本地独立目录：`dev/`
- 大文件策略：`resource/*.mp4`（见下一节）

### 2.3 `.gitattributes`

- 已对 `*.mp4` 配置 Git LFS 过滤规则（如未来要将视频纳入版本控制可复用）。

---

## 3. 大文件（视频）处理策略

GitHub 常规 Git 提交对单文件有 100MB 限制。当前仓库采取“**忽略 `resource/*.mp4`**”的策略，确保推送稳定、仓库体积可控。

如确需版本化管理视频，建议二选一：

1. **使用 Git LFS**：安装并初始化 Git LFS，将 `*.mp4` 交由 LFS 存储后再提交推送
2. **外部存储 + 文档索引**：将视频放在对象存储/网盘/Release，仅在 `docs/` 或 `resource/` 内记录链接与校验信息（更利于分发与权限管理）

