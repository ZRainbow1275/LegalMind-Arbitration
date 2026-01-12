/**
 * Virtualization单元测试
 */

import { describe, it, expect } from 'vitest';
import { buildQuadTree, QuadTree } from '../virtualization';
import type { CanvasElement } from '../../types/canvas-elements';

// 创建测试元素
const createElement = (id: string, x: number, y: number, width: number, height: number): CanvasElement => ({
  id,
  type: 'text',
  position: { x, y },
  size: { width, height },
  content: '测试',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
} as any);

describe('QuadTree', () => {
  describe('insert', () => {
    it('应该插入元素', () => {
      const quadTree = new QuadTree({ x: 0, y: 0, width: 1000, height: 1000 });
      const element = createElement('el1', 100, 100, 100, 50);

      quadTree.insert(element);

      const viewport = { x: 0, y: 0, width: 1000, height: 1000, zoom: 1 };
      const result = quadTree.queryViewport(viewport);

      expect(result).toContain(element);
    });

    it('应该插入多个元素', () => {
      const quadTree = new QuadTree({ x: 0, y: 0, width: 1000, height: 1000 });
      const elements = [
        createElement('el1', 100, 100, 100, 50),
        createElement('el2', 200, 200, 100, 50),
        createElement('el3', 300, 300, 100, 50),
      ];

      elements.forEach(el => quadTree.insert(el));

      const viewport = { x: 0, y: 0, width: 1000, height: 1000, zoom: 1 };
      const result = quadTree.queryViewport(viewport);

      expect(result.length).toBe(3);
      elements.forEach(el => {
        expect(result).toContain(el);
      });
    });
  });

  describe('queryViewport', () => {
    it('应该返回视口内的元素', () => {
      const quadTree = new QuadTree({ x: 0, y: 0, width: 1000, height: 1000 });
      const elements = [
        createElement('el1', 100, 100, 100, 50), // 在视口内
        createElement('el2', 500, 500, 100, 50), // 在视口外
      ];

      elements.forEach(el => quadTree.insert(el));

      const viewport = { x: 0, y: 0, width: 300, height: 300, zoom: 1 };
      const result = quadTree.queryViewport(viewport);

      expect(result).toContain(elements[0]);
      expect(result).not.toContain(elements[1]);
    });

    it('应该考虑缓冲区', () => {
      const quadTree = new QuadTree({ x: 0, y: 0, width: 1000, height: 1000 });
      const element = createElement('el1', 350, 350, 100, 50); // 刚好在视口外

      quadTree.insert(element);

      const viewport = { x: 0, y: 0, width: 300, height: 300, zoom: 1 };
      const result = quadTree.queryViewport(viewport, 100); // 100px缓冲区

      expect(result).toContain(element);
    });

    it('应该处理缩放', () => {
      const quadTree = new QuadTree({ x: 0, y: 0, width: 1000, height: 1000 });
      const element = createElement('el1', 100, 100, 100, 50);

      quadTree.insert(element);

      const viewport = { x: 0, y: 0, width: 300, height: 300, zoom: 2 };
      const result = quadTree.queryViewport(viewport);

      expect(result).toContain(element);
    });

    it('应该处理空的四叉树', () => {
      const quadTree = new QuadTree({ x: 0, y: 0, width: 1000, height: 1000 });

      const viewport = { x: 0, y: 0, width: 300, height: 300, zoom: 1 };
      const result = quadTree.queryViewport(viewport);

      expect(result).toEqual([]);
    });
  });

  describe('性能测试', () => {
    it('应该高效处理大量元素', () => {
      const quadTree = new QuadTree({ x: 0, y: 0, width: 10000, height: 10000 });
      const elements: CanvasElement[] = [];

      // 创建1000个元素
      for (let i = 0; i < 1000; i++) {
        const x = Math.random() * 10000;
        const y = Math.random() * 10000;
        elements.push(createElement(`el${i}`, x, y, 100, 50));
      }

      // 插入元素
      const insertStart = performance.now();
      elements.forEach(el => quadTree.insert(el));
      const insertTime = performance.now() - insertStart;

      // 查询元素
      const viewport = { x: 0, y: 0, width: 1000, height: 1000, zoom: 1 };
      const queryStart = performance.now();
      const result = quadTree.queryViewport(viewport);
      const queryTime = performance.now() - queryStart;

      // 插入应该在合理时间内完成（< 100ms）
      expect(insertTime).toBeLessThan(100);

      // 查询应该非常快（< 10ms）
      expect(queryTime).toBeLessThan(10);

      // 结果应该只包含视口内的元素
      expect(result.length).toBeLessThan(elements.length);
    });
  });
});

describe('buildQuadTree', () => {
  it('应该从元素列表构建四叉树', () => {
    const elements = [
      createElement('el1', 100, 100, 100, 50),
      createElement('el2', 200, 200, 100, 50),
      createElement('el3', 300, 300, 100, 50),
    ];

    const quadTree = buildQuadTree(elements);

    const viewport = { x: 0, y: 0, width: 1000, height: 1000, zoom: 1 };
    const result = quadTree.queryViewport(viewport);

    expect(result.length).toBe(3);
  });

  it('应该处理空列表', () => {
    const elements: CanvasElement[] = [];

    const quadTree = buildQuadTree(elements);

    const viewport = { x: 0, y: 0, width: 1000, height: 1000, zoom: 1 };
    const result = quadTree.queryViewport(viewport);

    expect(result).toEqual([]);
  });

  it('应该自动计算边界', () => {
    const elements = [
      createElement('el1', 100, 100, 100, 50),
      createElement('el2', 500, 500, 100, 50),
    ];

    const quadTree = buildQuadTree(elements);

    const viewport = { x: 0, y: 0, width: 1000, height: 1000, zoom: 1 };
    const result = quadTree.queryViewport(viewport);

    expect(result.length).toBe(2);
  });
});

