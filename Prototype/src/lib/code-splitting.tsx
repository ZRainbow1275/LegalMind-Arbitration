/**
 * 代码分割和懒加载配置
 * 
 * 提供智能代码分割和懒加载功能
 */

import React, { ComponentType, lazy, Suspense } from 'react';

/**
 * 懒加载配置
 */
interface LazyLoadConfig {
  loader: () => Promise<{ default: ComponentType<any> }>;
  fallback?: React.ReactNode;
  preload?: boolean;
  retryCount?: number;
  retryDelay?: number;
}

/**
 * 智能懒加载
 */
export function smartLazy<P extends object>(
  config: LazyLoadConfig
): ComponentType<P> {
  const {
    loader,
    fallback = <div className="loading">Loading...</div>,
    preload = false,
    retryCount = 3,
    retryDelay = 1000,
  } = config;

  // 带重试的加载器
  const retryLoader = async () => {
    for (let i = 0; i < retryCount; i++) {
      try {
        return await loader();
      } catch (error) {
        if (i === retryCount - 1) {
          throw error;
        }

        console.warn(`[SmartLazy] Retry ${i + 1}/${retryCount} after ${retryDelay}ms`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }

    throw new Error('Failed to load component');
  };

  const LazyComponent = lazy(retryLoader);

  // 预加载
  if (preload) {
    retryLoader();
  }

  return (props: P) => (
    <Suspense fallback={fallback}>
      <LazyComponent {...props} />
    </Suspense>
  );
}

/**
 * 路由懒加载
 */
export const lazyRoutes = {
  // 案件工作台
  CaseWorkspace: smartLazy({
    loader: () => import('../components/DrawnixLegalWorkspace').then(module => ({ default: module.DrawnixLegalWorkspace })),
    fallback: <div className="loading-workspace">Loading workspace...</div>,
    preload: false,
  }),

  // 性能测试页面
  PerformanceTest: smartLazy({
    loader: () => import('../components/PerformanceTestPage').then(module => ({ default: module.PerformanceTestPage })),
    fallback: <div className="loading-test">Loading test page...</div>,
    preload: false,
  }),

  // AI助手面板
  AIAssistantPanel: smartLazy({
    loader: () => import('../components/AIAssistantPanel'), // Has default export
    fallback: <div className="loading-panel">Loading AI assistant...</div>,
    preload: true, // 预加载常用组件
  }),

  // 文档查看器
  DocumentViewer: smartLazy({
    loader: () => import('../components/common/DocumentPreview').then(module => ({ default: module.DocumentPreview })),
    fallback: <div className="loading-viewer">Loading document viewer...</div>,
    preload: false,
  }),

  // 仲裁面板
  ArbitrationPanel: smartLazy({
    loader: () => import('../components/arbitration/ArbitrationFunctionPanel').then(module => ({ default: module.ArbitrationFunctionPanel })),
    fallback: <div className="loading-panel">Loading arbitration panel...</div>,
    preload: false,
  }),
};

/**
 * 组件懒加载
 */
export const lazyComponents = {
  // 小地图
  Minimap: smartLazy({
    loader: () => import('../components/Minimap').then(m => ({ default: m.Minimap })),
    fallback: <div className="loading-minimap">Loading minimap...</div>,
    preload: false,
  }),

  // 对齐辅助线
  AlignmentGuides: smartLazy({
    loader: () => import('../components/AlignmentGuides').then(m => ({ default: m.AlignmentGuides })),
    fallback: null,
    preload: false,
  }),

  // 连接线
  ConnectionLines: smartLazy({
    loader: () => import('../components/ConnectionLines').then(m => ({ default: m.ConnectionLines })),
    fallback: null,
    preload: true,
  }),

  // 浮动工具栏
  FloatingToolbar: smartLazy({
    loader: () => import('../components/FloatingToolbar').then(m => ({ default: m.FloatingToolbar })),
    fallback: null,
    preload: true,
  }),
};

/**
 * 预加载管理器
 */
class PreloadManager {
  private preloaded = new Set<string>();
  private loading = new Set<string>();

  /**
   * 预加载路由
   */
  public async preloadRoute(routeName: keyof typeof lazyRoutes): Promise<void> {
    if (this.preloaded.has(routeName) || this.loading.has(routeName)) {
      return;
    }

    this.loading.add(routeName);

    try {
      // 触发懒加载
      const Component = lazyRoutes[routeName];
      // 预渲染以触发加载
      React.createElement(Component, {});

      this.preloaded.add(routeName);
      console.log(`[PreloadManager] Preloaded route: ${routeName}`);
    } catch (error) {
      console.error(`[PreloadManager] Failed to preload route ${routeName}:`, error);
    } finally {
      this.loading.delete(routeName);
    }
  }

  /**
   * 预加载组件
   */
  public async preloadComponent(componentName: keyof typeof lazyComponents): Promise<void> {
    if (this.preloaded.has(componentName) || this.loading.has(componentName)) {
      return;
    }

    this.loading.add(componentName);

    try {
      const Component = lazyComponents[componentName];
      React.createElement(Component, {});

      this.preloaded.add(componentName);
      console.log(`[PreloadManager] Preloaded component: ${componentName}`);
    } catch (error) {
      console.error(`[PreloadManager] Failed to preload component ${componentName}:`, error);
    } finally {
      this.loading.delete(componentName);
    }
  }

  /**
   * 批量预加载
   */
  public async preloadBatch(
    items: Array<keyof typeof lazyRoutes | keyof typeof lazyComponents>
  ): Promise<void> {
    await Promise.all(
      items.map(item => {
        if (item in lazyRoutes) {
          return this.preloadRoute(item as keyof typeof lazyRoutes);
        } else {
          return this.preloadComponent(item as keyof typeof lazyComponents);
        }
      })
    );
  }

  /**
   * 智能预加载（基于用户行为）
   */
  public async smartPreload(): Promise<void> {
    // 预加载常用组件
    await this.preloadBatch([
      'ConnectionLines',
      'FloatingToolbar',
      'AIAssistantPanel',
    ]);

    // 延迟预加载其他组件
    setTimeout(() => {
      this.preloadBatch([
        'Minimap',
        'AlignmentGuides',
        'DocumentViewer',
      ]);
    }, 2000);
  }

  /**
   * 获取预加载状态
   */
  public getStatus(): {
    preloaded: string[];
    loading: string[];
  } {
    return {
      preloaded: Array.from(this.preloaded),
      loading: Array.from(this.loading),
    };
  }
}

/**
 * 全局预加载管理器实例
 */
export const preloadManager = new PreloadManager();

/**
 * 代码分割策略
 */
export const codeSplittingStrategy = {
  /**
   * 按路由分割
   */
  byRoute: {
    enabled: true,
    routes: [
      '/cases/[id]/workspace',
      '/performance-test',
    ],
  },

  /**
   * 按功能分割
   */
  byFeature: {
    enabled: true,
    features: [
      'ai-assistant',
      'document-viewer',
      'arbitration-panel',
    ],
  },

  /**
   * 按组件分割
   */
  byComponent: {
    enabled: true,
    components: [
      'Minimap',
      'AlignmentGuides',
      'ConnectionLines',
      'FloatingToolbar',
    ],
  },

  /**
   * 按库分割
   */
  byLibrary: {
    enabled: true,
    libraries: [
      '@plait/core',
      '@plait/draw',
      'zustand',
    ],
  },
};

/**
 * 动态导入工具
 */
export async function dynamicImport<T = any>(
  modulePath: string,
  retryCount: number = 3,
  retryDelay: number = 1000
): Promise<T> {
  for (let i = 0; i < retryCount; i++) {
    try {
      return await import(/* @vite-ignore */ modulePath);
    } catch (error) {
      if (i === retryCount - 1) {
        throw error;
      }

      console.warn(`[DynamicImport] Retry ${i + 1}/${retryCount} after ${retryDelay}ms`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }

  throw new Error('Failed to import module');
}

/**
 * 条件导入
 */
export async function conditionalImport<T = any>(
  condition: boolean,
  modulePath: string
): Promise<T | null> {
  if (!condition) {
    return null;
  }

  return await dynamicImport<T>(modulePath);
}

/**
 * 懒加载图片
 */
export function lazyImage(src: string, placeholder?: string): {
  src: string;
  loading: 'lazy' | 'eager';
  onLoad?: () => void;
} {
  return {
    src: placeholder || src,
    loading: 'lazy',
    onLoad: () => {
      // 图片加载完成后的回调
      console.log(`[LazyImage] Loaded: ${src}`);
    },
  };
}

/**
 * 懒加载样式
 */
export async function lazyStyle(href: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.onload = () => resolve();
    link.onerror = () => reject(new Error(`Failed to load style: ${href}`));
    document.head.appendChild(link);
  });
}

/**
 * 懒加载脚本
 */
export async function lazyScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.body.appendChild(script);
  });
}

