/**
 * Worker管理器单元测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  QuadTreeWorkerManager,
  createQuadTreeWorkerManager,
  isWorkerSupported,
  getGlobalWorkerManager,
  destroyGlobalWorkerManager
} from '../worker-manager';
import type { CanvasElement } from '../../types/canvas-elements';

// Mock Worker
class MockWorker {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;

  postMessage(message: any) {
    // 模拟异步响应
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
        } else if (message.type === 'clear') {
          response = {
            type: 'build-complete',
            success: true,
            elementCount: 0,
            buildTime: 0
          };
        }

        if (response) {
          this.onmessage(new MessageEvent('message', { data: response }));
        }
      }
    }, 10);
  }

  terminate() {
    // Mock terminate
  }
}

describe('WorkerManager', () => {
  beforeEach(() => {
    // Mock Worker
    global.Worker = vi.fn(() => new MockWorker()) as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    destroyGlobalWorkerManager();
  });

  // ==================== QuadTreeWorkerManager ====================

  describe('QuadTreeWorkerManager', () => {
    let manager: QuadTreeWorkerManager;
    let mockElements: CanvasElement[];

    beforeEach(() => {
      manager = new QuadTreeWorkerManager();

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
      manager.destroy();
    });

    it('应该创建Worker管理器', () => {
      expect(manager).toBeDefined();
      expect(manager.isAvailable()).toBe(true);
    });

    it('应该构建四叉树', async () => {
      const result = await manager.buildQuadTree(mockElements);

      expect(result.success).toBe(true);
      expect(result.elementCount).toBe(2);
      expect(result.buildTime).toBeGreaterThan(0);
    });

    it('应该查询四叉树', async () => {
      // 先构建
      await manager.buildQuadTree(mockElements);

      // 再查询
      const result = await manager.queryQuadTree({
        x: 0,
        y: 0,
        width: 500,
        height: 500
      });

      expect(result.elements).toBeDefined();
      expect(Array.isArray(result.elements)).toBe(true);
      expect(result.queryTime).toBeGreaterThan(0);
    });

    it('应该清除四叉树', async () => {
      await manager.buildQuadTree(mockElements);
      await manager.clearQuadTree();

      // 清除后应该能正常工作
      expect(manager.isAvailable()).toBe(true);
    });

    it('应该正确销毁', () => {
      manager.destroy();
      expect(manager.isAvailable()).toBe(false);
    });

    it('禁用时应该不可用', () => {
      const disabledManager = new QuadTreeWorkerManager({ enabled: false });
      expect(disabledManager.isAvailable()).toBe(false);
      disabledManager.destroy();
    });
  });

  // ==================== 辅助函数 ====================

  describe('createQuadTreeWorkerManager', () => {
    it('应该创建Worker管理器', () => {
      const manager = createQuadTreeWorkerManager();
      expect(manager).toBeInstanceOf(QuadTreeWorkerManager);
      manager.destroy();
    });

    it('应该支持自定义选项', () => {
      const manager = createQuadTreeWorkerManager({
        enabled: true,
        timeout: 10000
      });
      expect(manager).toBeInstanceOf(QuadTreeWorkerManager);
      manager.destroy();
    });
  });

  describe('isWorkerSupported', () => {
    it('应该检测Worker支持', () => {
      expect(isWorkerSupported()).toBe(true);
    });
  });

  describe('getGlobalWorkerManager', () => {
    it('应该获取全局Worker管理器', () => {
      const manager1 = getGlobalWorkerManager();
      const manager2 = getGlobalWorkerManager();

      expect(manager1).toBe(manager2); // 应该是同一个实例
    });

    it('应该销毁全局Worker管理器', () => {
      const manager = getGlobalWorkerManager();
      expect(manager.isAvailable()).toBe(true);

      destroyGlobalWorkerManager();

      // 销毁后获取新实例
      const newManager = getGlobalWorkerManager();
      expect(newManager).not.toBe(manager);
      expect(newManager.isAvailable()).toBe(true);
    });
  });
});

