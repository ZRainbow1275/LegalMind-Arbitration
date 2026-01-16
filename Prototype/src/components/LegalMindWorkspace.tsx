import React, { useState, useRef } from 'react';
import { PlaitElement, PlaitBoard, PlaitBoardOptions, Viewport, Selection } from '@plait/core';
import { withDraw } from '@plait/draw';
import { withMind } from '@plait/mind';
import { withGroup } from '@plait/common';
import MobileDetect from 'mobile-detect';
import { Wrapper } from './plait/Wrapper';
import { Board, BoardChangeData } from './plait/Board';
import { NodeEditDialog } from './dialogs/NodeEditDialog';
import { NavigationToolbar } from './toolbars/NavigationToolbar';
import { ConnectionToolbar, ConnectionType } from './toolbars/ConnectionToolbar';
import { EnhancedAIAssistant } from './ai/EnhancedAIAssistant';
import { LegalNode, LegalNodeTypes } from '../plugins/legal-nodes/types';

// LegalMind工作台状态类型
export interface LegalMindState {
  pointer: string;
  isMobile: boolean;
  selectedTool: string | null;
  isAIMode: boolean;
  isConnectionMode: boolean;
  selectedConnectionType: ConnectionType;
  editingNode: LegalNode | null;
  isEditDialogOpen: boolean;
  zoom: number;
  connectionCount: number;
}

// LegalMind工作台属性
export interface LegalMindWorkspaceProps {
  value?: PlaitElement[];
  viewport?: Viewport;
  theme?: any;
  onChange?: (data: BoardChangeData) => void;
  onSelectionChange?: (selection: Selection | null) => void;
  onValueChange?: (value: PlaitElement[]) => void;
  onViewportChange?: (value: Viewport) => void;
  onThemeChange?: (value: any) => void;
  afterInit?: (board: PlaitBoard) => void;
  className?: string;
  style?: React.CSSProperties;
}

