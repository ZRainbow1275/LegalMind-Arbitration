# 🏗️ LegalMind法律工作台 - 技术架构文档

**版本**：v2.0  
**更新日期**：2025-10-16  
**状态**：生产就绪

---

## 📋 目录

1. [技术栈](#技术栈)
2. [核心模块](#核心模块)
3. [性能优化](#性能优化)
4. [数据流](#数据流)
5. [测试策略](#测试策略)

---

## 技术栈

### 前端核心

```json
{
  "react": "18.3.1",
  "typescript": "5.2.2",
  "vite": "5.1.0",
  "zustand": "4.5.7",
  "@plait-board/drawnix": "0.86.1",
  "tailwindcss": "3.4.1"
}
```

### 测试工具

```json
{
  "vitest": "1.6.1",
  "@testing-library/react": "14.2.1",
  "@testing-library/user-event": "14.5.2"
}
```

### 开发工具

```json
{
  "eslint": "8.57.0",
  "prettier": "3.2.5",
  "typescript-eslint": "7.0.1"
}
```

---

## 核心模块

### 1. 画布系统 (Canvas System)

#### canvas-store.ts
**职责**：画布状态管理  
**技术**：Zustand  
**核心功能**：
- 元素CRUD操作
- 撤销/重做（历史记录）
- 批量操作优化
- 视口管理

**关键API**：
```typescript
interface CanvasStore {
  // 状态
  canvas: Canvas | null;
  selection: Selection;
  
  // 操作
  addElement(element: CanvasElement): void;
  updateElement(id: string, updates: Partial<CanvasElement>): void;
  deleteElements(ids: string[]): void;
  
  // 历史
  undo(): void;
  redo(): void;
  
  // 批量操作
  batchUpdate(updates: Array<{id: string, updates: Partial<CanvasElement>}>): void;
}
```

#### canvas-engine.ts
**职责**：画布渲染引擎  
**技术**：Canvas API + Plait  
**核心功能**：
- 元素渲染
- 事件处理
- 坐标转换
- 碰撞检测

#### virtualization.ts
**职责**：虚拟化系统  
**技术**：QuadTree空间索引  
**核心功能**：
- 四叉树构建
- 视口查询
- 元素剔除

**性能指标**：
- 10000元素构建：<100ms
- 视口查询：<10ms
- 内存优化：90%减少

---

### 2. 性能优化系统 (Performance Optimization)

#### event-optimization.ts
**职责**：事件处理优化  
**核心功能**：
- Throttle：限制执行频率
- Debounce：延迟执行
- 事件委托：减少监听器数量
- Passive监听器：提升滚动性能

**使用示例**：
```typescript
import { throttle, debounce } from './event-optimization';

// Throttle：60fps
const handleMouseMove = throttle((e: MouseEvent) => {
  console.log('Mouse moved');
}, 16);

// Debounce：300ms
const handleInput = debounce((e: Event) => {
  console.log('Input changed');
}, 300);
```

#### virtual-scroll.ts
**职责**：虚拟滚动  
**技术**：IntersectionObserver API  
**核心功能**：
- 可见性检测
- 自动DOM管理
- 性能监控

**使用示例**：
```typescript
import { VirtualScrollManager } from './virtual-scroll';

const manager = new VirtualScrollManager({
  rootMargin: '200px',
  threshold: [0, 0.5, 1.0]
});

manager.observe('element-1', element, domElement);
manager.onVisibilityChange((id, isVisible) => {
  console.log(`Element ${id} is ${isVisible ? 'visible' : 'hidden'}`);
});
```

#### worker-manager.ts
**职责**：Web Worker管理  
**核心功能**：
- 四叉树构建（后台）
- 复杂计算（后台）
- 消息通信

**使用示例**：
```typescript
import { QuadTreeWorkerManager } from './worker-manager';

const manager = new QuadTreeWorkerManager();

// 构建四叉树（在Worker中）
const result = await manager.buildQuadTree(elements);
console.log(`Built tree with ${result.elementCount} elements in ${result.buildTime}ms`);

// 查询四叉树
const visibleElements = await manager.queryQuadTree(bounds);
```

#### performance-analyzer.ts
**职责**：性能分析  
**核心功能**：
- 实时监控
- 性能报告
- 问题检测
- 统计分析

**使用示例**：
```typescript
import { performanceAnalyzer } from './performance-analyzer';

// 生成报告
const report = performanceAnalyzer.generateReport(60000); // 最近60秒

// 格式化输出
const text = performanceAnalyzer.formatReport(report);
console.log(text);

// 检测问题
report.issues.forEach(issue => {
  console.log(`[${issue.severity}] ${issue.message}`);
});
```

#### canvas-optimizations.ts
**职责**：优化集成  
**核心功能**：
- 统一管理所有优化
- 简化API
- 配置管理

**使用示例**：
```typescript
import { CanvasOptimizationManager } from './canvas-optimizations';

const optimizer = new CanvasOptimizationManager({
  enableVirtualScroll: true,
  enableWorker: true,
  enablePerformanceMonitoring: true
});

// 创建优化的事件处理器
const handlers = optimizer.createOptimizedHandlers({
  onMouseMove: (e) => handleMouseMove(e),
  onScroll: (e) => handleScroll(e)
});

// 构建四叉树
await optimizer.buildQuadTree(elements);

// 性能报告
optimizer.logPerformanceReport();
```

---

### 3. 协作系统 (Collaboration)

#### collaboration-engine.ts
**职责**：多用户协作  
**核心功能**：
- 用户管理
- 光标同步
- 选择同步
- 评论管理

**数据结构**：
```typescript
interface CollaborationState {
  users: Map<string, User>;
  cursors: Map<string, CursorPosition>;
  selections: Map<string, string[]>;
  comments: Map<string, Comment>;
}
```

---

### 4. 仲裁功能 (Arbitration)

#### arbitration-panel-manager.ts
**职责**：仲裁庭管理  
**核心功能**：
- 仲裁员匹配
- 推荐算法
- 冲突检测
- 配置验证

#### arbitration-procedure-manager.ts
**职责**：仲裁流程管理  
**核心功能**：
- 流程定义
- 进度跟踪
- 截止日期管理
- 依赖检查

#### dispute-focus-manager.ts
**职责**：争议焦点管理  
**核心功能**：
- 焦点分类
- 优先级评估
- 证据支撑度计算
- AI分析接口

---

## 性能优化

### 优化策略

| 优化类型 | 技术方案 | 性能提升 |
|---------|---------|---------|
| 事件处理 | Throttle/Debounce | 减少60%执行 |
| 虚拟滚动 | IntersectionObserver | DOM减少90% |
| 空间索引 | QuadTree | 查询快10倍 |
| 后台计算 | Web Worker | 主线程提升50% |
| 批量操作 | 状态合并 | 快5-337倍 |

### 性能基准

```typescript
// 批量操作
批量添加1000元素：<100ms（提升5-29倍）
批量删除1000元素：<30ms（提升10-337倍）
批量更新1000元素：<30ms（提升10倍）

// 虚拟化
四叉树构建10000元素：<100ms
视口查询10000元素：<10ms
视口查询1000元素：<5ms

// 历史记录
撤销100次：<10ms
重做100次：<10ms
```

---

## 数据流

### 状态管理流程

```
用户操作 → 事件处理 → Store更新 → 组件重渲染
                ↓
            历史记录
                ↓
            持久化
```

### 优化流程

```
用户交互 → 事件优化 → 虚拟化 → Worker计算 → 渲染
   ↓           ↓          ↓         ↓         ↓
Throttle   Debounce   QuadTree   后台线程   DOM优化
```

---

## 测试策略

### 测试金字塔

```
        E2E测试 (计划中)
           /\
          /  \
         /    \
    集成测试 (19个)
       /      \
      /        \
 单元测试 (318个)
```

### 测试覆盖

| 模块 | 测试数量 | 覆盖率 |
|------|---------|--------|
| 画布系统 | 47 | 85% |
| 性能优化 | 88 | 90% |
| 协作系统 | 11 | 75% |
| 仲裁功能 | 83 | 80% |
| 辅助工具 | 31 | 70% |
| 集成测试 | 19 | - |
| 性能测试 | 48 | - |

### 测试命令

```bash
# 运行所有测试
pnpm test

# 运行特定测试
pnpm test canvas-store
pnpm test performance

# 生成覆盖率报告
pnpm test:coverage

# 监听模式
pnpm test:watch
```

---

## 最佳实践

### 1. 性能优化

```typescript
// ✅ 使用批量操作
batchUpdate([
  { id: '1', updates: { position: { x: 10, y: 10 } } },
  { id: '2', updates: { position: { x: 20, y: 20 } } }
]);

// ❌ 避免循环单个更新
elements.forEach(el => {
  updateElement(el.id, { position: newPosition });
});
```

### 2. 事件处理

```typescript
// ✅ 使用throttle处理高频事件
const handleMouseMove = throttle((e: MouseEvent) => {
  // 处理逻辑
}, 16); // 60fps

// ❌ 避免直接处理
const handleMouseMove = (e: MouseEvent) => {
  // 每次移动都执行
};
```

### 3. 虚拟化

```typescript
// ✅ 使用虚拟滚动
const manager = new VirtualScrollManager();
manager.observe(id, element, domElement);

// ✅ 使用四叉树查询
const visible = quadTree.queryViewport(viewport);

// ❌ 避免遍历所有元素
const visible = elements.filter(el => isInViewport(el));
```

---

## 部署配置

### 生产环境

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    target: 'es2015',
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom'],
          'plait': ['@plait-board/drawnix'],
          'optimization': [
            './src/lib/event-optimization',
            './src/lib/virtual-scroll',
            './src/lib/worker-manager'
          ]
        }
      }
    }
  }
});
```

### 环境变量

```env
VITE_API_URL=https://api.legalmind.com
VITE_WS_URL=wss://ws.legalmind.com
VITE_ENABLE_PERFORMANCE_MONITORING=true
VITE_ENABLE_VIRTUAL_SCROLL=true
VITE_ENABLE_WORKER=true
```

---

## 相关资源

- [项目状态报告](./PROJECT_STATUS_2025_10_16.md)
- [测试文档](./TESTING.md)
- [部署指南](./DEPLOYMENT_GUIDE.md)
- [Plait文档](https://github.com/plait-board/drawnix)

---

**维护者**：LegalMind团队  
**最后审查**：2025-10-16

