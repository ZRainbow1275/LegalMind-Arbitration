/**
 * 辅助UI渲染器
 *
 * 管理右键菜单、全屏提示、Minimap、快捷键帮助等辅助UI组件
 */

import React from 'react';
import { ContextMenu } from './ContextMenu';
import { getCanvasContextMenuItems, getNodeContextMenuItems } from '../../utils/contextMenuUtils';
import { Minimap } from '../Minimap';
import { KeyboardShortcutsHelp } from '../KeyboardShortcutsHelp';
import { CanvasFloatingToolbar } from './CanvasFloatingToolbar'; // {{ AURA: Add - 画布浮动工具栏 }}
import { NodeTypeSelector } from './NodeTypeSelector'; // {{ AURA: Add - 节点类型选择器 }}
import type { LegalNode, Viewport, KeyboardShortcut } from '../../types/shared';

export interface AuxiliaryUIRendererProps {
  // 工作区状态
  viewMode: 'network' | 'timeline' | 'list';
  isFullscreen: boolean;
  showShortcutsHelp: boolean;
  contextMenu: {
    show: boolean;
    x: number;
    y: number;
    nodeId: string | null;
    menuType?: 'canvas' | 'node'; // {{ AURA: Modify - 与ContextMenuState保持一致 }}
    position?: { x: number; y: number }; // {{ AURA: Add - 画布坐标位置 }}
    selectedNodeIds?: string[];
  } | null;

  // 数据
  nodes: LegalNode[];
  currentViewport: Viewport;
  shortcuts: KeyboardShortcut[];

  // Refs
  canvasRef: React.RefObject<HTMLDivElement>;

  // 回调函数
  onContextMenuEdit: (nodeId: string) => void;
  onContextMenuDelete: (nodeId: string) => void;
  onContextMenuDuplicate: (nodeId: string) => void;
  onContextMenuConnect: (nodeId: string) => void;
  onContextMenuClose: () => void;
  onCloseShortcutsHelp: () => void;
  onMinimapViewportChange: (viewport: { x: number; y: number }) => void;
  onCreateNode?: (type: string, position: { x: number; y: number }) => void;
  onCreateChatNote?: (position: { x: number; y: number }) => void;
  onAIAnalysis?: (nodeIds: string[]) => void;
  onCreateComment?: (position: { x: number; y: number }) => void;
  // {{ AURA: Add - 粘贴回调 }}
  onPaste?: () => void;
  // {{ AURA: Add - Drawnix工具回调 }}
  onCreateMindMap?: (position: { x: number; y: number }) => void;
  onCreateFlowchart?: (position: { x: number; y: number }) => void;
  onCreateFreehand?: (position: { x: number; y: number }) => void;
  // {{ AURA: Add - FloatingToolbar状态和回调 }}
  floatingToolbarState?: {
    visible: boolean;
    position: { x: number; y: number } | null;
    canvasPosition: { x: number; y: number } | null;
  };
  onCloseFloatingToolbar?: () => void;
  onShowNodeSelector?: (position: { x: number; y: number }) => void;
  // {{ AURA: Add - NodeTypeSelector状态和回调 }}
  nodeSelectorState?: {
    visible: boolean;
    position: { x: number; y: number } | null;
    canvasPosition: { x: number; y: number } | null;
  };
  onCloseNodeSelector?: () => void;
}

