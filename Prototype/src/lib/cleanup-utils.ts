/**
 * 清理工具
 * 
 * 提供自动清理功能，防止内存泄漏
 * 基于2025年React最佳实践
 */

import * as React from 'react';
import { useEffect, useRef, useCallback } from 'react';

// ==================== 清理管理器 ====================

/**
 * 清理函数类型
 */
export type CleanupFunction = () => void;

/**
 * 清理管理器类
 * 集中管理所有需要清理的资源
 */
export class CleanupManager {
  private cleanups: Set<CleanupFunction> = new Set();
  private name: string;

  constructor(name: string = 'CleanupManager') {
    this.name = name;
  }

  /**
   * 添加清理函数
   */
  add(cleanup: CleanupFunction): void {
    this.cleanups.add(cleanup);
  }

  /**
   * 移除清理函数
   */
  remove(cleanup: CleanupFunction): void {
    this.cleanups.delete(cleanup);
  }

  /**
   * 执行所有清理函数
   */
  cleanup(): void {
    console.log(`[${this.name}] Cleaning up ${this.cleanups.size} resources`);

    this.cleanups.forEach(cleanup => {
      try {
        cleanup();
      } catch (error) {
        console.error(`[${this.name}] Cleanup error:`, error);
      }
    });

    this.cleanups.clear();
  }

  /**
   * 获取清理函数数量
   */
  get size(): number {
    return this.cleanups.size;
  }
}

// ==================== React Hooks ====================

/**
 * 使用清理管理器Hook
 * 自动在组件卸载时清理所有资源
 */
export function useCleanupManager(name?: string): CleanupManager {
  const managerRef = useRef<CleanupManager>();

  if (!managerRef.current) {
    managerRef.current = new CleanupManager(name || 'Component');
  }

  useEffect(() => {
    return () => {
      managerRef.current?.cleanup();
    };
  }, []);

  return managerRef.current;
}

/**
 * 使用安全的事件监听器Hook
 * 自动在组件卸载时移除监听器
 */
export function useSafeEventListener<K extends keyof WindowEventMap>(
  target: EventTarget | null | undefined,
  eventType: K,
  handler: (event: WindowEventMap[K]) => void,
  options?: AddEventListenerOptions
): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!target) return;

    const eventListener = (event: Event) => {
      handlerRef.current(event as WindowEventMap[K]);
    };

    target.addEventListener(eventType, eventListener, options);

    return () => {
      target.removeEventListener(eventType, eventListener, options);
    };

  }, [target, eventType, options?.capture, options?.passive, options?.once, options]);
}

/**
 * 使用安全的定时器Hook
 * 自动在组件卸载时清除定时器
 */
export function useSafeTimeout(
  callback: () => void,
  delay: number | null
): void {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (delay === null) return;

    const timeout = setTimeout(() => {
      callbackRef.current();
    }, delay);

    return () => {
      clearTimeout(timeout);
    };
  }, [delay]);
}

/**
 * 使用安全的间隔定时器Hook
 * 自动在组件卸载时清除定时器
 */
export function useSafeInterval(
  callback: () => void,
  delay: number | null
): void {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (delay === null) return;

    const interval = setInterval(() => {
      callbackRef.current();
    }, delay);

    return () => {
      clearInterval(interval);
    };
  }, [delay]);
}

/**
 * 使用安全的异步操作Hook
 * 防止在组件卸载后更新状态
 */
export function useSafeAsync<T>(
  asyncFn: () => Promise<T>,
  deps: React.DependencyList = []
): {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const [data, setData] = React.useState<T | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);
  const isMountedRef = useRef(true);

  const execute = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await asyncFn();
      if (isMountedRef.current) {
        setData(result);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err as Error);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asyncFn, ...deps]);

  useEffect(() => {
    execute();
  }, [execute]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return { data, loading, error, refetch: execute };
}

/**
 * 使用安全的Blob URL Hook
 * 自动在组件卸载时释放Blob URL
 */
export function useSafeBlobUrl(blob: Blob | null): string | null {
  const [url, setUrl] = React.useState<string | null>(null);

  useEffect(() => {
    if (!blob) {
      setUrl(null);
      return;
    }

    const blobUrl = URL.createObjectURL(blob);
    setUrl(blobUrl);

    return () => {
      URL.revokeObjectURL(blobUrl);
    };
  }, [blob]);

  return url;
}

/**
 * 使用安全的订阅Hook
 * 自动在组件卸载时取消订阅
 */
export function useSafeSubscription<T>(
  subscribe: (callback: (value: T) => void) => () => void,
  deps: React.DependencyList = []
): T | null {
  const [value, setValue] = React.useState<T | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    const unsubscribe = subscribe((newValue) => {
      if (isMountedRef.current) {
        setValue(newValue);
      }
    });

    return () => {
      unsubscribe();
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subscribe, ...deps]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return value;
}

// ==================== 资源清理工具 ====================

/**
 * 清理DOM引用
 */
export function cleanupDOMRefs(refs: React.MutableRefObject<any>[]): void {
  refs.forEach(ref => {
    if (ref.current) {
      ref.current = null;
    }
  });
}

/**
 * 清理所有定时器
 */
export function cleanupTimers(timers: (NodeJS.Timeout | number)[]): void {
  timers.forEach(timer => {
    if (typeof timer === 'number') {
      clearTimeout(timer);
      clearInterval(timer);
    } else {
      clearTimeout(timer);
      clearInterval(timer);
    }
  });
}

/**
 * 清理所有事件监听器
 */
export function cleanupEventListeners(
  listeners: Array<{
    target: EventTarget;
    type: string;
    listener: EventListener;
    options?: AddEventListenerOptions;
  }>
): void {
  listeners.forEach(({ target, type, listener, options }) => {
    target.removeEventListener(type, listener, options);
  });
}

/**
 * 清理所有Blob URL
 */
export function cleanupBlobUrls(urls: string[]): void {
  urls.forEach(url => {
    try {
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('[CleanupUtils] Failed to revoke blob URL:', error);
    }
  });
}

/**
 * 清理所有订阅
 */
export function cleanupSubscriptions(unsubscribes: (() => void)[]): void {
  unsubscribes.forEach(unsubscribe => {
    try {
      unsubscribe();
    } catch (error) {
      console.error('[CleanupUtils] Failed to unsubscribe:', error);
    }
  });
}

// ==================== 导入React ====================


