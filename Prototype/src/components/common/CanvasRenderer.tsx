/**
 * 画布渲染器组件
 * 
 * 负责渲染主画布区域，包括网格背景、Plait画布、对齐辅助线和节点
 */

import React from 'react';
import { PlaitCanvasWrapper, PlaitCanvasWrapperRef } from '../PlaitCanvasWrapper';
import { AlignmentGuides } from '../AlignmentGuides';
import { ConnectionLines } from '../ConnectionLines';
import { TemporaryConnectionLine } from '../TemporaryConnectionLine';
import { DraggableLegalNode } from '../DraggableLegalNode';
import { CommentMarker } from '../collaboration/CommentMarker';
import { CommentPanel } from '../collaboration/CommentPanel';
import { CursorRenderer } from '../collaboration/CursorRenderer';
import { VoiceZoneRenderer } from '../collaboration/VoiceZoneRenderer';
import { useCommentStore } from '../../stores/comment-store';
import { useCursorStore } from '../../stores/cursor-store';
import type { LegalNode } from '../workspace/types';
import type { Viewport } from '@plait/core';
import type { AlignmentGuide } from '../../lib/layout-engine';
import type { PlaitBoardOptions, PlaitPlugin, PlaitElement } from '@plait/core';
import { PlaitBoard } from '@plait/core'; // {{ AURA: Add - 导入PlaitBoard工具函数 }}

export interface CanvasRendererProps {
  canvasRef: React.RefObject<PlaitCanvasWrapperRef>;
  currentViewport: Viewport;
  visibleNodes: LegalNode[];
  plaitElements?: PlaitElement[]; // {{ AURA: Add - Plait元素 }}
  allNodes: LegalNode[];
  selectedNodeIds: string[];
  isConnecting: boolean;
  connectionStart: string | null;
  alignmentGuides: AlignmentGuide[];
  options: PlaitBoardOptions;
  plugins: PlaitPlugin[];
  lastViewportRef: React.MutableRefObject<{ zoom: number; x: number; y: number }>;
  onNodeSelect: (nodeId: string, isSelected: boolean) => void;
  onNodeDoubleClick: (nodeId: string) => void;
  onNodePositionChange: (nodeId: string, position: { x: number; y: number }) => void;
  onNodeConnectionClick: (nodeId: string) => void;
  onConnectionStart?: (nodeId: string) => void; // {{ AURA: Add - 连接开始回调 }}
  onAlignmentGuidesChange: (guides: AlignmentGuide[]) => void;
  onContextMenu: (e: React.MouseEvent, nodeId: string) => void;
  onCanvasDoubleClick?: (e: React.MouseEvent, canvasPosition: { x: number; y: number }) => void; // {{ AURA: Modify - 添加事件参数 }}
  onCanvasContextMenu?: (e: React.MouseEvent, position: { x: number; y: number }) => void; // {{ AURA: Add - 画布右键菜单回调 }}
  onCanvasDrop?: (e: React.DragEvent, position: { x: number; y: number }) => void;
  onViewportChange: (viewport: { zoom: number; x: number; y: number }) => void;
  onDocumentPreview?: (nodeId: string) => void; // {{ AURA: Add - 文档预览回调 }}
  onDocumentDownload?: (nodeId: string) => void; // {{ AURA: Add - 文档下载回调 }}
  className?: string;
}