export const AuxiliaryUIRenderer = React.memo<AuxiliaryUIRendererProps>(({
  viewMode,
  isFullscreen,
  showShortcutsHelp,
  contextMenu,
  nodes,
  currentViewport,
  shortcuts,
  canvasRef,
  onContextMenuEdit,
  onContextMenuDelete,
  onContextMenuDuplicate,
  onContextMenuConnect,
  onContextMenuClose,
  onCloseShortcutsHelp,
  onMinimapViewportChange,
  onCreateNode,
  onCreateChatNote,
  onAIAnalysis,
  onCreateComment,
  // {{ AURA: Add - 接收粘贴回调 }}
  onPaste,
  // {{ AURA: Add - Drawnix工具回调 }}
  onCreateMindMap,
  onCreateFlowchart,
  onCreateFreehand,
  // {{ AURA: Add - FloatingToolbar和NodeTypeSelector }}
  floatingToolbarState,
  onCloseFloatingToolbar,
  onShowNodeSelector,
  nodeSelectorState,
  onCloseNodeSelector,
}) => {
  // 生成右键菜单项
  const contextMenuItems = React.useMemo(() => {
    if (!contextMenu || !contextMenu.show) return [];

    const menuType = contextMenu.menuType || 'node'; // {{ AURA: Modify - 使用menuType }}
    const position = contextMenu.position || { x: contextMenu.x, y: contextMenu.y }; // {{ AURA: Modify - 使用画布坐标 }}

    if (menuType === 'canvas') {
      // 画布右键菜单
      // {{ AURA: Modify - 传递nodes参数用于智能推荐 }}
      return getCanvasContextMenuItems(
        position,
        onCreateNode || (() => { }),
        onCreateChatNote || (() => { }),
        onPaste, // 粘贴功能
        onCreateComment,
        nodes // {{ AURA: Add - 传递节点列表用于智能推荐 }}
      );
    } else {
      // 节点右键菜单
      const nodeId = contextMenu.nodeId || '';
      const selectedNodeIds = contextMenu.selectedNodeIds || (nodeId ? [nodeId] : []);

      return getNodeContextMenuItems(
        nodeId,
        selectedNodeIds,
        onContextMenuEdit,
        onContextMenuDuplicate,
        (nodeIds: string[]) => {
          nodeIds.forEach((id: string) => onContextMenuDelete(id));
        },
        onContextMenuConnect,
        onAIAnalysis
      );
    }
  }, [contextMenu, onCreateNode, onCreateChatNote, onContextMenuEdit, onContextMenuDuplicate, onContextMenuDelete, onContextMenuConnect, onAIAnalysis, onPaste, onCreateComment, nodes]);

  return (
    <>
      {/* 右键快捷菜单 - 只在网络图视图显示 */}
      {viewMode === 'network' &&
        contextMenu &&
        contextMenu.show &&
        typeof contextMenu.x === 'number' &&
        typeof contextMenu.y === 'number' && (
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            items={contextMenuItems}
            onClose={onContextMenuClose}
            visible={true}
          />
        )}

      {/* 全屏模式提示 */}
      {isFullscreen && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50
          bg-black/80 text-white px-6 py-3 rounded-full text-sm font-medium
          backdrop-blur-md shadow-2xl animate-fade-in">
          全屏模式 - 按 <kbd className="px-2 py-1 bg-white/20 rounded mx-1">F11</kbd> 或 <kbd className="px-2 py-1 bg-white/20 rounded mx-1">ESC</kbd> 退出
        </div>
      )}

      {/* Minimap导航 - 只在网络图视图显示 */}
      {viewMode === 'network' && (
        <Minimap
          nodes={nodes}
          viewport={currentViewport}
          canvasSize={{ width: 3000, height: 2000 }}
          onViewportChange={(newViewport) => {
            if (canvasRef.current) {
              (canvasRef.current as any).moveTo({
                x: newViewport.x,
                y: newViewport.y,
              });
            }
            onMinimapViewportChange(newViewport);
          }}
        />
      )}

      {/* 快捷键帮助面板 */}
      {showShortcutsHelp && (
        <KeyboardShortcutsHelp
          shortcuts={shortcuts}
          onClose={onCloseShortcutsHelp}
        />
      )}

      {/* {{ AURA: Add - 画布浮动工具栏 }} */}
      {floatingToolbarState && floatingToolbarState.visible && floatingToolbarState.canvasPosition && (
        <CanvasFloatingToolbar
          visible={floatingToolbarState.visible}
          position={floatingToolbarState.position}
          canvasPosition={floatingToolbarState.canvasPosition}
          onCreateComment={onCreateComment || (() => { })}
          onCreateChatNote={onCreateChatNote || (() => { })}
          onShowNodeSelector={onShowNodeSelector || (() => { })}
          onCreateMindMap={onCreateMindMap}
          onCreateFlowchart={onCreateFlowchart}
          onCreateFreehand={onCreateFreehand}
          onClose={onCloseFloatingToolbar || (() => { })}
        />
      )}

      {/* {{ AURA: Add - 节点类型选择器 }} */}
      {nodeSelectorState && nodeSelectorState.visible && nodeSelectorState.canvasPosition && (
        <NodeTypeSelector
          visible={nodeSelectorState.visible}
          position={nodeSelectorState.position}
          canvasPosition={nodeSelectorState.canvasPosition}
          onSelect={(type) => {
            if (onCreateNode && nodeSelectorState.canvasPosition) {
              onCreateNode(type, nodeSelectorState.canvasPosition);
            }
            onCloseNodeSelector?.();
          }}
          onClose={onCloseNodeSelector || (() => { })}
        />
      )}
    </>
  );
});

AuxiliaryUIRenderer.displayName = 'AuxiliaryUIRenderer';

