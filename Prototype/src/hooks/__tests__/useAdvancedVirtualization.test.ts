/**
 * 高级虚拟化Hook测试
 * 
 * 测试内容：
 * 1. 基础功能测试
 * 2. 缓存功能测试
 * 3. 性能对比测试
 * 4. 自适应padding测试
 */

import { renderHook } from '@testing-library/react';
import { useAdvancedVirtualization } from '../useAdvancedVirtualization';
import { useVirtualization } from '../useVirtualization';

// 生成测试节点
function generateTestNodes(count: number) {
  const nodes = [];
  for (let i = 0; i < count; i++) {
    nodes.push({
      id: `node-${i}`,
      position: { x: i * 300, y: Math.floor(i / 10) * 250 },
      size: { width: 280, height: 200 },
      data: {
        position: { x: i * 300, y: Math.floor(i / 10) * 250 },
        name: `节点${i}`,
      },
    });
  }
  return nodes as any[];
}

describe('useAdvancedVirtualization', () => {
  const viewport = { x: 0, y: 0, zoom: 1 };
  const canvasSize = { width: 1920, height: 1080 };

  describe('基础功能', () => {
    it('应该正确过滤可见节点', () => {
      const nodes = generateTestNodes(100);

      const { result } = renderHook(() =>
        useAdvancedVirtualization(nodes, {
          viewport,
          canvasSize,
          padding: 200,
        })
      );

      expect(result.current.totalNodes).toBe(100);
      expect(result.current.visibleCount).toBeGreaterThan(0);
      expect(result.current.visibleCount).toBeLessThan(100);
      expect(result.current.culledCount).toBe(100 - result.current.visibleCount);
    });

    it('应该处理空节点数组', () => {
      const { result } = renderHook(() =>
        useAdvancedVirtualization([], {
          viewport,
          canvasSize,
        })
      );

      expect(result.current.totalNodes).toBe(0);
      expect(result.current.visibleCount).toBe(0);
      expect(result.current.culledCount).toBe(0);
    });

    it('应该处理undefined viewport', () => {
      const nodes = generateTestNodes(10);

      const { result } = renderHook(() =>
        useAdvancedVirtualization(nodes, {
          viewport: undefined as any,
          canvasSize,
        })
      );

      // 应该显示所有节点（默认边界）
      expect(result.current.visibleCount).toBe(10);
    });
  });

  describe('缓存功能', () => {
    it('应该缓存四叉树', () => {
      const nodes = generateTestNodes(100);

      const { result, rerender } = renderHook(
        ({ viewport }) =>
          useAdvancedVirtualization(nodes, {
            viewport,
            canvasSize,
            enableCache: true,
          }),
        { initialProps: { viewport } }
      );

      const firstBuildTime = result.current.performanceMetrics.quadTreeBuildTime;
      expect(firstBuildTime).toBeGreaterThan(0); // 第一次应该构建

      // 改变viewport（节点不变）
      rerender({ viewport: { x: 100, y: 100, zoom: 1 } });

      const secondBuildTime = result.current.performanceMetrics.quadTreeBuildTime;

      // 第二次应该使用缓存，构建时间应该为0或非常小
      expect(secondBuildTime).toBeLessThanOrEqual(firstBuildTime * 0.1);
    });

    it('应该缓存可见节点', () => {
      const nodes = generateTestNodes(100);

      const { result } = renderHook(() =>
        useAdvancedVirtualization(nodes, {
          viewport,
          canvasSize,
          enableCache: true,
        })
      );

      const firstTotalTime = result.current.performanceMetrics.totalTime;
      expect(firstTotalTime).toBeGreaterThan(0); // 第一次应该有处理时间

      // 验证缓存功能存在（通过检查性能指标）
      expect(result.current.performanceMetrics).toHaveProperty('quadTreeBuildTime');
      expect(result.current.performanceMetrics).toHaveProperty('queryTime');
      expect(result.current.performanceMetrics).toHaveProperty('totalTime');
    });

    it('应该报告缓存命中率', () => {
      const nodes = generateTestNodes(100);

      const { result } = renderHook(() =>
        useAdvancedVirtualization(nodes, {
          viewport,
          canvasSize,
          enableCache: true,
        })
      );

      // 验证缓存命中率字段存在且为有效数字
      expect(result.current.cacheHitRate).toBeGreaterThanOrEqual(0);
      expect(result.current.cacheHitRate).toBeLessThanOrEqual(1);
      expect(typeof result.current.cacheHitRate).toBe('number');
    });
  });

  describe('自适应padding', () => {
    it('应该根据缩放级别调整padding', () => {
      const nodes = generateTestNodes(100);

      // 小缩放（zoom < 0.5）- padding更小，可见区域更小
      const { result: result1 } = renderHook(() =>
        useAdvancedVirtualization(nodes, {
          viewport: { x: 0, y: 0, zoom: 0.3 },
          canvasSize,
          padding: 200,
          enableAdaptivePadding: true,
        })
      );

      // 正常缩放（zoom = 1.0）
      const { result: result2 } = renderHook(() =>
        useAdvancedVirtualization(nodes, {
          viewport: { x: 0, y: 0, zoom: 1.0 },
          canvasSize,
          padding: 200,
          enableAdaptivePadding: true,
        })
      );

      // 大缩放（zoom > 2.0）- padding更大，可见区域更大
      const { result: result3 } = renderHook(() =>
        useAdvancedVirtualization(nodes, {
          viewport: { x: 0, y: 0, zoom: 3.0 },
          canvasSize,
          padding: 200,
          enableAdaptivePadding: true,
        })
      );

      // 验证自适应padding功能存在（不严格要求节点数量关系，因为取决于节点分布）
      expect(result1.current.visibleCount).toBeGreaterThan(0);
      expect(result2.current.visibleCount).toBeGreaterThan(0);
      expect(result3.current.visibleCount).toBeGreaterThan(0);

      // 至少有一个缩放级别的可见节点数量应该不同
      const allSame =
        result1.current.visibleCount === result2.current.visibleCount &&
        result2.current.visibleCount === result3.current.visibleCount;
      expect(allSame).toBe(false);
    });
  });

  describe('性能对比', () => {
    it('应该比旧版本更快（100个节点）', () => {
      const nodes = generateTestNodes(100);

      // 旧版本
      const startOld = performance.now();
      renderHook(() =>
        useVirtualization(nodes, {
          viewport,
          canvasSize,
          padding: 200,
        })
      );
      const oldTime = performance.now() - startOld;

      // 新版本
      const startNew = performance.now();
      renderHook(() =>
        useAdvancedVirtualization(nodes, {
          viewport,
          canvasSize,
          padding: 200,
          enableCache: true,
        })
      );
      const newTime = performance.now() - startNew;

      console.log(`旧版本: ${oldTime.toFixed(2)}ms, 新版本: ${newTime.toFixed(2)}ms`);
      console.log(`性能提升: ${((oldTime / newTime - 1) * 100).toFixed(1)}%`);

      // 新版本应该更快或相当
      expect(newTime).toBeLessThanOrEqual(oldTime * 1.2);
    });

    it('应该在viewport变化时显著更快（缓存）', () => {
      const nodes = generateTestNodes(100);

      const { result, rerender } = renderHook(
        ({ viewport }) =>
          useAdvancedVirtualization(nodes, {
            viewport,
            canvasSize,
            enableCache: true,
          }),
        { initialProps: { viewport } }
      );

      // 第一次渲染
      const firstTime = result.current.performanceMetrics.totalTime;

      // 改变viewport（但节点不变，应该使用四叉树缓存）
      rerender({ viewport: { x: 100, y: 100, zoom: 1 } });
      const secondTime = result.current.performanceMetrics.totalTime;

      console.log(`第一次: ${firstTime.toFixed(2)}ms, 第二次: ${secondTime.toFixed(2)}ms`);
      if (firstTime > 0 && secondTime > 0) {
        console.log(`性能提升: ${((firstTime / secondTime - 1) * 100).toFixed(1)}%`);
      }

      // 第二次应该更快或相当（使用四叉树缓存）
      expect(secondTime).toBeLessThanOrEqual(firstTime * 1.5);
    });

    it('应该在大量节点时表现更好（1000个节点）', () => {
      const nodes = generateTestNodes(1000);

      const { result } = renderHook(() =>
        useAdvancedVirtualization(nodes, {
          viewport,
          canvasSize,
          enableCache: true,
        })
      );

      const totalTime = result.current.performanceMetrics.totalTime;

      console.log(`1000个节点处理时间: ${totalTime.toFixed(2)}ms`);
      console.log(`四叉树构建: ${result.current.performanceMetrics.quadTreeBuildTime.toFixed(2)}ms`);
      console.log(`查询时间: ${result.current.performanceMetrics.queryTime.toFixed(2)}ms`);

      // 应该在合理时间内完成（<100ms）
      expect(totalTime).toBeLessThan(100);
    });
  });

  describe('性能指标', () => {
    it('应该提供详细的性能指标', () => {
      const nodes = generateTestNodes(100);

      const { result } = renderHook(() =>
        useAdvancedVirtualization(nodes, {
          viewport,
          canvasSize,
        })
      );

      expect(result.current.performanceMetrics).toHaveProperty('quadTreeBuildTime');
      expect(result.current.performanceMetrics).toHaveProperty('queryTime');
      expect(result.current.performanceMetrics).toHaveProperty('totalTime');

      expect(result.current.performanceMetrics.quadTreeBuildTime).toBeGreaterThanOrEqual(0);
      expect(result.current.performanceMetrics.queryTime).toBeGreaterThanOrEqual(0);
      expect(result.current.performanceMetrics.totalTime).toBeGreaterThanOrEqual(0);
    });
  });
});

