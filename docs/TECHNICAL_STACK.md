# 🛠️ LegalMind法律工作台原型v2.0 - 技术栈文档

**文档版本**：v1.0  
**更新日期**：2025-10-09  
**维护者**：LegalMind开发团队

---

## 📋 技术栈概览

LegalMind法律工作台原型v2.0是一个**基于Plait/Drawnix框架**的可视化法律工作平台，通过深度定制和扩展，实现了专业的法律业务功能。

### 核心技术选择原则

1. **避免重复造轮子**：充分利用成熟的开源框架（Plait/Drawnix）
2. **专注法律业务**：自研代码聚焦于法律场景的定制化需求
3. **生态融合**：与LegalMind主项目保持技术栈一致性
4. **可扩展性**：模块化设计，支持未来功能扩展

---

## 🎨 前端技术栈

### 核心框架

| 技术 | 版本 | 用途 | 说明 |
|------|------|------|------|
| **React** | 18.3.1 | UI框架 | 使用最新的React特性（Hooks、Concurrent Mode） |
| **TypeScript** | 5.2.2 | 类型系统 | 严格模式，提供完整的类型安全 |
| **Vite** | 5.1.0 | 构建工具 | 快速的开发服务器和HMR |

### 画布框架（核心）

| 技术 | 版本 | 用途 | 说明 |
|------|------|------|------|
| **@plait/core** | 0.86.1 | 画布核心 | 提供画布渲染、事件处理、坐标系统 |
| **@plait/draw** | 0.86.1 | 绘图功能 | 支持自由绘制、形状工具 |
| **@plait/mind** | 0.86.1 | 思维导图 | 提供思维导图布局算法 |
| **@plait-board/react-board** | 0.1.4 | React集成 | Plait的React封装 |
| **@plait-board/react-text** | 0.1.4 | 文本编辑 | 富文本编辑功能 |

