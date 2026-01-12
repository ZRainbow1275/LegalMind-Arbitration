# 🛠️ LegalMind法律工作台原型 - 技术指南

**文档版本**: v2.0  
**更新日期**: 2025-10-30  
**维护者**: LegalMind开发团队

---

## 📋 技术栈概览

### 核心技术

| 技术 | 版本 | 用途 | 说明 |
|------|------|------|------|
| **React** | 18.3.1 | UI框架 | 使用最新的React特性（Hooks、Concurrent Mode） |
| **TypeScript** | 5.2.2 | 类型系统 | 严格模式，提供完整的类型安全 |
| **Vite** | 5.1.0 | 构建工具 | 快速的开发服务器和HMR |
| **Zustand** | 4.5.7 | 状态管理 | 轻量级状态管理库 |
| **Plait/Drawnix** | 0.86.1 | 画布引擎 | 开源白板框架 |
| **Vitest** | 1.6.1 | 测试框架 | 快速的单元测试框架 |
| **Tailwind CSS** | 3.4.1 | 样式方案 | 实用优先的CSS框架 |

### 画布框架（核心）

| 技术 | 版本 | 用途 |
|------|------|------|
| **@plait/core** | 0.86.1 | 画布核心 - 渲染、事件处理、坐标系统 |
| **@plait/draw** | 0.86.1 | 绘图功能 - 自由绘制、形状工具 |
| **@plait/mind** | 0.86.1 | 思维导图 - 布局算法 |
| **@plait-board/react-board** | 0.1.4 | React集成 |
| **@plait-board/react-text** | 0.1.4 | 文本编辑 |

