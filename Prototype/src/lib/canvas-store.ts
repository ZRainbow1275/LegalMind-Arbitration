/**
 * 画布Store
 * 
 * 管理画布的所有元素和状态
 */

import { create } from 'zustand';
import localforage from 'localforage';
import type {
  CanvasData,
  CanvasElement,
  Position,
  Size,
  Selection,
  Operation,
  AlignType,
  DistributeType,
} from '../types/canvas-elements';
import { performanceMonitor } from './performance-monitor';
import { debounce } from '../utils/performance';

// ==================== Store接口 ====================

interface CanvasStore {
  // 画布数据
  canvas: CanvasData | null;

  // 选择状态
  selection: Selection;

  // 操作历史
  history: Operation[];
  historyIndex: number;

  // 加载状态
  loading: boolean;
  error: string | null;

  // ==================== 画布操作 ====================

  // 初始化画布
  initCanvas: (name: string) => void;

  // 加载画布
  loadCanvas: (id: string) => Promise<void>;

  // 保存画布
  saveCanvas: () => Promise<void>;

  // 防抖保存画布（延迟500ms）
  debouncedSaveCanvas: () => void;

  // 更新视口
  updateViewport: (viewport: Partial<CanvasData['viewport']>) => void;

  // ==================== 元素操作 ====================

  // 添加元素
  addElement: (element: CanvasElement) => void;

  // 批量添加元素
  addElements: (elements: CanvasElement[]) => void;

  // 更新元素
  updateElement: (id: string, updates: Partial<CanvasElement>) => void;

  // 批量更新元素
  updateElements: (updates: Array<{ id: string; updates: Partial<CanvasElement> }>) => void;

  // 删除元素
  deleteElement: (id: string) => void;

  // 批量删除元素
  deleteElements: (ids: string[]) => void;

  // 获取元素
  getElement: (id: string) => CanvasElement | undefined;

  // 获取所有元素
  getAllElements: () => CanvasElement[];

  // 获取根元素
  getRootElements: () => CanvasElement[];

  // 获取子元素
  getChildren: (parentId: string) => CanvasElement[];

  // ==================== 选择操作 ====================

  // 选择元素
  selectElement: (id: string, addToSelection?: boolean) => void;

  // 选择多个元素
  selectElements: (ids: string[]) => void;

  // 清除选择
  clearSelection: () => void;

  // 全选
  selectAll: () => void;

  // ==================== 变换操作 ====================

  // 移动元素
  moveElement: (id: string, delta: Position) => void;

  // 批量移动元素
  moveElements: (ids: string[], delta: Position) => void;

  // 调整元素大小
  resizeElement: (id: string, size: Size) => void;

  // 旋转元素
  rotateElement: (id: string, angle: number) => void;

  // ==================== 层级操作 ====================

  // 置于顶层
  bringToFront: (id: string) => void;

  // 置于底层
  sendToBack: (id: string) => void;

  // 上移一层
  bringForward: (id: string) => void;

  // 下移一层
  sendBackward: (id: string) => void;

  // ==================== 组合操作 ====================

  // 组合元素
  groupElements: (ids: string[]) => void;

  // 取消组合
  ungroupElement: (id: string) => void;

  // ==================== 对齐和分布 ====================

  // 对齐元素
  alignElements: (ids: string[], type: AlignType) => void;

  // 分布元素
  distributeElements: (ids: string[], type: DistributeType) => void;

  // ==================== 历史操作 ====================

  // 撤销
  undo: () => void;

  // 重做
  redo: () => void;

  // 添加操作到历史
  addToHistory: (operation: Operation) => void;

  // 清除历史
  clearHistory: () => void;
}

// ==================== 缓存机制 ====================

// 缓存getAllElements的结果，避免每次都创建新数组
let cachedElements: CanvasElement[] = [];
let cachedElementsHash = '';

// ==================== Store实现 ====================

// 创建防抖保存函数（在store外部，避免每次渲染都创建新函数）
let debouncedSave: (() => void) | null = null;

