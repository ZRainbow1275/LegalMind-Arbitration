/**
 * 工具栏回调Hook
 * 
 * 管理FloatingToolbar的所有回调函数
 */

import { useCallback } from 'react';
import type { WorkspaceState } from '../types';
import { ErrorType, ErrorSeverity } from '../../../utils/errorHandler';

export interface ToolbarCallbacksParams {
  workspaceState: WorkspaceState;
  updateWorkspaceState: (updater: (prev: WorkspaceState) => WorkspaceState) => void;
  handleZoomIn: () => void;
  handleZoomOut: () => void;
  handleResetView: () => void;
  handleFitToScreen: () => void;
  handleCreateNode: (type: string) => void;
  handleSmartLayout: () => void;
  cancelConnection: () => void;
  startConnection: (type: string) => void;
  saveWorkspaceData: () => void;
  dataStorage: {
    exportData: () => string;
  };
  handleError: (error: Error, type: ErrorType, severity: ErrorSeverity, context: string) => void;
  // {{ AURA: Add - 撤销/重做参数 }}
  undo?: () => void;
  redo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  // {{ AURA: Add - 新手引导参数 }}
  onRestartTutorial?: () => void;
  // {{ AURA: Add - 模板面板回调 }}
  onOpenTemplates?: () => void;
}

export const useToolbarCallbacks = ({
  workspaceState,
  updateWorkspaceState,
  handleZoomIn,
  handleZoomOut,
  handleResetView,
  handleFitToScreen,
  handleCreateNode,
  handleSmartLayout,
  cancelConnection,
  startConnection,
  saveWorkspaceData,
  dataStorage,
  handleError,
  undo, // {{ AURA: Add - 撤销回调 }}
  redo, // {{ AURA: Add - 重做回调 }}
  canUndo, // {{ AURA: Add - 是否可以撤销 }}
  canRedo, // {{ AURA: Add - 是否可以重做 }}
  onRestartTutorial, // {{ AURA: Add - 重新查看引导回调 }}
  onOpenTemplates, // {{ AURA: Add - 打开模板面板回调 }}
}: ToolbarCallbacksParams) => {
  const onArbitrationPanel = useCallback(() => {
    updateWorkspaceState(prev => ({
      ...prev,
      showArbitrationPanel: !prev.showArbitrationPanel
    }));
  }, [updateWorkspaceState]);

  const onAIAnalysis = useCallback(() => {
    updateWorkspaceState(prev => ({
      ...prev,
      showAIAnalysisPanel: !prev.showAIAnalysisPanel
    }));
  }, [updateWorkspaceState]);

  const onRelationDetection = useCallback(() => {
    updateWorkspaceState(prev => ({
      ...prev,
      showRelationshipGraph: !prev.showRelationshipGraph
    }));
  }, [updateWorkspaceState]);

  const onSmartRecommendation = useCallback(() => {
    updateWorkspaceState(prev => ({
      ...prev,
      showEvidenceChain: !prev.showEvidenceChain
    }));
  }, [updateWorkspaceState]);

  const onLegalArticleCitation = useCallback(() => {
    updateWorkspaceState(prev => ({
      ...prev,
      showLegalArticleCitation: !prev.showLegalArticleCitation
    }));
  }, [updateWorkspaceState]);

  const onPermissionManagement = useCallback(() => {
    updateWorkspaceState(prev => ({
      ...prev,
      showPermissionPanel: !prev.showPermissionPanel
    }));
  }, [updateWorkspaceState]);

  const onConnectionMode = useCallback(() => {
    if (workspaceState.isConnecting) {
      cancelConnection();
    } else {
      startConnection('related-to');
    }
  }, [workspaceState.isConnecting, cancelConnection, startConnection]);

  const onCollaboration = useCallback(() => {
    updateWorkspaceState(prev => ({
      ...prev,
      showCollaborationPanel: !prev.showCollaborationPanel
    }));
  }, [updateWorkspaceState]);

  const onExport = useCallback(() => {
    try {
      const exportData = dataStorage.exportData();
      const blob = new Blob([exportData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `legalmind-workspace-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      handleError(
        error instanceof Error ? error : new Error('导出失败'),
        ErrorType.DATA_PERSISTENCE,
        ErrorSeverity.MEDIUM,
        '数据导出'
      );
    }
  }, [dataStorage, handleError]);

  // {{ AURA: Add - 性能监控回调 }}
  const onPerformanceMonitor = useCallback(() => {
    updateWorkspaceState(prev => ({
      ...prev,
      showPerformanceMonitor: !prev.showPerformanceMonitor
    }));
  }, [updateWorkspaceState]);

  return {
    onZoomIn: handleZoomIn,
    onZoomOut: handleZoomOut,
    onResetView: handleResetView,
    onFitToScreen: handleFitToScreen,
    onCreateNode: handleCreateNode,
    onSmartLayout: handleSmartLayout,
    onArbitrationPanel,
    onAIAnalysis,
    onRelationDetection,
    onSmartRecommendation,
    onLegalArticleCitation,
    onPermissionManagement,
    onConnectionMode,
    onCollaboration,
    onSave: saveWorkspaceData,
    onExport,
    onPerformanceMonitor, // {{ AURA: Add - 性能监控回调 }}
    onUndo: undo, // {{ AURA: Add - 撤销回调 }}
    onRedo: redo, // {{ AURA: Add - 重做回调 }}
    onRestartTutorial, // {{ AURA: Add - 重新查看引导回调 }}
    isConnecting: workspaceState.isConnecting,
    canUndo, // {{ AURA: Add - 是否可以撤销 }}
    canRedo, // {{ AURA: Add - 是否可以重做 }}
    onOpenTemplates, // {{ AURA: Add - 打开模板面板回调 }}
  };
};

