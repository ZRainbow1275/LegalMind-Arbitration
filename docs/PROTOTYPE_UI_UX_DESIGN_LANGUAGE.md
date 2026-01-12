# Prototype（法律仲裁工作台）UI/UX 设计语言总结

本文档总结 `Prototype/` 目录中已实现的 UI/UX 设计语言，旨在让后续迭代保持一致（以代码为准，而非概念愿景）。

---

## 1) 设计定位与原则

### 产品隐喻：仲裁“工作台 + 无限画布”
- 以“画布”为中心承载案件分析：节点（事实/证据/时间线/庭审/AI 等）+ 连接（关系/论证/证据链）。
- 高频操作不占用固定空间：工具栏/面板/状态信息采用“浮层覆盖”而非传统三栏页面，降低视觉噪音与布局挤压。

### 设计目标（可从实现反推）
- 专业可信：中性灰为底、信息密度可控，避免“政务系统”厚重感。
- 高效率：右键菜单、径向快捷菜单、快捷键面板、自动保存与状态反馈随时可达。
- 强反馈：对齐辅助线、连线高亮、按钮/卡片微动效、Toast/Tooltip 等形成连续操作回路。

---

## 2) 视觉规范（Visual）

### 2.1 色彩系统（品牌色 + 语义色 + 节点语义色）
**来源**
- CSS 变量：`Prototype/src/styles/theme.css`
- Tailwind 扩展：`Prototype/tailwind.config.js`

**品牌主色（Primary）**
- 主色：`#FF6B35`（高饱和橙，强调操作与关键状态）
- 主色梯度：`primary-50 ~ primary-950`（用于渐变、hover、浅色背景）

**中性色（Neutral）**
- 背景/表面：偏白与浅灰（例如 `neutral-50 #F8F9FA`、`neutral-200 #E9ECEF`）
- 前景文字：深灰/近黑（例如 `--color-foreground 0 0% 10%`）

**语义色（Functional）**
- 成功：`#28A745`
- 警告：`#FFC107`
- 错误：`#DC3545`
- 信息：`#17A2B8`

**节点语义色（Node Colors）**
- 文书/证据节点：蓝 `--node-document #3498db`
- AI 节点：绿 `--node-ai #27ae60`
- 庭审节点：红 `--node-hearing #e74c3c`
- 时间线节点：紫 `--node-timeline #9b59b6`
- 协作节点：橙 `--node-collaboration #f39c12`

### 2.2 主题与材质（Surface / Depth）
**来源**
- `Prototype/src/styles/theme.css`
- `Prototype/src/index.css`
- `Prototype/src/components/common/FloatingPanel.tsx`

关键特征：
- 大圆角：`--radius: 0.75rem`（面板、按钮、卡片默认偏圆润）
- 阴影分级：`--shadow-card` / `--shadow-card-hover` / `--shadow-brand`（强调“浮层”层级与可点击性）
- 浮层“毛玻璃”：`bg-white/80 backdrop-blur-xl`（用于浮动面板/工具栏等）
- 背景轻渐变：工作区背景常见 `from-gray-50 to-gray-100` 或浅灰底，衬托画布内容

### 2.3 排版系统（Typography）
**来源**
- `Prototype/src/styles/typography.ts`
- `Prototype/src/index.css`

字体与层级：
- 字体：Inter + 系统字体 + 中文 `PingFang SC`
- 文字层级：`title / content / small / label / code`
  - Title：16px / 600
  - Content：14px / 400
  - Small：12px / 400
  - Label：12px / 500 + uppercase + tracking

落地方式：
- Tailwind 类名映射：`typographyClasses`
- 节点类型可复用 `nodeTypography`（不同节点共享同一套标题/正文/元信息层级）

### 2.4 运动与微交互（Motion）
**来源**
- `Prototype/src/styles/animations.css`
- `Prototype/src/styles/components.css`
- `Prototype/src/index.css`（全局过渡与 focus）

动效风格：
- 以短时长（0.2s~0.5s）和轻位移/缩放为主：fade / slide / scale / pulse
- 强调“可交互可点击”：按钮 hover 轻微放大、卡片 hover 上浮、连接线/对齐线发光

### 2.5 图标系统（Iconography）
**来源**
- 全局大量使用 `lucide-react`（按钮、工具栏、菜单、面板状态）

原则：
- 图标 + 文案组合为主（降低学习成本）；纯图标用于高频工具按钮。
- 常用尺寸：`w-3 ~ w-5`，保持与按钮高度匹配。

---

## 3) 组件语言（Components）

### 3.1 基础组件基座：shadcn/ui + Tailwind
**来源**
- shadcn 配置：`Prototype/components.json`
- UI 组件：`Prototype/src/components/ui/*`
- Tailwind 主题：`Prototype/tailwind.config.js`

按钮（Button）风格落地：
- 默认按钮：橙色渐变、hover 增强阴影并轻微 scale（`Prototype/src/components/ui/buttonVariants.ts`）

### 3.2 浮动面板（FloatingPanel / DraggablePanel）
**来源**
- `Prototype/src/components/common/FloatingPanel.tsx`
- `Prototype/src/components/common/DraggablePanel.tsx`

统一特征：
- 可拖拽 / 可缩放 / 可折叠
- 支持 `storageKey`：保存位置、尺寸、折叠状态（增强“个人工作台”属性）
- 视觉：半透明白底 + blur + 强阴影 + 圆角；标题栏浅色渐变

