/**
 * 画布优化集成模块单元测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  CanvasOptimizationManager,
  createCanvasOptimizationManager,
  getGlobalOptimizationManager,
  destroyGlobalOptimizationManager
} from '../canvas-optimizations';
import type { CanvasElement } from '../../types/canvas-elements';

// Mock Worker
class MockWorker {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;

  postMessage(message: any) {
    setTimeout(() => {
      if (this.onmessage) {
        let response;

        if (message.type === 'build') {
          response = {
            type: 'build-complete',
            success: true,
            elementCount: message.elements.length,
            buildTime: 10
          };
        } else if (message.type === 'query') {
          response = {
            type: 'query-result',
            elements: [],
            queryTime: 5
          };
        }

        if (response) {
          this.onmessage(new MessageEvent('message', { data: response }));
        }
      }
    }, 10);
  }

  terminate() { }
}

// Mock IntersectionObserver
class MockIntersectionObserver {
  callback: IntersectionObserverCallback;
  options: IntersectionObserverInit;
  elements = new Set<Element>();

  constructor(callback: IntersectionObserverCallback, options: IntersectionObserverInit = {}) {
    this.callback = callback;
    this.options = options;
  }

  observe(element: Element) {
    this.elements.add(element);
  }

  unobserve(element: Element) {
    this.elements.delete(element);
  }

  disconnect() {
    this.elements.clear();
  }
}

describe('CanvasOptimizations', () => {
  let mockElements: CanvasElement[];

  beforeEach(() => {
    // Mock Worker
    global.Worker = vi.fn(() => new MockWorker()) as any;

    // Mock IntersectionObserver
    global.IntersectionObserver = vi.fn((callback, options) => {
      return new MockIntersectionObserver(callback, options) as any;
    }) as any;

    mockElements = [
      {
        id: 'element-1',
        type: 'shape',
        shapeType: 'rectangle',
        position: { x: 0, y: 0 },
        size: { width: 100, height: 100 },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'element-2',
        type: 'shape',
        shapeType: 'rectangle',
        position: { x: 200, y: 200 },
        size: { width: 100, height: 100 },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
  });

  afterEach(() => {
    vi.restoreAllMocks();
    destroyGlobalOptimizationManager();
  });

  // ==================== CanvasOptimizationManager ====================

  describe('CanvasOptimizationManager', () => {
    let manager: CanvasOptimizationManager;

    beforeEach(() => {
      manager = new CanvasOptimizationManager();
    });

    afterEach(() => {
      manager.destroy();
    });

    it('应该创建优化管理器', () => {
      expect(manager).toBeDefined();
    });

    it('应该获取虚拟滚动管理器', () => {
      const vsManager = manager.getVirtualScrollManager();
      expect(vsManager).toBeDefined();
    });

    it('应该获取Worker管理器', () => {
      const workerManager = manager.getWorkerManager();
      expect(workerManager).toBeDefined();
    });

    it('应该创建优化的事件处理器', () => {
      const handlers = manager.createOptimizedHandlers({
        onMouseMove: vi.fn(),
        onScroll: vi.fn(),
        onResize: vi.fn(),
        onInput: vi.fn()
      });

      expect(handlers.onMouseMove).toBeDefined();
      expect(handlers.onScroll).toBeDefined();
      expect(handlers.onResize).toBeDefined();
      expect(handlers.onInput).toBeDefined();
    });

    it('应该添加优化的事件监听器', () => {
      const target = document.createElement('div');
      const handler = vi.fn();

      const cleanup = manager.addOptimizedListener(target, 'click', handler);

      expect(cleanup).toBeInstanceOf(Function);
    });

    it('应该构建四叉树', async () => {
      const result = await manager.buildQuadTree(mockElements);

      expect(result.success).toBe(true);
      expect(result.elementCount).toBe(2);
    });

    it('应该查询四叉树', async () => {
      await manager.buildQuadTree(mockElements);

      const elements = await manager.queryQuadTree({
        x: 0,
        y: 0,
        width: 500,
        height: 500
      });

      expect(Array.isArray(elements)).toBe(true);
    });

    it('应该生成性能报告', () => {
      const report = manager.generatePerformanceReport();

      expect(report).toBeDefined();
      expect(report?.overall).toBeDefined();
    });

    it('应该格式化性能报告', () => {
      const text = manager.formatPerformanceReport();

      expect(text).toBeDefined();
      expect(typeof text).toBe('string');
    });

    it('应该清除性能数据', () => {
      manager.clearPerformanceData();

      const report = manager.generatePerformanceReport();
      expect(report?.overall.totalOperations).toBe(0);
    });

    it('应该正确销毁', () => {
      manager.destroy();

      expect(manager.getVirtualScrollManager()).toBeNull();
      expect(manager.getWorkerManager()).toBeNull();
    });
  });

  // ==================== 配置选项 ====================

  describe('配置选项', () => {
    it('应该支持禁用虚拟滚动', () => {
      const manager = new CanvasOptimizationManager({
        enableVirtualScroll: false
      });

      expect(manager.getVirtualScrollManager()).toBeNull();
      manager.destroy();
    });

    it('应该支持禁用Worker', () => {
      const manager = new CanvasOptimizationManager({
        enableWorker: false
      });

      expect(manager.getWorkerManager()).toBeNull();
      manager.destroy();
    });

    it('应该支持禁用性能监控', () => {
      const manager = new CanvasOptimizationManager({
        enablePerformanceMonitoring: false
      });

      const report = manager.generatePerformanceReport();
      expect(report).toBeNull();
      manager.destroy();
    });

    it('应该支持自定义虚拟滚动选项', () => {
      const manager = new CanvasOptimizationManager({
        virtualScrollOptions: {
          rootMargin: '100px',
          threshold: [0, 0.5, 1.0]
        }
      });

      expect(manager.getVirtualScrollManager()).toBeDefined();
      manager.destroy();
    });

    it('应该支持自定义节流选项', () => {
      const manager = new CanvasOptimizationManager({
        throttleOptions: {
          mousemove: 32,
          scroll: 32,
          resize: 200
        }
      });

      const handlers = manager.createOptimizedHandlers({
        onMouseMove: vi.fn()
      });

      expect(handlers.onMouseMove).toBeDefined();
      manager.destroy();
    });

    it('应该支持自定义防抖选项', () => {
      const manager = new CanvasOptimizationManager({
        debounceOptions: {
          input: 500,
          search: 1000
        }
      });

      const handlers = manager.createOptimizedHandlers({
        onInput: vi.fn()
      });

      expect(handlers.onInput).toBeDefined();
      manager.destroy();
    });
  });

  // ==================== 辅助函数 ====================

  describe('辅助函数', () => {
    it('应该创建优化管理器', () => {
      const manager = createCanvasOptimizationManager();
      expect(manager).toBeInstanceOf(CanvasOptimizationManager);
      manager.destroy();
    });

    it('应该支持自定义选项', () => {
      const manager = createCanvasOptimizationManager({
        enableVirtualScroll: false
      });
      expect(manager.getVirtualScrollManager()).toBeNull();
      manager.destroy();
    });
  });

  // ==================== 全局实例 ====================

  describe('全局实例', () => {
    it('应该获取全局优化管理器', () => {
      const manager1 = getGlobalOptimizationManager();
      const manager2 = getGlobalOptimizationManager();

      expect(manager1).toBe(manager2); // 应该是同一个实例
    });

    it('应该销毁全局优化管理器', () => {
      const manager = getGlobalOptimizationManager();
      expect(manager).toBeDefined();

      destroyGlobalOptimizationManager();

      // 销毁后获取新实例
      const newManager = getGlobalOptimizationManager();
      expect(newManager).not.toBe(manager);
    });
  });
});