**技术来源**：[Drawnix开源白板工具](https://github.com/plait-board/drawnix)

**选择理由**：
- ✅ 开源、可定制、社区活跃
- ✅ 支持思维导图、流程图、自由画等多种模式
- ✅ 提供完整的画布能力（缩放、平移、拖拽、协作）
- ✅ 基于Canvas API，性能优秀
- ✅ 插件化架构，易于扩展

### UI组件库

| 技术 | 版本 | 用途 | 说明 |
|------|------|------|------|
| **Tailwind CSS** | 3.4.0 | CSS框架 | 实用优先的CSS框架 |
| **shadcn/ui** | - | UI组件 | 基于Radix UI的高质量组件库 |
| **lucide-react** | 0.400.0 | 图标库 | 现代化的图标系统 |
| **@radix-ui/react-*** | 1.x | 无障碍组件 | 提供无障碍的基础组件 |

**设计系统**：
- 主色调：橙色 (#FF6B35, orange-500/600)
- 设计风格：现代简约、卡片式布局
- 与LegalMind主项目保持一致

### 状态管理

| 技术 | 版本 | 用途 | 说明 |
|------|------|------|------|
| **Zustand** | 4.5.7 | 全局状态 | 轻量级状态管理库 |
| **React Hooks** | - | 组件状态 | 使用useState、useReducer等 |

### 其他依赖

| 技术 | 版本 | 用途 | 说明 |
|------|------|------|------|
| **roughjs** | 4.6.6 | 手绘风格 | 提供手绘风格的图形渲染 |
| **slate** | 0.116.0 | 富文本编辑 | 强大的富文本编辑框架 |
| **localforage** | 1.10.0 | 本地存储 | IndexedDB/WebSQL/localStorage封装 |

---

## 🏗️ 架构设计

### 分层架构

```
┌─────────────────────────────────────────────────────────┐
│                    React组件层                           │
│  (LegalWorkspaceDashboard, AIAssistantPanel, etc.)     │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                  法律业务逻辑层                          │
│  (自定义节点、连接系统、AI服务接口、文档管理)            │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                  Plait框架扩展层                         │
│  (withLegalNodes, SmartConnectionTool, etc.)            │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                  Plait核心框架                           │
│  (画布渲染、事件处理、坐标系统、协作功能)                │
└─────────────────────────────────────────────────────────┘
```

### 代码组织

```
Prototype/
├── src/
│   ├── components/              # React组件
│   │   ├── ai/                  # AI相关组件（自定义）
│   │   ├── arbitration/         # 仲裁专用功能（自定义）
│   │   ├── canvas/              # 画布组件（基于Plait）
│   │   ├── collaboration/       # 协作功能（基于Plait）
│   │   ├── editors/             # 节点编辑器（自定义）
│   │   ├── plait/               # Plait框架封装
│   │   ├── toolbars/            # 工具栏组件（自定义）
│   │   └── ui/                  # 基础UI组件（shadcn/ui）
│   │
│   ├── lib/                     # 核心库
│   │   ├── canvas-engine.ts     # 画布引擎（自研，部分功能）
│   │   ├── node-system.ts       # 节点系统（自研，法律节点定义）
│   │   ├── connection-system.ts # 连接系统（自研，智能连接）
│   │   ├── workspace-manager.ts # 工作台管理器（自研）
│   │   └── utils.ts             # 工具函数
│   │
│   ├── plugins/                 # Plait插件
│   │   └── legal-nodes/         # 法律节点插件（自定义）
│   │       └── with-legal-nodes.ts
│   │
│   ├── stores/                  # Zustand状态管理
│   ├── types/                   # TypeScript类型定义
│   ├── utils/                   # 工具函数
│   └── data/                    # 演示数据
│
├── docs/                        # 文档
├── public/                      # 静态资源
└── package.json                 # 依赖配置
```

---

## 🔧 Plait框架 vs 自研代码

### Plait框架提供的能力（原生功能）

✅ **画布渲染**：
- Canvas API封装
- 分层渲染系统
- 视口管理（缩放、平移）
- 性能优化（虚拟化渲染、脏区域检测）

✅ **事件处理**：
- 鼠标事件（点击、拖拽、滚轮）
- 键盘事件（快捷键）
- 触摸事件（移动端支持）

✅ **协作功能**：
- 多用户光标显示
- 实时同步机制
- 冲突解决策略

✅ **基础节点类型**：
- 思维导图节点
- 流程图节点
- 自由绘制

### 自研代码提供的能力（法律业务扩展）

🎯 **法律专用节点**（6种）：
1. **案件信息节点** (case-info) - 案件号、当事人、争议金额
2. **人物关系节点** (person) - 律师、当事人、证人关系网络
3. **文档管理节点** (document) - 证据、合同、文书管理
4. **时间轴节点** (timeline) - 重要节点、截止日期
5. **流程模板节点** (process) - 标准化庭审流程
6. **AI助手节点** (ai-assistant) - 智能分析和建议

🎯 **智能连接系统**（5种连接类型）：
1. **工作流连接** (workflow) - 正交路径，表示流程顺序
2. **关系连接** (relationship) - 曲线路径，表示人物关系
3. **引用连接** (reference) - 虚线路径，表示文档引用
4. **依赖连接** (dependency) - 粗直线，表示依赖关系
5. **协作连接** (collaboration) - 双向曲线，表示协作关系

🎯 **AI服务接口**：
- 用户意图分析
- 法律文书生成
- 案件关系分析
- 智能节点推荐

🎯 **仲裁专用功能**：
- 虚拟法庭系统
- 争议焦点可视化
- 证据链分析
- 仲裁流程管理

---

## 🔌 插件系统

### Plait插件机制

Plait使用插件模式扩展功能：

```typescript
// 基本插件结构
export const withLegalNodes = (board: PlaitBoard) => {
  const { drawElement, isRectangle, isSelectable } = board
  
  // 扩展绘制逻辑
  board.drawElement = (element: PlaitElement) => {
    if (element.type === 'legal-case') {
      return renderLegalCaseNode(element as LegalCaseNode)
    }
    return drawElement(element)
  }
  
  // 扩展选择逻辑
  board.isSelectable = (element: PlaitElement) => {
    if (element.type.startsWith('legal-')) {
      return true
    }
    return isSelectable(element)
  }
  
  return board
}
```

### 已实现的插件

1. **withLegalNodes** - 法律节点插件
   - 注册6种法律节点类型
   - 自定义节点渲染逻辑
   - 节点交互行为

2. **withGroup** - 分组插件（Plait原生）
   - 支持节点分组
   - 组内元素联动

3. **withDraw** - 绘图插件（Plait原生）
   - 自由绘制
   - 形状工具

4. **withMind** - 思维导图插件（Plait原生）
   - 思维导图布局
   - 自动排列

---

## 🚀 性能优化策略

### Plait框架层面

1. **虚拟化渲染**：只渲染可见区域的元素
2. **脏区域检测**：只重绘变化的区域
3. **分层渲染**：背景、节点、连接、UI分层
4. **Canvas缓存**：缓存静态元素

### React组件层面

1. **React.memo**：避免不必要的重新渲染
2. **useMemo/useCallback**：缓存计算结果和函数
3. **懒加载**：按需加载大型组件
4. **代码分割**：使用动态import

### 数据层面

1. **Zustand**：轻量级状态管理，减少渲染
2. **Immutable更新**：使用不可变数据结构
3. **本地缓存**：使用localforage缓存数据

---

## 🔄 与LegalMind主项目的集成

### 技术栈对比

| 项目 | 构建工具 | 框架 | 状态管理 | UI组件 |
|------|---------|------|---------|--------|
| **Prototype** | Vite | React 18 | Zustand | shadcn/ui |
| **LegalMind主项目** | Next.js | React 18 | Zustand | shadcn/ui |

### 集成策略

1. **组件级集成**：
   - 将Prototype组件标记为客户端组件（'use client'）
   - 避免使用Vite特有功能
   - 确保SSR兼容性

2. **样式集成**：
   - 共享Tailwind配置
   - 使用相同的设计token
   - 保持橙色主题一致

3. **状态集成**：
   - 共享Zustand store
   - 统一的数据流
   - 避免状态冲突

4. **构建集成**：
   - 将Prototype作为Next.js的子包
   - 使用Turborepo管理monorepo
   - 共享依赖，减少包体积

---

## 📚 学习资源

### Plait/Drawnix

- **GitHub仓库**：https://github.com/plait-board/drawnix
- **官方文档**：https://plait-board.github.io/drawnix/
- **示例代码**：参考Drawnix源码

### React生态

- **React官方文档**：https://react.dev/
- **TypeScript官方文档**：https://www.typescriptlang.org/
- **Tailwind CSS文档**：https://tailwindcss.com/

### LegalMind生态

- **主项目文档**：`dev/docs/`
- **设计系统**：`dev/docs/DESIGN_SYSTEM.md`
- **API文档**：`dev/docs/API_DESIGN_GUIDE.md`

---

## 🔮 未来技术规划

### 短期（1-2个月）

1. **深度集成Plait协作功能**：
   - 实现多用户实时编辑
   - 添加用户权限管理
   - 实现冲突解决机制

2. **性能优化**：
   - 添加性能监控
   - 优化大规模节点渲染
   - 实现增量更新

3. **测试覆盖**：
   - 单元测试（Vitest）
   - 组件测试（React Testing Library）
   - E2E测试（Playwright）

### 中期（3-6个月）

1. **AI服务集成**：
   - 集成OpenAI/Claude
   - 实现智能节点推荐
   - 法律文书自动生成

2. **移动端适配**：
   - 响应式布局优化
   - 触摸手势支持
   - 移动端性能优化

3. **插件市场**：
   - 开放插件API
   - 第三方插件支持
   - 插件商店

### 长期（6-12个月）

1. **离线支持**：
   - PWA支持
   - 离线数据同步
   - 冲突解决

2. **跨平台**：
   - Electron桌面应用
   - 移动端原生应用（React Native）

3. **生态扩展**：
   - 与LegalMind其他产品深度集成
   - 开放API，支持第三方集成
   - 建立开发者社区

---

## 📝 更新日志

### v1.0 (2025-10-09)

- ✅ 初始版本
- ✅ 明确技术栈选择和架构设计
- ✅ 说明Plait框架和自研代码的职责边界
- ✅ 提供学习资源和未来规划

---

**维护者**：LegalMind开发团队  
**最后更新**：2025-10-09  
**下次审查**：2025-10-23

