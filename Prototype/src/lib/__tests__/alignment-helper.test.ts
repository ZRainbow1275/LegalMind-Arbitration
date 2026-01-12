/**
 * AlignmentHelper单元测试
 */

import { describe, it, expect } from 'vitest';
import { detectAlignment, alignElements } from '../alignment-helper';
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

describe('AlignmentHelper', () => {
  describe('detectAlignment', () => {
    it('应该检测左对齐', () => {
      const movingElement = createElement('moving', 100, 100, 100, 50);
      const newPosition = { x: 200, y: 150 };
      const otherElements = [
        createElement('other1', 200, 50, 100, 50),
      ];

      const result = detectAlignment(movingElement, newPosition, otherElements);

      expect(result.snapped).toBe(true);
      expect(result.position.x).toBe(200);
      expect(result.guides.length).toBeGreaterThan(0);
      expect(result.guides[0].type).toBe('vertical');
    });

    it('应该检测右对齐', () => {
      const movingElement = createElement('moving', 100, 100, 100, 50);
      const newPosition = { x: 105, y: 150 }; // 接近右对齐位置
      const otherElements = [
        createElement('other1', 100, 50, 100, 50), // 右边缘在200
      ];

      const result = detectAlignment(movingElement, newPosition, otherElements);

      expect(result.snapped).toBe(true);
      expect(result.position.x).toBe(100); // 右边缘对齐到200，所以位置是200-100=100
    });

    it('应该检测顶部对齐', () => {
      const movingElement = createElement('moving', 100, 100, 100, 50);
      const newPosition = { x: 150, y: 200 };
      const otherElements = [
        createElement('other1', 50, 200, 100, 50),
      ];

      const result = detectAlignment(movingElement, newPosition, otherElements);

      expect(result.snapped).toBe(true);
      expect(result.position.y).toBe(200);
      expect(result.guides.length).toBeGreaterThan(0);
      expect(result.guides[0].type).toBe('horizontal');
    });

    it('应该检测底部对齐', () => {
      const movingElement = createElement('moving', 100, 100, 100, 50);
      const newPosition = { x: 150, y: 155 }; // 接近底部对齐位置
      const otherElements = [
        createElement('other1', 50, 150, 100, 50), // 底边在200
      ];

      const result = detectAlignment(movingElement, newPosition, otherElements);

      expect(result.snapped).toBe(true);
      expect(result.position.y).toBe(150); // 底边对齐到200，所以位置是200-50=150
    });

    it('应该检测中心对齐（垂直）', () => {
      const movingElement = createElement('moving', 100, 100, 100, 50);
      const newPosition = { x: 150, y: 150 };
      const otherElements = [
        createElement('other1', 100, 150, 100, 50), // 中心在x=150
      ];

      const result = detectAlignment(movingElement, newPosition, otherElements);

      expect(result.snapped).toBe(true);
      expect(result.position.x).toBe(150);
    });

    it('应该检测中心对齐（水平）', () => {
      const movingElement = createElement('moving', 100, 100, 100, 50);
      const newPosition = { x: 150, y: 105 }; // 接近中心对齐位置
      const otherElements = [
        createElement('other1', 150, 100, 100, 50), // 中心在y=125
      ];

      const result = detectAlignment(movingElement, newPosition, otherElements);

      expect(result.snapped).toBe(true);
      expect(result.position.y).toBeCloseTo(100, 0); // 中心对齐到125，所以位置是125-25=100
    });

    it('应该在没有对齐时返回原位置', () => {
      const movingElement = createElement('moving', 100, 100, 100, 50);
      const newPosition = { x: 500, y: 500 };
      const otherElements = [
        createElement('other1', 100, 100, 100, 50),
      ];

      const result = detectAlignment(movingElement, newPosition, otherElements);

      expect(result.snapped).toBe(false);
      expect(result.position).toEqual(newPosition);
      expect(result.guides).toEqual([]);
    });

    it('应该处理多个元素的对齐', () => {
      const movingElement = createElement('moving', 100, 100, 100, 50);
      const newPosition = { x: 200, y: 200 };
      const otherElements = [
        createElement('other1', 200, 50, 100, 50),
        createElement('other2', 50, 200, 100, 50),
      ];

      const result = detectAlignment(movingElement, newPosition, otherElements);

      expect(result.snapped).toBe(true);
      expect(result.guides.length).toBeGreaterThan(0);
    });

    it('应该处理空的其他元素列表', () => {
      const movingElement = createElement('moving', 100, 100, 100, 50);
      const newPosition = { x: 200, y: 200 };
      const otherElements: CanvasElement[] = [];

      const result = detectAlignment(movingElement, newPosition, otherElements);

      expect(result.snapped).toBe(false);
      expect(result.position).toEqual(newPosition);
      expect(result.guides).toEqual([]);
    });
  });

  describe('alignElements', () => {
    it('应该左对齐元素', () => {
      const elements = [
        createElement('el1', 100, 100, 100, 50),
        createElement('el2', 150, 150, 100, 50),
        createElement('el3', 200, 200, 100, 50),
      ];

      const positionsMap = alignElements(elements, 'left');

      expect(positionsMap.get('el1')?.x).toBe(100);
      expect(positionsMap.get('el2')?.x).toBe(100);
      expect(positionsMap.get('el3')?.x).toBe(100);
    });

    it('应该右对齐元素', () => {
      const elements = [
        createElement('el1', 100, 100, 100, 50),
        createElement('el2', 150, 150, 100, 50),
        createElement('el3', 200, 200, 100, 50),
      ];

      const positionsMap = alignElements(elements, 'right');

      // 最右边的元素在x=300（200+100）
      expect(positionsMap.get('el1')?.x).toBe(200); // 300-100
      expect(positionsMap.get('el2')?.x).toBe(200); // 300-100
      expect(positionsMap.get('el3')?.x).toBe(200); // 300-100
    });

    it('应该顶部对齐元素', () => {
      const elements = [
        createElement('el1', 100, 100, 100, 50),
        createElement('el2', 150, 150, 100, 50),
        createElement('el3', 200, 200, 100, 50),
      ];

      const positionsMap = alignElements(elements, 'top');

      expect(positionsMap.get('el1')?.y).toBe(100);
      expect(positionsMap.get('el2')?.y).toBe(100);
      expect(positionsMap.get('el3')?.y).toBe(100);
    });

    it('应该底部对齐元素', () => {
      const elements = [
        createElement('el1', 100, 100, 100, 50),
        createElement('el2', 150, 150, 100, 50),
        createElement('el3', 200, 200, 100, 50),
      ];

      const positionsMap = alignElements(elements, 'bottom');

      // 最底部的元素在y=250（200+50）
      expect(positionsMap.get('el1')?.y).toBe(200); // 250-50
      expect(positionsMap.get('el2')?.y).toBe(200); // 250-50
      expect(positionsMap.get('el3')?.y).toBe(200); // 250-50
    });

    it('应该水平居中对齐元素', () => {
      const elements = [
        createElement('el1', 100, 100, 100, 50),
        createElement('el2', 150, 150, 100, 50),
        createElement('el3', 200, 200, 100, 50),
      ];

      const positionsMap = alignElements(elements, 'center');

      // 中心应该在x=200（(100+300)/2）
      expect(positionsMap.get('el1')?.x).toBe(150); // 200-50
      expect(positionsMap.get('el2')?.x).toBe(150); // 200-50
      expect(positionsMap.get('el3')?.x).toBe(150); // 200-50
    });

    it('应该垂直居中对齐元素', () => {
      const elements = [
        createElement('el1', 100, 100, 100, 50),
        createElement('el2', 150, 150, 100, 50),
        createElement('el3', 200, 200, 100, 50),
      ];

      const positionsMap = alignElements(elements, 'middle');

      // 中心应该在y=175（(100+250)/2）
      expect(positionsMap.get('el1')?.y).toBe(150); // 175-25
      expect(positionsMap.get('el2')?.y).toBe(150); // 175-25
      expect(positionsMap.get('el3')?.y).toBe(150); // 175-25
    });

    it('应该处理单个元素', () => {
      const elements = [
        createElement('el1', 100, 100, 100, 50),
      ];

      const positionsMap = alignElements(elements, 'left');

      expect(positionsMap.get('el1')?.x).toBe(100);
    });

    it('应该处理空列表', () => {
      const elements: CanvasElement[] = [];

      const positionsMap = alignElements(elements, 'left');

      expect(positionsMap.size).toBe(0);
    });
  });
});

