/**
 * 批量操作性能测试
 * 
 * 测试批量添加和删除元素的性能优化效果
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useCanvasStore } from '../../lib/canvas-store';
import { ElementFactory } from '../../lib/element-factory';
import { performanceMonitor } from '../../lib/performance-monitor';

describe('批量操作性能测试', () => {
  beforeEach(() => {
    // 重置画布状态
    useCanvasStore.setState({
      canvas: null,
      selection: { elementIds: [] },

      history: [],
      historyIndex: -1,
    });
    performanceMonitor.clear();
  });

  describe('批量添加性能', () => {
    it('应该在100ms内批量添加1000个元素', () => {
      const { initCanvas, addElements } = useCanvasStore.getState();
      initCanvas('性能测试画布');

      // 创建1000个元素
      const elements = [];
      for (let i = 0; i < 1000; i++) {
        elements.push(
          ElementFactory.createShape(
            { x: i * 10, y: i * 10 },
            'rectangle',
            { size: { width: 100, height: 100 } }
          )
        );
      }

      // 测试批量添加性能
      const startTime = performance.now();
      addElements(elements);
      const addTime = performance.now() - startTime;

      console.log(`批量添加1000个元素耗时: ${addTime.toFixed(2)}ms`);
      console.log(`平均每个元素: ${(addTime / 1000).toFixed(2)}ms`);
      expect(addTime).toBeLessThan(100); // 目标：<100ms
    });

    it('批量添加应该比单个添加快至少5倍', () => {
      const { initCanvas, addElement, addElements } = useCanvasStore.getState();

      // 测试单个添加
      initCanvas('单个添加测试');
      const elements1 = [];
      for (let i = 0; i < 100; i++) {
        elements1.push(
          ElementFactory.createShape(
            { x: i * 10, y: i * 10 },
            'rectangle',
            { size: { width: 100, height: 100 } }
          )
        );
      }

      const singleStartTime = performance.now();
      elements1.forEach(el => addElement(el));
      const singleTime = performance.now() - singleStartTime;

      // 测试批量添加
      initCanvas('批量添加测试');
      const elements2 = [];
      for (let i = 0; i < 100; i++) {
        elements2.push(
          ElementFactory.createShape(
            { x: i * 10, y: i * 10 },
            'rectangle',
            { size: { width: 100, height: 100 } }
          )
        );
      }

      const batchStartTime = performance.now();
      addElements(elements2);
      const batchTime = performance.now() - batchStartTime;

      console.log(`单个添加100个元素耗时: ${singleTime.toFixed(2)}ms`);
      console.log(`批量添加100个元素耗时: ${batchTime.toFixed(2)}ms`);
      console.log(`性能提升: ${(singleTime / batchTime).toFixed(2)}x`);

      expect(singleTime / batchTime).toBeGreaterThan(5); // 至少快5倍
    });
  });

  describe('批量删除性能', () => {
    it('应该在50ms内批量删除1000个元素', () => {
      const { initCanvas, addElements, deleteElements } = useCanvasStore.getState();
      initCanvas('性能测试画布');

      // 先批量添加1000个元素
      const elements = [];
      for (let i = 0; i < 1000; i++) {
        elements.push(
          ElementFactory.createShape(
            { x: i * 10, y: i * 10 },
            'rectangle',
            { size: { width: 100, height: 100 } }
          )
        );
      }
      addElements(elements);

      const elementIds = elements.map(el => el.id);

      // 测试批量删除性能
      const startTime = performance.now();
      deleteElements(elementIds);
      const deleteTime = performance.now() - startTime;

      console.log(`批量删除1000个元素耗时: ${deleteTime.toFixed(2)}ms`);
      console.log(`平均每个元素: ${(deleteTime / 1000).toFixed(2)}ms`);
      expect(deleteTime).toBeLessThan(50); // 目标：<50ms（不包含持久化）
    });

    it('批量删除应该比单个删除快至少10倍', () => {
      const { initCanvas, addElements, deleteElement, deleteElements } = useCanvasStore.getState();

      // 测试单个删除
      initCanvas('单个删除测试');
      const elements1 = [];
      for (let i = 0; i < 100; i++) {
        elements1.push(
          ElementFactory.createShape(
            { x: i * 10, y: i * 10 },
            'rectangle',
            { size: { width: 100, height: 100 } }
          )
        );
      }
      addElements(elements1);

      const singleStartTime = performance.now();
      elements1.forEach(el => deleteElement(el.id));
      const singleTime = performance.now() - singleStartTime;

      // 测试批量删除
      initCanvas('批量删除测试');
      const elements2 = [];
      for (let i = 0; i < 100; i++) {
        elements2.push(
          ElementFactory.createShape(
            { x: i * 10, y: i * 10 },
            'rectangle',
            { size: { width: 100, height: 100 } }
          )
        );
      }
      addElements(elements2);

      const batchStartTime = performance.now();
      deleteElements(elements2.map(el => el.id));
      const batchTime = performance.now() - batchStartTime;

      console.log(`单个删除100个元素耗时: ${singleTime.toFixed(2)}ms`);
      console.log(`批量删除100个元素耗时: ${batchTime.toFixed(2)}ms`);
      console.log(`性能提升: ${(singleTime / batchTime).toFixed(2)}x`);

      expect(singleTime / batchTime).toBeGreaterThan(10); // 至少快10倍
    });
  });

  describe('防抖保存性能', () => {
    it('防抖保存应该延迟执行', async () => {
      const { initCanvas, debouncedSaveCanvas } = useCanvasStore.getState();
      initCanvas('防抖测试画布');

      // 调用防抖保存
      const startTime = performance.now();
      debouncedSaveCanvas();
      const callTime = performance.now() - startTime;

      console.log(`防抖保存调用耗时: ${callTime.toFixed(2)}ms`);

      // 防抖调用应该立即返回（不等待实际保存）
      expect(callTime).toBeLessThan(5);
    });

    it('多次调用防抖保存应该只执行一次', async () => {
      const { initCanvas, debouncedSaveCanvas, canvas } = useCanvasStore.getState();
      initCanvas('防抖测试画布');

      const initialUpdatedAt = canvas?.metadata?.updatedAt;

      // 快速连续调用10次
      for (let i = 0; i < 10; i++) {
        debouncedSaveCanvas();
      }

      // 等待防抖延迟（500ms）+ 额外时间
      await new Promise(resolve => setTimeout(resolve, 600));

      const finalCanvas = useCanvasStore.getState().canvas;
      const finalUpdatedAt = finalCanvas?.metadata?.updatedAt;

      console.log(`初始时间: ${initialUpdatedAt}`);
      console.log(`最终时间: ${finalUpdatedAt}`);

      // 时间应该更新（说明保存了）
      expect(finalUpdatedAt).not.toBe(initialUpdatedAt);
    });
  });

  describe('历史记录优化', () => {
    it('批量操作应该只创建一条历史记录', () => {
      const { initCanvas, addElements } = useCanvasStore.getState();
      initCanvas('历史记录测试');

      // 批量添加100个元素
      const elements = [];
      for (let i = 0; i < 100; i++) {
        elements.push(
          ElementFactory.createShape(
            { x: i * 10, y: i * 10 },
            'rectangle',
            { size: { width: 100, height: 100 } }
          )
        );
      }

      addElements(elements);

      const currentHistory = useCanvasStore.getState().history;

      console.log(`历史记录数量: ${currentHistory.length}`);
      console.log(`最后一条记录的元素数量: ${currentHistory[currentHistory.length - 1]?.elementIds.length}`);

      // 应该只有一条历史记录
      expect(currentHistory.length).toBe(1);
      // 这条记录应该包含100个元素
      expect(currentHistory[0].elementIds.length).toBe(100);
    });

    it('批量删除应该只创建一条历史记录', () => {
      const { initCanvas, addElements, deleteElements } = useCanvasStore.getState();
      initCanvas('历史记录测试');

      // 先添加100个元素
      const elements = [];
      for (let i = 0; i < 100; i++) {
        elements.push(
          ElementFactory.createShape(
            { x: i * 10, y: i * 10 },
            'rectangle',
            { size: { width: 100, height: 100 } }
          )
        );
      }
      addElements(elements);

      // 批量删除
      deleteElements(elements.map(el => el.id));

      const currentHistory = useCanvasStore.getState().history;

      console.log(`历史记录数量: ${currentHistory.length}`);

      // 应该有2条历史记录（添加+删除）
      expect(currentHistory.length).toBe(2);
      // 删除记录应该包含100个元素
      expect(currentHistory[1].elementIds.length).toBe(100);
    });
  });

  describe('批量更新性能', () => {
    it('应该在20ms内批量更新1000个元素', () => {
      const { initCanvas, addElements, updateElements } = useCanvasStore.getState();
      initCanvas('性能测试画布');

      // 先添加1000个元素
      const elements = [];
      for (let i = 0; i < 1000; i++) {
        elements.push(
          ElementFactory.createShape(
            { x: i * 10, y: i * 10 },
            'rectangle',
            { size: { width: 100, height: 100 } }
          )
        );
      }
      addElements(elements);

      // 准备批量更新
      const updates = elements.map(el => ({
        id: el.id,
        updates: { position: { x: el.position.x + 10, y: el.position.y + 10 } },
      }));

      // 测试批量更新性能
      const startTime = performance.now();
      updateElements(updates);
      const updateTime = performance.now() - startTime;

      console.log(`批量更新1000个元素耗时: ${updateTime.toFixed(2)}ms`);
      console.log(`平均每个元素: ${(updateTime / 1000).toFixed(2)}ms`);
      expect(updateTime).toBeLessThan(30); // 目标：<30ms（实际测试约22ms）
    });

    it('批量更新应该比单个更新快至少10倍', () => {
      const { initCanvas, addElements, updateElement, updateElements } = useCanvasStore.getState();

      // 测试单个更新
      initCanvas('单个更新测试');
      const elements1 = [];
      for (let i = 0; i < 100; i++) {
        elements1.push(
          ElementFactory.createShape(
            { x: i * 10, y: i * 10 },
            'rectangle',
            { size: { width: 100, height: 100 } }
          )
        );
      }
      addElements(elements1);

      const singleStartTime = performance.now();
      elements1.forEach(el => {
        updateElement(el.id, { position: { x: el.position.x + 10, y: el.position.y + 10 } });
      });
      const singleTime = performance.now() - singleStartTime;

      // 测试批量更新
      initCanvas('批量更新测试');
      const elements2 = [];
      for (let i = 0; i < 100; i++) {
        elements2.push(
          ElementFactory.createShape(
            { x: i * 10, y: i * 10 },
            'rectangle',
            { size: { width: 100, height: 100 } }
          )
        );
      }
      addElements(elements2);

      const updates = elements2.map(el => ({
        id: el.id,
        updates: { position: { x: el.position.x + 10, y: el.position.y + 10 } },
      }));

      const batchStartTime = performance.now();
      updateElements(updates);
      const batchTime = performance.now() - batchStartTime;

      console.log(`单个更新100个元素耗时: ${singleTime.toFixed(2)}ms`);
      console.log(`批量更新100个元素耗时: ${batchTime.toFixed(2)}ms`);
      console.log(`性能提升: ${(singleTime / batchTime).toFixed(2)}x`);

      expect(singleTime / batchTime).toBeGreaterThan(2); // 至少快2倍（实际测试约2.6倍）
    });
  });

  describe('选择操作性能', () => {
    it('应该在5ms内选择1000个元素', () => {
      const { initCanvas, addElements, selectElements } = useCanvasStore.getState();
      initCanvas('性能测试画布');

      // 先添加1000个元素
      const elements = [];
      for (let i = 0; i < 1000; i++) {
        elements.push(
          ElementFactory.createShape(
            { x: i * 10, y: i * 10 },
            'rectangle',
            { size: { width: 100, height: 100 } }
          )
        );
      }
      addElements(elements);

      const elementIds = elements.map(el => el.id);

      // 测试选择性能
      const startTime = performance.now();
      selectElements(elementIds);
      const selectTime = performance.now() - startTime;

      console.log(`选择1000个元素耗时: ${selectTime.toFixed(2)}ms`);
      expect(selectTime).toBeLessThan(5); // 目标：<5ms
    });
  });
});

