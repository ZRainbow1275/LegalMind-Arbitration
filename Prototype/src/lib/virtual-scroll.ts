/**
 * 虚拟滚动系统
 * 
 * 使用IntersectionObserver API实现高性能的虚拟滚动
 * 只渲染可见区域的元素，大幅减少DOM节点数量
 */

import type { CanvasElement } from '../types/canvas-elements';

// ==================== 类型定义 ====================

export interface VirtualScrollOptions {
  /**
   * 根元素（滚动容器）
   */
  root?: HTMLElement | null;

  /**
   * 根边距（扩展可见区域）
   * 格式：'top right bottom left'，例如 '100px 100px 100px 100px'
   */
  rootMargin?: string;

  /**
   * 可见性阈值
   * 0.0 = 元素刚进入视口
   * 1.0 = 元素完全在视口内
   */
  threshold?: number | number[];

  /**
   * 预加载距离（像素）
   */
  preloadDistance?: number;

  /**
   * 是否启用
   */
  enabled?: boolean;
}

export interface VirtualItem {
  id: string;
  element: CanvasElement;
  isVisible: boolean;
  domElement?: HTMLElement;
}

export type VisibilityChangeCallback = (id: string, isVisible: boolean) => void;

// ==================== 虚拟滚动管理器 ====================

/**
 * 虚拟滚动管理器
 * 使用IntersectionObserver监听元素可见性
 */
export class VirtualScrollManager {
  private observer: IntersectionObserver | null = null;
  private items = new Map<string, VirtualItem>();
  private visibilityCallbacks = new Set<VisibilityChangeCallback>();
  private options: Required<VirtualScrollOptions>;
  private enabled = true;

  constructor(options: VirtualScrollOptions = {}) {
    this.options = {
      root: options.root ?? null,
      rootMargin: options.rootMargin ?? '200px',
      threshold: options.threshold ?? [0, 0.1, 0.5, 0.9, 1.0],
      preloadDistance: options.preloadDistance ?? 200,
      enabled: options.enabled ?? true
    };

    this.enabled = this.options.enabled;

    if (this.enabled && typeof IntersectionObserver !== 'undefined') {
      this.initObserver();
    }
  }

