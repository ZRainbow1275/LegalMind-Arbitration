/**
 * LegalMind法律工作台 - 操作Hook
 * 
 * 处理所有的用户操作，包括节点创建、编辑、删除、连接等
 */

import { useCallback, useState } from 'react';
import { LegalNode, ConnectionType, AIAnalysisResult, AISuggestion } from '../types';
import { generateId, findEmptyPosition, autoLayoutNodes } from '../utils';
import { withErrorHandling } from '../../../utils/errorHandler';
import { useLayoutWorker } from '../../../hooks/useWorkerPool';
// {{ AURA: Add - 导入剪贴板管理器 }}
import { clipboardManager } from '../../../lib/clipboard-manager';
import { NODE_TYPE_CONFIG } from '../config';

/**
 * 工作台操作Hook
 * 
 * @param nodes 节点列表
 * @param setNodes 设置节点列表函数
 * @param workspaceState 工作台状态
 * @param updateWorkspaceState 更新工作台状态函数
 * @param onNodeCreate 节点创建回调
 * @param onNodeUpdate 节点更新回调
 * @param onNodeDelete 节点删除回调
 * @param onAIAnalysis AI分析回调
 * @returns 操作函数集合
 */
export const useWorkspaceActions = (
  nodes: LegalNode[],
  setNodes: (nodes: LegalNode[]) => void,
  workspaceState: any,
  updateWorkspaceState: (updater: (state: any) => any) => void,
  onNodeCreate?: (node: LegalNode) => void,
  onNodeUpdate?: (nodeId: string, updates: Partial<LegalNode>) => void,
  onNodeDelete?: (nodeId: string) => void,
  onAIAnalysis?: (nodes: LegalNode[]) => Promise<AIAnalysisResult>
) => {
  /**
   * 创建新节点
   * @param type 节点类型
   * @param customPosition 可选的自定义位置（用于右键菜单、双击创建等场景）
   */
  const createNode = useCallback((type: LegalNode['type'], customPosition?: { x: number; y: number }, initialData?: Partial<LegalNode['data']>) => {
    // @ts-ignore - config types might not perfectly match
    const config = NODE_TYPE_CONFIG[type];
    const position = customPosition || findEmptyPosition(nodes);

    const newNode: LegalNode = {
      id: generateId(type),
      type,
      data: {
        title: `新${config?.label || type}`,
        description: '',
        status: 'pending',
        metadata: {} as any,
        position,
        connections: [],
        ...initialData
      },
      children: []
    };

    setNodes([...nodes, newNode]);
    onNodeCreate?.(newNode);

    return newNode;
  }, [nodes, setNodes, onNodeCreate]);

  /**
   * {{ AURA: Fix - 修改为支持同时打开多个节点详情 }}
   * 处理节点双击（打开编辑器）
   */
  const handleNodeDoubleClick = useCallback((nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      updateWorkspaceState(state => ({
        ...state,
        editingNode: node, // 保持向后兼容
        editingNodes: state.editingNodes.some((n: LegalNode) => n.id === node.id)
          ? state.editingNodes // 如果已打开，不重复添加
          : [...state.editingNodes, node] // 添加到编辑列表
      }));
    }
  }, [nodes, updateWorkspaceState]);

  /**
   * 保存节点编辑
   */
  const handleNodeSave = useCallback((nodeId: string, updates: Partial<LegalNode>) => {
    setNodes(nodes.map(node =>
      node.id === nodeId ? { ...node, ...updates } : node
    ));
    onNodeUpdate?.(nodeId, updates);
    updateWorkspaceState(state => ({ ...state, editingNode: null }));
  }, [nodes, setNodes, onNodeUpdate, updateWorkspaceState]);

  /**
   * 删除节点
   */
  const handleNodeDelete = useCallback((nodeId: string) => {
    setNodes(nodes.filter(node => node.id !== nodeId));
    onNodeDelete?.(nodeId);
  }, [nodes, setNodes, onNodeDelete]);

  /**
   * 更新节点位置
   */
  const handleNodePositionChange = useCallback((nodeId: string, position: { x: number; y: number }) => {
    setNodes(nodes.map(node =>
      node.id === nodeId
        ? { ...node, data: { ...node.data, position } }
        : node
    ));
  }, [nodes, setNodes]);

  /**
   * 开始连接
   */
  const startConnection = useCallback((connectionType: ConnectionType) => {
    updateWorkspaceState(state => ({
      ...state,
      isConnecting: true,
      connectionType,
      connectionStart: null
    }));
  }, [updateWorkspaceState]);

  /**
   * 从特定节点开始连接（用于拖拽连接）
   */
  const startConnectionFromNode = useCallback((nodeId: string, connectionType: ConnectionType = 'related-to') => {
    updateWorkspaceState(state => ({
      ...state,
      isConnecting: true,
      connectionType,
      connectionStart: nodeId
    }));
  }, [updateWorkspaceState]);

  /**
   * 处理节点连接点击
   */
  const handleNodeConnectionClick = useCallback((nodeId: string) => {
    if (!workspaceState.isConnecting) return;

    if (!workspaceState.connectionStart) {
      // 第一次点击，设置起始节点
      updateWorkspaceState(state => ({
        ...state,
        connectionStart: nodeId
      }));
    } else {
      // 第二次点击，创建连接
      const startNodeId = workspaceState.connectionStart;

      if (startNodeId !== nodeId) {
        // 更新节点的连接关系
        setNodes(nodes.map(node => {
          if (node.id === startNodeId) {
            const newConnections = [...node.data.connections, nodeId];
            return {
              ...node,
              data: { ...node.data, connections: newConnections }
            };
          }
          if (node.id === nodeId) {
            const newConnections = [...node.data.connections, startNodeId];
            return {
              ...node,
              data: { ...node.data, connections: newConnections }
            };
          }
          return node;
        }));
      }

      // 重置连接状态
      updateWorkspaceState(state => ({
        ...state,
        isConnecting: false,
        connectionStart: null
      }));
    }
  }, [nodes, setNodes, workspaceState, updateWorkspaceState]);

  /**
   * 取消连接
   */
  const cancelConnection = useCallback(() => {
    updateWorkspaceState(state => ({
      ...state,
      isConnecting: false,
      connectionStart: null
    }));
  }, [updateWorkspaceState]);

  /**
   * 执行AI分析
   */
  const performAIAnalysis = useCallback(async (targetNodeIds?: string[]) => {
    updateWorkspaceState(state => ({
      ...state,
      isAIAnalyzing: true,
      showAIAnalysisPanel: true
    }));

    const result = await withErrorHandling(async () => {
      const idsToAnalyze = targetNodeIds || workspaceState.selectedNodes;
      const selectedNodeData = nodes.filter(node =>
        idsToAnalyze.includes(node.id)
      );

      if (onAIAnalysis) {
        return await onAIAnalysis(selectedNodeData.length > 0 ? selectedNodeData : nodes);
      }

      // 默认的模拟AI分析
      const suggestions = [
        { id: '1', type: 'connection', confidence: 0.85, suggestion: '建议在"申请人"和"证据文档"之间建立关联' },
        { id: '2', type: 'risk', confidence: 0.72, suggestion: '检测到时间线存在逻辑矛盾，建议核实' },
        { id: '3', type: 'recommendation', confidence: 0.90, suggestion: '建议补充调解记录节点' }
      ];

      return { suggestions, risks: [], recommendations: [] };
    }, 'AI分析失败');

    if (result) {
      updateWorkspaceState(state => ({
        ...state,
        isAIAnalyzing: false,
        aiSuggestions: result.suggestions.map((s: any, i: number) => ({
          id: s.id || `${i}`,
          type: s.type || 'suggestion',
          confidence: s.confidence || 0.8,
          suggestion: s.suggestion || s
        })) as AISuggestion[]
      }));
    } else {
      updateWorkspaceState(state => ({
        ...state,
        isAIAnalyzing: false
      }));
    }
  }, [nodes, workspaceState, updateWorkspaceState, onAIAnalysis]);

  // Web Worker布局计算
  const { computeLayout, isComputing: isLayoutComputing } = useLayoutWorker();
  const [isAutoLayouting, setIsAutoLayouting] = useState(false);

  /**
   * 自动布局（使用Web Worker后台计算）
   */
  const performAutoLayout = useCallback(async () => {
    // 如果正在计算，忽略
    if (isLayoutComputing || isAutoLayouting) {
      console.log('布局计算正在进行中，忽略新请求');
      return;
    }

    setIsAutoLayouting(true);

    try {
      // 准备连接数据
      const connections = nodes.flatMap(node =>
        (node.data.connections || []).map(targetId => ({
          source: node.id,
          target: targetId,
        }))
      );

      // 使用Web Worker计算布局（力导向布局）
      console.log('开始Web Worker布局计算...', { nodeCount: nodes.length, connectionCount: connections.length });
      const layoutedNodes = await computeLayout(nodes, connections, 'force');

      console.log('Web Worker布局计算完成', { resultCount: layoutedNodes.length });
      setNodes(layoutedNodes);
    } catch (error) {
      console.error('Web Worker布局计算失败，回退到主线程计算:', error);
      // 回退到主线程计算
      const layoutedNodes = autoLayoutNodes(nodes);
      setNodes(layoutedNodes);
    } finally {
      setIsAutoLayouting(false);
    }
  }, [nodes, setNodes, computeLayout, isLayoutComputing, isAutoLayouting]);

  // {{ AURA: Add - 复制节点功能 }}
  const copyNodes = useCallback((nodeIds: string[]) => {
    const nodesToCopy = nodes.filter(node => nodeIds.includes(node.id));
    if (nodesToCopy.length > 0) {
      clipboardManager.copy(nodesToCopy);
      console.log(`[Workspace] 已复制 ${nodesToCopy.length} 个节点`);
    }
  }, [nodes]);

  // {{ AURA: Add - 粘贴节点功能 }}
  const pasteNodes = useCallback(() => {
    const pastedNodes = clipboardManager.paste();
    if (pastedNodes) {
      setNodes([...nodes, ...pastedNodes]);
      console.log(`[Workspace] 已粘贴 ${pastedNodes.length} 个节点`);

      // 选中新粘贴的节点
      updateWorkspaceState(prev => ({
        ...prev,
        selectedNodes: pastedNodes.map(n => n.id),
      }));
    }
  }, [nodes, setNodes, updateWorkspaceState]);

  // {{ AURA: Add - 剪切节点功能 }}
  const cutNodes = useCallback((nodeIds: string[]) => {
    const nodesToCut = nodes.filter(node => nodeIds.includes(node.id));
    if (nodesToCut.length > 0 && clipboardManager.cut(nodesToCut)) {
      // 删除被剪切的节点
      setNodes(nodes.filter(node => !nodeIds.includes(node.id)));
      console.log(`[Workspace] 已剪切 ${nodesToCut.length} 个节点`);
    }
  }, [nodes, setNodes]);

  return {
    createNode,
    handleNodeDoubleClick,
    handleNodeSave,
    handleNodeDelete,
    handleNodePositionChange,
    startConnection,
    startConnectionFromNode,
    handleNodeConnectionClick,
    cancelConnection,
    performAIAnalysis,
    performAutoLayout,
    // {{ AURA: Add - 导出剪贴板操作 }}
    copyNodes,
    pasteNodes,
    cutNodes,
    hasClipboardData: () => clipboardManager.hasData(),
  };
};

