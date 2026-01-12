/**
 * LegalMind 法律工作台 - 主工作台组件
 * 基于 Plait/Drawnix 开源白板框架构建
 * @see https://github.com/plait-board/drawnix
 * @see docs/TECHNICAL_STACK.md
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';

// ==================== Workspace Hooks导入 ====================
// 使用重构后的hooks进行状态管理和操作
import {
  useWorkspaceState,
  useWorkspaceActions,
  useWorkspaceCanvas,
  useToolbarCallbacks,
  useAdditionalCallbacks,
  useKeyboardShortcutCallbacks,
} from './workspace/hooks';
import { createDemoNodes } from './workspace/utils';
import type { LegalNode } from './workspace/types';
export type { LegalNode };
import { PLAIT_OPTIONS, PLAIT_PLUGINS } from './workspace/config';

// ==================== Plait框架核心导入 ====================
// 这些是Plait框架提供的核心功能
import { MindThemeColors } from '@plait/mind';
import { PlaitBoardOptions, PlaitPlugin } from '@plait/core';

// ==================== 自定义插件导入 ====================
// 这是我们为法律业务开发的自定义插件
import { LegalNodeTypes } from '../plugins/legal-nodes/types';

// import { withLegalNodes } from '../plugins/legal-nodes/with-legal-nodes';  // ⭐ 法律节点插件
// ==================== UI组件导入 ====================
// 基于shadcn/ui的基础UI组件，与LegalMind主项目保持一致
// {{ AURA: Add - 导入聊天贴图层组件 }}
import { ChatNoteLayer } from './ChatNoteLayer';
import { Button } from './ui/button';// ==================== 自定义组件导入 ====================
// 这些是为法律业务开发的自定义组件

import { ViewSwitcher } from './ViewSwitcher';
import { LegalWorkflowTemplates } from './LegalWorkflowTemplates';
import { SaveTemplateDialog } from './SaveTemplateDialog';
import { useWorkspaceStore, WorkflowTemplate } from '../stores/workspaceStore';
// {{ AURA: Remove - 评论组件已在CanvasRenderer中渲染，移除导入 }}

// ==================== 性能优化导入 ====================
// {{ AURA: Add - 集成性能优化模块 }}
import { CanvasOptimizationManager } from '../lib/canvas-optimizations';
import { useAdvancedVirtualization } from '../hooks/useAdvancedVirtualization';
import { CanvasEmptyState } from './common/CanvasEmptyState';
import { v4 as uuidv4 } from 'uuid';



// ==================== 通用UI组件导入 ====================
import {
  ModalPanel,
  AllModalsRenderer,
  ViewModeRenderer,
} from './common';
import { AIContextAwareness, AIContext } from './ai/AIContextAwareness';
import AISuggestionsFloatingPanel, { AISuggestion } from './common/AISuggestionsFloatingPanel';
import { VirtualCourtroomPanel } from './courtroom/VirtualCourtroomPanel'; // {{ AURA: Add - 可拖拽面板组件 }}
import { FloatingToolbar } from './FloatingToolbar'; // {{ AURA: Add - 画布浮动工具栏 }}
// {{ AURA: Add - AI Bailiff }}

import {
  calculateWorkspaceStats,
  generateNodeTypeTooltip,
  generateConnectionTypeTooltip,
  generateSelectedNodesTooltip,
  generateCollaboratorsTooltip,
} from './common/WorkspaceStats';

import { StatusBar } from './common/StatusBar';
import { AuxiliaryUIRenderer } from './common/AuxiliaryUIRenderer';
import { LegalRelationshipGraph } from './LegalRelationshipGraph';
import { PerformanceMonitor } from './common/PerformanceMonitor';
import { StatsPanel } from './common/StatsPanel';
import { DocumentPreview } from './common/DocumentPreview';
import { AutoSaveIndicator } from './common/AutoSaveIndicator';
import { NodeSearchPanel } from './NodeSearchPanel';
import { NodeFilterPanel } from './NodeFilterPanel';
import { ExportImportPanel } from './ExportImportPanel';
import { createDocumentNodeData } from '../types/document-node';
import type { DocumentNodeData } from '../types/document-node';
import { uploadFile, getFilesFromDragEvent } from '../lib/file-upload';
import { useAutoSave } from '../lib/auto-save'; // {{ AURA: Add - 自动保存Hook }}
import { useUndoRedo, useUndoRedoShortcuts } from '../lib/undo-redo'; // {{ AURA: Add - 撤销/重做Hook }}

// {{ AURA: Add - 导入搜索引擎和导出/导入服务 }}
import { SearchEngine } from '../lib/search-engine';


// ==================== 工具函数导入 ====================
import { handleError, ErrorType, ErrorSeverity } from '../utils/errorHandler';
import { dataStorage } from '../utils/dataStorage';

import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';

import { KeyboardShortcutsPanel } from './common/KeyboardShortcutsPanel'; // {{ AURA: Add - 快捷键提示面板 }}
import { Tutorial } from './Tutorial'; // {{ AURA: Add - 新手引导组件 }}
import { useTutorialStore, shouldShowTutorial } from '../stores/tutorialStore'; // {{ AURA: Add - 新手引导状态管理 }}

// {{ AURA: Remove - 删除旧的虚拟化Hook导入，使用新的useAdvancedVirtualization }}
// import { useVirtualization, useConnectionVirtualization, useVirtualizationStats } from '../hooks/useVirtualization';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout'; // {{ AURA: Add - 响应式布局Hook }}

// ==================== 仲裁专用功能组件 ====================
// 这些组件提供仲裁业务的专用功能
import { EvidenceChainVisualization } from './EvidenceChainVisualization';  // 证据链可视化组件
import { LegalArticleCitation } from './LegalArticleCitation';  // 法律条文引用组件

// ==================== AI智能功能组件 ====================
// 这些组件提供AI驱动的智能分析功能（当前为接口预留，未来集成真实AI）
// import { IntelligentNodeAnalyzer } from './ai/IntelligentNodeAnalyzer';              // 智能节点分析
// import { EvidenceRelationshipDetector } from './ai/EvidenceRelationshipDetector';    // 证据关系检测

// ==================== 协作功能组件 ====================
// 这些组件提供多用户协作功能（基于Plait的协作能力扩展）
// import { UserPermissionManager } from './collaboration/UserPermissionManager';        // 用户权限管理

// import { MultiUserCollaboration } from './collaboration/MultiUserCollaboration'; // {{ AURA: Remove - 移除旧的协作面板 }}
import { FloatingCallWidget } from './collaboration/FloatingCallWidget'; // {{ AURA: Add - 新的浮动通话组件 }}
import { Participant } from './collaboration/CollaborationControl'; // {{ AURA: Add - 参与者类型 }}
import { useCollaborationSync } from './workspace/hooks/useCollaborationSync'; // {{ AURA: Add - 协作同步Hook }}
import { VoiceZoneOverlay } from './collaboration/VoiceZoneOverlay'; // {{ AURA: Add - 语音场覆盖层 }}
import { VoiceZoneCreationLayer } from './collaboration/VoiceZoneCreationLayer'; // {{ AURA: Add - 语音场创建层 }}
import {
  Gavel,
  LayoutTemplate
} from 'lucide-react';
import type { DocumentMetadata } from './workspace/types';

// ==================== 接口定义 ====================
export interface DrawnixLegalWorkspaceProps {
  initialData?: any; // Replace with specific type if available
  user?: {
    id: string;
    name: string;
    avatar: string;
  };
  participants?: Participant[];
  onStartCall?: (selectedIds: string[], type: 'video' | 'audio') => void;
  onEndCall?: () => void;
  onJoinCall?: () => void;
  isCallActive?: boolean;
  // Restored props
  caseId?: string;
  onStateChange?: (state: any) => void;
}

export const DrawnixLegalWorkspace: React.FC<DrawnixLegalWorkspaceProps> = ({
  initialData,

  participants: propParticipants,
  onStartCall,
  onEndCall,
  onJoinCall,
  isCallActive: propIsCallActive = false,
  // Restored props
  caseId,
  onStateChange
}) => {
  // ==================== 状态管理 ====================
  // ==================== 协作状态 (Moved to props/internal default) ====================
  // 默认关闭
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isCallActive, setIsCallActive] = useState(propIsCallActive);

  // Sync prop state if provided
  useEffect(() => {
    if (typeof propIsCallActive !== 'undefined') {
      setIsCallActive(propIsCallActive);
    }
  }, [propIsCallActive]);

  // Mock participants if not provided
  const defaultParticipants: Participant[] = [
    { id: '1', name: '李律师', avatar: 'https://i.pravatar.cc/150?u=1', status: 'online' },
    { id: '2', name: '张法务', avatar: 'https://i.pravatar.cc/150?u=2', status: 'idle' },
    { id: '3', name: '王顾问', avatar: 'https://i.pravatar.cc/150?u=3', status: 'in-call' },
    { id: '4', name: '赵助理', avatar: 'https://i.pravatar.cc/150?u=4', status: 'offline' },
    { id: 'me', name: '我', avatar: 'https://i.pravatar.cc/150?u=me', status: 'online' }
  ];

  const participants = propParticipants || defaultParticipants;

  // Default handlers if not provided
  // Default handlers if not provided
  const defaultStartCall = useCallback((selectedIds: string[], type: 'video' | 'audio') => {
    console.log(`Starting ${type} call with:`, selectedIds);
    setIsCallActive(true);
  }, []);
  const handleStartCall = onStartCall || defaultStartCall;

  const defaultEndCall = useCallback(() => {
    console.log('Ending call');
    setIsCallActive(false);
  }, []);
  const handleEndCall = onEndCall || defaultEndCall;

  const defaultJoinCall = useCallback(() => {
    console.log('Joining call');
    setIsCallActive(true);
  }, []);
  const handleJoinCall = onJoinCall || defaultJoinCall;


  // ==================== 注意：createDemoNodes已从./workspace/utils导入 ====================
  // 不需要在这里重复定义

  // const DrawnixLegalWorkspaceComponent: React.FC<DrawnixLegalWorkspaceProps> = ({
  //   initialNodes = createDemoNodes(),
  //   onNodeCreate,
  //   onNodeUpdate,
  //   onNodeDelete,
  //   onAIAnalysis,
  //   caseId,
  //   onStateChange
  // }) => {


  // {{ AURA: Add - 启用协作同步 }}
  useCollaborationSync();



  // {{ AURA: Add - AI上下文状态 }}


  // {{ AURA: Add - 案件模板面板状态 }}
  // ==================== 使用重构后的Hooks ====================

  // 状态管理Hook
  // 状态管理Hook
  const {
    nodes,
    plaitElements, // {{ AURA: Add - Plait元素 }}
    workspaceState,
    alignmentGuides,
    setNodes,
    setPlaitElements, // {{ AURA: Add - Plait元素设置函数 }}
    updateWorkspaceState,
    setAlignmentGuides,
    setSelectedNodes,
    togglePanel, // {{ AURA: Add - 切换面板函数 }}
  } = useWorkspaceState(initialData?.nodes || createDemoNodes()); // Use initialData

  // {{ AURA: Remove - 评论系统状态已在CanvasRenderer中管理 }}

  // 操作Hook
  const {
    createNode,
    handleNodeDoubleClick,
    handleNodeSave,
    handleNodeDelete,

    startConnection,
    handleNodeConnectionClick,
    cancelConnection,

    // {{ AURA: Add - 接收剪贴板操作 }}
    copyNodes,
    pasteNodes,
    cutNodes,
    performAIAnalysis,

  } = useWorkspaceActions(
    nodes,
    setNodes,
    workspaceState,
    updateWorkspaceState,
    // onNodeCreate, // These props are now part of the new DrawnixLegalWorkspaceProps
    // onNodeUpdate,
    // onNodeDelete,
    // onAIAnalysis
  );

  // {{ AURA: Fix - 立即更新节点位置，移除批处理延迟以消除拖拽延迟感 }}
  const handleBatchedNodePositionChange = useCallback((nodeId: string, position: { x: number; y: number }) => {
    // 直接更新，不使用批处理，提供即时视觉反馈
    setNodes(nodes.map(node =>
      node.id === nodeId
        ? { ...node, data: { ...node.data, position } }
        : node
    ));
  }, [nodes, setNodes]);

  // 画布操作Hook
  const {
    canvasRef,
    handleZoomIn,
    handleZoomOut,
    handleResetView,
    handleFitToScreen,
    moveTo,
    getViewport,
  } = useWorkspaceCanvas(nodes);

  // {{ AURA: Add - 统计面板状态管理 }}
  const [showStatsPanel, setShowStatsPanel] = useState(false);

  // {{ AURA: Add - 文档预览状态管理 }}
  const [previewingDocument, setPreviewingDocument] = useState<DocumentNodeData | null>(null);

  // {{ AURA: Add - 搜索面板状态管理 }}
  const [showSearchPanel, setShowSearchPanel] = useState(false);
  const searchEngineRef = useRef(new SearchEngine());

  // {{ AURA: Add - 过滤面板状态管理 }}
  const [showFilterPanel, setShowFilterPanel] = useState(false);


  // {{ AURA: Add - 导出/导入面板状态管理 }}
  const [showExportImportPanel, setShowExportImportPanel] = useState(false);
  const [showCourtroomPanel, setShowCourtroomPanel] = useState(false); // {{ AURA: Add - 虚拟法庭面板状态 }}

  // {{ AURA: Add - AI Context State }}
  const [, setAiContext] = useState<AIContext | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);
  const [showAISuggestions, setShowAISuggestions] = useState(true);

  const handleContextUpdate = useCallback((context: AIContext) => {
    console.log('[AI] Context updated:', context);
    setAiContext(context);

    // Transform context insights into suggestions
    const newSuggestions: AISuggestion[] = [
      ...context.insights.map((text, i) => ({
        id: `insight-${i}`,
        text,
        type: 'analysis' as const,
        priority: 'medium' as const,
        confidence: 0.85
      })),
      ...context.suggestedActions.map((text, i) => ({
        id: `action-${i}`,
        text,
        type: 'node' as const,
        priority: 'high' as const,
        confidence: 0.92,
        onClick: () => console.log('Action clicked:', text)
      }))
    ];
    setAiSuggestions(newSuggestions);
    if (newSuggestions.length > 0) {
      setShowAISuggestions(true);
    }
  }, []);


  // {{ AURA: Add - 性能监控面板状态管理 }}
  // const [showPerformanceMonitor, setShowPerformanceMonitor] = useState(false);

  // {{ AURA: Add - 案件模板面板状态管理 }}
  const [showTemplatesPanel, setShowTemplatesPanel] = useState(false);
  const [showSaveTemplateDialog, setShowSaveTemplateDialog] = useState(false);

  // {{ AURA: Add - 画布浮动工具栏状态管理 }}
  const [floatingToolbarState, setFloatingToolbarState] = useState<{
    visible: boolean;
    position: { x: number; y: number } | null;
    canvasPosition: { x: number; y: number } | null;
  }>({
    visible: false,
    position: null,
    canvasPosition: null,
  });

  // {{ AURA: Add - 节点类型选择器状态管理 }}
  const [nodeSelectorState, setNodeSelectorState] = useState<{
    visible: boolean;
    position: { x: number; y: number } | null;
    canvasPosition: { x: number; y: number } | null;
  }>({
    visible: false,
    position: null,
    canvasPosition: null,
  });

  // {{ AURA: Add - 语音场创建状态 }}
  const [isCreatingVoiceZone, setIsCreatingVoiceZone] = useState(false);

  const handleCreateVoiceZone = useCallback(() => {
    setIsCreatingVoiceZone(true);
  }, []);

  const handleCancelCreateVoiceZone = useCallback(() => {
    setIsCreatingVoiceZone(false);
  }, []);

  const handleCompleteCreateVoiceZone = useCallback(() => {
    setIsCreatingVoiceZone(false);
  }, []);

  // {{ AURA: Add - 性能优化管理器初始化 }}
  const optimizationManagerRef = useRef<CanvasOptimizationManager | null>(null);


  // {{ AURA: Add - 高级虚拟化Hook }}
  const {
    visibleNodes,
    totalNodes,
    visibleCount,
    culledCount,
    cacheHitRate,
    performanceMetrics
  } = useAdvancedVirtualization(nodes, {
    viewport: getViewport(),
    canvasSize: { width: window.innerWidth, height: window.innerHeight }, // 简化处理，实际应监听resize
    enableCache: true,
    enableIncrementalUpdate: true,
    enableAdaptivePadding: true
  });

  // 初始化性能优化管理器
  useEffect(() => {
    if (!optimizationManagerRef.current) {
      optimizationManagerRef.current = new CanvasOptimizationManager({
        enableVirtualScroll: true,
        enableWorker: true,
        enablePerformanceMonitoring: true,
        virtualScrollOptions: {
          rootMargin: '200px',
          threshold: [0, 0.1, 0.5, 0.9, 1.0]
        },
        throttleOptions: {
          mousemove: 16, // 60fps
          scroll: 16,
          resize: 100
        },
        debounceOptions: {
          input: 300,
          search: 500
        }
      });

      console.log('[Performance] CanvasOptimizationManager initialized');
    }

    return () => {
      if (optimizationManagerRef.current) {
        optimizationManagerRef.current.destroy();
        optimizationManagerRef.current = null;
      }
    };
  }, []);

  // {{ AURA: Add - 新手引导初始化 }}
  useEffect(() => {
    // 检查是否应该显示新手引导
    if (shouldShowTutorial()) {
      const { startTutorial } = useTutorialStore.getState();
      // 延迟1秒显示引导，确保页面已完全加载
      const timer = setTimeout(() => {
        startTutorial();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  // {{ AURA: Add - 重新查看引导回调 }}
  const handleRestartTutorial = useCallback(() => {
    const { resetTutorial } = useTutorialStore.getState();
    resetTutorial();
  }, []);

  // {{ AURA: Add - 高级虚拟化Hook }}
  const viewport = useMemo(() => ({
    x: workspaceState.viewport.x,
    y: workspaceState.viewport.y,
    zoom: workspaceState.viewport.zoom
  }), [workspaceState.viewport]);

  const canvasSize = useMemo(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 1920,
    height: typeof window !== 'undefined' ? window.innerHeight : 1080
  }), []);



  // {{ AURA: Add - 性能监控 }}
  useEffect(() => {
    if (performanceMetrics.totalTime > 50) {
      console.warn('[Performance] Slow virtualization:', performanceMetrics);
    }
  }, [performanceMetrics]);

  // {{ AURA: Add - 响应式布局Hook }}
  const {
    isMobile,
  } = useResponsiveLayout();

  // {{ AURA: Add - 自动保存功能 }}
  const workspaceData = useMemo(() => ({
    nodes,
    connections: workspaceState.connections,
    viewport: getViewport(),
    timestamp: new Date().toISOString(),
  }), [nodes, workspaceState.connections, getViewport]);

  const autoSaveState = useAutoSave(workspaceData, {
    storageKey: caseId ? `workspace_${caseId}` : 'workspace_default',
    interval: 30000, // 30秒
    debounce: 1000, // 1秒
    maxHistory: 10,
    enabled: true,
    onSave: async (data) => {
      console.log('[AutoSave] Saving workspace data:', data);
      // 如果提供了onStateChange回调，也调用它
      if (onStateChange) {
        onStateChange({
          nodes: data.nodes,
          connections: data.connections,
          viewport: data.viewport,
          metadata: { version: '1.0.0', editCount: 0 }, // Add metadata to satisfy CanvasState interface
        });
      }
    },
    onError: (error) => {
      console.error('[AutoSave] Failed to save:', error);
      handleError(error, ErrorType.STORAGE, ErrorSeverity.MEDIUM, 'AutoSave');
    },
  });

  // {{ AURA: Add - 撤销/重做功能 }}
  const undoRedoData = useMemo(() => ({
    nodes,
    connections: workspaceState.connections,
  }), [nodes, workspaceState.connections]);

  const {

    setState: setUndoRedoState,
    undo,
    redo,
    canUndo,
    canRedo,

  } = useUndoRedo(undoRedoData, {
    maxHistory: 50,
    enabled: true,
    onChange: (state) => {
      console.log('[UndoRedo] State changed:', state);
      // 更新节点和连接
      setNodes(state.nodes);
      updateWorkspaceState(prev => ({
        ...prev,
        connections: state.connections,
      }));
    },
  });

  // 启用快捷键
  useUndoRedoShortcuts(undo, redo, true);

  // 当节点或连接变化时，更新撤销/重做状态
  useEffect(() => {
    setUndoRedoState(undoRedoData, 'Workspace change');
  }, [nodes, workspaceState.connections, setUndoRedoState, undoRedoData]);

  // {{ AURA: Add - 批处理版本的setNodes }}


  // {{ AURA: Add - 全局节点动画管理 }}


  // Plait配置和插件
  const options = useMemo<PlaitBoardOptions>(() => ({
    ...PLAIT_OPTIONS,
    themeColors: MindThemeColors,
  }), []);

  const plugins = useMemo<PlaitPlugin[]>(() => PLAIT_PLUGINS as unknown as PlaitPlugin[], []);

  // 节点类型配置


  // 额外回调Hook
  const {
    handleSmartLayout,
    handleContextMenu,
    handleCanvasContextMenu, // {{ AURA: Add - 画布右键菜单处理 }}
    handleCloseContextMenu,
    handleDuplicateNode,
    handleArbitrationFunctionSelect,
    handleArbitrationFunctionLaunch,
    handleCloseArbitrationPanel,
    saveWorkspaceData,
    // {{ AURA: Add - FloatingToolbar相关回调 }}
    handleCanvasDoubleClick,
    handleCloseFloatingToolbar,
    handleShowNodeSelector,
    handleCloseNodeSelector,
    handleCreateComment, // {{ AURA: Add - 创建评论 }}
    handleCreateChatNote, // {{ AURA: Add - 创建聊天贴 }}
    handleCreateMindMap, // {{ AURA: Add - 创建思维导图 }}
    handleCreateFlowchart, // {{ AURA: Add - 创建流程图 }}
    handleCreateFreehand, // {{ AURA: Add - 创建手绘 }}
  } = useAdditionalCallbacks({
    nodes,
    setNodes,
    workspaceState,
    updateWorkspaceState,
    canvasRef,
    onStateChange,
    // {{ AURA: Add - 传递FloatingToolbar状态管理函数 }}
    setFloatingToolbarState,
    setNodeSelectorState,
    setPlaitElements, // {{ AURA: Add - 传递Plait元素设置函数 }}
  });

  // {{ AURA: Add - 处理法律条文引用点击 }}
  // const handleLegalArticleClick = useCallback((nodeId: string, articleId: string) => {
  //   console.log('Legal article clicked:', nodeId, articleId);
  //   // 这里可以添加打开法律条文详情的逻辑
  // }, []);



  // {{ AURA: Remove - 删除旧的虚拟化实现，使用新的useAdvancedVirtualization Hook }}
  // 虚拟化渲染
  const [currentViewport, setCurrentViewport] = useState({ zoom: 1, x: 0, y: 0 });
  const lastViewportRef = useRef({ zoom: 1, x: 0, y: 0 });

  // {{ AURA: Add - Sync viewport to workspaceStore for LOD }}
  useEffect(() => {
    useWorkspaceStore.getState().setZoomLevel(currentViewport.zoom);
  }, [currentViewport.zoom]);

  // {{ AURA: Add - 连接线虚拟化使用ConnectionRendererOptimized }}
  // 连接线虚拟化现在由ConnectionRendererOptimized处理


  // 过滤可见连接线（只保留两端节点都可见的连接）


  // {{ AURA: Add - 创建virtualizationStats对象以兼容现有代码 }}
  const virtualizationStats = useMemo(() => ({
    nodeCullingRate: culledCount / totalNodes,
    estimatedPerformanceGain: (culledCount / totalNodes) * 100,
    totalNodes,
    visibleCount,
    culledCount,
    cacheHitRate,
    performanceMetrics
  }), [culledCount, totalNodes, visibleCount, cacheHitRate, performanceMetrics]);

  // {{ AURA: Remove - 删除重复的评论创建回调，统一使用useAdditionalCallbacks中的handleCreateComment和handleCreateChatNote }}

  // {{ AURA: Add - 搜索快捷键回调 }}
  const handleSearchShortcut = useCallback(() => {
    setShowSearchPanel(true);
  }, []);

  // {{ AURA: Add - 优化：提取节点点击回调 }}
  const handleConnectionStart = useCallback((nodeId: string) => {
    updateWorkspaceState(prev => ({
      ...prev,
      isConnecting: true,
      connectionStart: nodeId
    }));
  }, [updateWorkspaceState]);

  const handleNodeClick = useCallback((nodeId: string) => {
    updateWorkspaceState(prev => ({
      ...prev,
      selectedNodes: prev.selectedNodes.includes(nodeId)
        ? prev.selectedNodes.filter(id => id !== nodeId)
        : [...prev.selectedNodes, nodeId],
    }));
  }, [updateWorkspaceState]);

  // {{ AURA: Add - 优化：提取节点选择回调 }}
  const handleNodeSelect = useCallback((nodeId: string, isSelected: boolean) => {
    updateWorkspaceState(prev => ({
      ...prev,
      selectedNodes: isSelected
        ? prev.selectedNodes.filter(id => id !== nodeId)
        : [...prev.selectedNodes, nodeId]
    }));
  }, [updateWorkspaceState]);

  // {{ AURA: Add - 优化：提取画板拖放回调 (Palette) }}
  const handlePaletteDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const data = e.dataTransfer.getData('application/json');
    if (data) {
      try {
        const payload = JSON.parse(data);
        if (payload.type === 'arbitration-function') {
          const viewport = getViewport();
          const { clientX, clientY } = e;
          // Convert to canvas coordinates
          const canvasX = (clientX - viewport.x) / viewport.zoom;
          const canvasY = (clientY - viewport.y) / viewport.zoom;

          // Map functionId to node type
          let nodeType = 'analysis'; // Default
          if (payload.functionId === 'dispute-focus') nodeType = 'issue';
          else if (payload.functionId === 'evidence-chain') nodeType = 'evidence';
          else if (payload.functionId === 'procedure-manager') nodeType = 'timeline';
          else if (payload.functionId === 'tribunal-composition') nodeType = 'arbitrator';
          else if (payload.functionId === 'fee-calculator') nodeType = 'analysis';

          createNode(nodeType as any, { x: canvasX, y: canvasY }, { title: payload.name });
        }
      } catch (err) {
        console.error('Failed to parse drop data', err);
      }
    }
  }, [getViewport, createNode]);

  // {{ AURA: Add - 优化：提取文件拖放回调 (File) }}
  const handleFileDrop = useCallback(async (e: React.DragEvent, position: { x: number; y: number }) => {
    // {{ AURA: Modify - 改进文件拖放，使用新的DocumentNodeData格式和文件上传 }}
    const files = getFilesFromDragEvent(e);
    if (files.length > 0) {
      files.forEach(async (file, index) => {
        // 为每个文件创建文档节点，稍微偏移位置避免重叠
        const offsetPosition = {
          x: position.x + (index * 30),
          y: position.y + (index * 30),
        };

        // 创建文档节点数据
        const documentData = createDocumentNodeData(file);

        // 创建节点
        const newNode = createNode('legal-document', offsetPosition);

        if (newNode) {
          // 更新节点为上传中状态
          handleNodeSave(newNode.id, {
            data: {
              ...newNode.data,
              title: file.name,
              description: `正在上传文件...`,
              metadata: {
                ...documentData,
                uploadStatus: 'uploading',
                uploadProgress: 0,
              } as unknown as DocumentMetadata,
            },
          });

          // 上传文件
          const result = await uploadFile(file, (progress) => {
            // 更新上传进度
            handleNodeSave(newNode.id, {
              data: {
                ...newNode.data,
                metadata: {
                  ...documentData,
                  uploadStatus: 'uploading',
                  uploadProgress: progress,
                } as unknown as DocumentMetadata,
              },
            });
          });

          // 更新节点为上传完成或失败状态
          if (result.success) {
            handleNodeSave(newNode.id, {
              data: {
                ...newNode.data,
                description: `文件已上传`,
                metadata: {
                  ...documentData,
                  fileUrl: result.fileUrl,
                  thumbnailUrl: result.thumbnailUrl,
                  uploadStatus: 'uploaded',
                  uploadProgress: 100,
                } as unknown as DocumentMetadata,
              },
            });
          } else {
            handleNodeSave(newNode.id, {
              data: {
                ...newNode.data,
                description: `上传失败`,
                metadata: {
                  ...documentData,
                  uploadStatus: 'error',
                  errorMessage: result.errorMessage,
                } as unknown as DocumentMetadata,
              },
            });
          }
        }
      });
    }
  }, [createNode, handleNodeSave]);

  // {{ AURA: Add - 过滤快捷键回调 }}
  const handleFilterShortcut = useCallback(() => {
    setShowFilterPanel(true);
  }, []);

  // {{ AURA: Add - 导出/导入快捷键回调 }}
  const handleExportImportShortcut = useCallback(() => {
    setShowExportImportPanel(true);
  }, []);

  // {{ AURA: Add - 模板选择回调 }}
  const handleTemplateSelect = useCallback((template: WorkflowTemplate) => {
    // 计算中心位置
    const center = {
      x: (canvasSize.width / 2 - viewport.x) / viewport.zoom,
      y: (canvasSize.height / 2 - viewport.y) / viewport.zoom
    };

    // 1. 创建新节点并建立索引映射
    const newNodes: LegalNode[] = [];
    const nodeIndexMap: Record<string, string> = {}; // oldId (index) -> newId

    template.nodes.forEach((nodeConfig, index) => {
      const newId = `node-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 5)}`;
      nodeIndexMap[index.toString()] = newId;

      // 计算位置（如果没有预设位置，则按网格排列）
      // 假设模板数据中metadata包含position，或者我们需要自动布局
      // 这里简单处理：如果有position则使用，否则按index偏移
      const position = (nodeConfig.metadata as any)?.position || {
        x: center.x + (index % 3) * 250,
        y: center.y + Math.floor(index / 3) * 150
      };

      const newNode: LegalNode = {
        id: newId,
        type: (nodeConfig.type as any) || 'legal-case',
        data: {
          ...nodeConfig,
          id: newId, // Ensure ID is in data too if needed by some components
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          connections: [], // Initialize connections array
          position: {
            x: position.x,
            y: position.y
          },
          // Ensure metadata exists and has required fields
          metadata: {
            ...(nodeConfig.metadata || {}),
            createdFromTemplate: template.id
          }
        }
      } as LegalNode;

      newNodes.push(newNode);
    });

    // 2. 创建连接
    const newConnections = template.connections.map((connConfig, index) => {
      const sourceId = nodeIndexMap[connConfig.sourceNodeId];
      const targetId = nodeIndexMap[connConfig.targetNodeId];

      if (sourceId && targetId) {
        return {
          ...connConfig,
          id: `conn-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 5)}`,
          sourceNodeId: sourceId,
          targetNodeId: targetId,
          metadata: {
            ...(connConfig.metadata || {}),
            createdFromTemplate: template.id
          }
        };
      }
      return null;
    }).filter(Boolean) as any[]; // Cast to any to avoid strict type checking issues with Connection type mismatch if any

    // 3. 更新工作台状态
    setNodes(prev => [...prev, ...newNodes]);
    updateWorkspaceState(prev => ({
      ...prev,
      connections: [...prev.connections, ...newConnections]
    }));

    // 提示用户
    // toast.success(`已应用模板：${template.name}`);
  }, [canvasSize, viewport, setNodes, updateWorkspaceState]);

  // {{ AURA: Add - 保存模板回调 }}
  const handleSaveTemplate = useCallback((templateData: Omit<WorkflowTemplate, 'id'>) => {
    // 获取当前节点和连接
    const currentNodes = nodes.map(node => {
      // 移除id和时间戳，保留相对位置
      // node.data doesn't have id in types.ts definition, but we use node.id
      const { createdAt: _createdAt, updatedAt: _updatedAt, ...rest } = node.data;

      return {
        ...rest,
        id: node.id, // Use node.id as the ID
        type: node.type,
        metadata: {
          ...rest.metadata,
          position: node.data.position
        }
      };
    });

    const currentConnections = workspaceState.connections.map(conn => {
      const { id: _id, source, target, type, ...rest } = conn;
      return {
        ...rest,
        sourceNodeId: source,
        targetNodeId: target,
        connectionType: type as any // Cast to any or specific type if known
      };
    });

    // 调用store保存
    useWorkspaceStore.getState().saveAsTemplate({
      ...templateData,
      nodes: currentNodes as any,
      connections: currentConnections
    });

    // toast.success('模板保存成功');
  }, [nodes, workspaceState.connections]);



  // 快捷键回调
  const keyboardCallbacks = useKeyboardShortcutCallbacks({
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
    // {{ AURA: Add - 传递剪贴板操作到快捷键 }}
    copyNodes,
    pasteNodes,
    cutNodes,
    // {{ AURA: Fix - 使用useAdditionalCallbacks中的评论创建回调，避免重复创建 }}
    onCreateComment: handleCreateComment,
    onCreateChatNote: handleCreateChatNote,
    onShowNodeSelector: handleShowNodeSelector,
    // {{ AURA: Add - 传递搜索、过滤和导出/导入操作到快捷键 }}
    onSearch: handleSearchShortcut,
    onFilter: handleFilterShortcut,
    onExportImport: handleExportImportShortcut,
  });

  // 快捷键系统
  const { shortcuts, isShortcutsPanelOpen, closeShortcutsPanel } = useKeyboardShortcuts({
    ...keyboardCallbacks,
    onFilter: handleFilterShortcut, // {{ AURA: Add - 传递过滤快捷键 }}
  });

  // 工具栏回调
  const toolbarCallbacks = useToolbarCallbacks({
    workspaceState,
    updateWorkspaceState,
    handleZoomIn,
    handleZoomOut,
    handleResetView,
    handleFitToScreen,
    handleCreateNode: (type: string) => createNode(type as LegalNode['type']),
    handleSmartLayout,
    cancelConnection,
    startConnection: (type: string) => startConnection(type as any),
    saveWorkspaceData,
    dataStorage,
    handleError,
    undo, // {{ AURA: Add - 撤销回调 }}
    redo, // {{ AURA: Add - 重做回调 }}
    canUndo, // {{ AURA: Add - 是否可以撤销 }}
    canRedo, // {{ AURA: Add - 是否可以重做 }}
    onRestartTutorial: handleRestartTutorial, // {{ AURA: Add - 重新查看引导回调 }}
    onOpenTemplates: () => setShowTemplatesPanel(true), // {{ AURA: Add - 打开模板面板回调 }}
  });

  return (
    <div
      className="h-full w-full bg-gradient-to-br from-gray-50 to-gray-100 relative overflow-hidden"
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
      }}
      onDrop={handlePaletteDrop}
    >
      {/* 浮动工具栏 - 全屏模式下隐藏，移动端自动切换到固定模式 */}
      {!workspaceState.isFullscreen && (
        <FloatingToolbar
          {...toolbarCallbacks}
          // {{ AURA: Add - 响应式适配：移动端强制固定模式 }}
          // {{ AURA: Add - 响应式适配：移动端强制固定模式 }}
          defaultMode={isMobile ? 'fixed' : undefined}
          // {{ AURA: Add - 协作相关Props }}
          participants={participants}
          isCallActive={isCallActive}
          onStartCall={handleStartCall}
          onEndCall={handleEndCall}
          onJoinCall={handleJoinCall}
        />
      )}

      {/* 左侧节点创建面板 - 已移至顶部工具栏 */}
      {/*
      {!workspaceState.isFullscreen && (
        <ResizablePanel
          side="left"
          defaultWidth={280}
          minWidth={80}
          maxWidth={400}
          collapsible
          defaultCollapsed={false}
          storageKey="workspace-left-panel"
        >
          <div className="p-4">
            <div className="mb-4">
              <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                  <Plus className="w-3 h-3 text-white" />
                </div>
                创建法律节点
              </h3>
            </div>
            <div className="space-y-2">
              {Object.entries(nodeTypeConfig).map(([type, config]) => {
                const IconComponent = config.icon;
                return (
                  <Button
                    key={type}
                    variant="outline"
                    className="w-full justify-start border-gray-200 hover:border-orange-400 hover:bg-orange-50 transition-all duration-200 hover:shadow-md"
                    onClick={() => createNode(type as LegalNode['type'])}
                  >
                    <div className={`w-7 h-7 rounded-lg ${config.color} mr-3 flex items-center justify-center shadow-sm`}>
                      <IconComponent className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-medium">{config.label}</span>
                  </Button>
                );
              })}
            </div>
          </div>
        </ResizablePanel>
      )}
      */}

      {/* 右侧AI建议面板 - 使用独立组件 */}
      <AISuggestionsFloatingPanel
        suggestions={workspaceState.aiSuggestions.map(s => ({
          text: s.suggestion,
          confidence: s.confidence,
          type: s.type as any,
          id: s.id
        }))}
        visible={!workspaceState.isFullscreen}
      />

      {/* {{ AURA: Add - 顶部功能开关 }} */}
      <Button
        variant={showCourtroomPanel ? "default" : "outline"}
        size="sm"
        onClick={() => setShowCourtroomPanel(!showCourtroomPanel)}
        className="shadow-md bg-white/90 backdrop-blur hover:bg-white"
      >
        <Gavel className="w-4 h-4 mr-2" />
        模拟法庭
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowSaveTemplateDialog(true)}
        className="shadow-md bg-white/90 backdrop-blur hover:bg-white ml-2"
      >
        <LayoutTemplate className="w-4 h-4 mr-2" />
        保存模板
      </Button>


      {/* 视图切换器 - 全屏模式下也显示 */}
      <div className="absolute top-4 right-4 z-40 flex gap-2">
        <Button
          variant={showCourtroomPanel ? "default" : "outline"}
          size="sm"
          onClick={() => setShowCourtroomPanel(!showCourtroomPanel)}
          className="shadow-sm"
        >
          ⚖️ 虚拟法庭
        </Button>
        <ViewSwitcher
          currentView={workspaceState.viewMode}
          onViewChange={(view) => {
            updateWorkspaceState(prev => ({
              ...prev,
              viewMode: view,
            }));
          }}
        />
      </div>


      {/* 性能监控面板 - 浮动窗口模式 */}
      {
        workspaceState.showPerformanceMonitor && (
          <PerformanceMonitor
            onClose={() => togglePanel('showPerformanceMonitor')}
            position="top-right"
          />
        )
      }

      {/* 案件模板面板 */}
      <ModalPanel
        isOpen={showTemplatesPanel}
        title="案件模板库"
        onClose={() => setShowTemplatesPanel(false)}
        size="lg"
      >
        <LegalWorkflowTemplates
          onSelectTemplate={handleTemplateSelect}
          onClose={() => setShowTemplatesPanel(false)}
        />
      </ModalPanel>

      {/* 保存模板对话框 */}
      <SaveTemplateDialog
        isOpen={showSaveTemplateDialog}
        onClose={() => setShowSaveTemplateDialog(false)}
        onSave={handleSaveTemplate}
      />

      {/* 根据视图模式渲染不同内容 */}
      <ViewModeRenderer
        viewMode={workspaceState.viewMode}
        nodes={nodes}
        selectedNodeIds={workspaceState.selectedNodes}
        onNodeClick={handleNodeClick}
        onNodeDoubleClick={handleNodeDoubleClick}
        canvasRef={canvasRef}
        currentViewport={currentViewport}
        visibleNodes={visibleNodes}
        plaitElements={plaitElements} // {{ AURA: Add - 传递Plait元素 }}
        isConnecting={workspaceState.isConnecting}
        connectionStart={workspaceState.connectionStart}
        alignmentGuides={alignmentGuides}
        options={options}
        plugins={plugins}
        lastViewportRef={lastViewportRef}
        onNodeSelect={handleNodeSelect}
        onNodePositionChange={handleBatchedNodePositionChange} // {{ AURA: Modify - 使用批处理优化的位置更新 }}
        onNodeConnectionClick={handleNodeConnectionClick}
        onConnectionStart={handleConnectionStart}
        onAlignmentGuidesChange={setAlignmentGuides}
        onContextMenu={handleContextMenu}
        onCanvasDoubleClick={handleCanvasDoubleClick} // {{ AURA: Modify - 使用handleCanvasDoubleClick回调 }}
        onCanvasContextMenu={handleCanvasContextMenu} // {{ AURA: Add - 画布右键菜单处理 }}
        onCanvasDrop={handleFileDrop}
        onViewportChange={setCurrentViewport}
      />

      {/* {{ AURA: Add - Empty State Overlay }} */}
      {nodes.length === 0 && workspaceState.viewMode === 'network' && (
        <CanvasEmptyState
          onCreateNode={() => {
            const newNode: LegalNode = {
              id: uuidv4(),
              type: 'legal-case',
              data: {
                title: '新案件',
                description: '双击编辑描述',
                position: { x: 0, y: 0 },
                connections: [],
                status: 'active',
                metadata: {
                  caseNumber: `CASE-${Date.now()}`,
                  caseType: 'general',
                  filingDate: new Date().toISOString()
                }
              }
            };
            setNodes(prev => [...prev, newNode]);
          }}
          onImportFile={() => document.getElementById('hidden-file-input')?.click()}
          onSelectTemplate={() => setShowTemplatesPanel(true)}
        />
      )}
      <input
        type="file"
        id="hidden-file-input"
        className="hidden"
        onChange={(e) => console.log('File selected:', e.target.files?.[0])}
      />

      {/* {{ AURA: Modify - 改进状态栏，添加工具提示和更多指标 }} */}
      <StatusBar
        visible={!workspaceState.isFullscreen}
        position="bottom-right"
        items={(() => {
          const stats = calculateWorkspaceStats(
            nodes,
            workspaceState.connections as any,
            workspaceState.selectedNodes,
            virtualizationStats
          );

          return [
            {
              id: 'nodes',
              label: '节点',
              value: nodes.length,
              color: 'blue',
              tooltip: generateNodeTypeTooltip(stats.nodesByType),
              onClick: () => setShowStatsPanel(true),
            },
            {
              id: 'connections',
              label: '连接',
              value: stats.totalConnections, // {{ AURA: Fix - 使用stats中计算的实际连接数 }}
              color: 'purple',
              tooltip: generateConnectionTypeTooltip(stats.connectionsByType),
              onClick: () => setShowStatsPanel(true),
            },
            {
              id: 'selected',
              label: '选中',
              value: workspaceState.selectedNodes.length,
              color: 'orange',
              tooltip: generateSelectedNodesTooltip(stats.selectedNodeTypes, nodes, workspaceState.selectedNodes),
              onClick: () => setShowStatsPanel(true),
            },
            {
              id: 'collaborators',
              label: '协作者',
              value: stats.collaboratorCount,
              color: 'green',
              tooltip: generateCollaboratorsTooltip(stats.collaboratorNames),
              onClick: () => setShowStatsPanel(true),
            },
            {
              id: 'zoom',
              label: '缩放',
              value: `${Math.round(currentViewport.zoom * 100)}%`,
              color: 'gray',
            },
            {
              id: 'performance',
              label: '性能',
              value: `+${virtualizationStats.estimatedPerformanceGain.toFixed(0)}%`,
              color: 'green',
              visible: virtualizationStats.nodeCullingRate > 0,
              tooltip: (
                <div className="space-y-1">
                  <div className="font-semibold text-xs">性能优化：</div>
                  <div className="text-xs">节点剔除率: {(virtualizationStats.nodeCullingRate * 100).toFixed(1)}%</div>
                  <div className="text-xs">性能提升: +{virtualizationStats.estimatedPerformanceGain.toFixed(0)}%</div>
                </div>
              ),
              onClick: () => setShowStatsPanel(true),
            },
          ];
        })()}
      />

      {/* 所有模态面板 */}
      <AllModalsRenderer
        workspaceState={workspaceState}
        nodes={nodes}
        onCloseEditingNode={() => updateWorkspaceState(prev => ({ ...prev, editingNode: null, editingNodes: [] }))} // {{ AURA: Fix - 同时清空editingNodes }}
        onRemoveEditingNode={(nodeId) => updateWorkspaceState(prev => ({ // {{ AURA: Add - 新增关闭单个节点的回调 }}
          ...prev,
          editingNodes: prev.editingNodes.filter(n => n.id !== nodeId),
          editingNode: prev.editingNodes.filter(n => n.id !== nodeId)[0] || null
        }))}
        onNodeSave={handleNodeSave}
        onNodeDelete={handleNodeDelete}
        onCloseArbitrationPanel={handleCloseArbitrationPanel}
        onArbitrationFunctionSelect={handleArbitrationFunctionSelect}
        onArbitrationFunctionLaunch={handleArbitrationFunctionLaunch}
        onCloseAIAnalysisPanel={() => updateWorkspaceState(prev => ({ ...prev, showAIAnalysisPanel: false }))}
        onCloseEvidenceRelationPanel={() => updateWorkspaceState(prev => ({ ...prev, showEvidenceRelationPanel: false }))}
        onCloseRecommendationPanel={() => updateWorkspaceState(prev => ({ ...prev, showRecommendationPanel: false }))}
        onClosePermissionPanel={() => updateWorkspaceState(prev => ({ ...prev, showPermissionPanel: false }))}
        onCloseCollaborationPanel={() => updateWorkspaceState(prev => ({ ...prev, showCollaborationPanel: false }))}
      />

      {/* 辅助UI组件 */}
      <AuxiliaryUIRenderer
        viewMode={workspaceState.viewMode}
        isFullscreen={workspaceState.isFullscreen}
        showShortcutsHelp={workspaceState.showShortcutsHelp}
        contextMenu={workspaceState.contextMenu}
        nodes={nodes as any}
        currentViewport={currentViewport}
        shortcuts={(shortcuts as any).map((s: any) => ({
          keys: [s.key], // 简单映射，实际可能需要组合键处理
          description: s.description,
          category: '通用'
        }))}
        canvasRef={canvasRef as any}
        onContextMenuEdit={handleNodeDoubleClick}
        onContextMenuDelete={handleNodeDelete}
        onContextMenuDuplicate={handleDuplicateNode}
        onContextMenuConnect={(nodeId) => {
          updateWorkspaceState(prev => ({
            ...prev,
            isConnecting: true,
            connectionStart: nodeId,
          }));
        }}
        onContextMenuClose={handleCloseContextMenu}
        onCloseShortcutsHelp={() => {
          updateWorkspaceState(prev => ({
            ...prev,
            showShortcutsHelp: false,
          }));
        }}
        onMinimapViewportChange={() => { }}
        onCreateNode={(type, position) => {
          createNode(type as LegalNodeTypes, position);
        }}
        onCreateChatNote={handleCreateChatNote} // {{ AURA: Modify - 使用handleCreateChatNote回调 }}
        onAIAnalysis={(nodeIds) => {
          performAIAnalysis(nodeIds);
        }}
        onCreateComment={handleCreateComment} // {{ AURA: Modify - 使用handleCreateComment回调 }}
        // {{ AURA: Add - 粘贴功能 }}
        // {{ AURA: Add - 粘贴功能 }}
        onPaste={pasteNodes}
        // {{ AURA: Add - Drawnix工具回调 }}
        onCreateMindMap={handleCreateMindMap}
        onCreateFlowchart={handleCreateFlowchart}
        onCreateFreehand={handleCreateFreehand}
        // {{ AURA: Add - FloatingToolbar状态和回调 }}
        floatingToolbarState={floatingToolbarState}
        onCloseFloatingToolbar={handleCloseFloatingToolbar}
        onShowNodeSelector={handleShowNodeSelector}
        // {{ AURA: Add - NodeTypeSelector状态和回调 }}
        nodeSelectorState={nodeSelectorState}
        onCloseNodeSelector={handleCloseNodeSelector}
      />

      {/* 法律关系图谱 */}
      {
        workspaceState.showRelationshipGraph && (
          <LegalRelationshipGraph
            nodes={nodes}
            onClose={() => {
              updateWorkspaceState(prev => ({
                ...prev,
                showRelationshipGraph: false,
              }));
            }}
          />
        )
      }

      {/* 证据链可视化 */}
      {
        workspaceState.showEvidenceChain && (
          <EvidenceChainVisualization
            nodes={nodes}
            onClose={() => {
              updateWorkspaceState(prev => ({
                ...prev,
                showEvidenceChain: false,
              }));
            }}
          />
        )
      }



      {/* {{ AURA: Add - 性能监控面板 }} */}
      {
        workspaceState.showPerformanceMonitor && (
          <PerformanceMonitor
            onClose={() => {
              updateWorkspaceState(prev => ({
                ...prev,
                showPerformanceMonitor: false,
              }));
            }}
            position="top-right"
          />
        )
      }

      {/* 法律条文引用 */}
      {
        workspaceState.showLegalArticleCitation && (
          <LegalArticleCitation
            nodes={nodes}
            selectedNodeId={workspaceState.selectedNodes[0]}
            onClose={() => {
              updateWorkspaceState(prev => ({
                ...prev,
                showLegalArticleCitation: false,
              }));
            }}
            onCiteArticle={(nodeId, articleId) => {
              // 更新节点的引用条文
              setNodes(prevNodes => {
                return prevNodes.map(node => {
                  if (node.id === nodeId) {
                    // metadata is a union, and we added citedArticles to all of them, so this should be safe now.
                    // If TS still complains, we can use a type guard or cast.
                    // For now, let's try direct access as we updated types.ts
                    const metadata = node.data.metadata;
                    const citedArticles = metadata?.citedArticles || [];
                    const newCitedArticles = citedArticles.includes(articleId)
                      ? citedArticles.filter(id => id !== articleId)
                      : [...citedArticles, articleId];

                    return {
                      ...node,
                      data: {
                        ...node.data,
                        metadata: {
                          ...metadata,
                          citedArticles: newCitedArticles
                        }
                      }
                    };
                  }
                  return node;
                });
              });
            }}
          />
        )
      }

      {/* {{ AURA: Add - 统计详情面板 }} */}
      {
        showStatsPanel && (
          <StatsPanel
            stats={calculateWorkspaceStats(
              nodes,
              workspaceState.connections as any,
              workspaceState.selectedNodes,
              virtualizationStats
            )}
            onClose={() => setShowStatsPanel(false)}
          />
        )
      }

      {/* {{ AURA: Add - 文档预览面板 }} */}
      {
        previewingDocument && (
          <DocumentPreview
            data={previewingDocument}
            onClose={() => setPreviewingDocument(null)}
          />
        )
      }

      {/* {{ AURA: Add - 快捷键提示面板 }} */}
      <KeyboardShortcutsPanel
        isOpen={isShortcutsPanelOpen}
        onClose={closeShortcutsPanel}
      />

      {/* {{ AURA: Add - 自动保存指示器 }} */}
      <AutoSaveIndicator
        isSaving={autoSaveState.isSaving}
        lastSaved={autoSaveState.lastSaved}
        hasUnsavedChanges={autoSaveState.hasUnsavedChanges}
        error={autoSaveState.error}
        onSaveNow={autoSaveState.saveNow}
        position="bottom-right"
        showDetails={true}
      />

      {/* {{ AURA: Remove - 移除重复渲染，已在AuxiliaryUIRenderer中渲染 }} */}

      {/* {{ AURA: Add - 聊天贴图层 }} */}
      <ChatNoteLayer className="absolute inset-0 pointer-events-none z-40" />

      {/* {{ AURA: Add - 语音场覆盖层 }} */}
      <VoiceZoneOverlay getViewport={getViewport} />

      {/* {{ AURA: Add - 语音场创建层 }} */}
      <VoiceZoneCreationLayer
        active={isCreatingVoiceZone}
        getViewport={getViewport}
        onComplete={handleCompleteCreateVoiceZone}
        onCancel={handleCancelCreateVoiceZone}
      />

      {/* {{ AURA: Add - 节点搜索面板 }} */}
      <NodeSearchPanel
        nodes={nodes}
        isOpen={showSearchPanel}
        onClose={() => setShowSearchPanel(false)}
        onSelectNode={(node) => {
          // 选中节点并移动视图到节点位置
          setSelectedNodes([node.id]);
          if (node.data.position) {
            moveTo({ x: node.data.position.x, y: node.data.position.y });
          }
          setShowSearchPanel(false);
        }}
        searchEngine={searchEngineRef.current}
        onOpenFilter={() => setShowFilterPanel(true)} // {{ AURA: Add - 打开过滤面板 }}
      />

      {/* {{ AURA: Add - 节点过滤面板 }} */}
      <NodeFilterPanel
        nodes={nodes}
        isOpen={showFilterPanel}
        onClose={() => setShowFilterPanel(false)}
        onFilterChange={(filtered) => {

          if (filtered.length > 0) {
            setSelectedNodes(filtered.map(n => n.id));
          }
        }}
      />


      {/* {{ AURA: Add - AI Context Awareness }} */}
      <AIContextAwareness
        nodes={nodes}
        connections={workspaceState.connections}
        onContextUpdate={handleContextUpdate}
      />

      <AISuggestionsFloatingPanel
        suggestions={aiSuggestions}
        visible={showAISuggestions}
        onClose={() => setShowAISuggestions(false)}
      />


      {/* {{ AURA: Add - 导出/导入面板 }} */}
      <ExportImportPanel
        nodes={nodes}
        connections={workspaceState.connections}
        viewport={{ ...getViewport(), origination: [getViewport().x, getViewport().y] }}
        isOpen={showExportImportPanel}
        onClose={() => setShowExportImportPanel(false)}
        onImport={(importedNodes, importedConnections) => {
          setNodes(importedNodes);
          updateWorkspaceState(prev => ({ ...prev, connections: importedConnections }));
          setShowExportImportPanel(false);
        }}
      />

      {/* {{ AURA: Remove - 评论系统（标记和面板）已在CanvasRenderer中渲染，移除重复渲染 }} */}

      {/* {{ AURA: Add - 浮动工具栏 }} */}


      {/* {{ AURA: Add - 浮动工具栏 }} */}
      <FloatingToolbar
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetView={handleResetView}
        onFitToScreen={handleFitToScreen}
        onCreateNode={(type) => {
          const viewport = getViewport();
          const center = {
            x: (canvasSize.width / 2 - viewport.x) / viewport.zoom,
            y: (canvasSize.height / 2 - viewport.y) / viewport.zoom
          };
          createNode(type as any, center);
        }}
        onSmartLayout={handleSmartLayout}
        onArbitrationPanel={() => togglePanel('showArbitrationPanel')}
        onAIAnalysis={performAIAnalysis}
        onRelationDetection={() => { }}
        onSmartRecommendation={() => { }}
        onLegalArticleCitation={() => { }}
        onPermissionManagement={() => { }}
        onConnectionMode={() => updateWorkspaceState(prev => ({ ...prev, isConnecting: !prev.isConnecting }))}
        onCollaboration={() => { }}
        onSave={() => saveWorkspaceData()}
        onExport={() => setShowExportImportPanel(true)}
        isConnecting={workspaceState.isConnecting}
        participants={participants}
        isCallActive={isCallActive}
        onStartCall={handleStartCall}
        onEndCall={handleEndCall}
        onJoinCall={handleJoinCall}
        onCreateVoiceZone={handleCreateVoiceZone}
        isCreatingVoiceZone={isCreatingVoiceZone}
      />

      {/* {{ AURA: Add - 浮动通话组件 }} */}
      {
        isCallActive && (
          <FloatingCallWidget
            initialPosition={{ x: window.innerWidth - 320, y: 20 }}
            participants={participants.filter(p => p.status === 'in-call' && p.id !== 'me')}
            isMuted={isMuted}
            isVideoOn={isVideoOn}
            onToggleMute={() => setIsMuted(!isMuted)}
            onToggleVideo={() => setIsVideoOn(!isVideoOn)}
            onEndCall={handleEndCall}
          />
        )
      }

      {/* {{ AURA: Add - 新手引导 }} */}
      <Tutorial />

      {/* {{ AURA: Add - 虚拟法庭面板 }} */}
      <VirtualCourtroomPanel
        isOpen={showCourtroomPanel}
        onClose={() => setShowCourtroomPanel(false)}

        onPresentationModeChange={() => { }} // 已移除isPresentationMode状态，暂传空函数
        onEvidenceSelect={(evidenceId) => {
          // 选中证据节点
          setSelectedNodes([evidenceId]);
        }}
      />
    </div >
  );
};

// 使用React.memo优化性能
// {{ AURA: Add - 可拖拽面板组件 }}



