/**
 * 批量更新Hook
 * 优化节点批量更新，减少重渲染次数
 */

import { useCallback, useRef, useEffect } from 'react';

interface BatchUpdateOptions {
  delay?: number; // 批量更新延迟（毫秒）
  maxBatchSize?: number; // 最大批量大小
}

/**
 * 批量更新Hook
 * 将多个更新操作合并为一次更新，减少重渲染次数
 */
export function useBatchUpdate<T>(
  updateFn: (updates: T[]) => void,
  options: BatchUpdateOptions = {}
): {
  addUpdate: (update: T) => void;
  flush: () => void;
  clear: () => void;
  pendingCount: number;
} {
  const { delay = 16, maxBatchSize = 100 } = options; // 默认16ms（约60fps）
  
  const pendingUpdates = useRef<T[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // 执行批量更新
  const flush = useCallback(() => {
    if (pendingUpdates.current.length === 0) return;
    
    const updates = [...pendingUpdates.current];
    pendingUpdates.current = [];
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    updateFn(updates);
  }, [updateFn]);
  
  // 添加更新
  const addUpdate = useCallback((update: T) => {
    pendingUpdates.current.push(update);
    
    // 如果达到最大批量大小，立即执行
    if (pendingUpdates.current.length >= maxBatchSize) {
      flush();
      return;
    }
    
    // 否则延迟执行
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(flush, delay);
  }, [flush, delay, maxBatchSize]);
  
  // 清空待处理更新
  const clear = useCallback(() => {
    pendingUpdates.current = [];
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);
  
  // 组件卸载时清理
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  
  return {
    addUpdate,
    flush,
    clear,
    pendingCount: pendingUpdates.current.length,
  };
}

/**
 * 节点批量更新Hook
 * 专门用于节点位置更新的批量优化
 */
export function useNodeBatchUpdate<T extends { id: string }>(
  updateFn: (updates: Map<string, Partial<T>>) => void,
  options: BatchUpdateOptions = {}
): {
  updateNode: (nodeId: string, updates: Partial<T>) => void;
  flush: () => void;
  clear: () => void;
  pendingCount: number;
} {
  const pendingUpdates = useRef<Map<string, Partial<T>>>(new Map());
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { delay = 16, maxBatchSize = 100 } = options;
  
  // 执行批量更新
  const flush = useCallback(() => {
    if (pendingUpdates.current.size === 0) return;
    
    const updates = new Map(pendingUpdates.current);
    pendingUpdates.current.clear();
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    updateFn(updates);
  }, [updateFn]);
  
  // 更新节点
  const updateNode = useCallback((nodeId: string, updates: Partial<T>) => {
    // 合并同一节点的多次更新
    const existing = pendingUpdates.current.get(nodeId) || {};
    pendingUpdates.current.set(nodeId, { ...existing, ...updates });
    
    // 如果达到最大批量大小，立即执行
    if (pendingUpdates.current.size >= maxBatchSize) {
      flush();
      return;
    }
    
    // 否则延迟执行
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(flush, delay);
  }, [flush, delay, maxBatchSize]);
  
  // 清空待处理更新
  const clear = useCallback(() => {
    pendingUpdates.current.clear();
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);
  
  // 组件卸载时清理
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  
  return {
    updateNode,
    flush,
    clear,
    pendingCount: pendingUpdates.current.size,
  };
}

/**
 * 防抖Hook
 * 用于防止频繁触发的操作
 */
export function useDebounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number = 300
): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const debouncedFn = useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      fn(...args);
    }, delay);
  }, [fn, delay]) as T;
  
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  
  return debouncedFn;
}

/**
 * 节流Hook
 * 用于限制操作的执行频率
 */
export function useThrottle<T extends (...args: any[]) => any>(
  fn: T,
  delay: number = 100
): T {
  const lastRunRef = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const throttledFn = useCallback((...args: Parameters<T>) => {
    const now = Date.now();
    const timeSinceLastRun = now - lastRunRef.current;
    
    if (timeSinceLastRun >= delay) {
      // 立即执行
      lastRunRef.current = now;
      fn(...args);
    } else {
      // 延迟执行
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        lastRunRef.current = Date.now();
        fn(...args);
      }, delay - timeSinceLastRun);
    }
  }, [fn, delay]) as T;
  
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  
  return throttledFn;
}

/**
 * 请求动画帧Hook
 * 用于在下一帧执行操作，确保流畅的动画
 */
export function useAnimationFrame<T extends (...args: any[]) => any>(
  fn: T
): T {
  const rafRef = useRef<number | null>(null);
  const pendingArgsRef = useRef<Parameters<T> | null>(null);
  
  const rafFn = useCallback((...args: Parameters<T>) => {
    pendingArgsRef.current = args;
    
    if (rafRef.current !== null) {
      return; // 已经有待处理的请求
    }
    
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      if (pendingArgsRef.current) {
        fn(...pendingArgsRef.current);
        pendingArgsRef.current = null;
      }
    });
  }, [fn]) as T;
  
  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);
  
  return rafFn;
}

/**
 * 批量更新统计Hook
 * 用于监控批量更新的性能提升
 */
export function useBatchUpdateStats() {
  const totalUpdatesRef = useRef(0);
  const batchedUpdatesRef = useRef(0);
  const savedUpdatesRef = useRef(0);
  
  const recordUpdate = useCallback((isBatched: boolean, batchSize: number = 1) => {
    totalUpdatesRef.current += batchSize;
    if (isBatched) {
      batchedUpdatesRef.current += 1;
      savedUpdatesRef.current += batchSize - 1;
    }
  }, []);
  
  const getStats = useCallback(() => {
    const totalUpdates = totalUpdatesRef.current;
    const batchedUpdates = batchedUpdatesRef.current;
    const savedUpdates = savedUpdatesRef.current;
    const savingsRate = totalUpdates > 0 ? (savedUpdates / totalUpdates) * 100 : 0;
    
    return {
      totalUpdates,
      batchedUpdates,
      savedUpdates,
      savingsRate: Math.round(savingsRate * 10) / 10,
    };
  }, []);
  
  const reset = useCallback(() => {
    totalUpdatesRef.current = 0;
    batchedUpdatesRef.current = 0;
    savedUpdatesRef.current = 0;
  }, []);
  
  return {
    recordUpdate,
    getStats,
    reset,
  };
}

