/**
 * CanvasStore单元测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useCanvasStore } from '../canvas-store';
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

describe('CanvasStore', () => {
  beforeEach(() => {
    // 重置store
    useCanvasStore.setState({
      canvas: null,
      selection: { elementIds: [] },
      history: [],
    });
  });

  describe('initCanvas', () => {
    it('应该初始化画布', () => {
      const { initCanvas } = useCanvasStore.getState();

      initCanvas('Test Canvas');

      const newCanvas = useCanvasStore.getState().canvas;
      expect(newCanvas).not.toBeNull();
      expect(newCanvas?.elements).toEqual({});
      expect(newCanvas?.viewport).toEqual({ x: 0, y: 0, zoom: 1 });
    });
  });

  describe('addElement', () => {
    it('应该添加元素', () => {
      const { initCanvas, addElement } = useCanvasStore.getState();

      initCanvas('Test Canvas');
      const element = createElement('el1', 100, 100, 100, 50);
      addElement(element);

      const canvas = useCanvasStore.getState().canvas;
      expect(canvas?.elements['el1']).toEqual(element);
    });

    it('应该添加到历史记录', () => {
      const { initCanvas, addElement } = useCanvasStore.getState();

      initCanvas('Test Canvas');
      const element = createElement('el1', 100, 100, 100, 50);
      addElement(element);

      const history = useCanvasStore.getState().history;
      expect(history.length).toBe(1);
      expect(history[0].type).toBe('create');
      expect(history[0].elementIds).toContain('el1');
    });
  });

  describe('updateElement', () => {
    it('应该更新元素', () => {
      const { initCanvas, addElement, updateElement } = useCanvasStore.getState();

      initCanvas('Test Canvas');
      const element = createElement('el1', 100, 100, 100, 50);
      addElement(element);

      updateElement('el1', { position: { x: 200, y: 200 } });

      const canvas = useCanvasStore.getState().canvas;
      expect(canvas?.elements['el1'].position).toEqual({ x: 200, y: 200 });
    });

    it('应该更新updatedAt时间戳', async () => {
      const { initCanvas, addElement, updateElement } = useCanvasStore.getState();

      initCanvas('Test Canvas');
      const element = createElement('el1', 100, 100, 100, 50);
      addElement(element);

      const originalUpdatedAt = element.updatedAt;

      // 等待10ms确保时间戳不同
      await new Promise(resolve => setTimeout(resolve, 10));

      // 更新元素，updatedAt会自动更新
      updateElement('el1', { position: { x: 200, y: 200 } });

      const canvas = useCanvasStore.getState().canvas;
      expect(canvas?.elements['el1'].updatedAt).not.toBe(originalUpdatedAt);
    });
  });

  describe('deleteElement', () => {
    it('应该删除元素', () => {
      const { initCanvas, addElement, deleteElement } = useCanvasStore.getState();

      initCanvas('Test Canvas');
      const element = createElement('el1', 100, 100, 100, 50);
      addElement(element);

      deleteElement('el1');

      const canvas = useCanvasStore.getState().canvas;
      expect(canvas?.elements['el1']).toBeUndefined();
    });

    it('应该从选中列表中移除', () => {
      const { initCanvas, addElement, selectElement, deleteElement } = useCanvasStore.getState();

      initCanvas('Test Canvas');
      const element = createElement('el1', 100, 100, 100, 50);
      addElement(element);
      selectElement('el1');

      deleteElement('el1');

      const selection = useCanvasStore.getState().selection;
      expect(selection.elementIds).not.toContain('el1');
    });
  });

  describe('selectElement', () => {
    it('应该选中元素', () => {
      const { initCanvas, addElement, selectElement } = useCanvasStore.getState();

      initCanvas('Test Canvas');
      const element = createElement('el1', 100, 100, 100, 50);
      addElement(element);

      selectElement('el1');

      const selection = useCanvasStore.getState().selection;
      expect(selection.elementIds).toContain('el1');
    });

    it('应该支持多选（Ctrl键）', () => {
      const { initCanvas, addElement, selectElement } = useCanvasStore.getState();

      initCanvas('Test Canvas');
      const element1 = createElement('el1', 100, 100, 100, 50);
      const element2 = createElement('el2', 200, 200, 100, 50);
      addElement(element1);
      addElement(element2);

      selectElement('el1');
      selectElement('el2', true); // multiSelect = true

      const selection = useCanvasStore.getState().selection;
      expect(selection.elementIds).toContain('el1');
      expect(selection.elementIds).toContain('el2');
    });

    it('应该清除之前的选中（不按Ctrl）', () => {
      const { initCanvas, addElement, selectElement } = useCanvasStore.getState();

      initCanvas('Test Canvas');
      const element1 = createElement('el1', 100, 100, 100, 50);
      const element2 = createElement('el2', 200, 200, 100, 50);
      addElement(element1);
      addElement(element2);

      selectElement('el1');
      selectElement('el2', false); // multiSelect = false

      const selection = useCanvasStore.getState().selection;
      expect(selection.elementIds).not.toContain('el1');
      expect(selection.elementIds).toContain('el2');
    });
  });

  describe('clearSelection', () => {
    it('应该清除选中', () => {
      const { initCanvas, addElement, selectElement, clearSelection } = useCanvasStore.getState();

      initCanvas('Test Canvas');
      const element = createElement('el1', 100, 100, 100, 50);
      addElement(element);
      selectElement('el1');

      clearSelection();

      const selection = useCanvasStore.getState().selection;
      expect(selection.elementIds).toEqual([]);
    });
  });

  describe('updateViewport', () => {
    it('应该更新视口', () => {
      const { initCanvas, updateViewport } = useCanvasStore.getState();

      initCanvas('Test Canvas');
      updateViewport({ x: 100, y: 100, zoom: 2 });

      const canvas = useCanvasStore.getState().canvas;
      expect(canvas?.viewport).toEqual({ x: 100, y: 100, zoom: 2 });
    });
  });

  describe('undo/redo', () => {
    // 注意：undo/redo需要先通过addToHistory添加操作记录
    it('应该撤销操作', () => {
      const { initCanvas, addElement, addToHistory, undo } = useCanvasStore.getState();

      initCanvas('Test Canvas');
      const element = createElement('el1', 100, 100, 100, 50);
      addElement(element);

      // 手动添加到历史记录（修复：after应该是数组）
      addToHistory({
        type: 'create',
        elementIds: [element.id],
        before: undefined,
        after: [element],
        timestamp: Date.now(),
      });

      undo();

      const canvas = useCanvasStore.getState().canvas;
      expect(canvas?.elements['el1']).toBeUndefined();
    });

    it('应该重做操作', () => {
      const { initCanvas, addElement, addToHistory, undo, redo } = useCanvasStore.getState();

      initCanvas('Test Canvas');
      const element = createElement('el1', 100, 100, 100, 50);
      addElement(element);

      // 手动添加到历史记录（修复：after应该是数组）
      addToHistory({
        type: 'create',
        elementIds: [element.id],
        before: undefined,
        after: [element],
        timestamp: Date.now(),
      });

      undo();
      redo();

      const canvas = useCanvasStore.getState().canvas;
      expect(canvas?.elements['el1']).toEqual(element);
    });

    it('应该限制历史记录长度', () => {
      const { initCanvas, addToHistory } = useCanvasStore.getState();

      initCanvas('Test Canvas');

      // 添加超过50个操作到历史记录
      for (let i = 0; i < 60; i++) {
        addToHistory({
          type: 'create',
          elementIds: [`el${i}`],
          before: undefined,
          after: undefined,
          timestamp: Date.now(),
        });
      }

      const history = useCanvasStore.getState().history;
      expect(history.length).toBeLessThanOrEqual(50);
    });
  });

  describe('getElement', () => {
    it('应该获取元素', () => {
      const { initCanvas, addElement, getElement } = useCanvasStore.getState();

      initCanvas('Test Canvas');
      const element = createElement('el1', 100, 100, 100, 50);
      addElement(element);

      const retrieved = getElement('el1');
      expect(retrieved).toEqual(element);
    });

    it('应该返回undefined（元素不存在）', () => {
      const { initCanvas, getElement } = useCanvasStore.getState();

      initCanvas('Test Canvas');

      const retrieved = getElement('nonexistent');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('getAllElements', () => {
    it('应该获取所有元素', () => {
      const { initCanvas, addElement, getAllElements } = useCanvasStore.getState();

      initCanvas('Test Canvas');
      const element1 = createElement('el1', 100, 100, 100, 50);
      const element2 = createElement('el2', 200, 200, 100, 50);
      addElement(element1);
      addElement(element2);

      const all = getAllElements();
      expect(all.length).toBe(2);
      expect(all).toContainEqual(element1);
      expect(all).toContainEqual(element2);
    });

    it('应该返回空数组（没有元素）', () => {
      const { initCanvas, getAllElements } = useCanvasStore.getState();

      initCanvas('Test Canvas');

      const all = getAllElements();
      expect(all).toEqual([]);
    });
  });
});

