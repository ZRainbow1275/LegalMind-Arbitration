/**
 * 优化的连接线渲染Hook
 * 
 * 提供高性能的连接线渲染功能，完全兼容现有的connection-system
 */

import { useRef, useEffect, useCallback } from 'react';
import { ConnectionRendererOptimized } from '@/lib/connection-renderer-optimized';
import { PathPoint } from '@/lib/connection-system';

interface Connection {
  id: string;
  points: PathPoint[];
  style: {
    strokeColor: string;
    strokeWidth: number;
    strokeDashArray?: number[];
    opacity: number;
    showArrow: boolean;
    arrowSize: number;
    shadowEnabled?: boolean;
    shadowColor?: string;
    shadowBlur?: number;
  };
  label?: string;
}

interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

interface CanvasSize {
  width: number;
  height: number;
}

interface UseOptimizedConnectionRendererOptions {
  enableVirtualization?: boolean;
  enablePathCache?: boolean;
  padding?: number;
}

interface RenderStats {
  totalConnections: number;
  visibleConnections: number;
  culledConnections: number;
  renderTime: number;
  fps: number;
}

/**
 * 优化的连接线渲染Hook
 */
export function useOptimizedConnectionRenderer(
  canvasRef: React.RefObject<HTMLCanvasElement>,
  connections: Connection[],
  viewport: Viewport,
  canvasSize: CanvasSize,
  options: UseOptimizedConnectionRendererOptions = {}
) {
  const rendererRef = useRef<ConnectionRendererOptimized | null>(null);
  const statsRef = useRef<RenderStats>({
    totalConnections: 0,
    visibleConnections: 0,
    culledConnections: 0,
    renderTime: 0,
    fps: 0,
  });
  const frameCountRef = useRef(0);
  const lastFpsUpdateRef = useRef(Date.now());

  // 创建渲染器实例
  useEffect(() => {
    rendererRef.current = new ConnectionRendererOptimized({
      enableVirtualization: options.enableVirtualization ?? true,
      enablePathCache: options.enablePathCache ?? true,
      padding: options.padding ?? 200,
    });

    return () => {
      rendererRef.current?.clearCache();
    };
  }, [options.enableVirtualization, options.enablePathCache, options.padding]);

  // 渲染函数
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const renderer = rendererRef.current;

    if (!canvas || !renderer) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 渲染连接线
    const stats = renderer.renderConnections(ctx, connections, {
      ...viewport,
      width: canvasSize.width,
      height: canvasSize.height,
    });

    // 更新统计信息
    statsRef.current = {
      ...stats,
      fps: statsRef.current.fps,
    };

    // 更新FPS
    frameCountRef.current++;
    const now = Date.now();
    if (now - lastFpsUpdateRef.current >= 1000) {
      statsRef.current.fps = frameCountRef.current;
      frameCountRef.current = 0;
      lastFpsUpdateRef.current = now;
    }
  }, [canvasRef, connections, viewport, canvasSize]);

  // 自动渲染
  useEffect(() => {
    render();
  }, [render]);

  // 清除缓存
  const clearCache = useCallback(() => {
    rendererRef.current?.clearCache();
  }, []);

  // 获取统计信息
  const getStats = useCallback((): RenderStats => {
    return { ...statsRef.current };
  }, []);

  // 获取缓存统计
  const getCacheStats = useCallback(() => {
    return rendererRef.current?.getCacheStats() || { cacheSize: 0, cacheLimit: 0 };
  }, []);

  return {
    render,
    clearCache,
    getStats,
    getCacheStats,
  };
}

/**
 * 将现有的Connection对象转换为渲染器需要的格式
 */
export function convertConnectionForRenderer(connection: {
  id: string;
  getData: () => {
    type: string;
    label?: string;
  };
  getPath: () => PathPoint[];
  getStyle: () => {
    strokeColor: string;
    strokeWidth: number;
    strokeDashArray?: number[];
    opacity: number;
    showArrow: boolean;
    arrowSize: number;
    shadowEnabled?: boolean;
    shadowColor?: string;
    shadowBlur?: number;
  };
}): Connection {
  return {
    id: connection.id,
    points: connection.getPath(),
    style: connection.getStyle(),
    label: connection.getData().label,
  };
}

/**
 * 批量转换连接线
 */
export function convertConnectionsForRenderer(
  connections: Array<{
    id: string;
    getData: () => {
      type: string;
      label?: string;
    };
    getPath: () => PathPoint[];
    getStyle: () => {
      strokeColor: string;
      strokeWidth: number;
      strokeDashArray?: number[];
      opacity: number;
      showArrow: boolean;
      arrowSize: number;
      shadowEnabled?: boolean;
      shadowColor?: string;
      shadowBlur?: number;
    };
  }>
): Connection[] {
  return connections.map(convertConnectionForRenderer);
}

/**
 * 性能监控Hook
 */
export function useConnectionRenderPerformance(
  getStats: () => RenderStats,
  interval: number = 1000
) {
  const performanceDataRef = useRef<Array<{
    timestamp: number;
    stats: RenderStats;
  }>>([]);

  useEffect(() => {
    const timer = setInterval(() => {
      const stats = getStats();
      performanceDataRef.current.push({
        timestamp: Date.now(),
        stats,
      });

      // 只保留最近100个数据点
      if (performanceDataRef.current.length > 100) {
        performanceDataRef.current.shift();
      }
    }, interval);

    return () => clearInterval(timer);
  }, [getStats, interval]);

  const getPerformanceData = useCallback(() => {
    return [...performanceDataRef.current];
  }, []);

  const getAverageRenderTime = useCallback(() => {
    if (performanceDataRef.current.length === 0) return 0;

    const sum = performanceDataRef.current.reduce(
      (acc, data) => acc + data.stats.renderTime,
      0
    );
    return sum / performanceDataRef.current.length;
  }, []);

  const getAverageFps = useCallback(() => {
    if (performanceDataRef.current.length === 0) return 0;

    const sum = performanceDataRef.current.reduce(
      (acc, data) => acc + data.stats.fps,
      0
    );
    return sum / performanceDataRef.current.length;
  }, []);

  return {
    getPerformanceData,
    getAverageRenderTime,
    getAverageFps,
  };
}