export const LegalMindWorkspace: React.FC<LegalMindWorkspaceProps> = ({
  value = [],
  viewport,
  theme,
  onChange,
  onSelectionChange,
  onViewportChange,
  onThemeChange,
  onValueChange,
  afterInit,
  className,
  style
}) => {
  // 画板选项配置
  const options: PlaitBoardOptions = {
    readonly: false,
    hideScrollbar: false,
    disabledScrollOnNonFocus: false,
    themeColors: {
      // LegalMind主题色彩
      primary: '#FF6B35',
      secondary: '#FFF4F1',
      accent: '#E55A2B'
    } as any
  };

  // LegalMind工作台状态
  const [appState, setAppState] = useState<LegalMindState>(() => {
    const md = new MobileDetect(window.navigator.userAgent);
    return {
      pointer: 'hand',
      isMobile: md.mobile() !== null,
      selectedTool: null,
      isAIMode: false,
      isConnectionMode: false,
      selectedConnectionType: 'related-to' as ConnectionType,
      editingNode: null,
      isEditDialogOpen: false,
      zoom: 1,
      connectionCount: 0
    };
  });

  const [, setBoard] = useState<PlaitBoard | null>(null);

  // 插件配置 - 基础绘图和思维导图功能 + 法律专用插件
  const plugins = [
    withDraw,
    withGroup,
    withMind
  ];

  const containerRef = useRef<HTMLDivElement>(null);

  const updateAppState = (newAppState: Partial<LegalMindState>) => {
    setAppState(prev => ({
      ...prev,
      ...newAppState,
    }));
  };

  const handleAfterInit = (boardInstance: PlaitBoard) => {
    setBoard(boardInstance);
    // 扩展board实例，添加LegalMind特定属性
    (boardInstance as any).appState = appState;
    afterInit?.(boardInstance);
  };

  // 缩放控制函数
  const handleZoomIn = () => {
    const newZoom = Math.min(appState.zoom * 1.2, 3);
    setAppState(prev => ({ ...prev, zoom: newZoom }));
    // TODO: 应用到画板
  };

  const handleZoomOut = () => {
    const newZoom = Math.max(appState.zoom / 1.2, 0.1);
    setAppState(prev => ({ ...prev, zoom: newZoom }));
    // TODO: 应用到画板
  };

  const handleZoomReset = () => {
    setAppState(prev => ({ ...prev, zoom: 1 }));
    // TODO: 应用到画板
  };

  const handleFitToScreen = () => {
    // TODO: 计算适合屏幕的缩放比例
    console.log('Fit to screen');
  };

  const handleCenterView = () => {
    // TODO: 居中视图
    console.log('Center view');
  };

  // 连接模式控制
  const handleToggleConnectionMode = () => {
    setAppState(prev => ({
      ...prev,
      isConnectionMode: !prev.isConnectionMode,
      selectedTool: !prev.isConnectionMode ? 'connection' : null
    }));
  };

  const handleConnectionTypeChange = (type: ConnectionType) => {
    setAppState(prev => ({ ...prev, selectedConnectionType: type }));
  };

  const handleClearConnections = () => {
    // TODO: 清除所有连接
    setAppState(prev => ({ ...prev, connectionCount: 0 }));
    console.log('Clear all connections');
  };

  // 节点编辑
  // const handleNodeDoubleClick = (node: LegalNode) => {
  //   setAppState(prev => ({
  //     ...prev,
  //     editingNode: node,
  //     isEditDialogOpen: true
  //   }));
  // };

  const handleNodeSave = (updatedNode: LegalNode) => {
    // TODO: 更新节点数据
    const nodeIndex = value.findIndex(item => item.id === updatedNode.id);
    if (nodeIndex !== -1) {
      const newValue = [...value];
      newValue[nodeIndex] = updatedNode as PlaitElement;
      onValueChange?.(newValue);
    }
    setAppState(prev => ({
      ...prev,
      editingNode: null,
      isEditDialogOpen: false
    }));
  };

  const handleCloseEditDialog = () => {
    setAppState(prev => ({
      ...prev,
      editingNode: null,
      isEditDialogOpen: false
    }));
  };

  // 节点创建功能
  const createNode = (nodeType: string) => {
    const position: [number, number] = [
      200 + Math.random() * 300,
      200 + Math.random() * 200
    ];

    const width = nodeType === 'person' ? 120 : 200;
    const height = nodeType === 'person' ? 120 : 100;

    const newNode = {
      id: `${nodeType}-${Date.now()}`,
      type: 'geometry',
      shape: nodeType === 'person' ? 'ellipse' : 'rectangle',
      points: [position, [position[0] + width, position[1] + height]],
      angle: 0,
      opacity: 1,
      fill: nodeType === 'case' ? '#e3f2fd' :
        nodeType === 'person' ? '#e8f5e8' :
          nodeType === 'document' ? '#fff3e0' : '#f5f5f5',
      strokeColor: nodeType === 'case' ? '#1976d2' :
        nodeType === 'person' ? '#4caf50' :
          nodeType === 'document' ? '#ff9800' : '#666',
      strokeWidth: 2,
      text: {
        children: [{
          text: nodeType === 'case' ? '📋 新案件' :
            nodeType === 'person' ? '👤 新人物' :
              nodeType === 'document' ? '📄 新文档' : '新节点'
        }],
        align: 'center'
      }
    };

    const newValue = [...value, newNode as any];
    onValueChange?.(newValue);
  };

  // AI助手功能
  const handleAICreateNode = (nodeType: LegalNodeTypes, _data?: any) => {
    // 将LegalNodeTypes转换为字符串
    const nodeTypeStr = nodeType.replace('legal-', '');
    createNode(nodeTypeStr);
  };

  const handleAIAnalyzeCase = () => {
    // TODO: 实现案件分析功能
    console.log('AI analyzing case with', value.length, 'nodes');
  };

  return (
    <div
      className={`legalmind-workspace ${className || ''}`}
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        backgroundColor: '#f8f9fa',
        ...style
      }}
    >
      {/* LegalMind工作台头部工具栏 */}
      <div className="legalmind-toolbar" style={{
        height: '60px',
        backgroundColor: 'white',
        borderBottom: '1px solid #e0e0e0',
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        zIndex: 1000
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <h1 style={{
            color: '#FF6B35',
            margin: '0',
            fontSize: '20px',
            fontWeight: '600'
          }}>
            <span aria-hidden="true">🏛️</span>{' '}
            LegalMind 法律工作台
          </h1>

          {/* 工具按钮 */}
          <div style={{
            display: 'flex',
            gap: '8px',
            marginLeft: '20px'
          }}>
            <button
              onClick={() => {
                updateAppState({ selectedTool: 'case' });
                createNode('case');
              }}
              aria-label="创建案件节点"
              aria-pressed={appState.selectedTool === 'case'}
              style={{
                padding: '8px 16px',
                backgroundColor: appState.selectedTool === 'case' ? '#FF6B35' : 'white',
                color: appState.selectedTool === 'case' ? 'white' : '#333',
                border: '1px solid #FF6B35',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              <span aria-hidden="true">📋</span>{' '}
              <span>案件</span>
            </button>
            <button
              onClick={() => {
                updateAppState({ selectedTool: 'person' });
                createNode('person');
              }}
              aria-label="创建人物节点"
              aria-pressed={appState.selectedTool === 'person'}
              style={{
                padding: '8px 16px',
                backgroundColor: appState.selectedTool === 'person' ? '#FF6B35' : 'white',
                color: appState.selectedTool === 'person' ? 'white' : '#333',
                border: '1px solid #FF6B35',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              <span aria-hidden="true">👥</span>{' '}
              <span>人物</span>
            </button>
            <button
              onClick={() => {
                updateAppState({ selectedTool: 'document' });
                createNode('document');
              }}
              aria-label="创建文档节点"
              aria-pressed={appState.selectedTool === 'document'}
              style={{
                padding: '8px 16px',
                backgroundColor: appState.selectedTool === 'document' ? '#FF6B35' : 'white',
                color: appState.selectedTool === 'document' ? 'white' : '#333',
                border: '1px solid #FF6B35',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              <span aria-hidden="true">📄</span>{' '}
              <span>文档</span>
            </button>
            <button
              onClick={() => updateAppState({ isAIMode: !appState.isAIMode })}  
              aria-label="切换AI助手面板"
              aria-pressed={appState.isAIMode}
              style={{
                padding: '8px 16px',
                backgroundColor: appState.isAIMode ? '#FF6B35' : 'white',
                color: appState.isAIMode ? 'white' : '#333',
                border: '1px solid #FF6B35',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              <span aria-hidden="true">🤖</span>{' '}
              <span>AI助手</span>
            </button>
          </div>
        </div>
      </div>

      {/* 主画板区域 */}
      <div style={{
        flex: 1,
        height: 'calc(100% - 60px)',
        position: 'relative'
      }}>
        <Wrapper
          value={value}
          viewport={viewport}
          theme={theme}
          options={options}
          plugins={plugins}
          onChange={onChange}
          onSelectionChange={onSelectionChange}
          onViewportChange={onViewportChange}
          onThemeChange={onThemeChange}
          onValueChange={onValueChange}
        >
          <Board
            value={value}
            options={options}
            plugins={plugins}
            viewport={viewport}
            onChange={onChange}
            afterInitialize={handleAfterInit}
            style={{
              width: '100%',
              height: '100%'
            }}
          />
        </Wrapper>
      </div>

      {/* AI助手面板 */}
      {appState.isAIMode && (
        <div style={{
          position: 'absolute',
          top: '60px',
          right: '0',
          width: '350px',
          height: 'calc(100% - 60px)',
          backgroundColor: 'white',
          borderLeft: '1px solid #e0e0e0',
          boxShadow: '-2px 0 8px rgba(0,0,0,0.1)',
          zIndex: 1000
        }}>
          <EnhancedAIAssistant
            onCreateNode={handleAICreateNode}
            onAnalyzeCase={handleAIAnalyzeCase}
            currentNodes={value}
          />
        </div>
      )}

      {/* 导航工具栏 */}
      <NavigationToolbar
        zoom={appState.zoom}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onZoomReset={handleZoomReset}
        onFitToScreen={handleFitToScreen}
        onCenterView={handleCenterView}
      />

      {/* 连接工具栏 */}
      <ConnectionToolbar
        isConnectionMode={appState.isConnectionMode}
        selectedConnectionType={appState.selectedConnectionType}
        onToggleConnectionMode={handleToggleConnectionMode}
        onConnectionTypeChange={handleConnectionTypeChange}
        onClearConnections={handleClearConnections}
        connectionCount={appState.connectionCount}
      />

      {/* 节点编辑对话框 */}
      <NodeEditDialog
        node={appState.editingNode}
        isOpen={appState.isEditDialogOpen}
        onClose={handleCloseEditDialog}
        onSave={handleNodeSave}
      />

      {/* 状态信息 */}
      <div style={{
        position: 'absolute',
        bottom: '10px',
        left: '10px',
        padding: '8px 12px',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderRadius: '6px',
        fontSize: '12px',
        color: '#666',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        工具: {appState.selectedTool || '选择'} |
        节点: {value.length} |
        连接: {appState.connectionCount} |
        缩放: {Math.round(appState.zoom * 100)}% |
        设备: {appState.isMobile ? '移动端' : '桌面端'}
      </div>
    </div>
  );
};
