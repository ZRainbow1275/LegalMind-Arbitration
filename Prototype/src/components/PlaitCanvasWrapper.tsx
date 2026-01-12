/**
 * Plait画布包装组件 - 基于Drawnix架构
 * 
 * 【架构说明】
 * 本组件完全遵循Drawnix的Wrapper+Board架构：
 * 1. Wrapper: 管理PlaitBoard实例和状态
 * 2. Board: 渲染SVG画布
 * 3. Children: 在Board内部渲染React组件（法律节点层）
 * 
 * 【参考】
 * - Drawnix源码: packages/react-board/src/wrapper.tsx
 * - Drawnix源码: packages/react-board/src/board.tsx
 * - Drawnix应用: packages/drawnix/src/drawnix.tsx
 */

import React, { useState, useImperativeHandle, forwardRef, useEffect, useRef } from 'react';
import { Board, Wrapper } from '@plait-board/react-board';
import {
  PlaitBoard,
  PlaitBoardOptions,
  PlaitElement,
  PlaitPlugin,
  Viewport,
  BoardTransforms,
} from '@plait/core';

// ==================== 接口定义 ====================

export interface PlaitCanvasWrapperProps {
  /** Plait元素数组（目前为空，只用于viewport管理） */
  elements: PlaitElement[];
  /** 元素变化回调 */
  onChange: (elements: PlaitElement[]) => void;
  /** Board配置选项 */
  options: PlaitBoardOptions;
  /** Plait插件 */
  plugins: PlaitPlugin[];
  /** React节点层（法律节点） */
  children?: React.ReactNode;
  /** 类名 */
  className?: string;
  /** 初始viewport */
  initialViewport?: Viewport;
  /** 当前viewport（用于外部控制） */
  viewport?: Viewport;
  /** Viewport变化回调 */
  onViewportChange?: (viewport: Viewport) => void;
}

export interface PlaitCanvasWrapperRef {
  /** 获取Board实例 */
  getBoard: () => PlaitBoard | null;
  /** 缩放到指定比例 */
  zoomTo: (zoom: number, point?: { x: number; y: number }) => void;
  /** 平移到指定位置 */
  moveTo: (position: { x: number; y: number }) => void;
  /** 设置viewport（完整设置） */
  setViewport: (viewport: { zoom?: number; x?: number; y?: number }) => void;
  /** 获取当前viewport */
  getViewport: () => { zoom: number; x: number; y: number };
  /** 重置视图 */
  resetView: () => void;
  /** 适应视口（自动缩放和居中所有内容） */
  fitViewport: () => void;
}

// ==================== 组件实现 ====================

