/**
 * 快捷键回调Hook
 * 
 * 管理所有快捷键的回调函数
 */

import { useCallback } from 'react';
import type { LegalNode, WorkspaceState } from '../types';
import { dataStorage } from '../../../utils/dataStorage';
import type { PlaitCanvasWrapperRef } from '../../PlaitCanvasWrapper';

export interface KeyboardShortcutCallbacksParams {
  nodes: LegalNode[];
  workspaceState: WorkspaceState;
  updateWorkspaceState: (updater: (prev: WorkspaceState) => WorkspaceState) => void;
  handleNodeDelete: (nodeId: string) => void;
  handleDuplicateNode: (nodeId: string) => void;
  handleZoomIn: () => void;
  handleZoomOut: () => void;
  handleResetView: () => void;
  handleFitToScreen: () => void;
  canvasRef: React.RefObject<PlaitCanvasWrapperRef>;
  // {{ AURA: Add - 剪贴板操作参数 }}
  copyNodes?: (nodeIds: string[]) => void;
  pasteNodes?: () => void;
  cutNodes?: (nodeIds: string[]) => void;
  // {{ AURA: Add - FloatingToolbar操作参数 }}
  onCreateComment?: (position: { x: number; y: number }) => void;
  onCreateChatNote?: (position: { x: number; y: number }) => void;
  onShowNodeSelector?: (position: { x: number; y: number }) => void;
  // {{ AURA: Add - 搜索和导出/导入操作参数 }}
  onSearch?: () => void;
  onFilter?: () => void;
  onExportImport?: () => void;
}