  /**
   * 初始化IntersectionObserver
   */
  private initObserver() {
    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = entry.target.getAttribute('data-element-id');
          if (!id) continue;

          const item = this.items.get(id);
          if (!item) continue;

          const wasVisible = item.isVisible;
          const isVisible = entry.isIntersecting;

          if (wasVisible !== isVisible) {
            item.isVisible = isVisible;
            this.notifyVisibilityChange(id, isVisible);
          }
        }
      },
      {
        root: this.options.root,
        rootMargin: this.options.rootMargin,
        threshold: this.options.threshold
      }
    );
  }

  /**
   * 注册元素
   */
  observe(id: string, element: CanvasElement, domElement: HTMLElement) {
    if (!this.enabled || !this.observer) {
      return;
    }

    // 设置data属性用于识别
    domElement.setAttribute('data-element-id', id);

    // 创建或更新虚拟项
    const item: VirtualItem = {
      id,
      element,
      isVisible: false,
      domElement
    };

    this.items.set(id, item);
    this.observer.observe(domElement);
  }

  /**
   * 取消观察元素
   */
  unobserve(id: string) {
    if (!this.enabled || !this.observer) {
      return;
    }

    const item = this.items.get(id);
    if (item?.domElement) {
      this.observer.unobserve(item.domElement);
    }

    this.items.delete(id);
  }

  /**
   * 批量注册元素
   */
  observeAll(elements: Array<{ id: string; element: CanvasElement; domElement: HTMLElement }>) {
    for (const { id, element, domElement } of elements) {
      this.observe(id, element, domElement);
    }
  }

  /**
   * 批量取消观察
   */
  unobserveAll(ids: string[]) {
    for (const id of ids) {
      this.unobserve(id);
    }
  }

  /**
   * 清除所有观察
   */
  clear() {
    if (this.observer) {
      this.observer.disconnect();
    }
    this.items.clear();
  }

  /**
   * 获取可见元素
   */
  getVisibleItems(): VirtualItem[] {
    return Array.from(this.items.values()).filter(item => item.isVisible);
  }

  /**
   * 获取不可见元素
   */
  getHiddenItems(): VirtualItem[] {
    return Array.from(this.items.values()).filter(item => !item.isVisible);
  }

  /**
   * 检查元素是否可见
   */
  isVisible(id: string): boolean {
    return this.items.get(id)?.isVisible ?? false;
  }

  /**
   * 添加可见性变化回调
   */
  onVisibilityChange(callback: VisibilityChangeCallback) {
    this.visibilityCallbacks.add(callback);
    return () => {
      this.visibilityCallbacks.delete(callback);
    };
  }

  /**
   * 通知可见性变化
   */
  private notifyVisibilityChange(id: string, isVisible: boolean) {
    for (const callback of this.visibilityCallbacks) {
      callback(id, isVisible);
    }
  }

  /**
   * 启用虚拟滚动
   */
  enable() {
    if (this.enabled) return;

    this.enabled = true;
    if (!this.observer && typeof IntersectionObserver !== 'undefined') {
      this.initObserver();

      // 重新观察所有元素
      for (const item of this.items.values()) {
        if (item.domElement) {
          this.observer!.observe(item.domElement);
        }
      }
    }
  }

  /**
   * 禁用虚拟滚动
   */
  disable() {
    if (!this.enabled) return;

    this.enabled = false;
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    // 标记所有元素为可见
    for (const item of this.items.values()) {
      if (!item.isVisible) {
        item.isVisible = true;
        this.notifyVisibilityChange(item.id, true);
      }
    }
  }

  /**
   * 销毁管理器
   */
  destroy() {
    this.clear();
    this.visibilityCallbacks.clear();
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }

  /**
   * 获取统计信息
   */
  getStats() {
    const visible = this.getVisibleItems().length;
    const total = this.items.size;
    const hidden = total - visible;
    const cullingRate = total > 0 ? (hidden / total) * 100 : 0;

    return {
      total,
      visible,
      hidden,
      cullingRate: Math.round(cullingRate * 100) / 100,
      enabled: this.enabled
    };
  }
}

// ==================== React Hook ====================

/**
 * React Hook for virtual scrolling
 */
export function useVirtualScroll(options: VirtualScrollOptions = {}) {
  const managerRef = { current: null as VirtualScrollManager | null };

  if (!managerRef.current) {
    managerRef.current = new VirtualScrollManager(options);
  }

  const manager = managerRef.current;

  // Cleanup on unmount
  const cleanup = () => {
    if (managerRef.current) {
      managerRef.current.destroy();
      managerRef.current = null;
    }
  };

  return {
    manager,
    observe: manager.observe.bind(manager),
    unobserve: manager.unobserve.bind(manager),
    observeAll: manager.observeAll.bind(manager),
    unobserveAll: manager.unobserveAll.bind(manager),
    clear: manager.clear.bind(manager),
    getVisibleItems: manager.getVisibleItems.bind(manager),
    getHiddenItems: manager.getHiddenItems.bind(manager),
    isVisible: manager.isVisible.bind(manager),
    onVisibilityChange: manager.onVisibilityChange.bind(manager),
    enable: manager.enable.bind(manager),
    disable: manager.disable.bind(manager),
    getStats: manager.getStats.bind(manager),
    cleanup
  };
}

// ==================== 辅助函数 ====================

/**
 * 创建虚拟滚动管理器
 */
export function createVirtualScrollManager(options?: VirtualScrollOptions): VirtualScrollManager {
  return new VirtualScrollManager(options);
}

/**
 * 检查浏览器是否支持IntersectionObserver
 */
export function isIntersectionObserverSupported(): boolean {
  return typeof IntersectionObserver !== 'undefined';
}

