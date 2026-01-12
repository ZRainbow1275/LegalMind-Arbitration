/**
 * 额外回调Hook
 * 
 * 管理智能布局、右键菜单、节点复制等额外的回调函数
 */

import { useCallback, useState } from 'react';
import type { LegalNode, WorkspaceState } from '../types';
import { autoLayout } from '../../../lib/layout-engine';
import { dataStorage } from '../../../utils/dataStorage';
import { handleError, ErrorType, ErrorSeverity } from '../../../utils/errorHandler';
import type { PlaitCanvasWrapperRef } from '../../PlaitCanvasWrapper';
import { useLayoutWorker } from '../../../hooks/useWorkerPool';
import { PlaitElement } from '@plait/core'; // {{ AURA: Add - 导入PlaitElement类型 }}


export interface WorkspaceStorageState {
  nodes: LegalNode[];
  viewport: { zoom: number; x: number; y: number };
  selectedNodes: string[];
  lastSaved: string;
  version: string;
}

export interface AdditionalCallbacksParams {
  nodes: LegalNode[];
  setNodes: React.Dispatch<React.SetStateAction<LegalNode[]>>; // {{ AURA: Fix - 支持函数式更新 }}
  workspaceState: WorkspaceState;
  updateWorkspaceState: (updater: (prev: WorkspaceState) => WorkspaceState) => void;
  canvasRef: React.RefObject<PlaitCanvasWrapperRef>;
  onStateChange?: (state: import('../../../interfaces/case-canvas-mapping').CanvasState) => void;
  // {{ AURA: Add - FloatingToolbar状态管理 }}
  setFloatingToolbarState?: (state: { visible: boolean; position: { x: number; y: number } | null; canvasPosition: { x: number; y: number } | null }) => void;
  setNodeSelectorState?: (state: { visible: boolean; position: { x: number; y: number } | null; canvasPosition: { x: number; y: number } | null }) => void;
  // {{ AURA: Add - Plait元素设置函数 }}
  setPlaitElements?: React.Dispatch<React.SetStateAction<PlaitElement[]>>; // {{ AURA: Fix - 支持函数式更新 }}
}

