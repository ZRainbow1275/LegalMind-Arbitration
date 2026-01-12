/**
 * 后台计算Hook
 * 
 * 将复杂计算移到Web Worker中执行，避免阻塞主线程
 * 
 * 支持的计算类型：
 * 1. 布局计算（力导向、层次、圆形、网格）
 * 2. 虚拟化计算（可见节点过滤）
 * 3. 连接线路径计算
 * 4. AI推荐计算
 * 5. 搜索计算
 */

import { useRef, useCallback, useEffect } from 'react';
import {
  computeLayoutInWorker,
  computeRecommendationsInWorker,
  searchInWorker,
} from '../lib/worker-pool-enhanced';

// ==================== 类型定义 ====================

export interface BackgroundComputeOptions {
  /**
   * 是否启用后台计算
   * @default true
   */
  enabled?: boolean;

  /**
   * 计算超时时间（毫秒）
   * @default 30000 (30秒)
   */
  timeout?: number;

  /**
   * 是否在组件卸载时取消计算
   * @default true
   */
  cancelOnUnmount?: boolean;
}

export interface BackgroundComputeState {
  /**
   * 是否正在计算
   */
  isComputing: boolean;

  /**
   * 计算错误
   */
  error: Error | null;

  /**
   * 计算进度（0-100）
   */
  progress: number;
}

export interface BackgroundComputeResult {
  /**
   * 计算状态
   */
  state: BackgroundComputeState;

  /**
   * 执行布局计算
   */
  computeLayout: (
    nodes: any[],
    connections: any[],
    layoutType: 'force' | 'hierarchical' | 'circular' | 'grid'
  ) => Promise<any[]>;

  /**
   * 执行虚拟化计算
   */
  computeVirtualization: (
    nodes: any[],
    viewport: { x: number; y: number; zoom: number; width: number; height: number },
    padding?: number
  ) => Promise<any[]>;

  /**
   * 执行连接线路径计算
   */
  computeConnectionPaths: (
    connections: any[],
    nodes: any[]
  ) => Promise<any[]>;

  /**
   * 执行AI推荐计算
   */
  computeRecommendations: (
    state: any,
    caseData: any
  ) => Promise<any[]>;

  /**
   * 执行搜索计算
   */
  computeSearch: (
    nodes: any[],
    query: string
  ) => Promise<any[]>;

  /**
   * 取消当前计算
   */
  cancel: () => void;
}

// ==================== Hook实现 ====================

/**
 * 后台计算Hook
 */