export const useCanvasStore = create<CanvasStore>((set, get) => {
  // 初始化防抖保存函数
  if (!debouncedSave) {
    debouncedSave = debounce(() => {
      get().saveCanvas();
    }, 500); // 500ms延迟
  }

  return {
    // 初始状态
    canvas: null,
    selection: { elementIds: [] },
    history: [],
    historyIndex: -1,
    loading: false,
    error: null,

    // ==================== 画布操作 ====================

    initCanvas: (name: string) => {
      const perfId = performanceMonitor.start('初始化画布', 'operation');

      const canvas: CanvasData = {
        id: `canvas-${Date.now()}`,
        name,
        elements: {},
        rootElements: [],
        viewport: {
          x: 0,
          y: 0,
          zoom: 1,
        },
        background: {
          color: '#ffffff',
          grid: {
            enabled: true,
            size: 20,
            color: '#f3f4f6',
          },
        },
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          version: '1.0.0',
        },
      };

      // 重置画布和历史记录
      set({
        canvas,
        history: [],
        historyIndex: -1,
      });
      performanceMonitor.end(perfId);
    },

    loadCanvas: async (id: string) => {
      const perfId = performanceMonitor.start('加载画布', 'operation', { canvasId: id });
      set({ loading: true, error: null });

      try {
        const canvas = await localforage.getItem<CanvasData>(`canvas-${id}`);
        if (canvas) {
          set({ canvas, loading: false });
        } else {
          set({ error: '画布不存在', loading: false });
        }
      } catch (error) {
        set({ error: '加载失败', loading: false });
        console.error('加载画布失败:', error);
      }

      performanceMonitor.end(perfId);
    },

    saveCanvas: async () => {
      const perfId = performanceMonitor.start('保存画布', 'operation');
      const { canvas } = get();

      if (!canvas) {
        performanceMonitor.end(perfId);
        return;
      }

      try {
        // 更新时间戳
        const updatedCanvas = {
          ...canvas,
          metadata: {
            createdAt: canvas.metadata?.createdAt || new Date().toISOString(),
            ...canvas.metadata,
            updatedAt: new Date().toISOString(),
          },
        };

        await localforage.setItem(`canvas-${canvas.id}`, updatedCanvas);
        set({ canvas: updatedCanvas });
      } catch (error) {
        console.error('保存画布失败:', error);
      }

      performanceMonitor.end(perfId);
    },

    debouncedSaveCanvas: () => {
      if (debouncedSave) {
        debouncedSave();
      }
    },

    updateViewport: (viewport) => {
      const { canvas } = get();
      if (!canvas) return;

      set({
        canvas: {
          ...canvas,
          viewport: {
            ...canvas.viewport,
            ...viewport,
          },
        },
      });
    },

    // ==================== 元素操作 ====================

    addElement: (element) => {
      const perfId = performanceMonitor.start('添加元素', 'operation', { elementType: element.type });
      const { canvas } = get();
      if (!canvas) {
        performanceMonitor.end(perfId);
        return;
      }

      const newElements = {
        ...canvas.elements,
        [element.id]: element,
      };

      const newRootElements = element.parentId
        ? canvas.rootElements
        : [...canvas.rootElements, element.id];

      set({
        canvas: {
          ...canvas,
          elements: newElements,
          rootElements: newRootElements,
        },
      });

      // 添加到历史记录
      get().addToHistory({
        type: 'create',
        elementIds: [element.id],
        before: undefined,
        after: [element],
        timestamp: Date.now(),
      });

      // 保存
      get().saveCanvas();
      performanceMonitor.end(perfId);
    },

    addElements: (elements) => {
      const perfId = performanceMonitor.start('批量添加元素', 'operation', { count: elements.length });
      const { canvas } = get();
      if (!canvas || elements.length === 0) {
        performanceMonitor.end(perfId);
        return;
      }

      // 批量添加元素
      const newElements = { ...canvas.elements };
      elements.forEach(element => {
        newElements[element.id] = element;
      });

      // 批量添加到rootElements
      const newRootElements = [...canvas.rootElements];
      elements.forEach(element => {
        if (!element.parentId) {
          newRootElements.push(element.id);
        }
      });

      set({
        canvas: {
          ...canvas,
          elements: newElements,
          rootElements: newRootElements,
        },
      });

      // 添加到历史记录（单次操作）
      get().addToHistory({
        type: 'create',
        elementIds: elements.map(el => el.id),
        before: undefined,
        after: elements,
        timestamp: Date.now(),
      });

      // 只保存一次
      get().saveCanvas();
      performanceMonitor.end(perfId);
    },

    updateElement: (id, updates) => {
      const perfId = performanceMonitor.start('更新元素', 'operation', { elementId: id });
      const { canvas } = get();
      if (!canvas || !canvas.elements[id]) {
        performanceMonitor.end(perfId);
        return;
      }

      const element = canvas.elements[id];
      const updatedElement = {
        ...element,
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      set({
        canvas: {
          ...canvas,
          elements: {
            ...canvas.elements,
            [id]: updatedElement as CanvasElement,
          },
        },
      });

      performanceMonitor.end(perfId);
    },

    updateElements: (updates) => {
      const perfId = performanceMonitor.start('批量更新元素', 'operation', { count: updates.length });
      const { canvas } = get();
      if (!canvas || updates.length === 0) {
        performanceMonitor.end(perfId);
        return;
      }

      // 保存更新前的元素状态
      const beforeElements = updates.map(({ id }) => canvas.elements[id]).filter(Boolean);

      // 批量更新元素
      const newElements = { ...canvas.elements };
      const afterElements: CanvasElement[] = [];

      updates.forEach(({ id, updates: elementUpdates }) => {
        if (newElements[id]) {
          const updatedElement = {
            ...newElements[id],
            ...elementUpdates,
            updatedAt: new Date().toISOString(),
          };
          newElements[id] = updatedElement as CanvasElement;
          afterElements.push(updatedElement as CanvasElement);
        }
      });

      set({
        canvas: {
          ...canvas,
          elements: newElements,
        },
      });

      // 添加到历史记录（单次操作）
      get().addToHistory({
        type: 'update',
        elementIds: updates.map(({ id }) => id),
        before: beforeElements,
        after: afterElements,
        timestamp: Date.now(),
      });

      performanceMonitor.end(perfId);
    },

    deleteElement: (id) => {
      const perfId = performanceMonitor.start('删除元素', 'operation', { elementId: id });
      const { canvas, selection } = get();
      if (!canvas) {
        performanceMonitor.end(perfId);
        return;
      }

      // 保存删除前的元素状态
      const deletedElement = canvas.elements[id];

      const newElements = { ...canvas.elements };
      delete newElements[id];

      const newRootElements = canvas.rootElements.filter(eid => eid !== id);

      // 从选中列表中移除
      const newSelection = {
        ...selection,
        elementIds: selection.elementIds.filter(eid => eid !== id),
      };

      set({
        canvas: {
          ...canvas,
          elements: newElements,
          rootElements: newRootElements,
        },
        selection: newSelection,
      });

      // 添加到历史记录
      get().addToHistory({
        type: 'delete',
        elementIds: [id],
        before: [deletedElement],
        after: undefined,
        timestamp: Date.now(),
      });

      // 保存
      get().saveCanvas();
      performanceMonitor.end(perfId);
    },

    deleteElements: (ids) => {
      const perfId = performanceMonitor.start('批量删除元素', 'operation', { count: ids.length });
      const { canvas, selection } = get();
      if (!canvas || ids.length === 0) {
        performanceMonitor.end(perfId);
        return;
      }

      // 保存删除前的元素状态
      const deletedElements = ids.map(id => canvas.elements[id]).filter(Boolean);

      // 批量删除元素
      const newElements = { ...canvas.elements };
      ids.forEach(id => delete newElements[id]);

      // 批量从rootElements中移除
      const newRootElements = canvas.rootElements.filter(eid => !ids.includes(eid));

      // 从选中列表中批量移除
      const newSelection = {
        ...selection,
        elementIds: selection.elementIds.filter(eid => !ids.includes(eid)),
      };

      set({
        canvas: {
          ...canvas,
          elements: newElements,
          rootElements: newRootElements,
        },
        selection: newSelection,
      });

      // 添加到历史记录（单次操作）
      get().addToHistory({
        type: 'delete',
        elementIds: ids,
        before: deletedElements,
        after: undefined,
        timestamp: Date.now(),
      });

      // 只保存一次
      get().saveCanvas();
      performanceMonitor.end(perfId);
    },

    getElement: (id) => {
      const { canvas } = get();
      return canvas?.elements[id];
    },

    getAllElements: () => {
      const { canvas } = get();
      if (!canvas) return [];

      // 使用元素ID列表作为hash，检测元素是否变化
      const currentHash = Object.keys(canvas.elements).sort().join(',');

      // 只有在元素变化时才创建新数组
      if (currentHash !== cachedElementsHash) {
        cachedElements = Object.values(canvas.elements);
        cachedElementsHash = currentHash;
        console.log(`[Store] getAllElements缓存更新，元素数量: ${cachedElements.length}`);
      }

      return cachedElements;
    },

    getRootElements: () => {
      const { canvas } = get();
      if (!canvas) return [];
      return canvas.rootElements.map(id => canvas.elements[id]).filter(Boolean);
    },

    getChildren: (parentId) => {
      const { canvas } = get();
      if (!canvas) return [];
      return Object.values(canvas.elements).filter(el => el.parentId === parentId);
    },

    // ==================== 选择操作 ====================

    selectElement: (id, addToSelection = false) => {
      const { selection } = get();
      const elementIds = addToSelection
        ? [...selection.elementIds, id]
        : [id];
      set({ selection: { elementIds } });
    },

    selectElements: (ids) => {
      set({ selection: { elementIds: ids } });
    },

    clearSelection: () => {
      set({ selection: { elementIds: [] } });
    },

    selectAll: () => {
      const { canvas } = get();
      if (!canvas) return;
      const allIds = Object.keys(canvas.elements);
      set({ selection: { elementIds: allIds } });
    },

    // ==================== 其他操作（简化实现）====================

    moveElement: (id, delta) => {
      const element = get().getElement(id);
      if (!element) return;

      get().updateElement(id, {
        position: {
          x: element.position.x + delta.x,
          y: element.position.y + delta.y,
        },
      });
    },

    moveElements: (ids, delta) => {
      ids.forEach(id => get().moveElement(id, delta));
    },

    resizeElement: (id, size) => {
      get().updateElement(id, { size });
    },

    rotateElement: (id, angle) => {
      get().updateElement(id, { rotation: angle });
    },

    bringToFront: (id) => {
      // 简化实现
      get().updateElement(id, { zIndex: 9999 });
    },

    sendToBack: (id) => {
      get().updateElement(id, { zIndex: -9999 });
    },

    bringForward: (id) => {
      const element = get().getElement(id);
      if (!element) return;
      get().updateElement(id, { zIndex: (element.zIndex || 0) + 1 });
    },

    sendBackward: (id) => {
      const element = get().getElement(id);
      if (!element) return;
      get().updateElement(id, { zIndex: (element.zIndex || 0) - 1 });
    },

    groupElements: (ids) => {
      // TODO: 实现组合逻辑
      console.log('组合元素:', ids);
    },

    ungroupElement: (id) => {
      // TODO: 实现取消组合逻辑
      console.log('取消组合:', id);
    },

    alignElements: (ids, type) => {
      // TODO: 实现对齐逻辑
      console.log('对齐元素:', ids, type);
    },

    distributeElements: (ids, type) => {
      // TODO: 实现分布逻辑
      console.log('分布元素:', ids, type);
    },

    undo: () => {
      const perfId = performanceMonitor.start('撤销操作', 'operation');
      const { history, historyIndex, canvas } = get();

      if (historyIndex < 0 || !canvas) {
        performanceMonitor.end(perfId);
        return;
      }

      const operation = history[historyIndex];

      // 根据操作类型执行撤销
      if (operation.type === 'create') {
        // 撤销创建 = 删除元素（批量处理）
        const newElements = { ...canvas.elements };
        const newRootElements = [...canvas.rootElements];

        operation.elementIds.forEach(id => {
          delete newElements[id];
          const index = newRootElements.indexOf(id);
          if (index > -1) {
            newRootElements.splice(index, 1);
          }
        });

        set({
          canvas: {
            ...canvas,
            elements: newElements as any,
            rootElements: newRootElements,
          },
        });
      } else if (operation.type === 'delete') {
        // 撤销删除 = 恢复元素
        if (operation.before) {
          const newElements = { ...canvas.elements };
          const newRootElements = [...canvas.rootElements];

          operation.before.forEach((el, index) => {
            const id = operation.elementIds[index];
            newElements[id] = el as CanvasElement;
            // 如果元素没有父元素，添加到rootElements
            if (!(el as CanvasElement).parentId && !newRootElements.includes(id)) {
              newRootElements.push(id);
            }
          });

          set({
            canvas: {
              ...canvas,
              elements: newElements,
              rootElements: newRootElements,
            },
          });
        }
      } else if (operation.type === 'update') {
        // 撤销更新 = 恢复旧值
        if (operation.before) {
          operation.before.forEach((updates, index) => {
            const id = operation.elementIds[index];
            const element = canvas.elements[id];
            if (element) {
              set({
                canvas: {
                  ...canvas,
                  elements: {
                    ...canvas.elements,
                    [id]: { ...element, ...updates } as CanvasElement,
                  },
                },
              });
            }
          });
        }
      }

      set({ historyIndex: historyIndex - 1 });
      performanceMonitor.end(perfId);
    },

    redo: () => {
      const perfId = performanceMonitor.start('重做操作', 'operation');
      const { history, historyIndex, canvas } = get();

      if (historyIndex >= history.length - 1 || !canvas) {
        performanceMonitor.end(perfId);
        return;
      }

      const operation = history[historyIndex + 1];

      // 根据操作类型执行重做
      if (operation.type === 'create') {
        // 重做创建 = 添加元素
        if (operation.after && Array.isArray(operation.after)) {
          const newElements = { ...canvas.elements };
          const newRootElements = [...canvas.rootElements];

          operation.after.forEach((el, index) => {
            const id = operation.elementIds[index];
            newElements[id] = el as CanvasElement;
            // 如果元素没有父元素，添加到rootElements
            if (!(el as CanvasElement).parentId && !newRootElements.includes(id)) {
              newRootElements.push(id);
            }
          });

          set({
            canvas: {
              ...canvas,
              elements: newElements as any,
              rootElements: newRootElements,
            },
          });
        }
      } else if (operation.type === 'delete') {
        // 重做删除 = 删除元素（批量处理）
        const newElements = { ...canvas.elements };
        const newRootElements = [...canvas.rootElements];

        operation.elementIds.forEach(id => {
          delete newElements[id];
          const index = newRootElements.indexOf(id);
          if (index > -1) {
            newRootElements.splice(index, 1);
          }
        });

        set({
          canvas: {
            ...canvas,
            elements: newElements,
            rootElements: newRootElements,
          },
        });
      } else if (operation.type === 'update') {
        // 重做更新 = 应用新值
        if (operation.after) {
          operation.after.forEach((updates, index) => {
            const id = operation.elementIds[index];
            const element = canvas.elements[id];
            if (element) {
              set({
                canvas: {
                  ...canvas,
                  elements: {
                    ...canvas.elements,
                    [id]: { ...element, ...updates } as CanvasElement,
                  },
                },
              });
            }
          });
        }
      }

      set({ historyIndex: historyIndex + 1 });
      performanceMonitor.end(perfId);
    },

    addToHistory: (operation) => {
      const { history, historyIndex } = get();
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(operation);

      // 限制历史记录数量（最多50条）
      const maxHistory = 50;
      if (newHistory.length > maxHistory) {
        newHistory.shift();
      }

      set({ history: newHistory, historyIndex: newHistory.length - 1 });
    },

    clearHistory: () => {
      set({ history: [], historyIndex: -1 });
    },
  };
});