**技术来源**: [Drawnix开源白板工具](https://github.com/plait-board/drawnix)

---

## 🏗️ 项目结构

```
Prototype/
├── src/
│   ├── components/              # React组件
│   │   ├── DrawnixLegalWorkspace.tsx  # 主工作台组件
│   │   ├── common/              # 通用组件（51个）
│   │   │   ├── ModalPanel.tsx
│   │   │   ├── StatusBar.tsx
│   │   │   ├── SidePanel.tsx
│   │   │   ├── ResponsiveToolbar.tsx
│   │   │   ├── MobileNodePanel.tsx
│   │   │   └── ...
│   │   ├── canvas/              # 画布组件
│   │   │   └── ConnectionCanvas.tsx
│   │   └── workspace/           # 工作区组件
│   │       ├── hooks/           # 自定义Hooks
│   │       ├── types.ts         # 类型定义
│   │       └── config.ts        # 配置文件
│   │
│   ├── hooks/                   # 全局Hooks
│   │   ├── useResponsiveLayout.ts
│   │   ├── useTouchGestures.ts
│   │   └── ...
│   │
│   ├── lib/                     # 工具库
│   │   ├── virtualization/      # 虚拟化
│   │   │   ├── quadtree-cache.ts
│   │   │   ├── viewport-cache.ts
│   │   │   └── performance-monitor.ts
│   │   ├── rendering/           # 渲染优化
│   │   │   ├── connection-virtualizer.ts
│   │   │   ├── path-cache.ts
│   │   │   └── bezier-optimizer.ts
│   │   └── ...
│   │
│   ├── workers/                 # Web Workers
│   │   ├── worker-pool.ts
│   │   ├── task-queue.ts
│   │   └── layout-worker.ts
│   │
│   ├── stores/                  # Zustand状态管理
│   ├── types/                   # TypeScript类型定义
│   ├── utils/                   # 工具函数
│   └── data/                    # 演示数据
│
├── docs/                        # 文档（已整合到主项目docs）
├── public/                      # 静态资源
└── package.json                 # 依赖配置
```

---

## 🎯 核心功能架构

### 1. 画布系统

**Plait框架提供**:
- Canvas API封装
- 分层渲染系统
- 视口管理（缩放、平移）
- 性能优化（虚拟化渲染、脏区域检测）

**自研扩展**:
- 6种法律节点类型
- 节点深度编辑系统
- 智能布局算法
- 连接线优化渲染

### 2. 性能优化系统

**QuadTree空间索引**:
```typescript
// src/lib/virtualization/quadtree-cache.ts
class QuadTreeCache {
  // 智能缓存系统
  // 节点不变时构建时间为0
  // 空间查询性能提升87%
}
```

**Canvas批量渲染**:
```typescript
// src/components/canvas/ConnectionCanvas.tsx
// 替代SVG渲染
// 一次性渲染所有连接线
// 性能提升14,600%
```

**Worker池**:
```typescript
// src/workers/worker-pool.ts
// 4个Worker并发处理
// 自动负载均衡
// UI响应性提升100%
```

### 3. 响应式系统

**断点系统**:
```typescript
export const BREAKPOINTS = {
  sm: 640,    // 手机横屏
  md: 768,    // 平板竖屏
  lg: 1024,   // 平板横屏/小笔记本
  xl: 1280,   // 桌面
  '2xl': 1536, // 2K屏幕
} as const;
```

**触摸手势**:
- 单指滑动（平移画布）
- 双指缩放（缩放画布）
- 双指旋转（旋转元素）
- 长按（显示菜单）
- 双击（重置视图）
- 单击（选择元素）

---

## 🔧 核心API

### 主组件API

```typescript
// DrawnixLegalWorkspace组件
interface WorkspaceState {
  nodes: LegalNode[];
  connections: Connection[];
  selectedNodeId?: string;
  viewport: Viewport;
  isFullscreen: boolean;
  viewMode: ViewMode;
  // ... 更多状态
}

// 主要方法
handleNodeCreate(position: Position): void
handleNodeUpdate(nodeId: string, updates: Partial<LegalNode>): void
handleNodeDelete(nodeId: string): void
handleNodeSelect(nodeId: string): void
handleConnectionCreate(sourceId: string, targetId: string): void
handleConnectionDelete(connectionId: string): void
handleZoomIn(): void
handleZoomOut(): void
handleResetView(): void
handleFitToScreen(): void
handleSmartLayout(): void
```

### 响应式Hooks API

```typescript
// useResponsiveLayout
const {
  width,          // 当前屏幕宽度
  height,         // 当前屏幕高度
  isMobile,       // 是否为移动设备 (<768px)
  isTablet,       // 是否为平板设备 (768px-1024px)
  isDesktop,      // 是否为桌面设备 (>=1024px)
  breakpoint,     // 当前断点
  isTouchDevice,  // 是否为触摸设备
  isLandscape,    // 是否为横屏
} = useResponsiveLayout();

// useTouchGestures
useTouchGestures(elementRef, {
  onSwipe: (direction, distance) => {},
  onPinch: (scale, center) => {},
  onRotate: (angle) => {},
  onLongPress: (point) => {},
  onDoubleTap: (point) => {},
  onTap: (point) => {},
});
```

---

## 🚀 快速开始

### 环境要求

```bash
Node.js >= 18.0.0
npm >= 9.0.0
```

### 安装和运行

```bash
# 进入项目目录
cd Prototype

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 运行测试
npm run test

# 构建生产版本
npm run build
```

### 开发服务器

- **URL**: http://localhost:3001
- **热重载**: 支持
- **端口**: 3001（可在vite.config.ts中修改）

---

## 📝 开发最佳实践

### 1. 组件开发

**组件提取原则**:
- 重复3次以上应提取
- 单一职责原则
- Props配置优于硬编码
- 使用TypeScript严格类型

**性能优化**:
```typescript
// 使用React.memo避免不必要的重新渲染
export const MyComponent = React.memo(({ data }) => {
  // 使用useMemo缓存计算结果
  const processedData = useMemo(() => {
    return expensiveOperation(data);
  }, [data]);

  // 使用useCallback缓存回调函数
  const handleClick = useCallback(() => {
    // ...
  }, []);

  return <div>...</div>;
});
```

### 2. 状态管理

**Zustand最佳实践**:
```typescript
// 使用updateWorkspaceState而非setWorkspaceState
const { updateWorkspaceState } = useWorkspaceState();

updateWorkspaceState((prev) => ({
  ...prev,
  nodes: [...prev.nodes, newNode],
}));
```

### 3. 响应式设计

**移动优先**:
```typescript
// 从移动端开始设计，逐步增强到桌面端
const columns = useResponsiveValue({
  base: 1,    // 移动端
  md: 2,      // 平板
  lg: 3,      // 桌面
});
```

**触摸目标大小**:
- 最小44x44px（符合iOS/Android规范）
- 使用`min-h-[44px] min-w-[44px]`

### 4. 性能优化

**虚拟化**:
- 大列表使用虚拟滚动
- 只渲染可见区域
- 使用QuadTree空间索引

**懒加载**:
```typescript
// 使用React.lazy动态导入
const HeavyComponent = React.lazy(() => import('./HeavyComponent'));

<Suspense fallback={<Loading />}>
  <HeavyComponent />
</Suspense>
```

---

## 🔄 与LegalMind主项目集成

### 技术栈对比

| 项目 | 构建工具 | 框架 | 状态管理 | UI组件 |
|------|---------|------|---------|--------|
| **Prototype** | Vite | React 18 | Zustand | shadcn/ui |
| **LegalMind主项目** | Next.js | React 18 | Zustand | shadcn/ui |

### 集成策略

1. **组件级集成**:
   - 将Prototype组件标记为客户端组件（'use client'）
   - 避免使用Vite特有功能
   - 确保SSR兼容性

2. **样式集成**:
   - 共享Tailwind配置
   - 使用相同的设计token
   - 保持橙色主题一致 (#FF6B35)

3. **状态集成**:
   - 共享Zustand stores
   - 统一状态管理模式
   - 避免状态冲突

---

## 📚 参考资源

### 官方文档
- [React文档](https://react.dev/)
- [TypeScript文档](https://www.typescriptlang.org/)
- [Vite文档](https://vitejs.dev/)
- [Zustand文档](https://zustand-demo.pmnd.rs/)
- [Plait文档](https://github.com/plait-board/drawnix)
- [Tailwind CSS文档](https://tailwindcss.com/)

### 项目文档
- [项目状态](./PROTOTYPE_STATUS.md)
- [开发历史](./DEVELOPMENT_HISTORY.md)
- [主项目README](./README.md)

---

**文档维护者**: LegalMind开发团队  
**最后更新**: 2025-10-30  
**下次审查**: 生产环境部署后

