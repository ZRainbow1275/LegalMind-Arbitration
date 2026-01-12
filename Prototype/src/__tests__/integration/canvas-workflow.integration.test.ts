/**
 * 画布工作流集成测试
 * 
 * 测试画布、元素工厂、对齐系统、虚拟化等模块的集成
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useCanvasStore } from '../../lib/canvas-store';
import { ElementFactory } from '../../lib/element-factory';
import { detectAlignment, alignElements } from '../../lib/alignment-helper';
import { buildQuadTree } from '../../lib/virtualization';

describe('画布工作流集成测试', () => {
  beforeEach(() => {
    // 重置store
    useCanvasStore.setState({
      canvas: null,
      selection: { elementIds: [] },
      history: [],
      historyIndex: -1,
      loading: false,
      error: null,
    });
  });

  describe('创建和管理元素', () => {
    it('应该创建画布并添加多个元素', () => {
      const { initCanvas, addElement, getAllElements } = useCanvasStore.getState();

      // 初始化画布
      initCanvas('测试画布');

      // 创建多个元素
      const text = ElementFactory.createText({ x: 100, y: 100 }, '标题');
      const shape = ElementFactory.createShape({ x: 200, y: 200 }, 'rectangle');
      const image = ElementFactory.createImage({ x: 300, y: 300 }, 'https://example.com/image.jpg');

      addElement(text);
      addElement(shape);
      addElement(image);

      // 验证元素已添加
      const elements = getAllElements();
      expect(elements.length).toBe(3);
      expect(elements.map(el => el.type)).toEqual(['text', 'shape', 'image']);
    });

    it('应该支持元素的选择和批量操作', () => {
      const { initCanvas, addElement, selectElement, selectElements } = useCanvasStore.getState();

      initCanvas('测试画布');

      // 创建元素
      const el1 = ElementFactory.createText({ x: 100, y: 100 }, '元素1');
      const el2 = ElementFactory.createText({ x: 200, y: 200 }, '元素2');
      const el3 = ElementFactory.createText({ x: 300, y: 300 }, '元素3');

      addElement(el1);
      addElement(el2);
      addElement(el3);

      // 选择单个元素
      selectElement(el1.id);
      expect(useCanvasStore.getState().selection.elementIds).toEqual([el1.id]);

      // 选择多个元素
      selectElements([el1.id, el2.id, el3.id]);
      expect(useCanvasStore.getState().selection.elementIds).toEqual([el1.id, el2.id, el3.id]);
    });

    it('应该支持元素的更新和删除', () => {
      const { initCanvas, addElement, updateElement, deleteElement, getElement } = useCanvasStore.getState();

      initCanvas('测试画布');

      // 创建元素
      const text = ElementFactory.createText({ x: 100, y: 100 }, '原始文本');
      addElement(text);

      // 更新元素
      updateElement(text.id, { content: '更新后的文本', position: { x: 200, y: 200 } });

      const updated = getElement(text.id);
      expect((updated as any)?.content).toBe('更新后的文本');
      expect(updated?.position).toEqual({ x: 200, y: 200 });

      // 删除元素
      deleteElement(text.id);
      expect(getElement(text.id)).toBeUndefined();
    });
  });

  describe('对齐系统集成', () => {
    it('应该检测元素移动时的对齐', () => {
      const { initCanvas, addElement } = useCanvasStore.getState();

      initCanvas('测试画布');

      // 创建参考元素
      const reference = ElementFactory.createShape({ x: 200, y: 200 }, 'rectangle');
      addElement(reference);

      // 创建移动元素
      const moving = ElementFactory.createShape({ x: 100, y: 100 }, 'circle');

      // 检测对齐（移动到接近参考元素左边缘的位置）
      const result = detectAlignment(moving, { x: 205, y: 150 }, [reference]);

      expect(result.snapped).toBe(true);
      expect(result.position.x).toBe(200); // 吸附到左边缘
      expect(result.guides.length).toBeGreaterThan(0);
    });

    it('应该批量对齐多个元素', () => {
      const { initCanvas, addElement, getAllElements } = useCanvasStore.getState();

      initCanvas('测试画布');

      // 创建多个元素
      const el1 = ElementFactory.createShape({ x: 100, y: 100 }, 'rectangle');
      const el2 = ElementFactory.createShape({ x: 200, y: 150 }, 'rectangle');
      const el3 = ElementFactory.createShape({ x: 300, y: 200 }, 'rectangle');

      addElement(el1);
      addElement(el2);
      addElement(el3);

      const elements = getAllElements();

      // 左对齐
      const positions = alignElements(elements, 'left');

      // 所有元素应该对齐到最左边的元素
      expect(positions.get(el1.id)?.x).toBe(100);
      expect(positions.get(el2.id)?.x).toBe(100);
      expect(positions.get(el3.id)?.x).toBe(100);
    });
  });

  describe('虚拟化系统集成', () => {
    it('应该使用四叉树优化大量元素的查询', () => {
      const { initCanvas, addElement, getAllElements } = useCanvasStore.getState();

      initCanvas('测试画布');

      // 创建大量元素
      for (let i = 0; i < 100; i++) {
        const x = (i % 10) * 100;
        const y = Math.floor(i / 10) * 100;
        const element = ElementFactory.createShape({ x, y }, 'rectangle');
        addElement(element);
      }

      const elements = getAllElements();
      expect(elements.length).toBe(100);

      // 构建四叉树
      const quadTree = buildQuadTree(elements);

      // 查询视口内的元素
      const viewport = { x: 0, y: 0, width: 500, height: 500, zoom: 1 };
      const visibleElements = quadTree.queryViewport(viewport);

      // 应该只返回视口内的元素
      expect(visibleElements.length).toBeLessThan(100);
      expect(visibleElements.length).toBeGreaterThan(0);
    });
  });

  describe('历史记录集成', () => {
    it('应该记录元素的创建和删除', () => {
      const { initCanvas, addElement, deleteElement, undo, redo, getElement } = useCanvasStore.getState();

      initCanvas('测试画布');

      // 创建元素
      const text = ElementFactory.createText({ x: 100, y: 100 }, '测试文本');
      addElement(text);

      expect(getElement(text.id)).toBeDefined();
      expect(useCanvasStore.getState().history.length).toBe(1);

      // 删除元素
      deleteElement(text.id);
      expect(getElement(text.id)).toBeUndefined();

      // 撤销删除
      undo();
      expect(getElement(text.id)).toBeDefined();

      // 重做删除
      redo();
      expect(getElement(text.id)).toBeUndefined();
    });

    it('应该限制历史记录长度', () => {
      const { initCanvas, addElement } = useCanvasStore.getState();

      initCanvas('测试画布');

      // 添加超过50个元素
      for (let i = 0; i < 60; i++) {
        const element = ElementFactory.createText({ x: i * 10, y: i * 10 }, `元素${i}`);
        addElement(element);
      }

      const history = useCanvasStore.getState().history;
      expect(history.length).toBeLessThanOrEqual(50);
    });
  });

  describe('分组和层级管理', () => {
    it('应该创建和管理元素分组', () => {
      const { initCanvas, addElement, getElement } = useCanvasStore.getState();

      initCanvas('测试画布');

      // 创建多个元素
      const el1 = ElementFactory.createShape({ x: 100, y: 100 }, 'rectangle');
      const el2 = ElementFactory.createShape({ x: 200, y: 200 }, 'circle');

      addElement(el1);
      addElement(el2);

      // 创建分组
      const group = ElementFactory.createGroup([el1.id, el2.id], '测试分组');
      addElement(group);

      // 验证分组
      const groupElement = getElement(group.id);
      expect(groupElement?.type).toBe('group');
      expect((groupElement as any)?.children).toEqual([el1.id, el2.id]);
    });
  });

  describe('完整工作流', () => {
    it('应该支持完整的画布操作流程', () => {
      const {
        initCanvas,
        addElement,
        updateElement,
        selectElements,
        deleteElements,
        getAllElements,
        undo,
        redo,
      } = useCanvasStore.getState();

      // 1. 初始化画布
      initCanvas('完整工作流测试');

      // 2. 创建多个元素
      const elements = [
        ElementFactory.createText({ x: 100, y: 100 }, '标题'),
        ElementFactory.createShape({ x: 200, y: 200 }, 'rectangle'),
        ElementFactory.createImage({ x: 300, y: 300 }, 'https://example.com/image.jpg'),
      ];

      elements.forEach(el => addElement(el));
      expect(getAllElements().length).toBe(3);

      // 3. 选择和更新元素
      selectElements(elements.map(el => el.id));
      updateElement(elements[0].id, { content: '更新后的标题' });

      // 4. 删除元素
      deleteElements([elements[1].id, elements[2].id]);
      expect(getAllElements().length).toBe(1);

      // 5. 撤销删除
      undo();
      expect(getAllElements().length).toBeGreaterThan(1);

      // 6. 重做删除
      redo();
      expect(getAllElements().length).toBe(1);
    });
  });
});

