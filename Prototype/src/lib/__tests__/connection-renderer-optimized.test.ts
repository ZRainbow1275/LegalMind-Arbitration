/**
 * 优化的连接线渲染器测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ConnectionRendererOptimized } from '../connection-renderer-optimized';


// Mock Path2D
class MockPath2D {
  private commands: string[] = [];

  moveTo(x: number, y: number) {
    this.commands.push(`M ${x} ${y}`);
  }

  lineTo(x: number, y: number) {
    this.commands.push(`L ${x} ${y}`);
  }

  bezierCurveTo(cp1x: number, cp1y: number, cp2x: number, cp2y: number, x: number, y: number) {
    this.commands.push(`C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${x} ${y}`);
  }

  quadraticCurveTo(cpx: number, cpy: number, x: number, y: number) {
    this.commands.push(`Q ${cpx} ${cpy} ${x} ${y}`);
  }

  toString() {
    return this.commands.join(' ');
  }
}

// 在全局作用域中定义Path2D
(global as any).Path2D = MockPath2D;

// Mock Canvas API
class MockCanvasRenderingContext2D {
  public strokeStyle = '';
  public lineWidth = 0;
  public globalAlpha = 1;
  public shadowColor = '';
  public shadowBlur = 0;
  public font = '';
  public textAlign = '';
  public textBaseline = '';
  public fillStyle = '';

  private _lineDash: number[] = [];
  private _transformStack: any[] = [];

  save() {
    this._transformStack.push({
      strokeStyle: this.strokeStyle,
      lineWidth: this.lineWidth,
      globalAlpha: this.globalAlpha,
    });
  }

  restore() {
    const state = this._transformStack.pop();
    if (state) {
      Object.assign(this, state);
    }
  }

  translate(_x: number, _y: number) { }
  scale(_x: number, _y: number) { }
  stroke(_path?: any) { }
  beginPath() { }
  moveTo(_x: number, _y: number) { }
  lineTo(_x: number, _y: number) { }
  fillText(_text: string, _x: number, _y: number) { }
  setLineDash(segments: number[]) {
    this._lineDash = segments;
  }
  getLineDash() {
    return this._lineDash;
  }
}

// 生成测试连接线
function generateTestConnections(count: number) {
  const connections = [];
  for (let i = 0; i < count; i++) {
    const startX = i * 300;
    const startY = Math.floor(i / 10) * 250;
    const endX = startX + 200;
    const endY = startY + 100;

    connections.push({
      id: `connection-${i}`,
      points: [
        { x: startX, y: startY, type: 'start' as const },
        { x: endX, y: endY, type: 'end' as const },
      ],
      style: {
        strokeColor: '#f97316',
        strokeWidth: 2,
        opacity: 0.8,
        showArrow: true,
        arrowSize: 10,
      },
      label: `连接${i}`,
    });
  }
  return connections;
}

describe('ConnectionRendererOptimized', () => {
  let renderer: ConnectionRendererOptimized;
  let ctx: any;

  beforeEach(() => {
    renderer = new ConnectionRendererOptimized({
      enableVirtualization: true,
      enablePathCache: true,
      padding: 200,
    });
    ctx = new MockCanvasRenderingContext2D() as any;
  });

  describe('基础功能', () => {
    it('应该正确渲染连接线', () => {
      const connections = generateTestConnections(10);
      const viewport = { x: 0, y: 0, zoom: 1, width: 1920, height: 1080 };

      const stats = renderer.renderConnections(ctx, connections, viewport);

      expect(stats.totalConnections).toBe(10);
      expect(stats.visibleConnections).toBeGreaterThan(0);
      expect(stats.renderTime).toBeGreaterThanOrEqual(0);
    });

    it('应该处理空连接线数组', () => {
      const viewport = { x: 0, y: 0, zoom: 1, width: 1920, height: 1080 };

      const stats = renderer.renderConnections(ctx, [], viewport);

      expect(stats.totalConnections).toBe(0);
      expect(stats.visibleConnections).toBe(0);
      expect(stats.culledConnections).toBe(0);
    });

    it('应该处理无效的连接线（点数<2）', () => {
      const connections = [
        {
          id: 'invalid-1',
          points: [{ x: 0, y: 0, type: 'start' as const }],
          style: {
            strokeColor: '#f97316',
            strokeWidth: 2,
            opacity: 0.8,
            showArrow: true,
            arrowSize: 10,
          },
        },
      ];
      const viewport = { x: 0, y: 0, zoom: 1, width: 1920, height: 1080 };

      const stats = renderer.renderConnections(ctx, connections, viewport);

      expect(stats.totalConnections).toBe(1);
      // 无效连接线不应该被渲染，但仍然计入总数
    });
  });

  describe('虚拟化功能', () => {
    it('应该过滤不可见的连接线', () => {
      const connections = generateTestConnections(100);
      // 设置viewport只显示左上角
      const viewport = { x: 0, y: 0, zoom: 1, width: 500, height: 500 };

      const stats = renderer.renderConnections(ctx, connections, viewport);

      expect(stats.totalConnections).toBe(100);
      expect(stats.visibleConnections).toBeLessThan(100);
      expect(stats.culledConnections).toBeGreaterThan(0);
      expect(stats.visibleConnections + stats.culledConnections).toBe(100);
    });

    it('应该在禁用虚拟化时渲染所有连接线', () => {
      const rendererNoVirt = new ConnectionRendererOptimized({
        enableVirtualization: false,
      });
      const connections = generateTestConnections(100);
      const viewport = { x: 0, y: 0, zoom: 1, width: 500, height: 500 };

      const stats = rendererNoVirt.renderConnections(ctx, connections, viewport);

      expect(stats.totalConnections).toBe(100);
      expect(stats.visibleConnections).toBe(100);
      expect(stats.culledConnections).toBe(0);
    });
  });

  describe('路径缓存功能', () => {
    it('应该缓存路径', () => {
      const connections = generateTestConnections(10);
      const viewport = { x: 0, y: 0, zoom: 1, width: 1920, height: 1080 };

      // 第一次渲染
      renderer.renderConnections(ctx, connections, viewport);
      renderer.getCacheStats();

      // 第二次渲染（相同的连接线）
      renderer.renderConnections(ctx, connections, viewport);
      const cacheStats2 = renderer.getCacheStats();

      // 缓存应该被使用
      expect(cacheStats2.cacheSize).toBeGreaterThan(0);
      expect(cacheStats2.cacheSize).toBeLessThanOrEqual(10);
    });

    it('应该清除缓存', () => {
      const connections = generateTestConnections(10);
      const viewport = { x: 0, y: 0, zoom: 1, width: 1920, height: 1080 };

      renderer.renderConnections(ctx, connections, viewport);
      const cacheStatsBefore = renderer.getCacheStats();
      expect(cacheStatsBefore.cacheSize).toBeGreaterThan(0);

      renderer.clearCache();
      const cacheStatsAfter = renderer.getCacheStats();
      expect(cacheStatsAfter.cacheSize).toBe(0);
    });

    it('应该限制缓存大小', () => {
      const connections = generateTestConnections(1500); // 超过缓存限制
      const viewport = { x: 0, y: 0, zoom: 1, width: 10000, height: 10000 };

      renderer.renderConnections(ctx, connections, viewport);
      const cacheStats = renderer.getCacheStats();

      expect(cacheStats.cacheSize).toBeLessThanOrEqual(cacheStats.cacheLimit);
    });
  });

  describe('性能测试', () => {
    it('应该在合理时间内渲染100条连接线', () => {
      const connections = generateTestConnections(100);
      const viewport = { x: 0, y: 0, zoom: 1, width: 1920, height: 1080 };

      const stats = renderer.renderConnections(ctx, connections, viewport);

      // 应该在10ms内完成
      expect(stats.renderTime).toBeLessThan(10);
    });

    it('应该在合理时间内渲染1000条连接线', () => {
      const connections = generateTestConnections(1000);
      const viewport = { x: 0, y: 0, zoom: 1, width: 10000, height: 10000 };

      const stats = renderer.renderConnections(ctx, connections, viewport);

      // 应该在100ms内完成
      expect(stats.renderTime).toBeLessThan(100);
      console.log(`1000条连接线渲染时间: ${stats.renderTime.toFixed(2)}ms`);
    });

    it('虚拟化应该提升性能', () => {
      const connections = generateTestConnections(1000);
      const viewport = { x: 0, y: 0, zoom: 1, width: 500, height: 500 };

      // 启用虚拟化
      const rendererWithVirt = new ConnectionRendererOptimized({
        enableVirtualization: true,
      });
      const statsWithVirt = rendererWithVirt.renderConnections(ctx, connections, viewport);

      // 禁用虚拟化
      const rendererNoVirt = new ConnectionRendererOptimized({
        enableVirtualization: false,
      });
      const statsNoVirt = rendererNoVirt.renderConnections(ctx, connections, viewport);

      console.log(`虚拟化: ${statsWithVirt.renderTime.toFixed(2)}ms (${statsWithVirt.visibleConnections}条)`);
      console.log(`无虚拟化: ${statsNoVirt.renderTime.toFixed(2)}ms (${statsNoVirt.visibleConnections}条)`);

      // 虚拟化应该渲染更少的连接线
      expect(statsWithVirt.visibleConnections).toBeLessThan(statsNoVirt.visibleConnections);
    });
  });

  describe('样式支持', () => {
    it('应该支持虚线样式', () => {
      const connections = [
        {
          id: 'dashed-1',
          points: [
            { x: 0, y: 0, type: 'start' as const },
            { x: 100, y: 100, type: 'end' as const },
          ],
          style: {
            strokeColor: '#f97316',
            strokeWidth: 2,
            strokeDashArray: [5, 5],
            opacity: 0.8,
            showArrow: false,
            arrowSize: 10,
          },
        },
      ];
      const viewport = { x: 0, y: 0, zoom: 1, width: 1920, height: 1080 };

      const stats = renderer.renderConnections(ctx, connections, viewport);

      expect(stats.visibleConnections).toBe(1);
    });

    it('应该支持阴影效果', () => {
      const connections = [
        {
          id: 'shadow-1',
          points: [
            { x: 0, y: 0, type: 'start' as const },
            { x: 100, y: 100, type: 'end' as const },
          ],
          style: {
            strokeColor: '#f97316',
            strokeWidth: 2,
            opacity: 0.8,
            showArrow: false,
            arrowSize: 10,
            shadowEnabled: true,
            shadowColor: 'rgba(0,0,0,0.2)',
            shadowBlur: 4,
          },
        },
      ];
      const viewport = { x: 0, y: 0, zoom: 1, width: 1920, height: 1080 };

      const stats = renderer.renderConnections(ctx, connections, viewport);

      expect(stats.visibleConnections).toBe(1);
    });
  });
});

