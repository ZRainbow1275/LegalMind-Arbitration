/**
 * React渲染优化工具
 * 
 * 提供React组件渲染优化的工具函数
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/**
 * 防抖Hook
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * 节流Hook
 */
export function useThrottle<T>(value: T, limit: number = 300): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastRan = useRef(Date.now());

  useEffect(() => {
    const handler = setTimeout(() => {
      if (Date.now() - lastRan.current >= limit) {
        setThrottledValue(value);
        lastRan.current = Date.now();
      }
    }, limit - (Date.now() - lastRan.current));

    return () => {
      clearTimeout(handler);
    };
  }, [value, limit]);

  return throttledValue;
}

/**
 * 防抖回调Hook
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 300
): T {
  const timeoutRef = useRef<NodeJS.Timeout>();

  return useCallback(
    (...args: any[]) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  ) as T;
}

/**
 * 节流回调Hook
 */
export function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  limit: number = 300
): T {
  const lastRan = useRef(Date.now());

  return useCallback(
    (...args: any[]) => {
      if (Date.now() - lastRan.current >= limit) {
        callback(...args);
        lastRan.current = Date.now();
      }
    },
    [callback, limit]
  ) as T;
}

/**
 * 懒加载Hook
 */
export function useLazyLoad<T>(
  loader: () => Promise<T>,
  deps: any[] = []
): { data: T | null; loading: boolean; error: Error | null } {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const result = await loader();
        if (!cancelled) {
          setData(result);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err as Error);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loader, ...deps]);

  return { data, loading, error };
}

/**
 * 虚拟化Hook
 */
export function useVirtualization(
  itemCount: number,
  itemHeight: number,
  containerHeight: number,
  scrollTop: number
): { startIndex: number; endIndex: number; offsetY: number } {
  return useMemo(() => {
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(
      itemCount - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight)
    );
    const offsetY = startIndex * itemHeight;

    return { startIndex, endIndex, offsetY };
  }, [itemCount, itemHeight, containerHeight, scrollTop]);
}

/**
 * 批量更新Hook
 */
export function useBatchUpdate<T>(
  initialValue: T[],
  batchSize: number = 10,
  delay: number = 100
): {
  items: T[];
  addItems: (newItems: T[]) => void;
  clear: () => void;
} {
  const [items, setItems] = useState<T[]>(initialValue);
  const queueRef = useRef<T[]>([]);
  const timerRef = useRef<NodeJS.Timeout>();

  const processBatch = useCallback(() => {
    if (queueRef.current.length === 0) return;

    const batch = queueRef.current.splice(0, batchSize);
    setItems(prev => [...prev, ...batch]);

    if (queueRef.current.length > 0) {
      timerRef.current = setTimeout(processBatch, delay);
    }
  }, [batchSize, delay]);

  const addItems = useCallback(
    (newItems: T[]) => {
      queueRef.current.push(...newItems);

      if (!timerRef.current) {
        processBatch();
      }
    },
    [processBatch]
  );

  const clear = useCallback(() => {
    queueRef.current = [];
    setItems([]);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = undefined;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return { items, addItems, clear };
}

/**
 * 渲染计数Hook（用于调试）
 */
export function useRenderCount(componentName: string): number {
  const renderCount = useRef(0);

  useEffect(() => {
    renderCount.current++;
    console.log(`[RenderCount] ${componentName} rendered ${renderCount.current} times`);
  });

  return renderCount.current;
}

/**
 * 性能监控Hook
 */
export function usePerformanceMonitor(
  componentName: string,
  enabled: boolean = true
): void {
  const startTime = useRef(Date.now());

  useEffect(() => {
    if (!enabled) return;

    const renderTime = Date.now() - startTime.current;

    if (renderTime > 16) { // 超过一帧（16ms）
      console.warn(
        `[Performance] ${componentName} render took ${renderTime}ms (> 16ms)`
      );
    }

    startTime.current = Date.now();
  });
}

/**
 * 深度比较Hook
 */
export function useDeepMemo<T>(factory: () => T, deps: any[]): T {
  const ref = useRef<{ deps: any[]; value: T }>();

  if (
    !ref.current ||
    !deepEqual(ref.current.deps, deps)
  ) {
    ref.current = {
      deps,
      value: factory(),
    };
  }

  return ref.current.value;
}

/**
 * 深度比较函数
 */
function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;

  if (
    typeof a !== 'object' ||
    typeof b !== 'object' ||
    a === null ||
    b === null
  ) {
    return false;
  }

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);

  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!keysB.includes(key) || !deepEqual(a[key], b[key])) {
      return false;
    }
  }

  return true;
}

/**
 * 窗口大小Hook
 */
export function useWindowSize(): { width: number; height: number } {
  const [size, setSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  });

  useEffect(() => {
    const handleResize = () => {
      setSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return size;
}

/**
 * 交叉观察Hook（用于懒加载）
 */
export function useIntersectionObserver(
  ref: React.RefObject<Element>,
  options?: IntersectionObserverInit
): boolean {
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    if (!ref.current) return;

    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting);
    }, options);

    observer.observe(ref.current);

    return () => {
      observer.disconnect();
    };
  }, [ref, options]);

  return isIntersecting;
}