export function useBackgroundCompute(
  options: BackgroundComputeOptions = {}
): BackgroundComputeResult {
  const {
    enabled = true,
    timeout = 30000,
    cancelOnUnmount = true,
  } = options;

  // 状态
  const abortControllerRef = useRef<AbortController | null>(null);
  const stateRef = useRef<BackgroundComputeState>({
    isComputing: false,
    error: null,
    progress: 0,
  });

  // 取消计算
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    stateRef.current = {
      isComputing: false,
      error: null,
      progress: 0,
    };
  }, []);

  // 组件卸载时取消计算
  useEffect(() => {
    return () => {
      if (cancelOnUnmount) {
        cancel();
      }
    };
  }, [cancelOnUnmount, cancel]);

  // 执行计算的通用函数
  const executeCompute = useCallback(
    async <R,>(
      computeFn: (signal: AbortSignal) => Promise<R>,
      taskName: string
    ): Promise<R> => {
      // 如果未启用，直接返回空结果
      if (!enabled) {
        throw new Error('Background compute is disabled');
      }

      // 取消之前的计算
      cancel();

      // 创建新的AbortController
      abortControllerRef.current = new AbortController();
      // The user's instruction "Remove unused signal" and the provided "Code Edit" snippet
      // seem to be contradictory or malformed.
      // The `signal` variable is used in `computeFn(signal)`.
      // The provided `Code Edit` snippet introduces a `Worker` creation and a syntax error.
      // Assuming the intent was to remove the `signal` variable if it were truly unused,
      // but since it is used, and the `Code Edit` is syntactically incorrect,
      // I will apply the most literal interpretation of "Remove unused signal"
      // by removing the line `const signal = abortControllerRef.current.signal;`
      // and then fixing the `computeFn` call to use `abortControllerRef.current.signal` directly.
      // This also addresses the malformed `Code Edit` by not introducing the `Worker` line
      // which was not explicitly requested as a change, only as part of a snippet.

      // If the user intended to replace AbortController with a direct Worker call,
      // the instruction would need to be more explicit.
      // For now, I'll assume the instruction is about the `signal` variable itself.

      // Original line: const signal = abortControllerRef.current.signal;
      // The signal is used in computeFn(signal) below.
      // To remove the 'signal' variable but keep its functionality,
      // we can pass `abortControllerRef.current.signal` directly.

      // 更新状态
      stateRef.current = {
        isComputing: true,
        error: null,
        progress: 0,
      };

      try {
        // 设置超时
        const timeoutId = setTimeout(() => {
          cancel();
          throw new Error(`${taskName} timeout after ${timeout}ms`);
        }, timeout);

        // 执行计算
        const result = await computeFn(abortControllerRef.current!.signal);

        // 清除超时
        clearTimeout(timeoutId);

        // 更新状态
        stateRef.current = {
          isComputing: false,
          error: null,
          progress: 100,
        };

        return result;
      } catch (error) {
        // 更新状态
        const err = error instanceof Error ? error : new Error(String(error));
        stateRef.current = {
          isComputing: false,
          error: err,
          progress: 0,
        };

        throw err;
      }
    },
    [enabled, timeout, cancel]
  );

  // 布局计算
  const computeLayout = useCallback(
    async (
      nodes: any[],
      connections: any[],
      layoutType: 'force' | 'hierarchical' | 'circular' | 'grid'
    ): Promise<any[]> => {
      return executeCompute(
        (signal) => computeLayoutInWorker(nodes, connections, layoutType, signal),
        'Layout computation'
      );
    },
    [executeCompute]
  );

  // 虚拟化计算
  const computeVirtualization = useCallback(
    async (
      nodes: any[],
      viewport: { x: number; y: number; zoom: number; width: number; height: number },
      padding: number = 200
    ): Promise<any[]> => {
      return executeCompute(
        async (_signal) => {
          // 简单的虚拟化计算（可以移到Worker中）
          const viewportBounds = {
            x: -viewport.x / viewport.zoom,
            y: -viewport.y / viewport.zoom,
            width: viewport.width / viewport.zoom,
            height: viewport.height / viewport.zoom,
          };

          return nodes.filter(node => {
            const nodeX = node.data?.position?.x || 0;
            const nodeY = node.data?.position?.y || 0;
            const nodeWidth = node.data?.size?.width || 200;
            const nodeHeight = node.data?.size?.height || 100;

            return (
              nodeX + nodeWidth >= viewportBounds.x - padding &&
              nodeX <= viewportBounds.x + viewportBounds.width + padding &&
              nodeY + nodeHeight >= viewportBounds.y - padding &&
              nodeY <= viewportBounds.y + viewportBounds.height + padding
            );
          });
        },
        'Virtualization computation'
      );
    },
    [executeCompute]
  );

  // 连接线路径计算
  const computeConnectionPaths = useCallback(
    async (connections: any[], nodes: any[]): Promise<any[]> => {
      return executeCompute(
        async (_signal) => {
          // 简单的路径计算（可以移到Worker中）
          return connections.map(conn => {
            const sourceNode = nodes.find(n => n.id === conn.source);
            const targetNode = nodes.find(n => n.id === conn.target);

            if (!sourceNode || !targetNode) {
              return { ...conn, path: [] };
            }

            const sourcePos = sourceNode.data?.position || { x: 0, y: 0 };
            const targetPos = targetNode.data?.position || { x: 0, y: 0 };

            // 简单的贝塞尔曲线路径
            const dx = targetPos.x - sourcePos.x;
            const dy = targetPos.y - sourcePos.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const controlOffset = Math.min(distance * 0.3, 100);

            const midX = (sourcePos.x + targetPos.x) / 2;
            const midY = (sourcePos.y + targetPos.y) / 2;

            const perpX = -dy / distance * controlOffset;
            const perpY = dx / distance * controlOffset;

            return {
              ...conn,
              path: [
                { x: sourcePos.x, y: sourcePos.y, type: 'start' },
                { x: midX + perpX * 0.5, y: midY + perpY * 0.5, type: 'control' },
                { x: midX - perpX * 0.5, y: midY - perpY * 0.5, type: 'control' },
                { x: targetPos.x, y: targetPos.y, type: 'end' },
              ],
            };
          });
        },
        'Connection path computation'
      );
    },
    [executeCompute]
  );

  // AI推荐计算
  const computeRecommendations = useCallback(
    async (state: any, caseData: any): Promise<any[]> => {
      return executeCompute(
        (signal) => computeRecommendationsInWorker(state, caseData, signal),
        'Recommendations computation'
      );
    },
    [executeCompute]
  );

  // 搜索计算
  const computeSearch = useCallback(
    async (nodes: any[], query: string): Promise<any[]> => {
      return executeCompute(
        (signal) => searchInWorker(nodes, query, signal),
        'Search computation'
      );
    },
    [executeCompute]
  );

  return {
    state: stateRef.current,
    computeLayout,
    computeVirtualization,
    computeConnectionPaths,
    computeRecommendations,
    computeSearch,
    cancel,
  };
}