export const useAdditionalCallbacks = ({
  nodes,
  setNodes,
  workspaceState,
  updateWorkspaceState,
  canvasRef,
  onStateChange,
  setFloatingToolbarState,
  setNodeSelectorState,
  setPlaitElements, // {{ AURA: Add - 接收setPlaitElements }}
}: AdditionalCallbacksParams) => {
  // Web Worker布局计算
  const { computeLayout, isComputing: isLayoutComputing } = useLayoutWorker();
  const [isSmartLayouting, setIsSmartLayouting] = useState(false);

  // 智能布局功能（使用Web Worker后台计算）
  const handleSmartLayout = useCallback(async () => {
    // 如果正在计算，忽略
    if (isLayoutComputing || isSmartLayouting) {
      console.log('智能布局计算正在进行中，忽略新请求');
      return;
    }

    setIsSmartLayouting(true);

    try {
      // 提取连接关系
      const connections: Array<{ source: string; target: string }> = [];
      nodes.forEach(node => {
        if (node.data.connections) {
          node.data.connections.forEach(connId => {
            connections.push({ source: node.id, target: connId });
          });
        }
      });

      // 使用Web Worker计算布局（力导向布局）
      console.log('开始Web Worker智能布局计算...', { nodeCount: nodes.length, connectionCount: connections.length });
      const layoutedNodes = await computeLayout(nodes as any[], connections, 'force');

      console.log('Web Worker智能布局计算完成', { resultCount: layoutedNodes.length });
      setNodes(layoutedNodes as any); // {{ AURA: Fix - 类型断言 }}

      // 保存到本地存储
      dataStorage.saveNodes(layoutedNodes as any);
    } catch (error) {
      console.error('Web Worker智能布局计算失败，回退到主线程计算:', error);
      // 回退到主线程计算
      try {
        const connections: Array<{ from: string; to: string }> = [];
        nodes.forEach(node => {
          if (node.data.connections) {
            node.data.connections.forEach(connId => {
              connections.push({ from: node.id, to: connId });
            });
          }
        });
        const layoutedNodes = autoLayout(nodes as any[], connections, {
          iterations: 150,
          repulsionStrength: 60000,
          attractionStrength: 0.015,
          centeringStrength: 0.002,
          damping: 0.75,
        });
        setNodes(layoutedNodes as any); // {{ AURA: Fix - 类型断言 }}
        dataStorage.saveNodes(layoutedNodes as any);
      } catch (fallbackError) {
        handleError(
          fallbackError instanceof Error ? fallbackError : new Error('智能布局失败'),
          ErrorType.CANVAS_OPERATION,
          ErrorSeverity.MEDIUM,
          '智能布局'
        );
      }
    } finally {
      setIsSmartLayouting(false);
    }
  }, [nodes, setNodes, computeLayout, isLayoutComputing, isSmartLayouting]);

  // 右键菜单处理函数
  const handleContextMenu = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.preventDefault();
    e.stopPropagation();

    updateWorkspaceState(prev => ({
      ...prev,
      contextMenu: {
        show: true,
        x: e.clientX,
        y: e.clientY,
        nodeId,
        menuType: 'node', // {{ AURA: Add - 节点右键菜单 }}
      },
    }));
  }, [updateWorkspaceState]);

  // {{ AURA: Add - 画布右键菜单处理函数 }}
  const handleCanvasContextMenu = useCallback((e: React.MouseEvent, position: { x: number; y: number }) => {
    e.preventDefault();
    e.stopPropagation();

    updateWorkspaceState(prev => ({
      ...prev,
      contextMenu: {
        show: true,
        x: e.clientX,
        y: e.clientY,
        nodeId: null,
        menuType: 'canvas', // 画布右键菜单
        position, // 画布坐标位置（用于创建节点）
        selectedNodeIds: prev.selectedNodes, // 当前选中的节点
      },
    }));
  }, [updateWorkspaceState]);

  const handleCloseContextMenu = useCallback(() => {
    updateWorkspaceState(prev => ({
      ...prev,
      contextMenu: null,
    }));
  }, [updateWorkspaceState]);

  const handleDuplicateNode = useCallback((nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    const newNode: LegalNode = {
      ...node,
      id: `node-${Date.now()}`,
      data: {
        ...node.data,
        title: `${node.data.title} (副本)`,
        position: {
          x: node.data.position.x + 50,
          y: node.data.position.y + 50,
        },
      },
    };

    setNodes(prev => [...prev, newNode]);
    dataStorage.saveNodes([...nodes, newNode]);
    console.log('节点已复制:', newNode.id);
  }, [nodes, setNodes]);

  // 仲裁功能处理
  const handleArbitrationFunctionSelect = useCallback((functionId: string) => {
    updateWorkspaceState(prev => ({
      ...prev,
      activeArbitrationFunction: functionId,
      showArbitrationPanel: true
    }));
  }, [updateWorkspaceState]);

  const handleArbitrationFunctionLaunch = useCallback((functionId: string) => {
    updateWorkspaceState(prev => ({
      ...prev,
      activeArbitrationFunction: functionId,
      showArbitrationPanel: true
    }));
    console.log('启动仲裁功能:', functionId);
  }, [updateWorkspaceState]);

  const handleCloseArbitrationPanel = useCallback(() => {
    updateWorkspaceState(prev => ({
      ...prev,
      showArbitrationPanel: false,
      activeArbitrationFunction: null
    }));
  }, [updateWorkspaceState]);

  // {{ AURA: Add - 画布双击处理（显示FloatingToolbar） }}
  const handleCanvasDoubleClick = useCallback((e: React.MouseEvent, canvasPosition: { x: number; y: number }) => {
    if (!setFloatingToolbarState) return;

    setFloatingToolbarState({
      visible: true,
      position: { x: e.clientX, y: e.clientY },
      canvasPosition,
    });
  }, [setFloatingToolbarState]);

  // {{ AURA: Add - 关闭FloatingToolbar }}
  const handleCloseFloatingToolbar = useCallback(() => {
    if (!setFloatingToolbarState) return;
    setFloatingToolbarState({
      visible: false,
      position: null,
      canvasPosition: null,
    });
  }, [setFloatingToolbarState]);

  // {{ AURA: Add - 显示NodeTypeSelector }}
  const handleShowNodeSelector = useCallback((canvasPosition: { x: number; y: number }) => {
    if (!setNodeSelectorState) return;

    // 使用画布中心位置作为屏幕位置
    const screenPosition = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

    setNodeSelectorState({
      visible: true,
      position: screenPosition,
      canvasPosition,
    });
  }, [setNodeSelectorState]);

  // {{ AURA: Add - 关闭NodeTypeSelector }}
  const handleCloseNodeSelector = useCallback(() => {
    if (!setNodeSelectorState) return;
    setNodeSelectorState({
      visible: false,
      position: null,
      canvasPosition: null,
    });
  }, [setNodeSelectorState]);

  // {{ AURA: Add - 创建评论 }}
  const handleCreateComment = useCallback((canvasPosition: { x: number; y: number }) => {
    const content = prompt('请输入评论内容：');
    if (content && content.trim()) {
      // {{ AURA: Fix - 使用import代替require，避免浏览器环境错误 }}
      import('../../../stores/comment-store').then(({ useCommentStore }) => {
        const { addComment } = useCommentStore.getState();
        addComment({
          position: canvasPosition,
          content: content.trim(),
        });
        console.log('评论已创建:', canvasPosition);
      });
    }
    // 关闭FloatingToolbar
    handleCloseFloatingToolbar();
  }, [handleCloseFloatingToolbar]);

  // {{ AURA: Fix - 创建聊天贴（使用comment-store，不是节点） }}
  const handleCreateChatNote = useCallback((canvasPosition: { x: number; y: number }) => {
    // 聊天贴应该是类似Figma Comments的独立组件，不是节点
    // 使用comment-store创建评论
    import('../../../stores/comment-store').then(({ useCommentStore }) => {
      const { addComment } = useCommentStore.getState();
      addComment({
        position: canvasPosition,
        content: '', // 空内容，用户可以在聊天贴中输入
      });
      console.log('聊天贴已创建:', canvasPosition);
    });

    // 关闭FloatingToolbar
    handleCloseFloatingToolbar();
  }, [handleCloseFloatingToolbar]);

  // {{ AURA: Add - 创建思维导图 }}
  const handleCreateMindMap = useCallback((canvasPosition: { x: number; y: number }) => {
    if (!setPlaitElements) return;

    const mindMapElement: any = {
      id: `mindmap-${Date.now()}`,
      type: 'mindmap',
      points: [[canvasPosition.x, canvasPosition.y]],
      children: [
        {
          id: `root-${Date.now()}`,
          value: { children: [{ text: '中心主题' }] },
          children: [],
          width: 72,
          height: 32,
        }
      ],
      data: { topic: { children: [{ text: '中心主题' }] } } // 兼容性数据
    };

    setPlaitElements((prev: PlaitElement[]) => [...prev, mindMapElement]);
    console.log('思维导图已创建:', canvasPosition);
    handleCloseFloatingToolbar();
  }, [setPlaitElements, handleCloseFloatingToolbar]);

  // {{ AURA: Add - 创建流程图 }}
  const handleCreateFlowchart = useCallback((canvasPosition: { x: number; y: number }) => {
    if (!setPlaitElements) return;

    const flowchartElement: any = {
      id: `flowchart-${Date.now()}`,
      type: 'geometry',
      shape: 'rectangle',
      points: [[canvasPosition.x, canvasPosition.y], [canvasPosition.x + 100, canvasPosition.y + 60]],
      text: { children: [{ text: '流程节点' }] },
    };

    setPlaitElements((prev: PlaitElement[]) => [...prev, flowchartElement]);
    console.log('流程图节点已创建:', canvasPosition);
    handleCloseFloatingToolbar();
  }, [setPlaitElements, handleCloseFloatingToolbar]);

  // {{ AURA: Add - 创建手绘 }}
  const handleCreateFreehand = useCallback((canvasPosition: { x: number; y: number }) => {
    // 手绘通常需要进入绘图模式，这里仅作为示例创建一个简单的线条
    if (!setPlaitElements) return;

    const drawElement: any = {
      id: `draw-${Date.now()}`,
      type: 'geometry',
      shape: 'ellipse',
      points: [[canvasPosition.x, canvasPosition.y], [canvasPosition.x + 80, canvasPosition.y + 80]],
      text: { children: [{ text: '绘图' }] },
    };

    setPlaitElements((prev: PlaitElement[]) => [...prev, drawElement]);
    console.log('绘图元素已创建:', canvasPosition);
    handleCloseFloatingToolbar();
  }, [setPlaitElements, handleCloseFloatingToolbar]);

  // 自动保存功能
  const saveWorkspaceData = useCallback(() => {
    try {
      // 获取当前viewport
      const plaitViewport = canvasRef.current?.getViewport() || { zoom: 1, x: 0, y: 0 };
      const viewport = {
        zoom: plaitViewport.zoom,
        x: plaitViewport.x,
        y: plaitViewport.y,
        origination: [plaitViewport.x, plaitViewport.y] as [number, number]
      };

      // 如果提供了onStateChange回调（案件集成模式），调用它
      if (onStateChange) {
        const canvasState: import('../../../interfaces/case-canvas-mapping').CanvasState = {
          nodes: nodes as any,
          connections: workspaceState.connections as any,
          viewport: viewport,
          metadata: {
            version: '1.0.0',
            lastEditedBy: undefined,
            editCount: 0,
          },
        };
        onStateChange(canvasState);
      } else {
        // 否则使用本地存储（独立模式）
        dataStorage.saveNodes(nodes);

        const stateToSave: WorkspaceStorageState = {
          nodes,
          viewport: {
            zoom: viewport.zoom,
            x: viewport.origination[0],
            y: viewport.origination[1]
          },
          selectedNodes: workspaceState.selectedNodes,
          lastSaved: new Date().toISOString(),
          version: '1.0.0'
        };
        dataStorage.saveWorkspaceState(stateToSave);
      }

      console.log('工作区数据已保存');
    } catch (error) {
      handleError(
        error instanceof Error ? error : new Error('保存失败'),
        ErrorType.DATA_PERSISTENCE,
        ErrorSeverity.MEDIUM,
        '数据保存'
      );
    }
  }, [nodes, workspaceState.connections, workspaceState.selectedNodes, onStateChange, canvasRef]);

  return {
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
  };
};

