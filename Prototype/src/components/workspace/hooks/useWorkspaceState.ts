/**
 * LegalMind法律工作台 - 状态管理Hook
 * 
 * 管理工作台的所有状态，包括节点、视口、AI分析等
 */

import { useState, useCallback } from 'react';
import { PlaitBoard, PlaitElement } from '@plait/core';
import { ViewMode } from '../../ViewSwitcher';
import {
  LegalNode,
  WorkspaceState,
  AISuggestion,
  ConnectionType,
  Connection,
  ContextMenuState
} from '../types';
import { dataStorage, UserPreferences } from '../../../utils/dataStorage';

/**
 * 工作台状态管理Hook
 * 
 * @param initialNodes 初始节点列表
 * @returns 状态和状态更新函数
 */
export const useWorkspaceState = (initialNodes?: LegalNode[]) => {
  // ==================== 节点状态 ====================
  const [nodes, setNodes] = useState<LegalNode[]>(() => {
    if (initialNodes && initialNodes.length > 0) {
      return initialNodes;
    }

    // 尝试从localStorage恢复
    const savedState = dataStorage.loadWorkspaceState();
    if (savedState?.nodes && savedState.nodes.length > 0) {
      return savedState.nodes as LegalNode[];
    }

    // 返回空数组，不创建演示数据
    return [];
  });

  // ==================== Plait元素状态 ====================
  const [plaitElements, setPlaitElements] = useState<PlaitElement[]>([]);

  // ==================== 工作台状态 ====================
  const [workspaceState, setWorkspaceState] = useState<WorkspaceState>(() => {
    // 尝试从localStorage恢复
    const savedState = dataStorage.loadWorkspaceState();

    return {
      selectedNodes: [],
      viewport: savedState?.viewport || { zoom: 1, origination: [0, 0] },
      isAIAnalyzing: false,
      editingNode: null,
      editingNodes: [], // {{ AURA: Fix - 初始化editingNodes数组 }}
      activeArbitrationFunction: null,
      showArbitrationPanel: false,
      showAIAnalysisPanel: false,
      showEvidenceRelationPanel: false,
      showRecommendationPanel: false,
      showPermissionPanel: false,
      showCollaborationPanel: false,
      aiSuggestions: [],
      isConnecting: false,
      connectionStart: null,
      connectionType: 'related-to',
      connections: [],
      contextMenu: null,
      showShortcutsHelp: false,
      isFullscreen: false,
      viewMode: 'network', // {{ AURA: Fix - 修正初始值为'network'，与ViewMode类型匹配 }}
      showRelationshipGraph: false,
      showEvidenceChain: false,
      showLegalArticleCitation: false,
      showPerformanceMonitor: false, // {{ AURA: Add - 性能监控面板初始状态 }}
      floatingToolbar: null, // {{ AURA: Add - 画布浮动工具栏初始状态 }}
      nodeTypeSelector: null, // {{ AURA: Add - 节点类型选择器初始状态 }}
    };
  });

  // ==================== 用户偏好设置 ====================
  const [userPreferences, setUserPreferences] = useState<UserPreferences>(() => {
    return dataStorage.loadUserPreferences();
  });

  // ==================== Board状态 ====================
  const [board, setBoard] = useState<PlaitBoard | null>(null);

  // ==================== 对齐辅助线状态 ====================
  const [alignmentGuides, setAlignmentGuides] = useState<any[]>([]);

  // ==================== 状态更新函数 ====================

  /**
   * 更新节点列表
   */
  const updateNodes = useCallback((updater: (nodes: LegalNode[]) => LegalNode[]) => {
    setNodes(updater);
  }, []);

  /**
   * 更新工作台状态
   */
  const updateWorkspaceState = useCallback((
    updater: (state: WorkspaceState) => WorkspaceState
  ) => {
    setWorkspaceState(updater);
  }, []);

  /**
   * 更新用户偏好设置
   */
  const updateUserPreferences = useCallback((
    updater: (prefs: UserPreferences) => UserPreferences
  ) => {
    setUserPreferences(prev => {
      const newPrefs = updater(prev);
      dataStorage.saveUserPreferences(newPrefs);
      return newPrefs;
    });
  }, []);

  /**
   * 设置选中的节点
   */
  const setSelectedNodes = useCallback((nodeIds: string[]) => {
    updateWorkspaceState(state => ({
      ...state,
      selectedNodes: nodeIds
    }));
  }, [updateWorkspaceState]);

  /**
   * 设置编辑中的节点（单个）
   */
  const setEditingNode = useCallback((node: LegalNode | null) => {
    updateWorkspaceState(state => ({
      ...state,
      editingNode: node,
      // {{ AURA: Fix - 同时更新editingNodes数组 }}
      editingNodes: node ? [node] : []
    }));
  }, [updateWorkspaceState]);

  /**
   * {{ AURA: Add - 添加节点到编辑列表 }}
   */
  const addEditingNode = useCallback((node: LegalNode) => {
    updateWorkspaceState(state => ({
      ...state,
      editingNode: node, // 保持向后兼容
      editingNodes: state.editingNodes.some(n => n.id === node.id)
        ? state.editingNodes // 如果已存在，不重复添加
        : [...state.editingNodes, node] // 添加到列表
    }));
  }, [updateWorkspaceState]);

  /**
   * {{ AURA: Add - 从编辑列表移除节点 }}
   */
  const removeEditingNode = useCallback((nodeId: string) => {
    updateWorkspaceState(state => {
      const newEditingNodes = state.editingNodes.filter(n => n.id !== nodeId);
      return {
        ...state,
        editingNode: newEditingNodes.length > 0 ? newEditingNodes[0] : null,
        editingNodes: newEditingNodes
      };
    });
  }, [updateWorkspaceState]);

  /**
   * 设置AI分析状态
   */
  const setAIAnalyzing = useCallback((isAnalyzing: boolean) => {
    updateWorkspaceState(state => ({
      ...state,
      isAIAnalyzing: isAnalyzing
    }));
  }, [updateWorkspaceState]);

  /**
   * 设置AI建议
   */
  const setAISuggestions = useCallback((suggestions: AISuggestion[]) => {
    updateWorkspaceState(state => ({
      ...state,
      aiSuggestions: suggestions
    }));
  }, [updateWorkspaceState]);

  /**
   * 设置连接状态
   */
  const setConnectionState = useCallback((
    isConnecting: boolean,
    connectionStart: string | null = null,
    connectionType: ConnectionType = 'related-to'
  ) => {
    updateWorkspaceState(state => ({
      ...state,
      isConnecting,
      connectionStart,
      connectionType
    }));
  }, [updateWorkspaceState]);

  /**
   * 添加连接
   */
  const addConnection = useCallback((connection: Connection) => {
    updateWorkspaceState(state => ({
      ...state,
      connections: [...state.connections, connection]
    }));
  }, [updateWorkspaceState]);

  /**
   * 设置右键菜单
   */
  const setContextMenu = useCallback((menu: ContextMenuState | null) => {
    updateWorkspaceState(state => ({
      ...state,
      contextMenu: menu
    }));
  }, [updateWorkspaceState]);

  /**
   * 设置视图模式
   */
  const setViewMode = useCallback((mode: ViewMode) => {
    updateWorkspaceState(state => ({
      ...state,
      viewMode: mode
    }));
  }, [updateWorkspaceState]);

  /**
   * 切换面板显示状态
   */
  const togglePanel = useCallback((panelName: keyof WorkspaceState) => {
    updateWorkspaceState(state => ({
      ...state,
      [panelName]: !state[panelName as keyof WorkspaceState]
    }));
  }, [updateWorkspaceState]);

  /**
   * 设置全屏模式
   */
  const setFullscreen = useCallback((isFullscreen: boolean) => {
    updateWorkspaceState(state => ({
      ...state,
      isFullscreen
    }));
  }, [updateWorkspaceState]);

  return {
    // 状态
    nodes,
    plaitElements,
    workspaceState,
    userPreferences,
    board,
    alignmentGuides,

    // 状态更新函数
    setNodes,
    setPlaitElements,
    updateNodes,
    setWorkspaceState,
    updateWorkspaceState,
    setUserPreferences,
    updateUserPreferences,
    setBoard,
    setAlignmentGuides,

    // 便捷更新函数
    setSelectedNodes,
    setEditingNode,
    addEditingNode, // {{ AURA: Add - 导出新函数 }}
    removeEditingNode, // {{ AURA: Add - 导出新函数 }}
    setAIAnalyzing,
    setAISuggestions,
    setConnectionState,
    addConnection,
    setContextMenu,
    setViewMode,
    togglePanel,
    setFullscreen,
  };
};