export const CanvasRenderer = React.memo<CanvasRendererProps>(({
  canvasRef,
  currentViewport,
  visibleNodes,
  plaitElements = [], // {{ AURA: Add - 默认空数组 }}
  allNodes,
  selectedNodeIds,
  isConnecting,
  connectionStart,
  alignmentGuides,
  options,
  plugins,
  lastViewportRef,
  onNodeSelect,
  onNodeDoubleClick,
  onNodePositionChange,
  onNodeConnectionClick,
  onConnectionStart, // {{ AURA: Add - 连接开始回调 }}
  onAlignmentGuidesChange,
  onContextMenu,
  onCanvasDoubleClick,
  onCanvasContextMenu, // {{ AURA: Add - 接收画布右键菜单回调 }}
  onCanvasDrop,
  onViewportChange,
  onDocumentPreview,
  onDocumentDownload,
  className = '',
}) => {
  // {{ AURA: Add - 评论系统状态 }}
  const { comments, activeCommentId, setActiveComment, getComment } = useCommentStore();
  const activeComment = activeCommentId ? getComment(activeCommentId) : null;

  // {{ AURA: Fix - Viewport兼容性处理 }}
  const viewportX = currentViewport.origination ? currentViewport.origination[0] : 0;
  const viewportY = currentViewport.origination ? currentViewport.origination[1] : 0;
  const legacyViewport = { zoom: currentViewport.zoom, x: viewportX, y: viewportY };

  // {{ AURA: Add - 光标系统状态 }}
  const { updateCursor } = useCursorStore();
  const lastMouseMoveRef = React.useRef<number>(0);

  // {{ AURA: Add - 鼠标移动追踪（节流100ms） }}
  const handleMouseMove = React.useCallback((e: React.MouseEvent) => {
    const now = Date.now();
    if (now - lastMouseMoveRef.current < 100) {
      return; // 节流：每100ms更新一次
    }
    lastMouseMoveRef.current = now;

    // 计算画布坐标
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const canvasX = (e.clientX - rect.left - viewportX) / currentViewport.zoom;
    const canvasY = (e.clientY - rect.top - viewportY) / currentViewport.zoom;

    // 更新当前用户的光标位置（模拟多用户协作）
    // 在真实场景中，这里应该通过WebSocket发送给其他用户
    updateCursor({
      userId: 'current-user',
      userName: 'Me',
      userColor: '#3b82f6', // Blue
      position: { x: canvasX, y: canvasY },
    });
  }, [currentViewport, updateCursor, viewportX, viewportY]);

  // {{ AURA: Modify - 处理画布双击事件，显示FloatingToolbar }}
  const handleCanvasDoubleClick = React.useCallback((e: React.MouseEvent) => {
    // 检查是否点击在节点上
    const target = e.target as HTMLElement;
    if (target.closest('[data-node-id]')) {
      return; // 点击在节点上，不处理
    }

    // 计算画布坐标
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const canvasX = (e.clientX - rect.left - viewportX) / currentViewport.zoom;
    const canvasY = (e.clientY - rect.top - viewportY) / currentViewport.zoom;

    console.log('[CanvasRenderer] Canvas double-click at:', {
      screenX: e.clientX,
      screenY: e.clientY,
      canvasX,
      canvasY
    });

    // {{ AURA: Modify - 传递事件对象和画布坐标 }}
    onCanvasDoubleClick?.(e, { x: canvasX, y: canvasY });
  }, [currentViewport, onCanvasDoubleClick, viewportX, viewportY]);

  // 处理文件拖放事件
  const handleDragOver = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // 计算画布坐标
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const canvasX = (e.clientX - rect.left - viewportX) / currentViewport.zoom;
    const canvasY = (e.clientY - rect.top - viewportY) / currentViewport.zoom;

    onCanvasDrop?.(e, { x: canvasX, y: canvasY });
  }, [currentViewport, onCanvasDrop, viewportX, viewportY]);

  // {{ AURA: Fix - 使用capture阶段处理双击和右键事件，因为Plait框架会阻止事件冒泡 }}
  React.useEffect(() => {
    if (!onCanvasDoubleClick && !onCanvasContextMenu) return;

    // 延迟添加事件监听器，等待board初始化完成
    const timer = setTimeout(() => {
      const board = canvasRef.current?.getBoard();

      if (!board) {
        return;
      }

      // 使用PlaitBoard.getBoardContainer获取DOM元素
      const canvasElement = PlaitBoard.getBoardContainer(board);

      if (!canvasElement) {
        return;
      }

      // {{ AURA: Add - 处理双击事件 }}
      const handleDoubleClick = (e: MouseEvent) => {
        // 检查是否点击在节点上
        const target = e.target as HTMLElement;
        const isNodeClick = target.closest('[data-node-id]') || target.closest('[class*="legal-node"]');

        if (!isNodeClick && onCanvasDoubleClick) {
          // 画布空白区域双击
          e.preventDefault();
          e.stopPropagation();

          // 计算画布坐标（考虑viewport变换）
          const rect = canvasElement.getBoundingClientRect();
          const canvasX = (e.clientX - rect.left - viewportX) / currentViewport.zoom;
          const canvasY = (e.clientY - rect.top - viewportY) / currentViewport.zoom;

          console.log('[CanvasRenderer] Canvas double-click (capture) at:', {
            screenX: e.clientX,
            screenY: e.clientY,
            canvasX,
            canvasY
          });

          // 触发画布双击回调
          onCanvasDoubleClick(e as any, { x: canvasX, y: canvasY });
        }
      };

      const handleMouseDown = (e: MouseEvent) => {
        // 只处理右键点击（button === 2）
        if (e.button !== 2) return;

        // 检查是否点击在节点上
        const target = e.target as HTMLElement;
        const isNodeClick = target.closest('[data-node-id]') || target.closest('[class*="legal-node"]');

        if (!isNodeClick && onCanvasContextMenu) {
          // 画布空白区域右键
          e.preventDefault();
          e.stopPropagation();

          // 计算画布坐标（考虑viewport变换）
          const rect = canvasElement.getBoundingClientRect();
          const canvasX = (e.clientX - rect.left - viewportX) / currentViewport.zoom;
          const canvasY = (e.clientY - rect.top - viewportY) / currentViewport.zoom;

          console.log('[CanvasRenderer] Canvas right-click at:', {
            screenX: e.clientX,
            screenY: e.clientY,
            canvasX,
            canvasY
          });

          // 触发画布右键菜单回调
          onCanvasContextMenu(e as any, { x: canvasX, y: canvasY });
        }
      };

      // 同时阻止contextmenu事件，避免浏览器默认菜单
      const handleContextMenu = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        const isNodeClick = target.closest('[data-node-id]') || target.closest('[class*="legal-node"]');
        if (!isNodeClick) {
          e.preventDefault();
        }
      };

      // 使用capture阶段确保在Plait框架之前处理
      if (onCanvasDoubleClick) {
        canvasElement.addEventListener('dblclick', handleDoubleClick, true); // {{ AURA: Add - 双击事件 }}
      }
      if (onCanvasContextMenu) {
        canvasElement.addEventListener('mousedown', handleMouseDown, true);
        canvasElement.addEventListener('contextmenu', handleContextMenu, true);
      }

      // 清理函数
      return () => {
        if (onCanvasDoubleClick) {
          canvasElement.removeEventListener('dblclick', handleDoubleClick, true); // {{ AURA: Add - 清理双击事件 }}
        }
        if (onCanvasContextMenu) {
          canvasElement.removeEventListener('mousedown', handleMouseDown, true);
          canvasElement.removeEventListener('contextmenu', handleContextMenu, true);
        }
      };
    }, 100); // 延迟100ms等待board初始化

    return () => {
      clearTimeout(timer);
    };
  }, [canvasRef, onCanvasDoubleClick, onCanvasContextMenu, currentViewport, viewportX, viewportY]);

  return (
    <div
      className={`absolute inset-0 pt-20 overflow-hidden cursor-custom ${className}`}
      onDoubleClick={handleCanvasDoubleClick}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onMouseMove={handleMouseMove}
      onContextMenu={(e) => {
        // 阻止默认右键菜单
        e.preventDefault();

        // 检查是否点击在节点上
        const target = e.target as HTMLElement;
        const isNodeClick = target.closest('[data-node-id]') || target.closest('[class*="legal-node"]');

        if (!isNodeClick && onCanvasContextMenu) {
          // 计算画布坐标
          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
          const canvasX = (e.clientX - rect.left - viewportX) / currentViewport.zoom;
          const canvasY = (e.clientY - rect.top - viewportY) / currentViewport.zoom;

          onCanvasContextMenu(e, { x: canvasX, y: canvasY });
        }
      }}
      style={{
        background: 'linear-gradient(135deg, #fafbfc 0%, #f0f2f5 100%)',
        backgroundImage: `
        linear-gradient(rgba(255, 107, 53, 0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255, 107, 53, 0.03) 1px, transparent 1px),
        linear-gradient(rgba(255, 107, 53, 0.08) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255, 107, 53, 0.08) 1px, transparent 1px)
      `,
        backgroundSize: '20px 20px, 20px 20px, 100px 100px, 100px 100px',
        backgroundPosition: '0 0, 0 0, 0 0, 0 0'
      }}>
      {/* 网格背景 - 在PlaitCanvasWrapper外部 */}
      <div
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          backgroundImage: `
            radial-gradient(circle, #cbd5e1 1px, transparent 1px)
          `,
          backgroundSize: '24px 24px'
        }}
      />

      <PlaitCanvasWrapper
        ref={canvasRef}
        elements={plaitElements}
        onChange={() => { }}
        options={options}
        plugins={plugins}
        className="w-full h-full"
        viewport={{
          zoom: currentViewport.zoom,
          origination: [viewportX, viewportY]
        }}
        onViewportChange={(viewport) => {
          const origination = viewport.origination || [0, 0];
          const newViewport = {
            zoom: viewport.zoom,
            x: origination[0],
            y: origination[1]
          };

          // 使用ref检查是否真的变化了（避免无限循环）
          const last = lastViewportRef.current;
          const hasChanged =
            Math.abs(last.zoom - newViewport.zoom) >= 0.001 ||
            Math.abs(last.x - newViewport.x) >= 0.1 ||
            Math.abs(last.y - newViewport.y) >= 0.1;

          if (!hasChanged) {
            return;
          }

          // 更新ref
          lastViewportRef.current = newViewport;

          onViewportChange(newViewport);
        }}
      >
        {/* 连接线层 - 应用viewport变换 */}
        {/* {{ AURA: Fix - 添加pointer-events: none，避免阻挡节点的鼠标事件 }} */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            transform: `translate(${viewportX}px, ${viewportY}px) scale(${currentViewport.zoom})`,
            transformOrigin: 'top left'
          }}
        >
          <ConnectionLines
            nodes={visibleNodes as any[]} // {{ AURA: Modify - 仅传递可见节点以优化性能 }}
            allNodes={allNodes as any[]} // {{ AURA: Add - 传递所有节点用于查找 }}
          />

          {isConnecting && connectionStart && (() => {
            const startNode = allNodes.find(n => n.id === connectionStart);
            if (startNode) {
              return (
                <TemporaryConnectionLine
                  startPosition={startNode.data.position}
                  viewport={legacyViewport}
                />
              );
            }
            return null;
          })()}
        </div>

        {/* 对齐辅助线层 - 应用viewport变换 */}
        {/* {{ AURA: Fix - 添加pointer-events: none，避免阻挡节点的鼠标事件 }} */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            transform: `translate(${viewportX}px, ${viewportY}px) scale(${currentViewport.zoom})`,
            transformOrigin: 'top left'
          }}
        >
          <AlignmentGuides
            guides={alignmentGuides}
            viewport={{ ...currentViewport, origination: [viewportX, viewportY] }}
          />
        </div>

        {/* 可拖拽节点渲染层 - 作为Board的children，应用viewport变换 */}
        {/* {{ AURA: Fix - 添加pointer-events: none到容器，节点本身有pointer-events: auto }} */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            transform: `translate(${viewportX}px, ${viewportY}px) scale(${currentViewport.zoom})`,
            transformOrigin: 'top left'
          }}
        >
          {visibleNodes.map((node) => {
            const isSelected = selectedNodeIds.includes(node.id);
            return (
              <DraggableLegalNode
                key={node.id}
                node={node}
                isSelected={isSelected}
                selectedNodeIds={selectedNodeIds}
                onSelect={() => {
                  if (isConnecting) {
                    onNodeConnectionClick(node.id);
                  } else {
                    onNodeSelect(node.id, isSelected);
                  }
                }}
                onDoubleClick={() => onNodeDoubleClick(node.id)}
                onPositionChange={onNodePositionChange}
                viewport={legacyViewport}
                isConnecting={isConnecting}
                isConnectionStart={connectionStart === node.id}
                onConnectionStart={onConnectionStart} // {{ AURA: Add - 传递连接开始回调 }}
                allNodes={allNodes}
                onAlignmentGuidesChange={onAlignmentGuidesChange}
                onContextMenu={onContextMenu}
                onDocumentPreview={onDocumentPreview}
                onDocumentDownload={onDocumentDownload}
              />
            );
          })}
        </div >

        {/* {{ AURA: Add - 评论标记渲染层 - 应用viewport变换 }} */}
        {/* {{ AURA: Fix - 添加pointer-events: none到容器，评论标记本身有pointer-events: auto }} */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            transform: `translate(${viewportX}px, ${viewportY}px) scale(${currentViewport.zoom})`,
            transformOrigin: 'top left'
          }}
        >
          {comments.map((comment) => (
            <CommentMarker
              key={comment.id}
              comment={comment}
              scale={currentViewport.zoom}
              onClick={() => setActiveComment(comment.id)}
              isActive={activeCommentId === comment.id}
            />
          ))}
        </div>

        {/* {{ AURA: Add - 实时光标渲染层 - 应用viewport变换 }} */}
        {/* {{ AURA: Fix - 添加pointer-events: none，光标不需要接收鼠标事件 }} */}
        {/* {{ AURA: Add - 实时光标渲染层 - 移至最外层以避免变换影响，或者保持在内层但确保坐标正确 }} */}
        {/* {{ AURA: Fix - 保持在内层，因为CursorRenderer通常期望画布坐标。如果它期望屏幕坐标，则需要移出。 }} */}
        {/* {{ AURA: Fix - 用户反馈有偏移，可能是因为CursorRenderer内部没有处理缩放。 }} */}
        {/* {{ AURA: Fix - 我们将CursorRenderer移出PlaitCanvasWrapper，并传递转换后的坐标或让其处理屏幕坐标 }} */}
        {/* {{ AURA: Add - 语音场渲染层 - 应用viewport变换 }} */}
        {/* {{ AURA: Fix - 添加pointer-events: none，语音场不需要接收鼠标事件 }} */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            transform: `translate(${viewportX}px, ${viewportY}px) scale(${currentViewport.zoom})`,
            transformOrigin: 'top left'
          }}
        >
          <VoiceZoneRenderer scale={currentViewport.zoom} />
        </div>
      </PlaitCanvasWrapper >

      {/* {{ AURA: Add - 实时光标渲染层 - 移出PlaitCanvasWrapper，使用屏幕坐标或自行处理变换 }} */}
      < div className="absolute inset-0 pointer-events-none z-50" >
        <CursorRenderer scale={currentViewport.zoom} offset={{ x: viewportX, y: viewportY }} />
      </div >

      {/* {{ AURA: Add - 评论详情面板 }} */}
      {
        activeComment && (
          <CommentPanel
            comment={activeComment}
            onClose={() => setActiveComment(null)}
          />
        )
      }
    </div >
  );
});


CanvasRenderer.displayName = 'CanvasRenderer';

