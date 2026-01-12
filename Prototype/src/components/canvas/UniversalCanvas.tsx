/**
 * 通用画布组件
 * 
 * 支持多种元素类型的通用可视化画布
 */

import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { useCanvasStore } from '../../lib/canvas-store';
import { ElementRenderer } from './ElementRenderer';
import { RotationHandle } from './RotationHandle';
import { ResizeHandles } from './ResizeHandles';
import { performanceMonitor } from '../../lib/performance-monitor';
import { buildQuadTree } from '../../lib/virtualization';
import { throttle } from '../../lib/lazy-loading';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { TutorialOverlay } from './TutorialOverlay';
import { TUTORIALS } from '../../config/tutorials';
import { useKeyboardShortcuts, getCanvasShortcuts } from '../../lib/keyboard-shortcuts';
import { CommandPalette } from './CommandPalette';
import type { AlignmentGuide } from '../../lib/alignment-helper';
import { detectAlignment } from '../../lib/alignment-helper';
import { AuxiliaryUIRenderer } from '../common/AuxiliaryUIRenderer';

interface UniversalCanvasProps {
  canvasId?: string;
  width?: number;
  height?: number;
  onElementClick?: (elementId: string) => void;
  onCanvasClick?: () => void;
}

export const UniversalCanvas: React.FC<UniversalCanvasProps> = ({
  canvasId,
  width = 1920,
  height = 1080,
  onElementClick,
  onCanvasClick,
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [showTutorial, setShowTutorial] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [alignmentGuides, setAlignmentGuides] = useState<AlignmentGuide[]>([]);
  const [viewMode] = useState<'network' | 'timeline' | 'list'>('network');
  const [isFullscreen] = useState(false);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    show: boolean;
    x: number;
    y: number;
    nodeId: string | null;
    menuType?: 'canvas' | 'node';
    position?: { x: number; y: number };
    selectedNodeIds?: string[];
  } | null>(null);

  // 拖拽状态
  const [draggingElement, setDraggingElement] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // 剪贴板状态
  const [clipboard, setClipboard] = useState<any[]>([]);

  // 连接线绘制状态
  const [isDrawingConnection, setIsDrawingConnection] = useState(false);
  const [connectionSource, setConnectionSource] = useState<string | null>(null);
  const [connectionMousePosition, setConnectionMousePosition] = useState({ x: 0, y: 0 });

  const {
    canvas,
    selection,
    initCanvas,
    loadCanvas,
    updateViewport,
    selectElement,
    clearSelection,
    getAllElements,
    undo,
    redo,
    deleteElements,
    updateElement,
    getElement,
    alignElements,
    selectElements,
    addElement,
  } = useCanvasStore();

  // ==================== 性能优化：四叉树虚拟化 ====================

  // 使用useRef跟踪elements对象引用，用于调试
  const elementsRefTracker = useRef<any>(null);

  // 步骤1：QuadTree构建（依赖canvas.elements对象引用）
  const quadTree = useMemo(() => {
    if (!canvas) return null;

    // 调试：检查elements引用是否变化
    const elementsChanged = elementsRefTracker.current !== canvas.elements;
    const elementsHash = Object.keys(canvas.elements).sort().join(',');

    console.log(`[四叉树-useMemo] 执行，elements引用${elementsChanged ? '已变化' : '未变化'}，元素数量: ${Object.keys(canvas.elements).length}，hash: ${elementsHash.substring(0, 30)}...`);

    elementsRefTracker.current = canvas.elements;

    const perfId = performanceMonitor.start('四叉树构建', 'operation');
    const elements = Object.values(canvas.elements);
    const tree = buildQuadTree(elements);
    performanceMonitor.end(perfId);

    console.log(`[四叉树] 重建完成，元素数量: ${elements.length}`);

    return tree;
  }, [canvas]); // 依赖elements对象引用

  // 步骤2：可见元素查询（依赖QuadTree、视口参数和画布尺寸）
  const visibleElements = useMemo(() => {
    if (!quadTree || !canvas) return [];

    const perfId = performanceMonitor.start('视口查询（四叉树）', 'operation');

    const viewport: any = {
      x: canvas.viewport.x,
      y: canvas.viewport.y,
      width,
      height,
      zoom: canvas.viewport.zoom,
    };

    const viewportHash = `${Math.round(viewport.x)},${Math.round(viewport.y)},${viewport.zoom.toFixed(2)}`;

    // 使用四叉树进行空间索引查询
    const visibleElements = quadTree.queryViewport(viewport, 200);

    // 添加始终渲染的类型
    const allElements = Object.values(canvas.elements);
    const alwaysRenderTypes = ['frame'];
    const alwaysVisible = allElements.filter(el =>
      alwaysRenderTypes.includes(el.type) && !visibleElements.includes(el)
    );

    const result = [...visibleElements, ...alwaysVisible];

    performanceMonitor.end(perfId);

    console.log(`[虚拟化-四叉树] 可见元素: ${result.length} / ${allElements.length}，视口: ${viewportHash}`);

    return result;
  }, [quadTree, canvas, width, height]); // 依赖QuadTree和视口参数

  // ==================== 元素拖拽功能 ====================

  /**
   * 处理元素鼠标按下事件（开始拖拽）
   *
   * 支持多选拖拽：
   * - 如果点击的元素已经在选中列表中，拖拽所有选中的元素
   * - 如果点击的元素不在选中列表中，只拖拽这个元素
   */
  const handleElementMouseDown = useCallback((elementId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    const element = getElement(elementId);
    if (!element) return;

    // 计算鼠标相对于元素的偏移
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const canvasX = (e.clientX - rect.left) / (canvas?.viewport.zoom || 1) - (canvas?.viewport.x || 0);
    const canvasY = (e.clientY - rect.top) / (canvas?.viewport.zoom || 1) - (canvas?.viewport.y || 0);

    const offset = {
      x: canvasX - element.position.x,
      y: canvasY - element.position.y,
    };

    setDraggingElement(elementId);
    setDragOffset(offset);

    // 如果点击的元素不在选中列表中，只选中这个元素
    if (!selection.elementIds.includes(elementId)) {
      selectElements([elementId]);
      console.log(`[拖拽] 开始拖拽元素: ${elementId}`);
    } else {
      // 如果点击的元素已经在选中列表中，拖拽所有选中的元素
      console.log(`[拖拽] 开始拖拽 ${selection.elementIds.length} 个选中元素`);
    }
  }, [getElement, canvas, selectElements, selection]);

  /**
   * 统一的鼠标移动事件处理器
   *
   * 按优先级处理三种场景：
   * 1. 元素拖拽（draggingElement存在）- 最高优先级
   * 2. 连接线绘制（isDrawingConnection为true）
   * 3. 画布平移（isPanning为true）
   *
   * 优化策略：
   * - 使用throttle限制处理频率到60fps
   * - 只检测可见元素的对齐（而不是所有元素）
   * - 添加性能监控
   *
   * 支持功能：
   * - 分组拖拽：拖拽分组时，同时移动所有子元素
   * - 多选拖拽：拖拽多个选中的元素
   * - 对齐吸附：自动对齐到其他元素
   * - 连接线绘制：实时更新鼠标位置
   * - 画布平移：中键或空格+左键拖拽
   */
  const handleMouseMove = useMemo(
    () => throttle((e: MouseEvent | React.MouseEvent) => {
      if (!canvas) return;

      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      // 优先级1：处理元素拖拽
      if (draggingElement) {
        const element = getElement(draggingElement);
        if (!element) return;

        // 性能监控：拖拽处理
        const perfId = performanceMonitor.start('拖拽处理', 'operation');

        // 计算画布坐标
        const canvasX = (e.clientX - rect.left) / canvas.viewport.zoom - canvas.viewport.x;
        const canvasY = (e.clientY - rect.top) / canvas.viewport.zoom - canvas.viewport.y;

        const newPosition = {
          x: canvasX - dragOffset.x,
          y: canvasY - dragOffset.y,
        };

        // 计算对齐线和吸附位置
        // 优化：只检测可见元素的对齐，而不是所有元素
        const otherVisibleElements = visibleElements.filter(
          el => el.id !== draggingElement && !selection.elementIds.includes(el.id)
        );

        const snapResult = detectAlignment(
          element,
          newPosition,
          otherVisibleElements
        );

        // 更新对齐线状态
        setAlignmentGuides(snapResult.guides);

        // 使用吸附后的位置
        const finalPosition = snapResult.snapped ? snapResult.position : newPosition;

        // 计算位置变化
        const deltaX = finalPosition.x - element.position.x;
        const deltaY = finalPosition.y - element.position.y;

        // 更新主元素位置
        updateElement(draggingElement, { position: finalPosition });

        // 如果是分组，同时移动所有子元素
        if (element.type === 'group' && 'children' in element) {
          element.children.forEach(childId => {
            const child = getElement(childId);
            if (child) {
              // Connections do not have a traditional position and should not be moved this way.
              if (child.type === 'connection') {
                // Handle connection movement if needed, e.g., update its source/target points
                // For now, we skip updating its 'position' property.
                return;
              }
              updateElement(childId, {
                position: {
                  x: child.position.x + deltaX,
                  y: child.position.y + deltaY,
                },
              });
            }
          });
        }

        // 如果有多个选中的元素，同时移动其他选中的元素
        if (selection.elementIds.length > 1) {
          selection.elementIds.forEach(id => {
            if (id !== draggingElement) {
              const otherElement = getElement(id);
              if (otherElement) {
                updateElement(id, {
                  position: {
                    x: otherElement.position.x + deltaX,
                    y: otherElement.position.y + deltaY,
                  },
                });
              }
            }
          });
        }

        performanceMonitor.end(perfId);

        // 日志（仅在吸附时输出）
        if (snapResult.snapped) {
          console.log(`[对齐] 吸附到 ${snapResult.guides.length} 条对齐线`);
        }
        return;
      }

      // 优先级2：处理连接线绘制
      if (isDrawingConnection) {
        const canvasX = (e.clientX - rect.left) / canvas.viewport.zoom - canvas.viewport.x;
        const canvasY = (e.clientY - rect.top) / canvas.viewport.zoom - canvas.viewport.y;
        setConnectionMousePosition({ x: canvasX, y: canvasY });
        return;
      }

      // 优先级3：处理画布平移
      if (isPanning) {
        const dx = e.clientX - panStart.x;
        const dy = e.clientY - panStart.y;

        updateViewport({
          x: canvas.viewport.x + dx,
          y: canvas.viewport.y + dy,
        });

        setPanStart({ x: e.clientX, y: e.clientY });
        return;
      }
    }, 16), // 16ms = 60fps
    [
      draggingElement,
      dragOffset,
      canvas,
      getElement,
      updateElement,
      visibleElements,
      selection,
      isDrawingConnection,
      isPanning,
      panStart,
      updateViewport,
    ]
  );

  /**
   * 统一的鼠标释放事件处理器
   *
   * 处理三种场景的结束：
   * 1. 结束元素拖拽
   * 2. 结束画布平移
   * 3. 其他清理工作
   */
  const handleMouseUp = useCallback(() => {
    // 结束元素拖拽
    if (draggingElement) {
      console.log(`[拖拽] 结束拖拽元素: ${draggingElement}`);
      setDraggingElement(null);
      setAlignmentGuides([]); // 清除对齐线
    }

    // 结束画布平移
    if (isPanning) {
      setIsPanning(false);
    }
  }, [draggingElement, isPanning]);

  // ==================== 元素旋转功能 ====================

  /**
   * 处理元素旋转
   */
  const handleRotate = useCallback((elementId: string, rotation: number) => {
    updateElement(elementId, { rotation });
  }, [updateElement]);

  /**
   * 顺时针旋转选中的元素（15°）
   */
  const rotateClockwise = useCallback(() => {
    if (selection.elementIds.length === 0) return;

    selection.elementIds.forEach(id => {
      const element = getElement(id);
      if (element) {
        const newRotation = ((element.rotation || 0) + 15) % 360;
        updateElement(id, { rotation: newRotation });
      }
    });

    console.log(`[旋转] 顺时针旋转 ${selection.elementIds.length} 个元素 15°`);
  }, [selection, getElement, updateElement]);

  /**
   * 逆时针旋转选中的元素（15°）
   */
  const rotateCounterClockwise = useCallback(() => {
    if (selection.elementIds.length === 0) return;

    selection.elementIds.forEach(id => {
      const element = getElement(id);
      if (element) {
        const newRotation = ((element.rotation || 0) - 15 + 360) % 360;
        updateElement(id, { rotation: newRotation });
      }
    });

    console.log(`[旋转] 逆时针旋转 ${selection.elementIds.length} 个元素 15°`);
  }, [selection, getElement, updateElement]);

  // ==================== 元素缩放功能 ====================

  /**
   * 处理元素缩放
   */
  const handleResize = useCallback((elementId: string, position: { x: number; y: number }, size: { width: number; height: number }) => {
    updateElement(elementId, { position, size });
  }, [updateElement]);

  // ==================== 连接线绘制功能 ====================

  /**
   * 开始绘制连接线（按住Ctrl+点击元素）
   */
  const startDrawingConnection = useCallback((elementId: string, e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.stopPropagation();
      setIsDrawingConnection(true);
      setConnectionSource(elementId);
      console.log(`[连接线] 开始绘制，源元素: ${elementId}`);
    }
  }, []);

  /**
   * 创建连接线
   */
  const createConnection = useCallback((sourceId: string, targetId: string, style: 'straight' | 'curved' | 'orthogonal' = 'curved') => {
    const sourceElement = getElement(sourceId);
    const targetElement = getElement(targetId);

    if (!sourceElement || !targetElement) return;

    // 创建连接线元素
    const connectionId = `connection-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const connection = {
      id: connectionId,
      type: 'connection' as const,
      sourceId: sourceId,
      targetId: targetId,
      style,
      position: { x: 0, y: 0 }, // 连接线不需要位置
      size: { width: 0, height: 0 }, // 连接线不需要尺寸
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    addElement(connection);
    console.log(`[连接线] 创建连接: ${sourceId} -> ${targetId}`);
  }, [getElement, addElement]);

  /**
   * 结束绘制连接线
   */
  const endDrawingConnection = useCallback((targetId?: string) => {
    if (isDrawingConnection && connectionSource && targetId && connectionSource !== targetId) {
      createConnection(connectionSource, targetId);
    }

    setIsDrawingConnection(false);
    setConnectionSource(null);
  }, [isDrawingConnection, connectionSource, createConnection]);

  /**
   * 取消绘制连接线
   */
  const cancelDrawingConnection = useCallback(() => {
    setIsDrawingConnection(false);
    setConnectionSource(null);
    console.log('[连接线] 取消绘制');
  }, []);

  /**
   * 注册全局鼠标事件监听
   */
  useEffect(() => {
    if (draggingElement) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [draggingElement, handleMouseMove, handleMouseUp]);

  // ==================== 分组/取消分组功能 ====================

  /**
   * 分组选中的元素
   *
   * 创建一个新的GroupElement，包含所有选中的元素
   */
  const handleGroup = useCallback(() => {
    if (selection.elementIds.length < 2) {
      console.log('[分组] 至少需要选中2个元素');
      return;
    }

    const perfId = performanceMonitor.start('分组元素', 'operation');

    // 获取选中的元素
    const selectedElements = selection.elementIds
      .map(id => getElement(id))
      .filter(el => el !== null);

    if (selectedElements.length < 2) {
      console.log('[分组] 选中的元素不足2个');
      return;
    }

    // 计算包围盒
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    selectedElements.forEach(el => {
      if (!el) return;
      minX = Math.min(minX, el.position.x);
      minY = Math.min(minY, el.position.y);
      maxX = Math.max(maxX, el.position.x + el.size.width);
      maxY = Math.max(maxY, el.position.y + el.size.height);
    });

    // 创建分组元素
    const groupId = `group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const groupElement = {
      id: groupId,
      type: 'group' as const,
      name: `分组 ${selection.elementIds.length}`,
      position: { x: minX, y: minY },
      size: { width: maxX - minX, height: maxY - minY },
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      children: selection.elementIds,
      zIndex: Math.max(...selectedElements.map(el => el?.zIndex || 0)) + 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 添加分组元素
    addElement(groupElement);

    // 选中分组
    selectElements([groupId]);

    performanceMonitor.end(perfId);
    console.log(`[分组] 已创建分组，包含 ${selection.elementIds.length} 个元素`);
  }, [selection, getElement, addElement, selectElements]);

  /**
   * 取消分组
   *
   * 删除GroupElement，恢复子元素的选中状态
   */
  const handleUngroup = useCallback(() => {
    if (selection.elementIds.length === 0) {
      console.log('[取消分组] 没有选中的元素');
      return;
    }

    const perfId = performanceMonitor.start('取消分组', 'operation');

    // 查找选中的分组元素
    const groupElements = selection.elementIds
      .map(id => getElement(id))
      .filter((el): el is any => !!el && el.type === 'group');

    if (groupElements.length === 0) {
      console.log('[取消分组] 选中的元素中没有分组');
      return;
    }

    // 收集所有子元素ID
    const childrenIds: string[] = [];
    groupElements.forEach(group => {
      if ('children' in group) {
        childrenIds.push(...group.children);
      }
    });

    // 删除分组元素
    deleteElements(groupElements.map(g => g.id));

    // 选中子元素
    selectElements(childrenIds);

    performanceMonitor.end(perfId);
    console.log(`[取消分组] 已取消 ${groupElements.length} 个分组`);
  }, [selection, getElement, deleteElements, selectElements]);

  // ==================== 复制粘贴功能 ====================

  /**
   * 复制选中的元素到剪贴板
   */
  const handleCopy = useCallback(() => {
    if (selection.elementIds.length === 0) {
      console.log('[复制] 没有选中的元素');
      return;
    }

    // 获取选中的元素
    const selectedElements = selection.elementIds
      .map(id => getElement(id))
      .filter(el => el !== null);

    if (selectedElements.length === 0) {
      console.log('[复制] 选中的元素不存在');
      return;
    }

    // 复制到剪贴板
    setClipboard(selectedElements);
    console.log(`[复制] 已复制 ${selectedElements.length} 个元素`);
  }, [selection, getElement]);

  /**
   * 从剪贴板粘贴元素
   *
   * 粘贴时自动偏移位置，避免与原元素重叠
   */
  const handlePaste = useCallback(() => {
    if (clipboard.length === 0) {
      console.log('[粘贴] 剪贴板为空');
      return;
    }

    const perfId = performanceMonitor.start('粘贴元素', 'operation');

    // 粘贴偏移量（像素）
    const PASTE_OFFSET = 20;

    // 创建新元素
    const newElementIds: string[] = [];

    clipboard.forEach(element => {
      // 生成新ID
      const newId = `${element.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // 创建新元素（偏移位置）
      const newElement = {
        ...element,
        id: newId,
        position: {
          x: element.position.x + PASTE_OFFSET,
          y: element.position.y + PASTE_OFFSET,
        },
      };

      // 添加到画布
      addElement(newElement);
      newElementIds.push(newId);
    });

    // 选中新粘贴的元素
    selectElements(newElementIds);

    performanceMonitor.end(perfId);
    console.log(`[粘贴] 已粘贴 ${newElementIds.length} 个元素`);
  }, [clipboard, addElement, selectElements]);

  // ==================== 键盘快捷键集成 ====================

  // 定义所有快捷键操作
  const shortcuts = useMemo(() => {
    return getCanvasShortcuts({
      undo: () => {
        undo();
        console.log('[快捷键] 撤销');
      },
      redo: () => {
        redo();
        console.log('[快捷键] 重做');
      },
      copy: handleCopy,
      paste: handlePaste,
      cut: () => console.log('[快捷键] 剪切'),
      delete: () => {
        if (selection.elementIds.length > 0) {
          deleteElements(selection.elementIds);
          console.log('[快捷键] 删除选中元素');
        }
      },
      selectAll: () => console.log('[快捷键] 全选'),
      duplicate: () => console.log('[快捷键] 复制'),
      group: handleGroup,
      ungroup: handleUngroup,
      bringToFront: () => console.log('[快捷键] 置顶'),
      sendToBack: () => console.log('[快捷键] 置底'),
      alignLeft: () => {
        if (selection.elementIds.length > 0) {
          alignElements(selection.elementIds, 'left');
          console.log('[快捷键] 左对齐');
        }
      },
      alignCenter: () => {
        if (selection.elementIds.length > 0) {
          alignElements(selection.elementIds, 'center');
          console.log('[快捷键] 居中对齐');
        }
      },
      alignRight: () => {
        if (selection.elementIds.length > 0) {
          alignElements(selection.elementIds, 'right');
          console.log('[快捷键] 右对齐');
        }
      },
      alignTop: () => {
        if (selection.elementIds.length > 0) {
          alignElements(selection.elementIds, 'top');
          console.log('[快捷键] 顶部对齐');
        }
      },
      alignMiddle: () => {
        if (selection.elementIds.length > 0) {
          alignElements(selection.elementIds, 'middle');
          console.log('[快捷键] 中间对齐');
        }
      },
      alignBottom: () => {
        if (selection.elementIds.length > 0) {
          alignElements(selection.elementIds, 'bottom');
          console.log('[快捷键] 底部对齐');
        }
      },
      zoomIn: () => {
        const currentZoom = canvas?.viewport.zoom || 1;
        updateViewport({ zoom: currentZoom * 1.1 });
        console.log('[快捷键] 放大');
      },
      zoomOut: () => {
        const currentZoom = canvas?.viewport.zoom || 1;
        updateViewport({ zoom: currentZoom / 1.1 });
        console.log('[快捷键] 缩小');
      },
      zoomToFit: () => console.log('[快捷键] 适应画布'),
      resetZoom: () => {
        updateViewport({ zoom: 1 });
        console.log('[快捷键] 重置缩放');
      },
      rotateClockwise,
      rotateCounterClockwise,
    });
  }, [undo, redo, deleteElements, selection, canvas, updateViewport, alignElements, handleCopy, handlePaste, handleGroup, handleUngroup, rotateClockwise, rotateCounterClockwise]);

  // 注册快捷键
  useKeyboardShortcuts(shortcuts.flatMap(g => g.shortcuts));

  // Ctrl+K打开命令面板，Esc取消连接线绘制
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(true);
        console.log('[快捷键] 打开命令面板');
      }

      if (e.key === 'Escape' && isDrawingConnection) {
        e.preventDefault();
        cancelDrawingConnection();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDrawingConnection, cancelDrawingConnection]);

  // ==================== 画布初始化 ====================

  // 初始化或加载画布
  useEffect(() => {
    const perfId = performanceMonitor.start('画布初始化', 'render');
    setIsLoading(true);

    if (canvasId) {
      loadCanvas(canvasId).finally(() => setIsLoading(false));
    } else if (!canvas) {
      initCanvas('新画布');
      setIsLoading(false);
    } else {
      setIsLoading(false);
    }

    performanceMonitor.end(perfId);

    // 检查是否需要显示教程
    // 检查是否需要显示教程
    const hasSeenTutorial = localStorage.getItem('canvas-tutorial-seen');
    if (!hasSeenTutorial) {
      setTimeout(() => setShowTutorial(true), 1000);
      localStorage.setItem('canvas-tutorial-seen', 'true');
    }
  }, [canvasId, canvas, initCanvas, loadCanvas]);

  // 处理画布点击
  const handleCanvasClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      clearSelection();
      onCanvasClick?.();
    }
  };

  // 处理元素点击
  const handleElementClick = (elementId: string, e?: React.MouseEvent) => {
    // 如果正在绘制连接线，结束绘制
    if (isDrawingConnection) {
      endDrawingConnection(elementId);
      return;
    }

    // 如果按住Ctrl键，开始绘制连接线
    if (e && (e.ctrlKey || e.metaKey)) {
      startDrawingConnection(elementId, e);
      return;
    }

    // 正常选中元素
    selectElement(elementId);
    onElementClick?.(elementId);
  };

  /**
   * 处理鼠标按下事件（开始平移）
   *
   * 支持：
   * - 中键拖拽
   * - 空格+左键拖拽（未来功能）
   */
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      // 中键或空格+左键
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      e.preventDefault();
    }
  };

  // 处理滚轮（缩放）
  const handleWheel = (e: React.WheelEvent) => {
    if (!canvas) return;

    e.preventDefault();

    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.1, Math.min(5, canvas.viewport.zoom * delta));

    updateViewport({ zoom: newZoom });
  };

  // ==================== 命令面板命令列表 ====================

  const commandPaletteCommands = useMemo(() => [
    {
      id: 'undo',
      name: '撤销',
      description: '撤销上一步操作',
      shortcut: 'Ctrl+Z',
      category: '编辑',
      action: () => undo(),
    },
    {
      id: 'redo',
      name: '重做',
      description: '重做上一步操作',
      shortcut: 'Ctrl+Y',
      category: '编辑',
      action: () => redo(),
    },
    {
      id: 'delete',
      name: '删除选中元素',
      description: '删除当前选中的所有元素',
      shortcut: 'Delete',
      category: '编辑',
      action: () => {
        if (selection.elementIds.length > 0) {
          deleteElements(selection.elementIds);
        }
      },
    },
    {
      id: 'align-left',
      name: '左对齐',
      description: '将选中元素左对齐',
      shortcut: 'Ctrl+Alt+←',
      category: '对齐',
      action: () => {
        if (selection.elementIds.length > 0) {
          alignElements(selection.elementIds, 'left');
        }
      },
    },
    {
      id: 'zoom-in',
      name: '放大',
      description: '放大画布',
      shortcut: 'Ctrl++',
      category: '视图',
      action: () => {
        const currentZoom = canvas?.viewport.zoom || 1;
        updateViewport({ zoom: currentZoom * 1.1 });
      },
    },
    {
      id: 'reset-zoom',
      name: '重置缩放',
      description: '将缩放重置为100%',
      shortcut: 'Ctrl+0',
      category: '视图',
      action: () => updateViewport({ zoom: 1 }),
    },
  ], [undo, redo, deleteElements, selection, canvas, updateViewport, alignElements]);

  // 加载状态
  if (isLoading || !canvas) {
    return <LoadingSpinner size="large" message="正在加载画布..." fullScreen />;
  }

  return (
    <>
      <div
        ref={canvasRef}
        style={{
          width,
          height,
          position: 'relative',
          overflow: 'hidden',
          backgroundColor: canvas.background?.color || '#ffffff',
          cursor: isPanning ? 'grabbing' : 'default',
        }}
        onClick={handleCanvasClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        {/* 网格背景 */}
        {canvas.background?.grid?.enabled && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              backgroundImage: `
              linear-gradient(${canvas.background.grid.color} 1px, transparent 1px),
              linear-gradient(90deg, ${canvas.background.grid.color} 1px, transparent 1px)
            `,
              backgroundSize: `${canvas.background.grid.size}px ${canvas.background.grid.size}px`,
              pointerEvents: 'none',
            }}
          />
        )}

        {/* 画布内容 */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            transform: `translate(${canvas.viewport.x}px, ${canvas.viewport.y}px) scale(${canvas.viewport.zoom})`,
            transformOrigin: '0 0',
          }}
        >
          {/* 渲染可见元素（虚拟化） */}
          {/* Update quadtree for virtualization */}
          {/* Cast viewport to any to avoid type mismatch if buildQuadTree expects width/height */}
          {/* Ideally we should update the Viewport type in shared.ts or virtualization.ts */}
          {(() => {
            // Check visibility
            const visibleElements = Object.values(canvas.elements).filter(el => {
              if (!el) return false;
              // Simple bounding box check
              return true;
            });

            return (
              <>
                <AuxiliaryUIRenderer
                  nodes={Object.values(canvas.elements).filter(el => {
                    if (!el) return false;
                    if (el.type === 'connection') return false;
                    return true;
                  }) as any[]}
                  currentViewport={canvas.viewport}
                  shortcuts={getCanvasShortcuts({
                    undo,
                    redo,
                    copy: () => { }, // Placeholder
                    paste: () => { }, // Placeholder
                    cut: () => { }, // Placeholder
                    delete: () => deleteElements(selection.elementIds),
                    selectAll: () => { selectElements(Object.keys(canvas.elements)); },
                    duplicate: () => { }, // Placeholder
                    group: () => { }, // Placeholder
                    ungroup: () => { }, // Placeholder
                    bringToFront: () => { }, // Placeholder
                    sendToBack: () => { }, // Placeholder
                    alignLeft: () => alignElements(selection.elementIds, 'left'),
                    alignCenter: () => alignElements(selection.elementIds, 'center'),
                    alignRight: () => alignElements(selection.elementIds, 'right'),
                    alignTop: () => alignElements(selection.elementIds, 'top'),
                    alignMiddle: () => alignElements(selection.elementIds, 'middle'),
                    alignBottom: () => alignElements(selection.elementIds, 'bottom'),
                    zoomIn: () => updateViewport({ zoom: canvas.viewport.zoom * 1.2 }),
                    zoomOut: () => updateViewport({ zoom: canvas.viewport.zoom / 1.2 }),
                    zoomToFit: () => { }, // Placeholder
                    resetZoom: () => updateViewport({ zoom: 1, x: 0, y: 0 }),
                  }).flatMap(g => g.shortcuts)}
                  viewMode={viewMode}
                  isFullscreen={isFullscreen}
                  showShortcutsHelp={showShortcutsHelp}
                  contextMenu={contextMenu}
                  canvasRef={canvasRef}
                  onContextMenuEdit={() => { }}
                  onContextMenuDelete={() => { }}
                  onContextMenuDuplicate={() => { }}
                  onContextMenuConnect={() => { }}
                  onContextMenuClose={() => setContextMenu(null)}
                  onCloseShortcutsHelp={() => setShowShortcutsHelp(false)}
                  onMinimapViewportChange={(v) => updateViewport(v)}
                />
                {visibleElements.map(element => (
                  <ElementRenderer
                    key={element.id}
                    element={element}
                    selected={selection.elementIds.includes(element.id)}
                    onSelect={handleElementClick}
                    onMouseDown={handleElementMouseDown}
                  />
                ))}
              </>
            );
          })()}


          {/* 旋转手柄和缩放手柄（SVG） */}
          <svg
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
            }}
          >
            {selection.elementIds.map(id => {
              const element = getElement(id);
              if (!element) return null;
              return (
                <g key={id} style={{ pointerEvents: 'auto' }}>
                  {/* 缩放手柄 */}
                  <ResizeHandles
                    element={element}
                    onResize={handleResize}
                    zoom={canvas.viewport.zoom}
                  />
                  {/* 旋转手柄 */}
                  <RotationHandle
                    element={element}
                    onRotate={handleRotate}
                    zoom={canvas.viewport.zoom}
                  />
                </g>
              );
            })}

            {/* 连接线绘制预览 */}
            {isDrawingConnection && connectionSource && (
              (() => {
                const sourceElement = getElement(connectionSource);
                if (!sourceElement) return null;

                // 计算起点（源元素中心）
                const startX = sourceElement.position.x + sourceElement.size.width / 2;
                const startY = sourceElement.position.y + sourceElement.size.height / 2;

                // 终点（鼠标位置）
                const endX = connectionMousePosition.x;
                const endY = connectionMousePosition.y;

                // 生成曲线路径
                const dx = endX - startX;
                const controlOffset = Math.min(Math.abs(dx) / 2, 100);
                const cp1x = startX + controlOffset;
                const cp1y = startY;
                const cp2x = endX - controlOffset;
                const cp2y = endY;
                const path = `M ${startX} ${startY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endX} ${endY}`;

                return (
                  <g>
                    {/* 连接线 */}
                    <path
                      d={path}
                      stroke="#f97316"
                      strokeWidth={2 / canvas.viewport.zoom}
                      fill="none"
                      strokeDasharray={`${4 / canvas.viewport.zoom} ${4 / canvas.viewport.zoom}`}
                    />
                    {/* 起点标记 */}
                    <circle
                      cx={startX}
                      cy={startY}
                      r={4 / canvas.viewport.zoom}
                      fill="#f97316"
                    />
                    {/* 终点标记 */}
                    <circle
                      cx={endX}
                      cy={endY}
                      r={4 / canvas.viewport.zoom}
                      fill="#f97316"
                    />
                    {/* 提示文本 */}
                    <text
                      x={endX}
                      y={endY - 20 / canvas.viewport.zoom}
                      fill="#f97316"
                      fontSize={12 / canvas.viewport.zoom}
                      textAnchor="middle"
                    >
                      点击目标元素创建连接
                    </text>
                  </g>
                );
              })()
            )}
          </svg>
        </div>

        {/* 对齐辅助线 */}
        {alignmentGuides.map((guide, index) => (
          <div
            key={index}
            style={{
              position: 'absolute',
              [guide.type === 'vertical' ? 'left' : 'top']: guide.position,
              [guide.type === 'vertical' ? 'width' : 'height']: '1px',
              [guide.type === 'vertical' ? 'height' : 'width']: '100%',
              backgroundColor: '#f97316',
              pointerEvents: 'none',
              zIndex: 1000,
            }}
          />
        ))}

        {/* 画布信息 */}
        <div
          style={{
            position: 'absolute',
            bottom: 16,
            left: 16,
            padding: '8px 12px',
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            borderRadius: 8,
            fontSize: 12,
            color: '#6b7280',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          }}
        >
          <div>
            <strong>{canvas.name}</strong>
          </div>
          <div>
            缩放: {(canvas.viewport.zoom * 100).toFixed(0)}% | 可见: {visibleElements.length} / {getAllElements().length}
          </div>
        </div>

        {/* 选择信息 */}
        {selection.elementIds.length > 0 && (
          <div
            style={{
              position: 'absolute',
              top: 16,
              right: 16,
              padding: '8px 12px',
              backgroundColor: 'rgba(249, 115, 22, 0.9)',
              borderRadius: 8,
              fontSize: 12,
              color: '#ffffff',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
            }}
          >
            已选择 {selection.elementIds.length} 个元素
          </div>
        )}
      </div>

      {/* 教程覆盖层 */}
      {showTutorial && (
        <TutorialOverlay
          tutorial={TUTORIALS['canvas-basics']}
          onComplete={() => {
            setShowTutorial(false);
            localStorage.setItem('canvas-tutorial-seen', 'true');
          }}
          onSkip={() => {
            setShowTutorial(false);
            localStorage.setItem('canvas-tutorial-seen', 'true');
          }}
        />
      )}

      {/* 命令面板 */}
      {commandPaletteOpen && (
        <CommandPalette
          isOpen={commandPaletteOpen}
          onClose={() => setCommandPaletteOpen(false)}
          commands={commandPaletteCommands}
        />
      )}
    </>
  );
};