典型用法：
- AI 建议面板：`Prototype/src/components/common/AISuggestionsFloatingPanel.tsx`
- 虚拟法庭面板：`Prototype/src/components/courtroom/VirtualCourtroomPanel.tsx`

### 3.3 浮动工具栏（FloatingToolbar）
**来源**
- `Prototype/src/components/FloatingToolbar.tsx`

设计语言：
- “分组 + 折叠 + 下拉菜单”减少密度；高频操作常驻、低频操作收纳
- 支持固定/浮动两种模式，并持久化用户偏好（localStorage）
- 与协作/通话/语音场等能力并列为工具栏入口（工作台的“控制中枢”）

### 3.4 右键菜单（两种风格并存）
1) 传统（Figma/飞书画板风格）：支持子菜单、hover 橙色高亮  
   - `Prototype/src/components/common/ContextMenu.tsx`
2) 径向快捷菜单：围绕节点的环形操作（编辑/连接/复制/删除/锁定/收藏/隐藏等）  
   - `Prototype/src/components/ContextMenu.tsx`

### 3.5 状态栏（StatusBar）
**来源**
- `Prototype/src/components/common/StatusBar.tsx`
- 在工作台中用于展示节点/连接/选中/协作者/缩放/性能等指标：`Prototype/src/components/DrawnixLegalWorkspace.tsx`

风格：
- 小体积、强信息密度、Tooltip 承载细节、可点击跳转到统计面板

### 3.6 节点与连接（图谱表达）
**节点（Card-like）**
- 结构：Header（图标+标题）/ 描述 / 元信息（时间/案号等）
- 选中态：主色边框 + 发光阴影（`Prototype/src/index.css`）

**连接线（Confidence-driven）**
- 颜色/线宽随“置信度”变化，并叠加 glow 层与渐变定义  
  - `Prototype/src/components/ConnectionLines.tsx`

**对齐辅助线**
- 橙色虚线 + 发光滤镜，随 zoom 自适应线宽  
  - `Prototype/src/components/AlignmentGuides.tsx`

---

## 4) 交互规范（Interaction）

### 4.1 画布交互（导航与编辑）
**入口与控制**
- 缩放/适配/重置/智能布局等由浮动工具栏提供统一入口（`Prototype/src/components/FloatingToolbar.tsx`）。

**直接操控**
- 拖拽节点时出现对齐辅助线，减少排布成本（`Prototype/src/components/AlignmentGuides.tsx`）。
- 连接模式显式切换（减少误连），连接线视觉有强反馈（`Prototype/src/components/ConnectionLines.tsx`）。

### 4.2 “就地操作”策略（右键优先）
- 对节点：右键弹出操作集合（传统菜单/径向菜单），Esc/点击外部可关闭（`Prototype/src/components/common/ContextMenu.tsx`、`Prototype/src/components/ContextMenu.tsx`）。
- 对画布：右键应承载创建节点、粘贴、导入等（具体项由工作台状态与工具模块组合）。

### 4.3 面板策略（信息不打断主线）
- 复杂功能以“浮动面板”承载：可随意移动与调整大小，避免遮挡关键节点。
- 面板默认可折叠，并记忆上次位置/尺寸（提升复用频率）。

### 4.4 系统反馈（Feedback Loop）
**Toast**
- 右上角堆叠；按类型使用强语义底色（`Prototype/src/components/ui/Toast.tsx`）。

**Tooltip**
- 状态栏、工具按钮等以 Tooltip 承载解释文本与细节数据（`Prototype/src/components/common/StatusBar.tsx`）。

**焦点与可用性**
- 全局 `:focus-visible` 使用主色描边，保证键盘可达性（`Prototype/src/index.css`）。

### 4.5 快捷键与引导
**来源**
- 工作台集成快捷键面板与新手引导（`Prototype/src/components/DrawnixLegalWorkspace.tsx` 中包含 `KeyboardShortcutsPanel`、`Tutorial`）。

原则：
- 快捷键用于高频动作（搜索/过滤/导出导入/撤销重做/面板开关），并提供可视化提示面板。
- 引导以 Overlay 形式出现，不改变布局结构。

### 4.6 仲裁业务交互（领域化 UI）
**虚拟法庭**
- 作为可拖拽面板进入；Tab 组织参与者/公聊/私聊/书记员日志；演示模式有显式状态徽标（`Prototype/src/components/courtroom/VirtualCourtroomPanel.tsx`）。

**文档/证据**
- 类型/状态/权限（机密/收藏）均可被视觉化标识与筛选，支持列表/网格视图（`Prototype/src/components/DocumentManager.tsx`）。

---

## 5) 一致性检查清单（用于后续迭代）

- 颜色：新增业务状态/节点类型，优先落到 `theme.css` + `tailwind.config.js`，避免散落魔法色值。
- 面板：新面板优先复用 `FloatingPanel`（拖拽/缩放/折叠/记忆）。
- 菜单：节点操作放到右键/径向菜单；低频操作进下拉或二级菜单。
- 动效：默认 0.2s~0.5s，避免长动画；hover 轻量、强调可点击即可。
- 可访问性：确保键盘关闭（Esc）、focus-visible、对比度不低于可读阈值。