export const useKeyboardShortcutCallbacks = ({
  nodes,
  workspaceState,
  updateWorkspaceState,
  handleNodeDelete,
  handleDuplicateNode,
  handleZoomIn,
  handleZoomOut,
  handleResetView,
  handleFitToScreen,
  canvasRef,
  // {{ AURA: Add - 接收剪贴板操作 }}
  copyNodes,
  pasteNodes,
  cutNodes,
  // {{ AURA: Add - 接收FloatingToolbar操作 }}
  onCreateComment,
  onCreateChatNote,
  onShowNodeSelector,
  // {{ AURA: Add - 接收搜索和导出/导入操作 }}
  onSearch,
  onFilter,
  onExportImport,
}: KeyboardShortcutCallbacksParams) => {
  const onSave = useCallback(() => {
    dataStorage.saveNodes(nodes);
    dataStorage.saveWorkspaceState({
      selectedNodes: workspaceState.selectedNodes,
      viewport: canvasRef.current?.getViewport() || { zoom: 1, x: 0, y: 0 },
      nodes,
      lastSaved: new Date().toISOString(),
      version: '1.0.0'
    });
    console.log('工作区已保存');
  }, [nodes, workspaceState.selectedNodes, canvasRef]);

  const onDelete = useCallback(() => {
    if (workspaceState.selectedNodes.length > 0) {
      workspaceState.selectedNodes.forEach(nodeId => {
        handleNodeDelete(nodeId);
      });
    }
  }, [workspaceState.selectedNodes, handleNodeDelete]);

  const onDuplicate = useCallback(() => {
    if (workspaceState.selectedNodes.length > 0) {
      handleDuplicateNode(workspaceState.selectedNodes[0]);
    }
  }, [workspaceState.selectedNodes, handleDuplicateNode]);

  const onSelectAll = useCallback(() => {
    updateWorkspaceState(prev => ({
      ...prev,
      selectedNodes: nodes.map(n => n.id),
    }));
  }, [nodes, updateWorkspaceState]);

  const onDeselect = useCallback(() => {
    updateWorkspaceState(prev => ({
      ...prev,
      selectedNodes: [],
      isConnecting: false,
      connectionStart: null,
    }));
  }, [updateWorkspaceState]);

  const onToggleFullscreen = useCallback(() => {
    updateWorkspaceState(prev => ({
      ...prev,
      isFullscreen: !prev.isFullscreen,
    }));
  }, [updateWorkspaceState]);

  const onHelp = useCallback(() => {
    updateWorkspaceState(prev => ({
      ...prev,
      showShortcutsHelp: true,
    }));
  }, [updateWorkspaceState]);

  // {{ AURA: Add - 剪贴板快捷键回调 }}
  const onCopy = useCallback(() => {
    if (workspaceState.selectedNodes.length > 0 && copyNodes) {
      copyNodes(workspaceState.selectedNodes);
      console.log(`[快捷键] 已复制 ${workspaceState.selectedNodes.length} 个节点`);
    }
  }, [workspaceState.selectedNodes, copyNodes]);

  const onPaste = useCallback(() => {
    if (pasteNodes) {
      pasteNodes();
      console.log('[快捷键] 已粘贴节点');
    }
  }, [pasteNodes]);

  const onCut = useCallback(() => {
    if (workspaceState.selectedNodes.length > 0 && cutNodes) {
      cutNodes(workspaceState.selectedNodes);
      console.log(`[快捷键] 已剪切 ${workspaceState.selectedNodes.length} 个节点`);
    }
  }, [workspaceState.selectedNodes, cutNodes]);

  // {{ AURA: Add - FloatingToolbar快捷键回调 }}
  const onCreateCommentShortcut = useCallback(() => {
    if (onCreateComment) {
      // 使用画布中心位置
      const viewport = canvasRef.current?.getViewport() || { zoom: 1, x: 0, y: 0 };
      const centerX = (window.innerWidth / 2 - viewport.x) / viewport.zoom;
      const centerY = (window.innerHeight / 2 - viewport.y) / viewport.zoom;
      onCreateComment({ x: centerX, y: centerY });
      console.log('[快捷键] 创建评论');
    }
  }, [onCreateComment, canvasRef]);

  const onCreateChatNoteShortcut = useCallback(() => {
    if (onCreateChatNote) {
      // 使用画布中心位置
      const viewport = canvasRef.current?.getViewport() || { zoom: 1, x: 0, y: 0 };
      const centerX = (window.innerWidth / 2 - viewport.x) / viewport.zoom;
      const centerY = (window.innerHeight / 2 - viewport.y) / viewport.zoom;
      onCreateChatNote({ x: centerX, y: centerY });
      console.log('[快捷键] 创建聊天贴');
    }
  }, [onCreateChatNote, canvasRef]);

  const onShowNodeSelectorShortcut = useCallback(() => {
    if (onShowNodeSelector) {
      // 使用画布中心位置
      const viewport = canvasRef.current?.getViewport() || { zoom: 1, x: 0, y: 0 };
      const centerX = (window.innerWidth / 2 - viewport.x) / viewport.zoom;
      const centerY = (window.innerHeight / 2 - viewport.y) / viewport.zoom;
      onShowNodeSelector({ x: centerX, y: centerY });
      console.log('[快捷键] 显示节点选择器');
    }
  }, [onShowNodeSelector, canvasRef]);

  return {
    onSave,
    onDelete,
    onDuplicate,
    onSelectAll,
    onDeselect,
    onZoomIn: handleZoomIn,
    onZoomOut: handleZoomOut,
    onResetZoom: handleResetView,
    onFitToScreen: handleFitToScreen,
    onToggleFullscreen,
    onHelp,
    // {{ AURA: Add - 导出剪贴板快捷键 }}
    onCopy,
    onPaste,
    onCut,
    // {{ AURA: Add - 导出FloatingToolbar快捷键 }}
    onCreateComment: onCreateCommentShortcut,
    onCreateChatNote: onCreateChatNoteShortcut,
    onShowNodeSelector: onShowNodeSelectorShortcut,
    // {{ AURA: Add - 导出搜索和导出/导入快捷键 }}
    onSearch,
    onFilter,
    onExportImport,
  };
};

