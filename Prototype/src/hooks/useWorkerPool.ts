/**
 * Worker池React Hook
 * 
 * 提供便捷的Worker池使用接口
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import {
  getWorkerPool,
  computeLayoutInWorker,
  computeRecommendationsInWorker,
  searchInWorker,
  type WorkerPoolStats,
} from '@/lib/worker-pool-enhanced';

/**
 * 使用Worker池
 */
export function useWorkerPool() {
  const poolRef = useRef(getWorkerPool());
  const [stats, setStats] = useState<WorkerPoolStats | null>(null);

  // 定期更新统计信息
  useEffect(() => {
    const timer = setInterval(() => {
      setStats(poolRef.current.getStats());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const execute = useCallback(
    <T = any, R = any>(type: string, data: T, priority: number = 0) => {
      return poolRef.current.execute<T, R>(type, data, priority);
    },
    []
  );

  const cancelTask = useCallback((taskId: string) => {
    return poolRef.current.cancelTask(taskId);
  }, []);

  const clearQueue = useCallback(() => {
    poolRef.current.clearQueue();
  }, []);

  return {
    execute,
    cancelTask,
    clearQueue,
    stats,
  };
}

/**
 * 使用布局计算Worker
 */
export function useLayoutWorker() {
  const abortControllerRef = useRef<AbortController | null>(null);
  const [isComputing, setIsComputing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const computeLayout = useCallback(
    async (
      nodes: any[],
      connections: any[],
      layoutType: 'force' | 'hierarchical' | 'circular' | 'grid'
    ) => {
      // 取消之前的计算
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();
      setIsComputing(true);
      setError(null);

      try {
        const result = await computeLayoutInWorker(
          nodes,
          connections,
          layoutType,
          abortControllerRef.current.signal
        );
        setIsComputing(false);
        return result;
      } catch (err) {
        setIsComputing(false);
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        throw error;
      }
    },
    []
  );

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsComputing(false);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    computeLayout,
    cancel,
    isComputing,
    error,
  };
}

/**
 * 使用AI推荐Worker
 */
export function useRecommendationsWorker() {
  const abortControllerRef = useRef<AbortController | null>(null);
  const [isComputing, setIsComputing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const computeRecommendations = useCallback(async (state: any, caseData: any) => {
    // 取消之前的计算
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setIsComputing(true);
    setError(null);

    try {
      const result = await computeRecommendationsInWorker(
        state,
        caseData,
        abortControllerRef.current.signal
      );
      setIsComputing(false);
      return result;
    } catch (err) {
      setIsComputing(false);
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    }
  }, []);

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsComputing(false);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    computeRecommendations,
    cancel,
    isComputing,
    error,
  };
}

/**
 * 使用搜索Worker
 */
export function useSearchWorker() {
  const abortControllerRef = useRef<AbortController | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const search = useCallback(async (nodes: any[], query: string) => {
    // 取消之前的搜索
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setIsSearching(true);
    setError(null);

    try {
      const result = await searchInWorker(
        nodes,
        query,
        abortControllerRef.current.signal
      );
      setIsSearching(false);
      return result;
    } catch (err) {
      setIsSearching(false);
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    }
  }, []);

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    search,
    cancel,
    isSearching,
    error,
  };
}

/**
 * 使用防抖搜索Worker
 */
export function useDebouncedSearchWorker(delay: number = 300) {
  const { search, cancel, isSearching, error } = useSearchWorker();
  const timeoutRef = useRef<number | null>(null);

  const debouncedSearch = useCallback(
    async (nodes: any[], query: string) => {
      // 清除之前的定时器
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
      }

      // 如果查询为空，立即返回
      if (!query.trim()) {
        cancel();
        return [];
      }

      // 设置新的定时器
      return new Promise<any[]>((resolve, reject) => {
        timeoutRef.current = window.setTimeout(async () => {
          try {
            const result = await search(nodes, query);
            resolve(result);
          } catch (err) {
            reject(err);
          }
        }, delay);
      });
    },
    [search, cancel, delay]
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    search: debouncedSearch,
    cancel,
    isSearching,
    error,
  };
}

/**
 * 使用Worker池性能监控
 */
export function useWorkerPoolMonitor(interval: number = 1000) {
  const [stats, setStats] = useState<WorkerPoolStats | null>(null);
  const [history, setHistory] = useState<Array<{ timestamp: number; stats: WorkerPoolStats }>>([]);

  useEffect(() => {
    const pool = getWorkerPool();
    const timer = setInterval(() => {
      const currentStats = pool.getStats();
      setStats(currentStats);
      setHistory(prev => {
        const newHistory = [
          ...prev,
          { timestamp: Date.now(), stats: currentStats },
        ];
        // 只保留最近100个数据点
        return newHistory.slice(-100);
      });
    }, interval);

    return () => clearInterval(timer);
  }, [interval]);

  return {
    stats,
    history,
  };
}