export const PlaitCanvasWrapper = forwardRef<PlaitCanvasWrapperRef, PlaitCanvasWrapperProps>(
  (props, ref) => {
    const {
      elements,
      onChange,
      options,
      plugins,
      children,
      className = '',
      initialViewport,
      viewport: externalViewport,
      onViewportChange
    } = props;

    // Board实例引用
    const [board, setBoard] = useState<PlaitBoard | null>(null);

    // Viewport状态 - 用于响应式更新
    const [viewport, setViewport] = useState<Viewport>(
      initialViewport || { zoom: 1, origination: [0, 0] }
    );

    // 标志：是否是初始化阶段（防止初始化时的无限循环）
    const isInitializedRef = useRef(false);

    // 标志：是否正在内部更新viewport（防止Wrapper的onViewportChange覆盖）
    const isInternalUpdateRef = useRef(false);

    useEffect(() => {
      // 组件挂载后标记为已初始化
      isInitializedRef.current = true;
    }, []);

    // 同步外部viewport到内部状态
    useEffect(() => {
      if (externalViewport && isInitializedRef.current) {
        // 检查是否真的变化了
        const hasChanged =
          Math.abs(viewport.zoom - externalViewport.zoom) >= 0.001 ||
          Math.abs((viewport.origination?.[0] || 0) - (externalViewport.origination?.[0] || 0)) >= 0.1 ||
          Math.abs((viewport.origination?.[1] || 0) - (externalViewport.origination?.[1] || 0)) >= 0.1;

        if (hasChanged) {
          console.log('[PlaitCanvasWrapper] Syncing external viewport:', externalViewport);
          setViewport(externalViewport);
          viewportRef.current = externalViewport;
        }
      }
    }, [externalViewport, viewport.origination, viewport.zoom]);

    // ==================== 暴露给父组件的方法 ====================

    useImperativeHandle(ref, () => ({
      getBoard: () => board,

      zoomTo: (zoom: number) => {
        const clampedZoom = Math.max(0.1, Math.min(3, zoom));

        // 标记为内部更新
        isInternalUpdateRef.current = true;

        // 直接更新viewport状态
        const newViewport: Viewport = {
          ...viewport,
          zoom: clampedZoom
        };

        setViewport(newViewport);

        // 触发viewport变化回调
        onViewportChange?.(newViewport);

        console.log('[PlaitCanvasWrapper] Zoom updated:', clampedZoom);

        // 延迟重置标志，确保Wrapper的onViewportChange能看到这个标志
        setTimeout(() => {
          isInternalUpdateRef.current = false;
        }, 100);
      },

      moveTo: (position: { x: number; y: number }) => {
        try {
          // 标记为内部更新
          isInternalUpdateRef.current = true;

          // 更新内部viewport状态
          const newViewport: Viewport = {
            ...viewport,
            origination: [position.x, position.y]
          };

          setViewport(newViewport);

          // 触发viewport变化回调
          onViewportChange?.(newViewport);

          console.log('[PlaitCanvasWrapper] Position updated:', position);

          // 延迟重置标志
          setTimeout(() => {
            isInternalUpdateRef.current = false;
          }, 100);
        } catch (error) {
          console.error('[PlaitCanvasWrapper] Failed to move viewport:', error);
        }
      },

      setViewport: (newViewportPartial: { zoom?: number; x?: number; y?: number }) => {
        if (!board) {
          console.warn('[PlaitCanvasWrapper] Board not initialized, cannot set viewport');
          return;
        }

        try {
          // 计算新的origination和zoom
          const newOrigination: [number, number] = [
            newViewportPartial.x !== undefined ? newViewportPartial.x : (viewport.origination?.[0] || 0),
            newViewportPartial.y !== undefined ? newViewportPartial.y : (viewport.origination?.[1] || 0)
          ];
          const newZoom = newViewportPartial.zoom !== undefined ? newViewportPartial.zoom : viewport.zoom;

          // 使用Plait的官方API更新viewport
          BoardTransforms.updateViewport(board, newOrigination, newZoom);

          console.log('[PlaitCanvasWrapper] Viewport set via BoardTransforms:', { origination: newOrigination, zoom: newZoom });
        } catch (error) {
          console.error('[PlaitCanvasWrapper] Failed to set viewport:', error);
        }
      },

      getViewport: () => {
        return {
          zoom: viewport.zoom,
          x: viewport.origination?.[0] || 0,
          y: viewport.origination?.[1] || 0
        };
      },

      resetView: () => {
        try {
          // 标记为内部更新
          isInternalUpdateRef.current = true;

          // 重置viewport状态
          const newViewport: Viewport = {
            zoom: 1,
            origination: [0, 0]
          };

          setViewport(newViewport);

          // 触发viewport变化回调
          onViewportChange?.(newViewport);

          console.log('[PlaitCanvasWrapper] View reset');

          // 延迟重置标志
          setTimeout(() => {
            isInternalUpdateRef.current = false;
          }, 100);
        } catch (error) {
          console.error('[PlaitCanvasWrapper] Failed to reset view:', error);
        }
      },

      fitViewport: () => {
        try {
          // 标记为内部更新
          isInternalUpdateRef.current = true;

          // 简单实现：重置到默认视图
          // TODO: 未来可以计算所有节点的边界框并自动调整
          const newViewport: Viewport = {
            zoom: 1,
            origination: [0, 0]
          };

          setViewport(newViewport);

          // 触发viewport变化回调
          onViewportChange?.(newViewport);

          console.log('[PlaitCanvasWrapper] Viewport fitted');

          // 延迟重置标志
          setTimeout(() => {
            isInternalUpdateRef.current = false;
          }, 100);
        } catch (error) {
          console.error('[PlaitCanvasWrapper] Failed to fit viewport:', error);
        }
      }
    }), [board, viewport, onViewportChange]);

    // ==================== 画布拖拽和鼠标滚轮缩放 ====================

    const containerRef = useRef<HTMLDivElement>(null);
    const viewportRef = useRef(viewport);
    const onViewportChangeRef = useRef(onViewportChange);
    const isDraggingRef = useRef(false);
    const dragStartRef = useRef<{ x: number; y: number } | null>(null);

    // 保持ref同步
    useEffect(() => {
      viewportRef.current = viewport;
      onViewportChangeRef.current = onViewportChange;
    }, [viewport, onViewportChange]);

    // 画布拖拽功能
    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      const handleMouseDown = (e: MouseEvent) => {
        // 空格键 + 鼠标左键 或 鼠标中键 进行画布拖拽
        if ((e.button === 0 && e.shiftKey) || e.button === 1) {
          e.preventDefault();
          isDraggingRef.current = true;
          dragStartRef.current = { x: e.clientX, y: e.clientY };
          container.style.cursor = 'grabbing';
        }
      };

      const handleMouseMove = (e: MouseEvent) => {
        if (!isDraggingRef.current || !dragStartRef.current) return;

        e.preventDefault();

        const currentViewport = viewportRef.current;
        const deltaX = e.clientX - dragStartRef.current.x;
        const deltaY = e.clientY - dragStartRef.current.y;

        // 更新拖拽起点
        dragStartRef.current = { x: e.clientX, y: e.clientY };

        // 标记为内部更新
        isInternalUpdateRef.current = true;

        // 更新viewport位置
        const newViewport: Viewport = {
          ...currentViewport,
          origination: [
            (currentViewport.origination?.[0] || 0) + deltaX,
            (currentViewport.origination?.[1] || 0) + deltaY
          ]
        };

        setViewport(newViewport);
        onViewportChangeRef.current?.(newViewport);

        // 延迟重置标志
        setTimeout(() => {
          isInternalUpdateRef.current = false;
        }, 100);
      };

      const handleMouseUp = () => {
        if (isDraggingRef.current) {
          isDraggingRef.current = false;
          dragStartRef.current = null;
          container.style.cursor = '';
        }
      };

      container.addEventListener('mousedown', handleMouseDown);
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);

      return () => {
        container.removeEventListener('mousedown', handleMouseDown);
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }, []);

    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      const handleWheel = (e: WheelEvent) => {
        // Ctrl+滚轮 或 Meta+滚轮（Mac）进行缩放
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();

          // 使用ref获取最新的viewport，避免闭包问题
          const currentViewport = viewportRef.current;

          // 计算缩放增量
          const delta = -e.deltaY / 1000;
          const newZoom = Math.max(0.1, Math.min(3, currentViewport.zoom * (1 + delta)));

          // 检查是否真的变化了
          if (Math.abs(newZoom - currentViewport.zoom) < 0.001) {
            return; // 没有变化，不更新
          }

          // 标记为内部更新
          isInternalUpdateRef.current = true;

          // 更新viewport
          const newViewport: Viewport = {
            ...currentViewport,
            zoom: newZoom
          };

          setViewport(newViewport);
          onViewportChangeRef.current?.(newViewport);

          console.log('[PlaitCanvasWrapper] Wheel zoom:', newZoom);

          // 延迟重置标志
          setTimeout(() => {
            isInternalUpdateRef.current = false;
          }, 100);
        }
      };

      container.addEventListener('wheel', handleWheel, { passive: false });
      return () => container.removeEventListener('wheel', handleWheel);
    }, []); // 空依赖数组，只在mount时添加监听器

    // ==================== 渲染 ====================

    return (
      <div ref={containerRef} className={`relative w-full h-full ${className}`}>
        {/* Drawnix架构：Wrapper + Board */}
        <Wrapper
          value={elements}
          options={options}
          plugins={plugins}
          onChange={(data) => {
            if (data.children) {
              onChange(data.children as PlaitElement[]);
            }
          }}
          onViewportChange={() => {
            // 完全忽略Plait Wrapper的viewport变化
            // 我们只使用自己的viewport管理系统
            console.log('[PlaitCanvasWrapper] Ignoring Wrapper viewport change (using external viewport only)');
            return;
          }}
        >
          {/* Board组件 - 渲染SVG画布 */}
          <Board
            className="w-full h-full"
            afterInit={(boardInstance) => {
              // 延迟设置board，确保DOM元素已完全挂载
              setTimeout(() => {
                setBoard(boardInstance);
                console.log('[PlaitCanvasWrapper] Board initialized');

                // 阻止Plait的scroll事件触发viewport变化
                const viewportContainer = containerRef.current?.querySelector('.viewport-container');
                if (viewportContainer) {
                  // 阻止scroll事件
                  viewportContainer.addEventListener('scroll', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    (e.target as HTMLElement).scrollLeft = 0;
                    (e.target as HTMLElement).scrollTop = 0;
                  }, { capture: true });

                  console.log('[PlaitCanvasWrapper] Blocked Plait scroll events');
                }
              }, 100);
            }}
          >
            {/* 法律节点层 - 作为Board的children渲染 */}
            {children}
          </Board>
        </Wrapper>
      </div>
    );
  }
);

PlaitCanvasWrapper.displayName = 'PlaitCanvasWrapper';

