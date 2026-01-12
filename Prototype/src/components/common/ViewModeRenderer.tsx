/**
 * 视图模式渲染器
 * 
 * 根据当前视图模式渲染不同的视图组件
 */

import React from 'react';
import { TimelineView } from '../TimelineView';
import { ListView } from '../ListView';
import { CanvasRenderer } from './CanvasRenderer';
import type { LegalNode } from '../workspace/types';
import type { Viewport } from '@plait/core';
import type { AlignmentGuide } from '../../lib/layout-engine';
import type { PlaitBoardOptions, PlaitPlugin, PlaitElement } from '@plait/core';
import type { PlaitCanvasWrapperRef } from '../PlaitCanvasWrapper';

export interface ViewModeRendererProps {
  viewMode: 'network' | 'timeline' | 'list';

  // Timeline/List view props
  nodes: LegalNode[];
  selectedNodeIds: string[];
  onNodeClick: (nodeId: string) => void;
  onNodeDoubleClick: (nodeId: string) => void;

  // Network view props
  canvasRef: React.RefObject<PlaitCanvasWrapperRef>;
  currentViewport: Viewport;
  visibleNodes: LegalNode[];
  plaitElements?: PlaitElement[]; // {{ AURA: Add - Plait元素 }}
  isConnecting: boolean;
  connectionStart: string | null;
  alignmentGuides: AlignmentGuide[];
  options: PlaitBoardOptions;
  plugins: PlaitPlugin[];
  lastViewportRef: React.MutableRefObject<{ zoom: number; x: number; y: number }>;
  onNodeSelect: (nodeId: string, isSelected: boolean) => void;
  onNodePositionChange: (nodeId: string, position: { x: number; y: number }) => void;
  onNodeConnectionClick: (nodeId: string) => void;
  onAlignmentGuidesChange: (guides: AlignmentGuide[]) => void;
  onContextMenu: (e: React.MouseEvent, nodeId: string) => void;
  onConnectionStart?: (nodeId: string) => void; // {{ AURA: Add - 连接开始回调 }}
  onCanvasDoubleClick?: (e: React.MouseEvent, canvasPosition: { x: number; y: number }) => void; // {{ AURA: Modify - 添加事件参数 }}
  onCanvasContextMenu?: (e: React.MouseEvent, position: { x: number; y: number }) => void; // {{ AURA: Add - 画布右键菜单回调 }}
  onCanvasDrop?: (e: React.DragEvent, position: { x: number; y: number }) => void;
  onViewportChange: (viewport: { zoom: number; x: number; y: number }) => void;
}

export const ViewModeRenderer = React.memo<ViewModeRendererProps>(({
  viewMode,
  nodes,
  selectedNodeIds,
  onNodeClick,
  onNodeDoubleClick,
  canvasRef,
  currentViewport,
  visibleNodes,
  plaitElements = [], // {{ AURA: Add - 默认空数组 }}
  isConnecting,
  connectionStart,
  alignmentGuides,
  options,
  plugins,
  lastViewportRef,
  onNodeSelect,
  onNodePositionChange,
  onNodeConnectionClick,
  onConnectionStart, // {{ AURA: Add - 连接开始回调 }}
  onAlignmentGuidesChange,
  onContextMenu,
  onCanvasDoubleClick,
  onCanvasContextMenu, // {{ AURA: Add - 接收画布右键菜单回调 }}
  onCanvasDrop,
  onViewportChange,
}) => {
  if (viewMode === 'timeline') {
    return (
      <TimelineView
        nodes={nodes}
        selectedNodes={selectedNodeIds} // {{ AURA: Fix - 传递selectedNodes }}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
      />
    );
  }

  if (viewMode === 'list') {
    return (
      <ListView
        nodes={nodes}
        selectedNodeIds={selectedNodeIds}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
      />
    );
  }

  // Network view (default)
  return (
    <CanvasRenderer
      canvasRef={canvasRef}
      currentViewport={currentViewport}
      visibleNodes={visibleNodes}
      plaitElements={plaitElements} // {{ AURA: Add - 传递Plait元素 }}
      allNodes={nodes}
      selectedNodeIds={selectedNodeIds}
      isConnecting={isConnecting}
      connectionStart={connectionStart}
      alignmentGuides={alignmentGuides}
      options={options}
      plugins={plugins}
      lastViewportRef={lastViewportRef}
      onNodeSelect={onNodeSelect}
      onNodeDoubleClick={onNodeDoubleClick}
      onNodePositionChange={onNodePositionChange}
      onNodeConnectionClick={onNodeConnectionClick}
      onConnectionStart={onConnectionStart} // {{ AURA: Add - 传递连接开始回调 }}
      onAlignmentGuidesChange={onAlignmentGuidesChange}
      onContextMenu={onContextMenu}
      onCanvasDoubleClick={onCanvasDoubleClick}
      onCanvasContextMenu={onCanvasContextMenu} // {{ AURA: Add - 传递画布右键菜单回调 }}
      onCanvasDrop={onCanvasDrop}
      onViewportChange={onViewportChange}
    />
  );
});

ViewModeRenderer.displayName = 'ViewModeRenderer';

