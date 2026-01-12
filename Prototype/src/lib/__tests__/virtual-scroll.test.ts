/**
 * 虚拟滚动系统单元测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  VirtualScrollManager,
  createVirtualScrollManager,
  isIntersectionObserverSupported
} from '../virtual-scroll';
import type { CanvasElement } from '../../types/canvas-elements';

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

  // 模拟元素进入视口
  mockIntersect(element: Element, isIntersecting: boolean) {
    const entry: Partial<IntersectionObserverEntry> = {
      target: element,
      isIntersecting,
      intersectionRatio: isIntersecting ? 1 : 0,
      boundingClientRect: element.getBoundingClientRect(),
      intersectionRect: element.getBoundingClientRect(),
      rootBounds: null,
      time: Date.now()
    };

    this.callback([entry as IntersectionObserverEntry], this as any);
  }
}

describe('VirtualScroll', () => {
  let mockObserver: MockIntersectionObserver;

  beforeEach(() => {
    // Mock IntersectionObserver
    mockObserver = new MockIntersectionObserver(() => { });
    global.IntersectionObserver = vi.fn((callback, options) => {
      mockObserver = new MockIntersectionObserver(callback, options);
      return mockObserver as any;
    }) as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==================== VirtualScrollManager ====================

  describe('VirtualScrollManager', () => {
    let manager: VirtualScrollManager;
    let mockElement: CanvasElement;
    let mockDomElement: HTMLElement;

    beforeEach(() => {
      manager = new VirtualScrollManager();

      mockElement = {
        id: 'element-1',
        type: 'shape',
        shapeType: 'rectangle',
        position: { x: 0, y: 0 },
        size: { width: 100, height: 100 },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      mockDomElement = document.createElement('div');
      document.body.appendChild(mockDomElement);
    });

    afterEach(() => {
      manager.destroy();
      if (mockDomElement.parentNode) {
        document.body.removeChild(mockDomElement);
      }
    });

    it('应该创建虚拟滚动管理器', () => {
      expect(manager).toBeDefined();
      expect(manager.getStats().total).toBe(0);
    });

    it('应该观察元素', () => {
      manager.observe('element-1', mockElement, mockDomElement);

      expect(manager.getStats().total).toBe(1);
      expect(mockDomElement.getAttribute('data-element-id')).toBe('element-1');
    });

    it('应该取消观察元素', () => {
      manager.observe('element-1', mockElement, mockDomElement);
      expect(manager.getStats().total).toBe(1);

      manager.unobserve('element-1');
      expect(manager.getStats().total).toBe(0);
    });

    it('应该批量观察元素', () => {
      const elements = [
        { id: 'element-1', element: mockElement, domElement: mockDomElement },
        { id: 'element-2', element: mockElement, domElement: document.createElement('div') },
        { id: 'element-3', element: mockElement, domElement: document.createElement('div') }
      ];

      manager.observeAll(elements);
      expect(manager.getStats().total).toBe(3);
    });

    it('应该批量取消观察', () => {
      const elements = [
        { id: 'element-1', element: mockElement, domElement: mockDomElement },
        { id: 'element-2', element: mockElement, domElement: document.createElement('div') },
        { id: 'element-3', element: mockElement, domElement: document.createElement('div') }
      ];

      manager.observeAll(elements);
      manager.unobserveAll(['element-1', 'element-2']);

      expect(manager.getStats().total).toBe(1);
    });

    it('应该清除所有观察', () => {
      manager.observe('element-1', mockElement, mockDomElement);
      manager.observe('element-2', mockElement, document.createElement('div'));

      expect(manager.getStats().total).toBe(2);

      manager.clear();
      expect(manager.getStats().total).toBe(0);
    });

    it('应该检测元素可见性', () => {
      manager.observe('element-1', mockElement, mockDomElement);

      // 初始状态不可见
      expect(manager.isVisible('element-1')).toBe(false);

      // 模拟元素进入视口
      mockObserver.mockIntersect(mockDomElement, true);
      expect(manager.isVisible('element-1')).toBe(true);

      // 模拟元素离开视口
      mockObserver.mockIntersect(mockDomElement, false);
      expect(manager.isVisible('element-1')).toBe(false);
    });

    it('应该获取可见元素', () => {
      const dom1 = mockDomElement;
      const dom2 = document.createElement('div');
      const dom3 = document.createElement('div');

      manager.observe('element-1', mockElement, dom1);
      manager.observe('element-2', mockElement, dom2);
      manager.observe('element-3', mockElement, dom3);

      // 模拟部分元素可见
      mockObserver.mockIntersect(dom1, true);
      mockObserver.mockIntersect(dom2, false);
      mockObserver.mockIntersect(dom3, true);

      const visible = manager.getVisibleItems();
      expect(visible.length).toBe(2);
      expect(visible.map(item => item.id)).toEqual(['element-1', 'element-3']);
    });

    it('应该获取不可见元素', () => {
      const dom1 = mockDomElement;
      const dom2 = document.createElement('div');
      const dom3 = document.createElement('div');

      manager.observe('element-1', mockElement, dom1);
      manager.observe('element-2', mockElement, dom2);
      manager.observe('element-3', mockElement, dom3);

      // 模拟部分元素可见
      mockObserver.mockIntersect(dom1, true);
      mockObserver.mockIntersect(dom2, false);
      mockObserver.mockIntersect(dom3, true);

      const hidden = manager.getHiddenItems();
      expect(hidden.length).toBe(1);
      expect(hidden[0].id).toBe('element-2');
    });

    it('应该触发可见性变化回调', () => {
      const callback = vi.fn();
      manager.onVisibilityChange(callback);

      manager.observe('element-1', mockElement, mockDomElement);

      // 模拟元素进入视口
      mockObserver.mockIntersect(mockDomElement, true);
      expect(callback).toHaveBeenCalledWith('element-1', true);

      // 模拟元素离开视口
      mockObserver.mockIntersect(mockDomElement, false);
      expect(callback).toHaveBeenCalledWith('element-1', false);

      expect(callback).toHaveBeenCalledTimes(2);
    });

    it('应该移除可见性变化回调', () => {
      const callback = vi.fn();
      const remove = manager.onVisibilityChange(callback);

      manager.observe('element-1', mockElement, mockDomElement);
      mockObserver.mockIntersect(mockDomElement, true);

      expect(callback).toHaveBeenCalledTimes(1);

      remove();
      mockObserver.mockIntersect(mockDomElement, false);

      // 回调不应该再被调用
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('应该启用和禁用虚拟滚动', () => {
      manager.observe('element-1', mockElement, mockDomElement);

      // 禁用
      manager.disable();
      expect(manager.getStats().enabled).toBe(false);

      // 禁用后所有元素应该可见
      expect(manager.isVisible('element-1')).toBe(true);

      // 启用
      manager.enable();
      expect(manager.getStats().enabled).toBe(true);
    });

    it('应该获取统计信息', () => {
      const dom1 = mockDomElement;
      const dom2 = document.createElement('div');
      const dom3 = document.createElement('div');

      manager.observe('element-1', mockElement, dom1);
      manager.observe('element-2', mockElement, dom2);
      manager.observe('element-3', mockElement, dom3);

      // 模拟1个可见，2个不可见
      mockObserver.mockIntersect(dom1, true);
      mockObserver.mockIntersect(dom2, false);
      mockObserver.mockIntersect(dom3, false);

      const stats = manager.getStats();
      expect(stats.total).toBe(3);
      expect(stats.visible).toBe(1);
      expect(stats.hidden).toBe(2);
      expect(stats.cullingRate).toBeCloseTo(66.67, 1);
    });

    it('应该正确销毁', () => {
      manager.observe('element-1', mockElement, mockDomElement);

      manager.destroy();

      expect(manager.getStats().total).toBe(0);
    });
  });

  // ==================== 辅助函数 ====================

  describe('createVirtualScrollManager', () => {
    it('应该创建虚拟滚动管理器', () => {
      const manager = createVirtualScrollManager();
      expect(manager).toBeInstanceOf(VirtualScrollManager);
      manager.destroy();
    });

    it('应该支持自定义选项', () => {
      const manager = createVirtualScrollManager({
        rootMargin: '100px',
        threshold: [0, 0.5, 1.0]
      });
      expect(manager).toBeInstanceOf(VirtualScrollManager);
      manager.destroy();
    });
  });

  describe('isIntersectionObserverSupported', () => {
    it('应该检测IntersectionObserver支持', () => {
      expect(isIntersectionObserverSupported()).toBe(true);
    });
  });
});

